-- Las condiciones de la tarjeta (glosario: «Lista de respaldo», «Condiciones de la tarjeta», «Condición (de la tarjeta)»): la forma 2 admite el contenido `respaldo`
-- (de 2 a 5 datos: se muestra el primero con valor), el contenido `condiciones` (de 1 a 4 ramas «si… → contenido» y el «si no»; cada rama, de 1 a 3 condiciones
-- unidas con Y) y la fila que se oculta `condiciones` (con su `si`). Espejo de entities/plantilla/ (`condiciones-de-cuadricula.ts`, `datos-de-la-cuadricula.ts`,
-- `forma-de-cuadricula.ts`, `reglas-de-la-grilla.ts`, `nodos-de-cuadricula.ts`) con el juego casos-de-plantilla.json. Reglas nuevas: `respaldo_vacio` (tras
-- `variable_inexistente`) y `condicion_invalida` (la última). Todo dato y toda condición que la cuadrícula nombra pasa por las reglas de las variables y de los
-- nodos (un nodo de una condición que no es del nivel «todos» es `nodo_restringido`) y por lo que `cotizacion_tarjeta()` entrega.

-- Todo dato que nombra la cuadrícula, aplanado y en orden (espejo de `datosNombrados()`): primero las filas (el nodo que la decide y los de sus condiciones) y
-- después las celdas (su dato, los de su lista de respaldo o, de sus condiciones, rama por rama las condiciones y su contenido, y el «si no»). Una condición sobre un
-- dato trae su dato con `es`; una sobre un nodo, su nodo con `es` y su `opcion`. Se llama sobre una cuadrícula que ya pasó la forma.
create function public._plantilla_cuadricula_datos(p_plantilla jsonb)
returns table (o bigint, lugar text, id text, variable text, nodo text, mostrar text, es text, opcion text)
language sql immutable
set search_path = ''
as $$
  with filas as (
    select f.v, f.n from jsonb_array_elements(p_plantilla -> 'filas') with ordinality f (v, n)
  ), celdas as (
    select c.v ->> 'id' as cual, c.v -> 'contenido' as x, 1000000 + c.n * 100 as base
      from jsonb_array_elements(p_plantilla -> 'celdas') with ordinality c (v, n)
  ), ramas as (
    select c.cual, c.base, r.x as rama, r.j
      from celdas c cross join lateral jsonb_array_elements(c.x -> 'ramas') with ordinality r (x, j)
     where c.x ->> 'tipo' = 'condiciones'
  ), piezas (orden, en, cual, dato, cond) as (
    select f.n * 100, 'filas'::text, f.v ->> 'id', f.v, null::jsonb from filas f where f.v ? 'nodo'
    union all
    select f.n * 100 + s.m, 'filas', f.v ->> 'id', null, s.x
      from filas f cross join lateral jsonb_array_elements(f.v -> 'si') with ordinality s (x, m)
     where jsonb_typeof(f.v -> 'si') = 'array'
    union all
    select c.base, 'celdas', c.cual, c.x, null from celdas c where c.x ->> 'tipo' = 'dato'
    union all
    select c.base + d.j, 'celdas', c.cual, d.x, null
      from celdas c cross join lateral jsonb_array_elements(c.x -> 'datos') with ordinality d (x, j)
     where c.x ->> 'tipo' = 'respaldo'
    union all
    select r.base + (r.j - 1) * 4 + s.m, 'celdas', r.cual, null, s.x
      from ramas r cross join lateral jsonb_array_elements(r.rama -> 'si') with ordinality s (x, m)
    union all
    select r.base + r.j * 4, 'celdas', r.cual, r.rama -> 'contenido', null from ramas r where r.rama -> 'contenido' ->> 'tipo' = 'dato'
    union all
    select c.base + 17, 'celdas', c.cual, c.x -> 'si_no', null from celdas c where c.x ->> 'tipo' = 'condiciones' and c.x -> 'si_no' ->> 'tipo' = 'dato'
  )
  select p.orden, p.en, p.cual,
         coalesce(p.cond -> 'dato', p.dato) ->> 'variable',
         coalesce(p.cond -> 'dato', p.cond, p.dato) ->> 'nodo',
         coalesce(p.cond -> 'dato', p.dato) ->> 'mostrar',
         p.cond ->> 'es',
         p.cond ->> 'opcion'
    from piezas p
$$;

revoke all on function public._plantilla_cuadricula_datos(jsonb) from public, anon;
grant execute on function public._plantilla_cuadricula_datos(jsonb) to authenticated, service_role;

comment on function public._plantilla_cuadricula_datos(jsonb) is 'Interna: todo dato que nombra la cuadrícula de la tarjeta (filas y celdas, con sus listas de respaldo y sus condiciones), aplanado y en orden; espejo de entities/plantilla/datos-de-la-cuadricula.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';

-- Un dato suelto (de una celda, una lista, una rama o una condición): un objeto con `tipo` `dato` y una variable (`{tipo, variable}`) o un nodo con qué mostrar
-- (`{tipo, nodo, mostrar}`); lo decide la clave `variable`. Que la variable exista es otra regla (`variable_inexistente`).
create function public._plantilla_cuadricula_dato(p_x jsonb, p_donde text)
returns void
language plpgsql stable
set search_path = ''
as $$
declare v_t text;
begin
  if jsonb_typeof(p_x) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', p_donde); end if;
  if p_x -> 'tipo' is distinct from '"dato"'::jsonb then perform public._plantilla_cuadricula_rechazar('forma', p_donde || '.tipo'); end if;
  if p_x ? 'variable' then
    if exists (select 1 from jsonb_object_keys(p_x) k where k not in ('tipo', 'variable')) then perform public._plantilla_cuadricula_rechazar('forma', p_donde); end if;
    if not public._plantilla_es_id(p_x -> 'variable') then perform public._plantilla_cuadricula_rechazar('forma', p_donde || '.variable'); end if;
  else
    if exists (select 1 from jsonb_object_keys(p_x) k where k not in ('tipo', 'nodo', 'mostrar')) then perform public._plantilla_cuadricula_rechazar('forma', p_donde); end if;
    if not public._plantilla_es_id(p_x -> 'nodo') then perform public._plantilla_cuadricula_rechazar('forma', p_donde || '.nodo'); end if;
    v_t := case when jsonb_typeof(p_x -> 'mostrar') = 'string' then p_x ->> 'mostrar' end;
    if v_t is null or v_t not in ('monto', 'etiqueta', 'descripcion', 'porcentaje', 'tc_nombre', 'tc_valor', 'plazo') then
      perform public._plantilla_cuadricula_rechazar('forma', p_donde || '.mostrar');
    end if;
  end if;
