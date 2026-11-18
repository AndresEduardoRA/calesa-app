-- La plantilla de la tarjeta como cuadrícula (la forma 2 de `plantillas_tarjeta.definicion`, marcada con `"forma": 2`): `validar_plantilla()` acepta las dos
-- formas. Sin la clave `forma` en la raíz es la forma 1 de siempre, sin ningún cambio. Espejo en TS: `entities/plantilla/forma-de-cuadricula.ts`,
-- `celdas-de-cuadricula.ts`, `reglas-de-la-grilla.ts` y `nodos-de-cuadricula.ts`, con el juego `casos-de-plantilla.json`. docs/COTIZADOR.md › «Plantilla de
-- tarjeta (PDF)». `plantilla_guardar_borrador` y `plantilla_publicar` no cambian: ya llaman a `validar_plantilla()`.

-- Un id con la forma de la base (`^[a-z][a-z0-9_]{0,40}$`), leído de un jsonb: un texto, nunca un número ni un nulo.
create or replace function public._plantilla_es_id(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(p) = 'string' and (p #>> '{}') ~ '^[a-z][a-z0-9_]{0,40}$', false)
$$;
comment on function public._plantilla_es_id(jsonb) is
  'Interna: un id con la forma de la base dentro de un jsonb (la forma 2 de la plantilla de la tarjeta). docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
revoke all on function public._plantilla_es_id(jsonb) from public, anon;
grant execute on function public._plantilla_es_id(jsonb) to authenticated, service_role;

-- Un número entero entre dos topes: `jsonb_typeof = 'number'` y `v::numeric = trunc(v::numeric)` (`24.0` es entero, como en TS). El `case` va antes del
-- cast: un `and` no corta y un texto no se puede leer como número.
create or replace function public._plantilla_entero_entre(p jsonb, p_minimo int, p_maximo int) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p) = 'number'
              then (p #>> '{}')::numeric = trunc((p #>> '{}')::numeric) and (p #>> '{}')::numeric between p_minimo and p_maximo
              else false end
$$;
comment on function public._plantilla_entero_entre(jsonb, int, int) is
  'Interna: un entero de un jsonb entre dos topes (la forma 2 de la plantilla de la tarjeta). docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
revoke all on function public._plantilla_entero_entre(jsonb, int, int) from public, anon;
grant execute on function public._plantilla_entero_entre(jsonb, int, int) to authenticated, service_role;

-- El rechazo de una regla de la forma 2 con el mensaje de `motivos-de-plantilla.ts`: el `donde` lleva prefijo (`columnas.<id>`, `filas.<id>`, `celdas.<id>`) y
-- el mensaje nombra la celda, la fila o la columna, nunca el nodo (así no expone un id restringido).
create or replace function public._plantilla_cuadricula_rechazar(p_regla text, p_donde text) returns void
language plpgsql stable set search_path = '' as $$
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
    when 'tono_inexistente' then v_l || ' usa un color que no está en el catálogo.'
    when 'nodo_de_fila_inexistente' then v_l || ' depende de un nodo que no es de la fórmula.'
    when 'nodo_inexistente' then v_l || ' nombra un nodo que no es de la fórmula.'
    when 'mostrar_no_admitido' then v_l || ' muestra algo que su nodo no tiene.'
    when 'nodo_restringido' then format('La tarjeta no puede mostrar lo que nombra %s: no es del nivel «todos».', v_lugar)
    when 'tipo_de_cambio_restringido' then format('La tarjeta no puede nombrar el tipo de cambio de %s: no es del nivel «todos».', v_lugar)
  end);
end;
$$;
comment on function public._plantilla_cuadricula_rechazar(text, text) is
  'Interna: el 22023 de una regla de la forma 2 de la plantilla de la tarjeta, con el mensaje de motivos-de-plantilla.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
revoke all on function public._plantilla_cuadricula_rechazar(text, text) from public, anon;
grant execute on function public._plantilla_cuadricula_rechazar(text, text) to authenticated, service_role;

-- La forma 2 y las reglas que no miran la fórmula, en este orden (el primer rechazo manda): `forma` (el objeto y, con tope, sus 24 KiB como texto del jsonb;
-- la clave de más en orden C; `forma` = 2; las columnas; las filas; las celdas con su contenido y su estilo), `demasiadas_columnas`, `demasiadas_filas`,
-- `demasiadas_celdas`, los repetidos (la segunda aparición), `ancho_total`, `celda_fuera_de_la_grilla`, `celdas_se_pisan` y `variable_inexistente`.
-- `p_con_tope` falso sólo para lo que sale de la conversión de la forma 1: no se guarda y ya lo acota la forma 1.
create or replace function public._plantilla_cuadricula_forma(p_plantilla jsonb, p_con_tope boolean) returns void
language plpgsql stable set search_path = '' as $$
declare
  v_cols jsonb; v_filas jsonb; v_celdas jsonb; v_c jsonb; v_x jsonb; v_e jsonb; v_b jsonb;
  v_k text; v_t text; v_d text; v_dc text; v_lado text;
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

  -- Las filas: al menos una, cada una {id, alto, ocultar_si, nodo?}; el nodo va salvo con `nunca`, y con `nunca` no va (aunque sea nulo: mira `?`).
  v_filas := p_plantilla -> 'filas';
  if jsonb_typeof(v_filas) is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', 'filas'); end if;
  if jsonb_array_length(v_filas) = 0 then perform public._plantilla_cuadricula_rechazar('forma', 'filas'); end if;
  for i in 0 .. jsonb_array_length(v_filas) - 1 loop
    v_c := v_filas -> i;
    v_d := format('filas[%s]', i);
    if jsonb_typeof(v_c) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if exists (select 1 from jsonb_object_keys(v_c) k where k not in ('id', 'alto', 'ocultar_si', 'nodo')) then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if not public._plantilla_es_id(v_c -> 'id') then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.id'); end if;
    if not public._plantilla_entero_entre(v_c -> 'alto', 16, 240) then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.alto'); end if;
    v_t := case when jsonb_typeof(v_c -> 'ocultar_si') = 'string' then v_c ->> 'ocultar_si' end;
    if v_t is null or v_t not in ('nunca', 'no_aplica', 'no_aplica_o_cero') then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.ocultar_si'); end if;
    if v_t = 'nunca' then
      if v_c ? 'nodo' then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.nodo'); end if;
    elsif not public._plantilla_es_id(v_c -> 'nodo') then
      perform public._plantilla_cuadricula_rechazar('forma', v_d || '.nodo');
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

    -- El contenido: texto (0 a 300 caracteres, sin `{{`), dato (una variable o un nodo con qué mostrar), logo o vacío.
    v_x := v_c -> 'contenido';
    v_dc := v_d || '.contenido';
    if jsonb_typeof(v_x) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
    v_t := case when jsonb_typeof(v_x -> 'tipo') = 'string' then v_x ->> 'tipo' end;
    if v_t is null or v_t not in ('texto', 'dato', 'logo', 'vacio') then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.tipo'); end if;
    if v_t = 'texto' then
      if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('tipo', 'texto')) then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
      if jsonb_typeof(v_x -> 'texto') is distinct from 'string' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.texto'); end if;
      if char_length(v_x ->> 'texto') > 300 or strpos(v_x ->> 'texto', '{{') > 0 then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.texto'); end if;
    elsif v_t = 'dato' then
      if v_x ? 'variable' then
        if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('tipo', 'variable')) then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
        if not public._plantilla_es_id(v_x -> 'variable') then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.variable'); end if;
      else
        if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('tipo', 'nodo', 'mostrar')) then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
        if not public._plantilla_es_id(v_x -> 'nodo') then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.nodo'); end if;
        v_t := case when jsonb_typeof(v_x -> 'mostrar') = 'string' then v_x ->> 'mostrar' end;
        if v_t is null or v_t not in ('monto', 'etiqueta', 'descripcion', 'porcentaje', 'tc_nombre', 'tc_valor', 'plazo') then
          perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.mostrar');
        end if;
      end if;
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

  select c ->> 'id' into v_k from jsonb_array_elements(v_celdas) with ordinality t (c, o)
   where c -> 'contenido' ->> 'tipo' = 'dato' and c -> 'contenido' ? 'variable'
     and (c -> 'contenido' ->> 'variable') not in ('fecha_larga', 'numero', 'titulo', 'titulo_opcion', 'asesor_nombre', 'asesor_iniciales', 'cliente_nombre',
                                                   'vehiculo_titulo', 'vehiculo_lote', 'vehiculo_vin', 'vence_el', 'modo_tc')
   order by o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('variable_inexistente', 'celdas.' || v_k); end if;
