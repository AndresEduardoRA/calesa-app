-- Los datos del asesor de la tarjeta (quien la mira o la comparte): la forma 2 admite el contenido `foto_del_asesor` (como `logo` y `vacio`, sólo la clave
-- `tipo`) y las variables `asesor_telefono` y `asesor_cargo` (espejo de VARIABLES_DE_LA_TARJETA y TIPOS en entities/). Lo demás es la definición vigente.
CREATE OR REPLACE FUNCTION "public"."_plantilla_cuadricula_forma"("p_plantilla" "jsonb", "p_con_tope" boolean) RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
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

    -- El contenido: texto (0 a 300 caracteres, sin `{{`), dato (una variable o un nodo con qué mostrar), logo, foto del asesor o vacío.
    v_x := v_c -> 'contenido';
    v_dc := v_d || '.contenido';
    if jsonb_typeof(v_x) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
    v_t := case when jsonb_typeof(v_x -> 'tipo') = 'string' then v_x ->> 'tipo' end;
    if v_t is null or v_t not in ('texto', 'dato', 'logo', 'vacio', 'foto_del_asesor') then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.tipo'); end if;
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
     and (c -> 'contenido' ->> 'variable') not in ('empresa_nombre', 'fecha_larga', 'numero', 'titulo', 'titulo_opcion', 'asesor_nombre', 'asesor_iniciales', 'cliente_nombre',
                                                   'vehiculo_titulo', 'vehiculo_lote', 'vehiculo_vin', 'vence_el', 'modo_tc', 'asesor_telefono', 'asesor_cargo')
   order by o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('variable_inexistente', 'celdas.' || v_k); end if;
end;
$$;

revoke all on function public._plantilla_cuadricula_forma(jsonb, boolean) from public;
grant all on function public._plantilla_cuadricula_forma(jsonb, boolean) to authenticated, service_role;

comment on function public._plantilla_cuadricula_forma(jsonb, boolean) is 'Interna: la forma 2 de la plantilla de la tarjeta (la cuadrícula) y las reglas de la grilla, espejo de entities/plantilla/forma-de-cuadricula.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