end;
$$;

revoke all on function public._plantilla_cuadricula_dato(jsonb, text) from public, anon;
grant execute on function public._plantilla_cuadricula_dato(jsonb, text) to authenticated, service_role;

comment on function public._plantilla_cuadricula_dato(jsonb, text) is 'Interna: la forma de un dato de la cuadrícula de la tarjeta, espejo de revisarDatoDeUnaCelda() en entities/plantilla/condiciones-de-cuadricula.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';

-- El `si` de una rama o de una fila: de 1 a 3 condiciones unidas con Y. `vacio` y `no_vacio` llevan `{es, dato}`; `cero`, `no_cero`, `encendido` y `apagado`,
-- `{es, nodo}`; `mayor`, `menor` e `igual`, `{es, nodo, a}` con `a` un número; `opcion`, `{es, nodo, opcion}`.
create function public._plantilla_cuadricula_condiciones(p_si jsonb, p_donde text)
returns void
language plpgsql stable
set search_path = ''
as $$
declare v_c jsonb; v_d text; v_es text; v_extra text;
begin
  if jsonb_typeof(p_si) is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', p_donde); end if;
  if jsonb_array_length(p_si) not between 1 and 3 then perform public._plantilla_cuadricula_rechazar('forma', p_donde); end if;
  for k in 0 .. jsonb_array_length(p_si) - 1 loop
    v_c := p_si -> k;
    v_d := format('%s[%s]', p_donde, k);
    if jsonb_typeof(v_c) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    v_es := case when jsonb_typeof(v_c -> 'es') = 'string' then v_c ->> 'es' end;
    if v_es is null or v_es not in ('vacio', 'no_vacio', 'cero', 'no_cero', 'mayor', 'menor', 'igual', 'opcion', 'encendido', 'apagado') then
      perform public._plantilla_cuadricula_rechazar('forma', v_d || '.es');
    end if;
    if v_es in ('vacio', 'no_vacio') then
      if exists (select 1 from jsonb_object_keys(v_c) x where x not in ('es', 'dato')) then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
      perform public._plantilla_cuadricula_dato(v_c -> 'dato', v_d || '.dato');
    else
      v_extra := case when v_es in ('mayor', 'menor', 'igual') then 'a' when v_es = 'opcion' then 'opcion' else 'es' end;
      if exists (select 1 from jsonb_object_keys(v_c) x where x not in ('es', 'nodo', v_extra)) then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
      if not public._plantilla_es_id(v_c -> 'nodo') then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.nodo'); end if;
      if v_es in ('mayor', 'menor', 'igual') and jsonb_typeof(v_c -> 'a') is distinct from 'number' then
        perform public._plantilla_cuadricula_rechazar('forma', v_d || '.a');
      end if;
      if v_es = 'opcion' and not public._plantilla_es_id(v_c -> 'opcion') then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.opcion'); end if;
    end if;
  end loop;
end;
$$;

revoke all on function public._plantilla_cuadricula_condiciones(jsonb, text) from public, anon;
grant execute on function public._plantilla_cuadricula_condiciones(jsonb, text) to authenticated, service_role;

comment on function public._plantilla_cuadricula_condiciones(jsonb, text) is 'Interna: la forma del `si` de una rama o de una fila de la cuadrícula de la tarjeta, espejo de revisarSi() en entities/plantilla/condiciones-de-cuadricula.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';

-- Lo que muestra una rama o el «si no»: un texto (0 a 300 caracteres, sin `{{`), un dato o nada.
create function public._plantilla_cuadricula_simple(p_x jsonb, p_donde text)
returns void
language plpgsql stable
set search_path = ''
as $$
declare v_t text;
begin
  if jsonb_typeof(p_x) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', p_donde); end if;
  v_t := case when jsonb_typeof(p_x -> 'tipo') = 'string' then p_x ->> 'tipo' end;
  if v_t is null or v_t not in ('texto', 'dato', 'vacio') then perform public._plantilla_cuadricula_rechazar('forma', p_donde || '.tipo'); end if;
  if v_t = 'texto' then
    if exists (select 1 from jsonb_object_keys(p_x) k where k not in ('tipo', 'texto')) then perform public._plantilla_cuadricula_rechazar('forma', p_donde); end if;
    if jsonb_typeof(p_x -> 'texto') is distinct from 'string' then perform public._plantilla_cuadricula_rechazar('forma', p_donde || '.texto'); end if;
    if char_length(p_x ->> 'texto') > 300 or strpos(p_x ->> 'texto', '{{') > 0 then perform public._plantilla_cuadricula_rechazar('forma', p_donde || '.texto'); end if;
  elsif v_t = 'dato' then
    perform public._plantilla_cuadricula_dato(p_x, p_donde);
  elsif exists (select 1 from jsonb_object_keys(p_x) k where k <> 'tipo') then
    perform public._plantilla_cuadricula_rechazar('forma', p_donde);
  end if;
end;
$$;

revoke all on function public._plantilla_cuadricula_simple(jsonb, text) from public, anon;
grant execute on function public._plantilla_cuadricula_simple(jsonb, text) to authenticated, service_role;