end;
$$;
comment on function public._plantilla_cuadricula_forma(jsonb, boolean) is
  'Interna: la forma 2 de la plantilla de la tarjeta (la cuadrícula) y las reglas de la grilla, espejo de entities/plantilla/forma-de-cuadricula.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
revoke all on function public._plantilla_cuadricula_forma(jsonb, boolean) from public, anon;
grant execute on function public._plantilla_cuadricula_forma(jsonb, boolean) to authenticated, service_role;

-- Lo que la forma 2 cruza con la versión, en este orden: `tono_inexistente` (sólo con el catálogo), `nodo_de_fila_inexistente`, `nodo_inexistente`,
-- `mostrar_no_admitido` (`porcentaje` de un nodo que no es de un par; `tc_*` o `plazo` de un nodo sin grupo o con un grupo que no está), `nodo_restringido`
-- (los nodos de las filas en orden, después los de las celdas en orden; de un `porcentaje`, también su `pct`; no figurar cuenta como restringido) y
-- `tipo_de_cambio_restringido` (por cada celda `tc_*` en orden, el nodo del bucket de su grupo por omisión y después el de cada modo).
create or replace function public._plantilla_cuadricula_nodos(p_plantilla jsonb, p_def jsonb, p_diseno jsonb, p_visibilidad jsonb, p_tonos text[]) returns void
language plpgsql stable set search_path = '' as $$
declare
  v_filas jsonb; v_celdas jsonb; v_nodos jsonb; v_grupos jsonb; v_pcts jsonb; v_vis jsonb; v_ton jsonb; v_k text;