comment on function public._plantilla_cuadricula_simple(jsonb, text) is 'Interna: la forma de lo que muestra una rama o el «si no» de unas condiciones de la tarjeta, espejo de revisarSimple() en entities/plantilla/condiciones-de-cuadricula.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';

-- La forma 2 con la lista de respaldo, las condiciones de una celda y las de una fila; `variable_inexistente` mira todo dato que la cuadrícula nombra y después va
-- `respaldo_vacio`. Lo demás es la definición vigente.
CREATE OR REPLACE FUNCTION "public"."_plantilla_cuadricula_forma"("p_plantilla" "jsonb", "p_con_tope" boolean) RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  v_cols jsonb; v_filas jsonb; v_celdas jsonb; v_c jsonb; v_x jsonb; v_e jsonb; v_b jsonb;
  v_k text; v_t text; v_d text; v_dc text; v_dr text; v_lado text; v_r jsonb;
  v_icol jsonb; v_ifila jsonb; v_ncols int; v_ocupadas boolean[]; v_f0 int; v_c0 int; v_n int; v_ok boolean;
begin
  if jsonb_typeof(p_plantilla) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', 'definicion'); end if;
  if p_con_tope and octet_length(p_plantilla::text) > 24576 then perform public._plantilla_cuadricula_rechazar('forma', 'definicion'); end if;
  select k into v_k from jsonb_object_keys(p_plantilla) k where k not in ('forma', 'columnas', 'filas', 'celdas') order by k collate "C" limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('forma', v_k); end if;
  if jsonb_typeof(p_plantilla -> 'forma') is distinct from 'number' then perform public._plantilla_cuadricula_rechazar('forma', 'forma'); end if;
  if (p_plantilla ->> 'forma')::numeric <> 2 then perform public._plantilla_cuadricula_rechazar('forma', 'forma'); end if;

  -- Las columnas: al menos una, cada una {id, ancho} con el ancho entero de 24 a 640.
  v_cols := p_plantilla -> 'columnas';
  if jsonb_typeof(v_cols) is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', 'columnas'); end if;
  if jsonb_array_length(v_cols) = 0 then perform public._plantilla_cuadricula_rechazar('forma', 'columnas'); end if;
  for i in 0 .. jsonb_array_length(v_cols) - 1 loop
    v_c := v_cols -> i;
    v_d := format('columnas[%s]', i);
    if jsonb_typeof(v_c) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if exists (select 1 from jsonb_object_keys(v_c) k where k not in ('id', 'ancho')) then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if not public._plantilla_es_id(v_c -> 'id') then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.id'); end if;
    if not public._plantilla_entero_entre(v_c -> 'ancho', 24, 640) then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.ancho'); end if;
  end loop;

  -- Las filas: al menos una, cada una {id, alto, ocultar_si, nodo?, si?}; el nodo va con `no_aplica` y `no_aplica_o_cero`, y con `nunca` o `condiciones` no va (aunque sea
  -- nulo: mira `?`); el `si` (de 1 a 3 condiciones) va sólo con `condiciones`.
  v_filas := p_plantilla -> 'filas';
  if jsonb_typeof(v_filas) is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', 'filas'); end if;
  if jsonb_array_length(v_filas) = 0 then perform public._plantilla_cuadricula_rechazar('forma', 'filas'); end if;
  for i in 0 .. jsonb_array_length(v_filas) - 1 loop
    v_c := v_filas -> i;
    v_d := format('filas[%s]', i);
    if jsonb_typeof(v_c) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if exists (select 1 from jsonb_object_keys(v_c) k where k not in ('id', 'alto', 'ocultar_si', 'nodo', 'si')) then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if not public._plantilla_es_id(v_c -> 'id') then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.id'); end if;
    if not public._plantilla_entero_entre(v_c -> 'alto', 16, 240) then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.alto'); end if;
    v_t := case when jsonb_typeof(v_c -> 'ocultar_si') = 'string' then v_c ->> 'ocultar_si' end;
    if v_t is null or v_t not in ('nunca', 'no_aplica', 'no_aplica_o_cero', 'condiciones') then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.ocultar_si'); end if;
    if v_t = 'condiciones' then
      if v_c ? 'nodo' then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.nodo'); end if;
      perform public._plantilla_cuadricula_condiciones(v_c -> 'si', v_d || '.si');
    else
      if v_t = 'nunca' then
        if v_c ? 'nodo' then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.nodo'); end if;
      elsif not public._plantilla_es_id(v_c -> 'nodo') then
        perform public._plantilla_cuadricula_rechazar('forma', v_d || '.nodo');
      end if;
      if v_c ? 'si' then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.si'); end if;
    end if;
  end loop;

  -- Las celdas (puede no haber): por celda la clave de más, `id`, `fila`, `columna`, las combinaciones, el contenido según su tipo y el estilo.
  v_celdas := p_plantilla -> 'celdas';
  if jsonb_typeof(v_celdas) is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', 'celdas'); end if;
  for i in 0 .. jsonb_array_length(v_celdas) - 1 loop
    v_c := v_celdas -> i;
    v_d := format('celdas[%s]', i);
    if jsonb_typeof(v_c) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if exists (select 1 from jsonb_object_keys(v_c) k where k not in ('id', 'fila', 'columna', 'abarca_columnas', 'abarca_filas', 'contenido', 'estilo')) then
      perform public._plantilla_cuadricula_rechazar('forma', v_d);
    end if;
    foreach v_k in array array['id', 'fila', 'columna'] loop
      if not public._plantilla_es_id(v_c -> v_k) then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.' || v_k); end if;
    end loop;
    if v_c ? 'abarca_columnas' and not public._plantilla_entero_entre(v_c -> 'abarca_columnas', 1, 16) then
      perform public._plantilla_cuadricula_rechazar('forma', v_d || '.abarca_columnas');
    end if;
    if v_c ? 'abarca_filas' and not public._plantilla_entero_entre(v_c -> 'abarca_filas', 1, 120) then
      perform public._plantilla_cuadricula_rechazar('forma', v_d || '.abarca_filas');
    end if;

    -- El contenido: texto (0 a 300 caracteres, sin `{{`), dato (una variable o un nodo con qué mostrar), la lista de respaldo (hasta 5 datos), las condiciones
    -- (de 1 a 4 ramas {si, contenido} y el «si no»), logo, foto del asesor o vacío.
    v_x := v_c -> 'contenido';
    v_dc := v_d || '.contenido';
    if jsonb_typeof(v_x) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
    v_t := case when jsonb_typeof(v_x -> 'tipo') = 'string' then v_x ->> 'tipo' end;
    if v_t is null or v_t not in ('texto', 'dato', 'respaldo', 'condiciones', 'logo', 'vacio', 'foto_del_asesor') then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.tipo'); end if;
    if v_t = 'texto' then
      if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('tipo', 'texto')) then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
      if jsonb_typeof(v_x -> 'texto') is distinct from 'string' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.texto'); end if;
      if char_length(v_x ->> 'texto') > 300 or strpos(v_x ->> 'texto', '{{') > 0 then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.texto'); end if;
    elsif v_t = 'dato' then
      perform public._plantilla_cuadricula_dato(v_x, v_dc);
    elsif v_t = 'respaldo' then
      if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('tipo', 'datos')) then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
      if jsonb_typeof(v_x -> 'datos') is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.datos'); end if;
      if jsonb_array_length(v_x -> 'datos') > 5 then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.datos'); end if;
      for j in 0 .. jsonb_array_length(v_x -> 'datos') - 1 loop
        perform public._plantilla_cuadricula_dato(v_x -> 'datos' -> j, format('%s.datos[%s]', v_dc, j));
      end loop;
    elsif v_t = 'condiciones' then
      if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('tipo', 'ramas', 'si_no')) then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
      if jsonb_typeof(v_x -> 'ramas') is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.ramas'); end if;
      if jsonb_array_length(v_x -> 'ramas') not between 1 and 4 then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.ramas'); end if;
      for j in 0 .. jsonb_array_length(v_x -> 'ramas') - 1 loop
        v_r := v_x -> 'ramas' -> j;
        v_dr := format('%s.ramas[%s]', v_dc, j);
        if jsonb_typeof(v_r) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_dr); end if;
        if exists (select 1 from jsonb_object_keys(v_r) k where k not in ('si', 'contenido')) then perform public._plantilla_cuadricula_rechazar('forma', v_dr); end if;
        perform public._plantilla_cuadricula_condiciones(v_r -> 'si', v_dr || '.si');
        perform public._plantilla_cuadricula_simple(v_r -> 'contenido', v_dr || '.contenido');
      end loop;
      perform public._plantilla_cuadricula_simple(v_x -> 'si_no', v_dc || '.si_no');
    elsif exists (select 1 from jsonb_object_keys(v_x) k where k <> 'tipo') then
      perform public._plantilla_cuadricula_rechazar('forma', v_dc);
    end if;

    -- El estilo: cada clave opcional; una presente, aunque sea nula, tiene que valer.
    continue when not v_c ? 'estilo';
    v_e := v_c -> 'estilo';
    v_dc := v_d || '.estilo';
    if jsonb_typeof(v_e) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
    if exists (select 1 from jsonb_object_keys(v_e) k where k not in ('fondo', 'texto', 'negrita', 'cursiva', 'tamano', 'alinear', 'alinear_vertical', 'bordes')) then
      perform public._plantilla_cuadricula_rechazar('forma', v_dc);
    end if;
    if v_e ? 'fondo' and not public._plantilla_es_id(v_e -> 'fondo') then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.fondo'); end if;
    if v_e ? 'texto' and not public._plantilla_es_id(v_e -> 'texto') then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.texto'); end if;
    if v_e ? 'negrita' and jsonb_typeof(v_e -> 'negrita') is distinct from 'boolean' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.negrita'); end if;
    if v_e ? 'cursiva' and jsonb_typeof(v_e -> 'cursiva') is distinct from 'boolean' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.cursiva'); end if;
    -- El `case` va en una variable: un `if` de plpgsql termina en el primer `then`.
    v_ok := case when jsonb_typeof(v_e -> 'tamano') = 'number' then (v_e ->> 'tamano')::numeric in (10, 11, 12, 14, 16, 18, 22, 28) else false end;
    if v_e ? 'tamano' and not v_ok then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.tamano'); end if;
    if v_e ? 'alinear' and coalesce(jsonb_typeof(v_e -> 'alinear') <> 'string' or (v_e ->> 'alinear') not in ('izquierda', 'centro', 'derecha'), true) then
      perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.alinear');
    end if;
    if v_e ? 'alinear_vertical' and coalesce(jsonb_typeof(v_e -> 'alinear_vertical') <> 'string' or (v_e ->> 'alinear_vertical') not in ('arriba', 'centro', 'abajo'), true) then
      perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.alinear_vertical');
    end if;
    continue when not v_e ? 'bordes';
    v_b := v_e -> 'bordes';
    if jsonb_typeof(v_b) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.bordes'); end if;
    if exists (select 1 from jsonb_object_keys(v_b) k where k not in ('todos', 'arriba', 'derecha', 'abajo', 'izquierda')) then
      perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.bordes');
    end if;
    foreach v_lado in array array['todos', 'arriba', 'derecha', 'abajo', 'izquierda'] loop
      if v_b ? v_lado and coalesce(jsonb_typeof(v_b -> v_lado) <> 'string' or (v_b ->> v_lado) not in ('ninguno', 'fino', 'grueso'), true) then
        perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.bordes.' || v_lado);
      end if;
    end loop;
  end loop;

  -- Los topes de la grilla.
  if jsonb_array_length(v_cols) > 16 then perform public._plantilla_cuadricula_rechazar('demasiadas_columnas', 'columnas'); end if;
  if jsonb_array_length(v_filas) > 120 then perform public._plantilla_cuadricula_rechazar('demasiadas_filas', 'filas'); end if;
  if jsonb_array_length(v_celdas) > 1000 then perform public._plantilla_cuadricula_rechazar('demasiadas_celdas', 'celdas'); end if;

  -- Los repetidos: la segunda aparición, en el orden del arreglo.
  select x.id into v_k from (select v ->> 'id' as id, o, row_number() over (partition by v ->> 'id' order by o) as n
                               from jsonb_array_elements(v_cols) with ordinality t (v, o)) x where x.n = 2 order by x.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('columna_repetida', 'columnas.' || v_k); end if;
  select x.id into v_k from (select v ->> 'id' as id, o, row_number() over (partition by v ->> 'id' order by o) as n
                               from jsonb_array_elements(v_filas) with ordinality t (v, o)) x where x.n = 2 order by x.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('fila_repetida', 'filas.' || v_k); end if;
  select x.id into v_k from (select v ->> 'id' as id, o, row_number() over (partition by v ->> 'id' order by o) as n
                               from jsonb_array_elements(v_celdas) with ordinality t (v, o)) x where x.n = 2 order by x.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('celda_repetida', 'celdas.' || v_k); end if;

  if (select sum((c ->> 'ancho')::numeric) from jsonb_array_elements(v_cols) c) > 1600 then
    perform public._plantilla_cuadricula_rechazar('ancho_total', 'columnas');
  end if;

  -- Fuera: una fila o columna que no existe, o una combinación que pasa del borde. Los índices van por id (ya únicos).
  v_ncols := jsonb_array_length(v_cols);
  v_icol := (select jsonb_object_agg(v ->> 'id', o - 1) from jsonb_array_elements(v_cols) with ordinality t (v, o));
  v_ifila := (select jsonb_object_agg(v ->> 'id', o - 1) from jsonb_array_elements(v_filas) with ordinality t (v, o));
  select c ->> 'id' into v_k from jsonb_array_elements(v_celdas) with ordinality t (c, o)
   where not v_icol ? (c ->> 'columna') or not v_ifila ? (c ->> 'fila')
      or (v_icol ->> (c ->> 'columna'))::numeric + coalesce((c ->> 'abarca_columnas')::numeric, 1) > v_ncols
      or (v_ifila ->> (c ->> 'fila'))::numeric + coalesce((c ->> 'abarca_filas')::numeric, 1) > jsonb_array_length(v_filas)
   order by o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('celda_fuera_de_la_grilla', 'celdas.' || v_k); end if;

  -- Se pisan: la primera celda, en orden, que ocupa una casilla ya ocupada (a lo sumo 16 × 120 casillas).
  v_ocupadas := array_fill(false, array[greatest(1, v_ncols * jsonb_array_length(v_filas))]);
  for v_c in select c from jsonb_array_elements(v_celdas) with ordinality t (c, o) order by o loop
    v_f0 := (v_ifila ->> (v_c ->> 'fila'))::int;
    v_c0 := (v_icol ->> (v_c ->> 'columna'))::int;
    for f in v_f0 .. v_f0 + coalesce((v_c ->> 'abarca_filas')::numeric::int, 1) - 1 loop
      for k in v_c0 .. v_c0 + coalesce((v_c ->> 'abarca_columnas')::numeric::int, 1) - 1 loop
        v_n := f * v_ncols + k + 1;
        if v_ocupadas[v_n] then perform public._plantilla_cuadricula_rechazar('celdas_se_pisan', 'celdas.' || (v_c ->> 'id')); end if;
        v_ocupadas[v_n] := true;
      end loop;
    end loop;
  end loop;

  -- El primer dato con una variable que no existe, en el orden de `_plantilla_cuadricula_datos()` (las filas, por sus condiciones, antes que las celdas).
  select d.lugar || '.' || d.id into v_k from public._plantilla_cuadricula_datos(p_plantilla) d
   where d.variable is not null
     and d.variable not in ('empresa_nombre', 'fecha_larga', 'numero', 'titulo', 'titulo_opcion', 'asesor_nombre', 'asesor_iniciales', 'cliente_nombre',
                            'vehiculo_titulo', 'vehiculo_lote', 'vehiculo_vin', 'vence_el', 'modo_tc', 'asesor_telefono', 'asesor_cargo')
   order by d.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('variable_inexistente', v_k); end if;

  -- La primera lista de respaldo con menos de dos datos.
  select c ->> 'id' into v_k from jsonb_array_elements(v_celdas) with ordinality t (c, o)
   where c -> 'contenido' ->> 'tipo' = 'respaldo' and jsonb_array_length(c -> 'contenido' -> 'datos') < 2
   order by o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('respaldo_vacio', 'celdas.' || v_k); end if;