begin
  v_filas := p_plantilla -> 'filas';
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

  select f ->> 'id' into v_k from jsonb_array_elements(v_filas) with ordinality t (f, o) where f ? 'nodo' and not v_nodos ? (f ->> 'nodo') order by o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('nodo_de_fila_inexistente', 'filas.' || v_k); end if;

  select c ->> 'id' into v_k from jsonb_array_elements(v_celdas) with ordinality t (c, o)
   where c -> 'contenido' ->> 'tipo' = 'dato' and c -> 'contenido' ? 'nodo' and not v_nodos ? (c -> 'contenido' ->> 'nodo') order by o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('nodo_inexistente', 'celdas.' || v_k); end if;

  -- El `pct` del par de un nodo: el suyo si es el `porcentaje_de`, él mismo si es el `pct` de uno; nulo si no es de un par.
  select c ->> 'id' into v_k from jsonb_array_elements(v_celdas) with ordinality t (c, o)
   cross join lateral (select v_nodos -> (c -> 'contenido' ->> 'nodo') as n, c -> 'contenido' ->> 'mostrar' as mostrar) d
   where c -> 'contenido' ->> 'tipo' = 'dato' and c -> 'contenido' ? 'nodo'
     and ((d.mostrar = 'porcentaje'
           and (case when d.n ->> 'tipo' = 'calculo' and d.n ->> 'op' = 'porcentaje_de' and d.n ->> 'pct' is not null then d.n ->> 'pct'
                     when v_pcts ? (d.n ->> 'id') then d.n ->> 'id' end) is null)
       or (d.mostrar in ('tc_nombre', 'tc_valor', 'plazo') and (d.n ->> 'grupo' is null or not v_grupos ? (d.n ->> 'grupo'))))
   order by o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('mostrar_no_admitido', 'celdas.' || v_k); end if;

  select 'filas.' || (f ->> 'id') into v_k from jsonb_array_elements(v_filas) with ordinality t (f, o)
   where f ? 'nodo' and coalesce(v_vis -> (f ->> 'nodo') ->> 'ver', '') <> 'todos' order by o limit 1;
  if v_k is null then
    select 'celdas.' || (c ->> 'id') into v_k from jsonb_array_elements(v_celdas) with ordinality t (c, o)
     cross join lateral (select v_nodos -> (c -> 'contenido' ->> 'nodo') as n, c -> 'contenido' ->> 'mostrar' as mostrar) d
     where c -> 'contenido' ->> 'tipo' = 'dato' and c -> 'contenido' ? 'nodo'
       and (coalesce(v_vis -> (d.n ->> 'id') ->> 'ver', '') <> 'todos'
         or (d.mostrar = 'porcentaje'
             and coalesce(v_vis -> (case when d.n ->> 'tipo' = 'calculo' and d.n ->> 'op' = 'porcentaje_de' then d.n ->> 'pct' else d.n ->> 'id' end) ->> 'ver', '') <> 'todos'))
     order by o limit 1;
  end if;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('nodo_restringido', v_k); end if;

  select c ->> 'id' into v_k from jsonb_array_elements(v_celdas) with ordinality t (c, o)
   cross join lateral (select v_grupos -> (v_nodos -> (c -> 'contenido' ->> 'nodo') ->> 'grupo') ->> 'bucket' as b) g
   where c -> 'contenido' ->> 'tipo' = 'dato' and c -> 'contenido' ->> 'mostrar' in ('tc_nombre', 'tc_valor') and g.b is not null
     and exists (select 1 from (select p_def -> 'buckets' ->> g.b as id
                                union all
                                select mb ->> 'nodo'
                                  from jsonb_array_elements(coalesce(p_diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m
                                 cross join lateral jsonb_array_elements(coalesce(m -> 'buckets', '[]'::jsonb)) mb
                                 where mb ->> 'bucket' = g.b) x
                  where x.id is not null and coalesce(v_vis -> x.id ->> 'ver', '') <> 'todos')
   order by o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('tipo_de_cambio_restringido', 'celdas.' || v_k); end if;
end;
$$;
comment on function public._plantilla_cuadricula_nodos(jsonb, jsonb, jsonb, jsonb, text[]) is
  'Interna: lo que la forma 2 de la plantilla de la tarjeta cruza con la versión y el catálogo, espejo de entities/plantilla/nodos-de-cuadricula.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
revoke all on function public._plantilla_cuadricula_nodos(jsonb, jsonb, jsonb, jsonb, text[]) from public, anon;
grant execute on function public._plantilla_cuadricula_nodos(jsonb, jsonb, jsonb, jsonb, text[]) to authenticated, service_role;

-- `validar_plantilla()` con las dos formas: con la clave `forma` en la raíz, la cuadrícula; sin ella, lo de siempre.
create or replace function public.validar_plantilla(p_plantilla jsonb, p_def jsonb, p_diseno jsonb, p_visibilidad jsonb, p_tonos text[]) returns void
language plpgsql stable set search_path = '' as $$
declare
  v_grupos jsonb; v_pla jsonb; v_ton jsonb; v_k text;
begin
  if jsonb_typeof(p_plantilla) = 'object' and p_plantilla ? 'forma' then
    perform public._plantilla_cuadricula_forma(p_plantilla, true);
    if p_def is not null then perform public._plantilla_cuadricula_nodos(p_plantilla, p_def, p_diseno, p_visibilidad, p_tonos); end if;
    return;
  end if;
  perform public._plantilla_forma(p_plantilla);
  if p_def is null then return; end if;
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', true) from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) g), '{}'::jsonb);
  v_pla := coalesce((select jsonb_object_agg(g ->> 'grupo', true) from jsonb_array_elements(p_plantilla -> 'grupos') g), '{}'::jsonb);

  select g ->> 'grupo' into v_k from jsonb_array_elements(p_plantilla -> 'grupos') with ordinality t (g, o) where not v_grupos ? (g ->> 'grupo') order by o limit 1;
  if v_k is not null then perform public._formula_rechazar('grupo_inexistente', v_k, format('El grupo «%s» no es de la fórmula.', v_k)); end if;
  select a.g ->> 'grupo' into v_k from jsonb_array_elements(p_plantilla -> 'grupos') with ordinality a (g, o)
   where exists (select 1 from jsonb_array_elements(p_plantilla -> 'grupos') with ordinality b (g, o) where b.o < a.o and b.g ->> 'grupo' = a.g ->> 'grupo')
   order by a.o limit 1;
  if v_k is not null then perform public._formula_rechazar('grupo_repetido', v_k, format('El grupo «%s» está dos veces.', v_k)); end if;
  select g ->> 'id' into v_k from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) with ordinality t (g, o) where not v_pla ? (g ->> 'id') order by o limit 1;
  if v_k is not null then perform public._formula_rechazar('grupo_faltante', v_k, format('Falta el grupo «%s»: la tarjeta lleva todos los grupos de la fórmula.', v_k)); end if;
  if p_tonos is not null then
    select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ton from unnest(p_tonos) x where x is not null;
    select g ->> 'grupo' into v_k from jsonb_array_elements(p_plantilla -> 'grupos') with ordinality t (g, o) where g ? 'tono' and not v_ton ? (g ->> 'tono') order by o limit 1;
    if v_k is not null then perform public._formula_rechazar('tono_inexistente', v_k, format('El grupo «%s» usa un tono que no está en el catálogo.', v_k)); end if;
  end if;

  perform public._plantilla_nodos(p_plantilla, p_def, p_diseno, p_visibilidad);
end;
$$;

-- `auto` es el color automático de la forma 2 (fondo blanco; texto negro o blanco): ninguna clave del catálogo puede ser `auto`. Un color «Auto» toma
-- `auto_2`, como si `auto` estuviera tomada.
create or replace function public._tono_clave(p_nombre text) returns text
language plpgsql stable set search_path = '' as $$
declare v text; v_base text; n int := 1;
begin
  v := btrim(regexp_replace(
         translate(lower(p_nombre), 'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun'),
         '[^a-z0-9]+', '_', 'g'), '_');
  if v !~ '^[a-z]' then
    v := 't_' || v;
  end if;
  v := rtrim(left(v, 30), '_');
  if char_length(v) < 2 then
    v := 'tono';
  end if;
  v_base := v;
  while v = 'auto' or exists (select 1 from public.tonos t where t.clave = v) loop
    n := n + 1;
    v := left(v_base, 30 - char_length(n::text) - 1) || '_' || n;
  end loop;
  return v;
end;
$$;