end;
$$;

-- Las reglas de los nodos sobre todo dato que la cuadrícula nombra (`_plantilla_cuadricula_datos()`, en orden): las de siempre ahora también miran las listas de
-- respaldo, las ramas y las condiciones (un nodo de una condición que no es del nivel «todos» es `nodo_restringido`; `mostrar_no_admitido` y
-- `tipo_de_cambio_restringido` pueden nombrar una fila, por el dato de una condición), y al final `condicion_invalida`: la opción, sobre lo que no es la variante o
-- con una clave que no tiene; encendido o apagado, sobre lo que no es una bandera; un número (cero, no cero, mayor, menor, igual), sobre la variante.
create or replace function public._plantilla_cuadricula_nodos(p_plantilla jsonb, p_def jsonb, p_diseno jsonb, p_visibilidad jsonb, p_tonos text[])
returns void
language plpgsql stable
set search_path = ''
as $$
declare
  v_celdas jsonb; v_nodos jsonb; v_grupos jsonb; v_pcts jsonb; v_vis jsonb; v_ton jsonb; v_k text;
begin
  v_celdas := p_plantilla -> 'celdas';
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g) from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) g), '{}'::jsonb);
  -- Los `pct` de un par porcentaje-monto: el `pct` de cada `porcentaje_de`.
  v_pcts := coalesce((select jsonb_object_agg(n ->> 'pct', true) from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) n
                       where n ->> 'tipo' = 'calculo' and n ->> 'op' = 'porcentaje_de' and n ->> 'pct' is not null), '{}'::jsonb);
  v_vis := coalesce(p_visibilidad, '{}'::jsonb);

  if p_tonos is not null then
    select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ton from unnest(p_tonos) x where x is not null;
    select c ->> 'id' into v_k from jsonb_array_elements(v_celdas) with ordinality t (c, o)
     where coalesce(c -> 'estilo' ? 'fondo' and c -> 'estilo' ->> 'fondo' <> 'auto' and not v_ton ? (c -> 'estilo' ->> 'fondo'), false)
        or coalesce(c -> 'estilo' ? 'texto' and c -> 'estilo' ->> 'texto' <> 'auto' and not v_ton ? (c -> 'estilo' ->> 'texto'), false)
     order by o limit 1;
    if v_k is not null then perform public._plantilla_cuadricula_rechazar('tono_inexistente', 'celdas.' || v_k); end if;
  end if;

  select d.id into v_k from public._plantilla_cuadricula_datos(p_plantilla) d
   where d.lugar = 'filas' and d.nodo is not null and not v_nodos ? d.nodo order by d.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('nodo_de_fila_inexistente', 'filas.' || v_k); end if;

  select d.id into v_k from public._plantilla_cuadricula_datos(p_plantilla) d
   where d.lugar = 'celdas' and d.nodo is not null and not v_nodos ? d.nodo order by d.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('nodo_inexistente', 'celdas.' || v_k); end if;

  -- El `pct` del par de un nodo: el suyo si es el `porcentaje_de`, él mismo si es el `pct` de uno; nulo si no es de un par.
  select d.lugar || '.' || d.id into v_k from public._plantilla_cuadricula_datos(p_plantilla) d
   cross join lateral (select v_nodos -> d.nodo as n) x
   where d.nodo is not null and d.mostrar is not null
     and ((d.mostrar = 'porcentaje'
           and (case when x.n ->> 'tipo' = 'calculo' and x.n ->> 'op' = 'porcentaje_de' and x.n ->> 'pct' is not null then x.n ->> 'pct'
                     when v_pcts ? d.nodo then d.nodo end) is null)
       or (d.mostrar in ('tc_nombre', 'tc_valor', 'plazo') and (x.n ->> 'grupo' is null or not v_grupos ? (x.n ->> 'grupo'))))
   order by d.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('mostrar_no_admitido', v_k); end if;

  select d.lugar || '.' || d.id into v_k from public._plantilla_cuadricula_datos(p_plantilla) d
   cross join lateral (select v_nodos -> d.nodo as n) x
   where d.nodo is not null
     and (coalesce(v_vis -> d.nodo ->> 'ver', '') <> 'todos'
       or (d.mostrar = 'porcentaje'
           and coalesce(v_vis -> (case when x.n ->> 'tipo' = 'calculo' and x.n ->> 'op' = 'porcentaje_de' and x.n ->> 'pct' is not null then x.n ->> 'pct'
                                       else d.nodo end) ->> 'ver', '') <> 'todos'))
   order by d.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('nodo_restringido', v_k); end if;

  select d.lugar || '.' || d.id into v_k from public._plantilla_cuadricula_datos(p_plantilla) d
   cross join lateral (select v_grupos -> (v_nodos -> d.nodo ->> 'grupo') ->> 'bucket' as b) g
   where d.mostrar in ('tc_nombre', 'tc_valor') and g.b is not null
     and exists (select 1 from (select p_def -> 'buckets' ->> g.b as id
                                union all
                                select mb ->> 'nodo'
                                  from jsonb_array_elements(coalesce(p_diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m
                                 cross join lateral jsonb_array_elements(coalesce(m -> 'buckets', '[]'::jsonb)) mb
                                 where mb ->> 'bucket' = g.b) b
                  where b.id is not null and coalesce(v_vis -> b.id ->> 'ver', '') <> 'todos')
   order by d.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('tipo_de_cambio_restringido', v_k); end if;

  -- Una condición sobre un nodo que ese nodo no puede responder (las de un dato, `vacio` y `no_vacio`, siempre se responden).
  select d.lugar || '.' || d.id into v_k from public._plantilla_cuadricula_datos(p_plantilla) d
   cross join lateral (select v_nodos -> d.nodo as n) x
   where d.es is not null and d.nodo is not null and d.mostrar is null
     and ((d.es = 'opcion'
           and (x.n ->> 'tipo' is distinct from 'opcion'
                or not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(x.n -> 'opciones') = 'array' then x.n -> 'opciones' else '[]'::jsonb end) op
                                where op ->> 'clave' = d.opcion)))
       or (d.es in ('encendido', 'apagado') and x.n ->> 'tipo' is distinct from 'bandera')
       or (d.es in ('cero', 'no_cero', 'mayor', 'menor', 'igual') and x.n ->> 'tipo' = 'opcion'))
   order by d.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('condicion_invalida', v_k); end if;
end;
$$;

-- Los mensajes de `respaldo_vacio` y `condicion_invalida` (los de motivos-de-plantilla.ts). Lo demás es la definición vigente.
CREATE OR REPLACE FUNCTION "public"."_plantilla_cuadricula_rechazar"("p_regla" "text", "p_donde" "text") RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare v_lugar text; v_l text;
begin
  v_lugar := case split_part(p_donde, '.', 1)
               when 'celdas' then format('la celda «%s»', substr(p_donde, 8))
               when 'filas' then format('la fila «%s»', substr(p_donde, 7))
               when 'columnas' then format('la columna «%s»', substr(p_donde, 10)) end;
  v_l := coalesce(upper(left(v_lugar, 1)) || substr(v_lugar, 2), p_donde);
  perform public._formula_rechazar(p_regla, p_donde, case p_regla
    when 'forma' then 'La plantilla no tiene la forma esperada.'
    when 'demasiadas_columnas' then 'La tarjeta lleva hasta 16 columnas.'
    when 'demasiadas_filas' then 'La tarjeta lleva hasta 120 filas.'
    when 'demasiadas_celdas' then 'La tarjeta lleva hasta 1.000 celdas.'
    when 'columna_repetida' then v_l || ' está dos veces.'
    when 'fila_repetida' then v_l || ' está dos veces.'
    when 'celda_repetida' then v_l || ' está dos veces.'
    when 'ancho_total' then 'Las columnas suman más de 1.600 px de ancho.'
    when 'celda_fuera_de_la_grilla' then v_l || ' se sale de la cuadrícula.'
    when 'celdas_se_pisan' then v_l || ' pisa otra celda.'
    when 'variable_inexistente' then v_l || ' muestra un dato que no existe.'
    when 'respaldo_vacio' then v_l || ' necesita al menos dos datos para mostrar el primero con valor.'
    when 'tono_inexistente' then v_l || ' usa un color que no está en el catálogo.'
    when 'nodo_de_fila_inexistente' then v_l || ' depende de un nodo que no es de la fórmula.'
    when 'nodo_inexistente' then v_l || ' nombra un nodo que no es de la fórmula.'
    when 'mostrar_no_admitido' then v_l || ' muestra algo que su nodo no tiene.'
    when 'nodo_restringido' then format('La tarjeta no puede mostrar lo que nombra %s: no es del nivel «todos».', v_lugar)
    when 'tipo_de_cambio_restringido' then format('La tarjeta no puede nombrar el tipo de cambio de %s: no es del nivel «todos».', v_lugar)
    when 'condicion_invalida' then v_l || ' tiene una condición que esta fórmula no puede responder.'
  end);
end;
$$;

-- Lo que la tarjeta entrega mira todo dato que nombra la cuadrícula (`_plantilla_cuadricula_datos()`): los nodos de las listas, las ramas y las condiciones (y sus
-- etiquetas, grupos y tipos de cambio) y las variables que nombran; todos ya validados del nivel «todos». Lo demás es la definición vigente.
CREATE OR REPLACE FUNCTION "public"."cotizacion_tarjeta"("p_formula" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  fo public.formulas; v_pla public.plantillas_tarjeta; v_p jsonb; v_celdas jsonb; v_nodos jsonb; v_grupos jsonb; v_total text; v_opcion jsonb;
  v_datos jsonb; v_ids text[]; v_pcts jsonb; v_de_grupo text[]; v_buckets text[]; v_tc jsonb; v_variables text[];
begin
  perform public.assert_activo();
  select * into fo from public.formulas f where f.id = p_formula;
  -- La inexistencia y el borrador se deciden antes del permiso (`tiene_permiso` con un origen nulo da verdadero) y dan lo mismo que no tenerlo.
  if not found or fo.estado = 'borrador' then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;
  if not public.tiene_permiso('cotizaciones.ver', fo.origen_id) then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;

  -- La publicada de la fórmula del origen de esta versión (plantillas_publicada_unica), validada contra ESTA versión sin el catálogo: un color borrado se dibuja `auto`. La de la forma 1 se
  -- convierte con el catálogo de hoy (un color borrado cae al del grupo) y lo convertido se valida sin el tope de 24 KiB.
  select * into v_pla from public.plantillas_tarjeta p where p.formula_del_origen_id = fo.formula_del_origen_id and p.estado = 'publicada';
  if not found then return jsonb_build_object('estado', 'sin_plantilla'); end if;
  begin
    perform public.validar_plantilla(v_pla.definicion, fo.definicion, fo.diseno, fo.visibilidad, null);
    if v_pla.definicion ? 'forma' then
      v_p := v_pla.definicion;
    else
      v_p := public._plantilla_convertir(v_pla.definicion, fo.definicion, fo.diseno, fo.visibilidad, array(select t.clave from public.tonos t));
      perform public._plantilla_cuadricula_forma(v_p, false);
      perform public._plantilla_cuadricula_nodos(v_p, fo.definicion, fo.diseno, fo.visibilidad, null);
    end if;
  exception when sqlstate '22023' then
    return jsonb_build_object('estado', 'sin_plantilla');
  end;

  v_celdas := v_p -> 'celdas';
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g) from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g), '{}'::jsonb);
  select n ->> 'id' into v_total from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'salida' = 'total' limit 1;
  select n into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;

  -- Lo que la cuadrícula muestra de un nodo ({nodo, mostrar}: en una celda, su lista de respaldo, sus ramas y el dato de una condición, `_plantilla_cuadricula_datos()`) y
  -- el `pct` del par de cada porcentaje: el suyo si es el `porcentaje_de`, él mismo si es el `pct`.
  v_datos := coalesce((select jsonb_agg(jsonb_build_object('nodo', d.nodo, 'mostrar', d.mostrar))
                         from public._plantilla_cuadricula_datos(v_p) d where d.nodo is not null and d.mostrar is not null), '[]'::jsonb);
  v_pcts := coalesce((select jsonb_object_agg(d ->> 'nodo',
                                              case when v_nodos -> (d ->> 'nodo') ->> 'tipo' = 'calculo' and v_nodos -> (d ->> 'nodo') ->> 'op' = 'porcentaje_de'
                                                        and v_nodos -> (d ->> 'nodo') ->> 'pct' is not null
                                                   then v_nodos -> (d ->> 'nodo') ->> 'pct' else d ->> 'nodo' end)
                        from jsonb_array_elements(v_datos) d where d ->> 'mostrar' = 'porcentaje'), '{}'::jsonb);
  -- Los nodos que nombra la cuadrícula (el de cada fila, los de cada dato y los de cada condición) y el `pct` de cada porcentaje.
  v_ids := array(select distinct x from (select d.nodo as x from public._plantilla_cuadricula_datos(v_p) d
                                         union all select value #>> '{}' from jsonb_each(v_pcts)) t where x is not null);
  v_de_grupo := array(select distinct v_nodos -> (d ->> 'nodo') ->> 'grupo' from jsonb_array_elements(v_datos) d
                       where d ->> 'mostrar' in ('tc_nombre', 'tc_valor', 'plazo') and v_nodos -> (d ->> 'nodo') ->> 'grupo' is not null);
  v_buckets := array(select distinct v_grupos -> (v_nodos -> (d ->> 'nodo') ->> 'grupo') ->> 'bucket' from jsonb_array_elements(v_datos) d
                      where d ->> 'mostrar' in ('tc_nombre', 'tc_valor') and v_grupos -> (v_nodos -> (d ->> 'nodo') ->> 'grupo') ->> 'bucket' is not null);
  v_variables := array(select distinct d.variable from public._plantilla_cuadricula_datos(v_p) d where d.variable is not null);
  -- El nombre de cada tipo de cambio por su nodo: el de `tipos_cambio` activo con la clave del nodo (nulo si no hay uno activo), nunca la clave ni el id.
  v_tc := coalesce((select jsonb_object_agg(n ->> 'id', t.nombre) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                      left join public.tipos_cambio t on t.activo and t.clave = n ->> 'clave' where n ->> 'tipo' = 'tipo_cambio'), '{}'::jsonb);

  return jsonb_build_object(
    'estado', 'lista',
    'plantilla', jsonb_build_object('version', v_pla.version),
    'definicion', v_p,
    'nodos', coalesce((select jsonb_agg(jsonb_build_object('id', x, 'etiqueta', v_nodos -> x ->> 'etiqueta', 'descripcion', v_nodos -> x ->> 'descripcion',
                                                           'grupo', v_nodos -> x ->> 'grupo', 'pct', v_pcts ->> x) order by x collate "C")
                         from unnest(v_ids) x), '[]'::jsonb),
    'grupos', coalesce((select jsonb_agg(jsonb_build_object('id', g, 'etiqueta', v_grupos -> g ->> 'etiqueta',
                                                            'plazo', case when jsonb_typeof(v_grupos -> g -> 'plazo') = 'string' then v_grupos -> g -> 'plazo' end,
                                                            -- El bucket sólo si una celda `tc_*` lo nombra (y la plantilla validó su tipo de cambio): un grupo de un `plazo` no lo lleva.
                                                            'bucket', case when v_grupos -> g ->> 'bucket' = any (v_buckets) then v_grupos -> g ->> 'bucket' end)
                                            order by g collate "C")
                          from unnest(v_de_grupo) g), '[]'::jsonb),
    'tipos_de_cambio', jsonb_build_object(
      'buckets', coalesce((select jsonb_object_agg(b, jsonb_build_object('nombre', v_tc ->> (fo.definicion -> 'buckets' ->> b), 'nodo', fo.definicion -> 'buckets' ->> b))
                             from unnest(v_buckets) b), '{}'::jsonb),
      'modos', coalesce((select jsonb_object_agg(md ->> 'clave',
                                  coalesce((select jsonb_object_agg(mb ->> 'bucket', jsonb_build_object('nombre', v_tc ->> (mb ->> 'nodo'), 'nodo', mb ->> 'nodo'))
                                              from jsonb_array_elements(coalesce(md -> 'buckets', '[]'::jsonb)) mb where mb ->> 'bucket' = any (v_buckets)), '{}'::jsonb))
                           from jsonb_array_elements(coalesce(fo.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) md
                          where exists (select 1 from jsonb_array_elements(coalesce(md -> 'buckets', '[]'::jsonb)) mb where mb ->> 'bucket' = any (v_buckets))), '{}'::jsonb)),
    'modos', case when 'modo_tc' = any (v_variables)
                  then coalesce((select jsonb_agg(jsonb_build_object('clave', md ->> 'clave', 'nombre', md ->> 'nombre') order by o)
                                   from jsonb_array_elements(coalesce(fo.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) with ordinality t (md, o)), '[]'::jsonb)
                  else '[]'::jsonb end,
    'variante', case when 'titulo_opcion' = any (v_variables) and (fo.visibilidad -> (v_opcion ->> 'id') ->> 'ver') = 'todos'
                     then jsonb_build_object('nodo', v_opcion ->> 'id', 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', x.v ->> 'clave', 'titulo', x.v ->> 'titulo') order by x.o)
                                                                                               from jsonb_array_elements(v_opcion -> 'opciones') with ordinality x (v, o)), '[]'::jsonb)) end,
    'colores', coalesce((select jsonb_agg(jsonb_build_object('clave', t.clave, 'hex', t.hex) order by t.clave collate "C")
                           from public.tonos t
                          where exists (select 1 from jsonb_array_elements(v_celdas) c where c -> 'estilo' ->> 'fondo' = t.clave or c -> 'estilo' ->> 'texto' = t.clave)), '[]'::jsonb),
    'total', jsonb_build_object('nodo', v_total),
    -- La moneda del total en Bs: la `moneda_a` del tipo de cambio activo que nombra el `total_en` de esta versión (la regla de la hoja).
    'moneda_bs', (select to_jsonb(t.moneda_a::text) from public.tipos_cambio t where t.activo and t.clave = (v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave'));
end;
$$;
