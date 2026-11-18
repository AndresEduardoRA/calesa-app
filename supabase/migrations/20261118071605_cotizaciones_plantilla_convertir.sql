-- La plantilla de hoy (forma 1) convertida a la cuadrícula (forma 2) al leerla, con la misma apariencia: espejo de `convertirPlantilla()`
-- (`entities/plantilla/convertir-plantilla.ts` y `armado-de-la-conversion.ts`), con el juego `entities/plantilla/casos-de-conversion.json`. Las plantillas
-- guardadas no se migran. Pura: no lee tablas. La llama sólo `cotizacion_tarjeta` (definer): las funciones son de service_role. docs/COTIZADOR.md ›
-- «Plantilla de tarjeta (PDF)».

-- Los ids de la conversión (D4): el texto si cabe en 41 caracteres; si no, sus primeros 32, `_` y el FNV-1a de 32 bits del texto (8 cifras hexadecimales).
-- Los ids sólo llevan ASCII; el producto entra en `bigint` (h < 2³², × 16777619 < 2⁵⁷).
create or replace function public._plantilla_id_derivado(p_texto text) returns text
language plpgsql immutable set search_path = '' as $$
declare h bigint := 2166136261;
begin
  if char_length(p_texto) <= 41 then return p_texto; end if;
  for i in 1 .. char_length(p_texto) loop
    h := h # ascii(substr(p_texto, i, 1));
    h := (h * 16777619) % 4294967296;
  end loop;
  return left(p_texto, 32) || '_' || lpad(to_hex(h), 8, '0');
end;
$$;
comment on function public._plantilla_id_derivado(text) is
  'Interna: un id derivado de la conversión de la plantilla de la tarjeta, espejo de idDerivado() (entities/plantilla/ids-de-la-conversion.ts). docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
revoke all on function public._plantilla_id_derivado(text) from public, anon, authenticated;
grant execute on function public._plantilla_id_derivado(text) to service_role;

-- El alto de un texto en una celda (D11), con aritmética entera como TS: `cpl = max(1, (ancho − 8) × 10 / (tamaño × 6))`, cada línea del texto al menos un
-- renglón (`⌈cp/cpl⌉`), y `renglones × ((tamaño × 14 + 9) / 10) + 8`. Con `p_renglones`, esos renglones sin mirar el texto.
create or replace function public._plantilla_alto_de_texto(p_texto text, p_ancho int, p_tamano int, p_renglones int) returns int
language sql immutable set search_path = '' as $$
  select coalesce(p_renglones,
                  (select sum(greatest(1, (char_length(l) + c.cpl - 1) / c.cpl))::int
                     from (select greatest(1, ((p_ancho - 8) * 10) / (p_tamano * 6)) as cpl) c,
                          regexp_split_to_table(p_texto, E'\n') l))
         * ((p_tamano * 14 + 9) / 10) + 8
$$;
comment on function public._plantilla_alto_de_texto(text, int, int, int) is
  'Interna: el alto estimado de un texto en una celda de la conversión de la plantilla de la tarjeta, espejo de altos-de-la-conversion.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
revoke all on function public._plantilla_alto_de_texto(text, int, int, int) from public, anon, authenticated;
grant execute on function public._plantilla_alto_de_texto(text, int, int, int) to service_role;

-- Una celda por armar (una «pieza» de `armado-de-la-conversion.ts`): desde qué columna y hasta cuál, cuántas filas abarca, qué muestra, su estilo y el texto con
-- que se mide su alto (o sus renglones). Lo nulo no va.
create or replace function public._plantilla_pieza(p_columna text, p_hasta text, p_filas int, p_contenido jsonb, p_estilo jsonb, p_medida text, p_renglones int)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object('columna', p_columna, 'hasta', p_hasta, 'filas', p_filas, 'contenido', p_contenido, 'estilo', p_estilo,
                                              'medida', p_medida, 'renglones', p_renglones))
$$;
comment on function public._plantilla_pieza(text, text, int, jsonb, jsonb, text, int) is
  'Interna: una celda por armar de la conversión de la plantilla de la tarjeta. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
revoke all on function public._plantilla_pieza(text, text, int, jsonb, jsonb, text, int) from public, anon, authenticated;
grant execute on function public._plantilla_pieza(text, text, int, jsonb, jsonb, text, int) to service_role;

-- La fila con sus celdas en orden de columna, sumada a lo armado (`{filas, celdas}`): ids derivados, combinaciones sólo si abarcan más de una, y el alto, el mayor
-- de sus celdas de una fila entre 16 y 240. Con `p_nodo`, la fila se oculta si su nodo no aplica.
create or replace function public._plantilla_conversion_fila(p_armado jsonb, p_cols jsonb, p_id text, p_piezas jsonb, p_nodo text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_p jsonb; v_desde int; v_hasta int; v_filas int; v_tam int; v_ancho int; v_altos int[] := array[]::int[]; v_celdas jsonb := '[]'::jsonb; v_celda jsonb; v_alto int;
  v_ids text[];
begin
  v_ids := array(select c ->> 'id' from jsonb_array_elements(p_cols) with ordinality t (c, o) order by o);
  for v_p in select p from jsonb_array_elements(p_piezas) with ordinality t (p, o) order by o loop
    v_desde := array_position(v_ids, v_p ->> 'columna') - 1;
    v_hasta := coalesce(array_position(v_ids, v_p ->> 'hasta') - 1, v_desde);
    v_filas := coalesce((v_p ->> 'filas')::int, 1);
    v_tam := coalesce((v_p -> 'estilo' ->> 'tamano')::int, 12);
    if v_filas = 1 then
      v_ancho := (select sum((c ->> 'ancho')::int) from jsonb_array_elements(p_cols) with ordinality t (c, o) where o - 1 between v_desde and v_hasta);
      v_altos := v_altos || public._plantilla_alto_de_texto(coalesce(v_p ->> 'medida', ''), v_ancho, v_tam, (v_p ->> 'renglones')::int);
    end if;
    v_celda := jsonb_build_object('id', case when v_p -> 'contenido' ->> 'tipo' = 'logo' then 'c_logo'
                                             else public._plantilla_id_derivado('c_' || p_id || '_' || (v_p ->> 'columna')) end,
                                  'fila', p_id, 'columna', v_p ->> 'columna', 'contenido', v_p -> 'contenido');
    if v_hasta > v_desde then v_celda := v_celda || jsonb_build_object('abarca_columnas', v_hasta - v_desde + 1); end if;
    if v_filas > 1 then v_celda := v_celda || jsonb_build_object('abarca_filas', v_filas); end if;
    if v_p ? 'estilo' then v_celda := v_celda || jsonb_build_object('estilo', v_p -> 'estilo'); end if;
    v_celdas := v_celdas || jsonb_build_array(v_celda);
  end loop;
  v_alto := least(240, greatest(16, coalesce((select max(x) from unnest(v_altos) x), 16)));
  return jsonb_build_object(
    'filas', (p_armado -> 'filas') || jsonb_build_array(case when p_nodo is null then jsonb_build_object('id', p_id, 'alto', v_alto, 'ocultar_si', 'nunca')
                                                             else jsonb_build_object('id', p_id, 'alto', v_alto, 'ocultar_si', 'no_aplica', 'nodo', p_nodo) end),
    'celdas', (p_armado -> 'celdas') || v_celdas);
end;
$$;
comment on function public._plantilla_conversion_fila(jsonb, jsonb, text, jsonb, text) is
  'Interna: suma una fila con sus celdas a la conversión de la plantilla de la tarjeta, espejo de Armado.fila() (armado-de-la-conversion.ts). docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
revoke all on function public._plantilla_conversion_fila(jsonb, jsonb, text, jsonb, text) from public, anon, authenticated;
grant execute on function public._plantilla_conversion_fila(jsonb, jsonb, text, jsonb, text) to service_role;

-- La conversión. Columnas (sólo las que van): grupo (100, si algún grupo tiene miembros), concepto (190), monto (110), leyenda (170), tipo de cambio y plazo
-- (90, con la columna del grupo). Filas: el logo arriba con 2 columnas; el título de la opción (si la variante es del nivel «todos»), la fecha, el número y el
-- asesor, con el logo al costado desde 3 columnas; el vehículo; los rótulos de tipo de cambio y plazo; una fila por miembro de cada grupo (el título del grupo,
-- el tipo de cambio y el plazo abarcan las filas del grupo) con su color; el total en dos renglones con su leyenda; lo aparte; la nota.
create or replace function public._plantilla_convertir(p_plantilla jsonb, p_def jsonb, p_diseno jsonb, p_visibilidad jsonb, p_tonos text[]) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_nodos jsonb; v_grupos jsonb; v_cols jsonb; v_ids text[]; v_n int; v_con_grupo boolean; v_logo boolean; v_costado boolean;
  v_primera text; v_segunda text; v_ultima text; v_fin text; v_a jsonb := '{"filas": [], "celdas": []}'::jsonb;
  v_enc jsonb; v_piezas jsonb; v_opcion text; v_lat text[]; v_x text; v_rot text; v_g jsonb; v_dg jsonb; v_miembros jsonb; v_m jsonb; v_k int;
  v_fondo text; v_titulo text; v_et text; v_ley text; v_total text; v_desde text; v_s text; v_nota text;
  v_fino constant jsonb := '{"todos": "fino"}'::jsonb;
begin
  v_nodos := coalesce(p_def -> 'nodos', '[]'::jsonb);
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g) from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) g), '{}'::jsonb);
  v_con_grupo := exists (select 1 from jsonb_array_elements(p_plantilla -> 'grupos') g
                          where exists (select 1 from jsonb_array_elements(v_nodos) n where n ->> 'grupo' = g ->> 'grupo'));
  v_cols := (select jsonb_agg(jsonb_build_object('id', c.id, 'ancho', c.ancho) order by c.o)
               from (values (1, 'grupo', 100, v_con_grupo), (2, 'concepto', 190, true), (3, 'monto', 110, true),
                            (4, 'leyenda', 170, (p_plantilla -> 'columnas' ->> 'leyenda')::boolean),
                            (5, 'tipo_cambio', 90, (p_plantilla -> 'columnas' ->> 'tipo_cambio')::boolean and v_con_grupo),
                            (6, 'plazo', 90, (p_plantilla -> 'columnas' ->> 'plazo')::boolean and v_con_grupo)) c (o, id, ancho, va)
              where c.va);
  v_ids := array(select c ->> 'id' from jsonb_array_elements(v_cols) with ordinality t (c, o) order by o);
  v_n := cardinality(v_ids);
  v_logo := (p_plantilla ->> 'logo')::boolean;
  v_costado := v_logo and v_n >= 3;
  v_primera := v_ids[1];
  v_segunda := v_ids[2];
  v_ultima := v_ids[v_n];
  v_fin := case when v_costado then v_ids[v_n - 1] else v_ultima end;

  -- El encabezado.
  if v_logo and not v_costado then
    v_a := public._plantilla_conversion_fila(v_a, v_cols, 'logo', jsonb_build_array(public._plantilla_pieza(v_primera, v_ultima, null, '{"tipo": "logo"}', null, null, 2)), null);
  end if;
  select n ->> 'id' into v_opcion from jsonb_array_elements(v_nodos) with ordinality t (n, o) where n ->> 'tipo' = 'opcion' order by o limit 1;
  v_enc := case when v_opcion is not null and coalesce(p_visibilidad -> v_opcion ->> 'ver', '') = 'todos'
                then jsonb_build_array(jsonb_build_array('titulo', jsonb_build_array(
                       public._plantilla_pieza(v_primera, v_fin, null, '{"tipo": "dato", "variable": "titulo_opcion"}', '{"tamano": 18, "negrita": true}', null, null))))
                else '[]'::jsonb end
        || jsonb_build_array(
             jsonb_build_array('fecha', jsonb_build_array(public._plantilla_pieza(v_primera, v_fin, null, '{"tipo": "dato", "variable": "fecha_larga"}', null, null, null))),
             jsonb_build_array('numero', jsonb_build_array(
               public._plantilla_pieza(v_primera, null, null, '{"tipo": "texto", "texto": "Cotización n.º"}', null, 'Cotización n.º', null),
               public._plantilla_pieza(v_segunda, v_fin, null, '{"tipo": "dato", "variable": "numero"}', null, null, null))),
             jsonb_build_array('asesor', jsonb_build_array(
               public._plantilla_pieza(v_primera, null, null, '{"tipo": "texto", "texto": "Asesor:"}', null, 'Asesor:', null),
               public._plantilla_pieza(v_segunda, v_fin, null, '{"tipo": "dato", "variable": "asesor_nombre"}', null, null, null))));
  for i in 0 .. jsonb_array_length(v_enc) - 1 loop
    v_piezas := v_enc -> i -> 1;
    if v_costado and i = 0 then
      v_piezas := v_piezas || jsonb_build_array(public._plantilla_pieza(v_ultima, null, jsonb_array_length(v_enc), '{"tipo": "logo"}', null, null, null));
    end if;
    v_a := public._plantilla_conversion_fila(v_a, v_cols, v_enc -> i ->> 0, v_piezas, null);
  end loop;
  v_a := public._plantilla_conversion_fila(v_a, v_cols, 'vehiculo', jsonb_build_array(
           public._plantilla_pieza(v_primera, v_ultima, null, '{"tipo": "dato", "variable": "vehiculo_titulo"}', '{"tamano": 14, "negrita": true}', null, null)), null);

  -- Los rótulos «Tipo de cambio» y «Plazo», una vez; lo de antes, vacío.
  v_lat := array(select x from unnest(array['tipo_cambio', 'plazo']) with ordinality t (x, o) where x = any (v_ids) order by o);
  if cardinality(v_lat) > 0 then
    v_piezas := jsonb_build_array(public._plantilla_pieza(v_primera, v_ids[array_position(v_ids, v_lat[1]) - 1], null, '{"tipo": "vacio"}', null, null, null));
    foreach v_x in array v_lat loop
      v_rot := case when v_x = 'tipo_cambio' then 'Tipo de cambio' else 'Plazo' end;
      v_piezas := v_piezas || public._plantilla_pieza(v_x, null, null, jsonb_build_object('tipo', 'texto', 'texto', v_rot),
                                                      jsonb_build_object('tamano', 11, 'negrita', true, 'alinear', 'centro', 'bordes', v_fino), v_rot, null);
    end loop;
    v_a := public._plantilla_conversion_fila(v_a, v_cols, 'cabecera', v_piezas, null);
  end if;

  -- Cada grupo con miembros, en el orden de la plantilla; sus miembros en el de la fórmula. El color (D10): el elegido si sigue en el catálogo; si no, el del
  -- grupo; si no, ninguno.
  for v_g in select g from jsonb_array_elements(p_plantilla -> 'grupos') with ordinality t (g, o) order by o loop
    v_miembros := (select jsonb_agg(n order by o) from jsonb_array_elements(v_nodos) with ordinality t (n, o) where n ->> 'grupo' = v_g ->> 'grupo');
    continue when v_miembros is null;
    v_dg := v_grupos -> (v_g ->> 'grupo');
    v_fondo := case when v_g ? 'tono' and (v_g ->> 'tono') = any (p_tonos) then v_g ->> 'tono'
                    when (v_dg ->> 'tono') = any (p_tonos) then v_dg ->> 'tono' end;
    v_titulo := coalesce(nullif(v_dg ->> 'etiqueta', ''), v_g ->> 'grupo');
    v_k := jsonb_array_length(v_miembros);
    for i in 0 .. v_k - 1 loop
      v_m := v_miembros -> i;
      v_piezas := '[]'::jsonb;
      if i = 0 then
        v_piezas := jsonb_build_array(public._plantilla_pieza('grupo', null, v_k, jsonb_build_object('tipo', 'texto', 'texto', v_titulo),
          case when v_fondo is null then '{}'::jsonb else jsonb_build_object('fondo', v_fondo) end
            || jsonb_build_object('negrita', true, 'alinear_vertical', 'arriba', 'bordes', v_fino), v_titulo, null));
      end if;
      v_et := case when coalesce(p_plantilla -> 'etiquetas' ? (v_m ->> 'id'), false) then p_plantilla -> 'etiquetas' ->> (v_m ->> 'id') end;
      v_piezas := v_piezas
        || case when v_et is not null and btrim(v_et) <> ''
                then public._plantilla_pieza('concepto', null, null, jsonb_build_object('tipo', 'texto', 'texto', v_et),
                       case when v_fondo is null then '{}'::jsonb else jsonb_build_object('fondo', v_fondo) end || jsonb_build_object('bordes', v_fino), v_et, null)
                else public._plantilla_pieza('concepto', null, null, jsonb_build_object('tipo', 'dato', 'nodo', v_m ->> 'id', 'mostrar', 'etiqueta'),
                       case when v_fondo is null then '{}'::jsonb else jsonb_build_object('fondo', v_fondo) end || jsonb_build_object('bordes', v_fino),
                       coalesce(v_m ->> 'etiqueta', ''), null) end
        || public._plantilla_pieza('monto', null, null, jsonb_build_object('tipo', 'dato', 'nodo', v_m ->> 'id', 'mostrar', 'monto'),
             case when v_fondo is null then '{}'::jsonb else jsonb_build_object('fondo', v_fondo) end
               || jsonb_build_object('negrita', true, 'alinear', 'derecha', 'bordes', v_fino), null, null);
      if 'leyenda' = any (v_ids) then
        v_piezas := v_piezas
          || case when not coalesce(p_plantilla -> 'leyendas' ? (v_m ->> 'id'), false)
                  then public._plantilla_pieza('leyenda', null, null, jsonb_build_object('tipo', 'dato', 'nodo', v_m ->> 'id', 'mostrar', 'descripcion'),
                         case when v_fondo is null then '{}'::jsonb else jsonb_build_object('fondo', v_fondo) end || jsonb_build_object('tamano', 11, 'bordes', v_fino),
                         coalesce(v_m ->> 'descripcion', ''), null)
                  when p_plantilla -> 'leyendas' ->> (v_m ->> 'id') = ''
                  then public._plantilla_pieza('leyenda', null, null, '{"tipo": "vacio"}',
                         case when v_fondo is null then '{}'::jsonb else jsonb_build_object('fondo', v_fondo) end || jsonb_build_object('tamano', 11, 'bordes', v_fino), null, null)
                  else public._plantilla_pieza('leyenda', null, null, jsonb_build_object('tipo', 'texto', 'texto', p_plantilla -> 'leyendas' ->> (v_m ->> 'id')),
                         case when v_fondo is null then '{}'::jsonb else jsonb_build_object('fondo', v_fondo) end || jsonb_build_object('tamano', 11, 'bordes', v_fino),
                         p_plantilla -> 'leyendas' ->> (v_m ->> 'id'), null) end;
      end if;
      if i = 0 and 'tipo_cambio' = any (v_ids) then
        v_piezas := v_piezas || public._plantilla_pieza('tipo_cambio', null, v_k, jsonb_build_object('tipo', 'dato', 'nodo', v_m ->> 'id', 'mostrar', 'tc_nombre'),
          case when v_fondo is null then '{}'::jsonb else jsonb_build_object('fondo', v_fondo) end || jsonb_build_object('alinear', 'centro', 'bordes', v_fino), null, null);
      end if;
      if i = 0 and 'plazo' = any (v_ids) then
        v_piezas := v_piezas || public._plantilla_pieza('plazo', null, v_k, jsonb_build_object('tipo', 'dato', 'nodo', v_m ->> 'id', 'mostrar', 'plazo'),
          case when v_fondo is null then '{}'::jsonb else jsonb_build_object('fondo', v_fondo) end || jsonb_build_object('alinear', 'centro', 'bordes', v_fino), null, null);
      end if;
      v_a := public._plantilla_conversion_fila(v_a, v_cols, public._plantilla_id_derivado('n_' || (v_m ->> 'id')), v_piezas, v_m ->> 'id');
    end loop;
  end loop;

  -- El total en dos renglones (D6) con su leyenda en su columna o, sin ella, en una fila aparte.
  select n ->> 'id' into v_total from jsonb_array_elements(v_nodos) with ordinality t (n, o) where n ->> 'salida' = 'total' order by o limit 1;
  v_desde := case when 'grupo' = any (v_ids) then 'grupo' else 'concepto' end;
  v_et := p_plantilla -> 'total' ->> 'etiqueta';
  v_ley := coalesce(p_plantilla -> 'total' ->> 'leyenda', '');
  v_piezas := jsonb_build_array(
    public._plantilla_pieza(v_desde, 'concepto', null, jsonb_build_object('tipo', 'texto', 'texto', v_et), jsonb_build_object('tamano', 16, 'negrita', true, 'bordes', v_fino), v_et, null),
    public._plantilla_pieza('monto', null, null, case when v_total is null then '{"tipo": "vacio"}'::jsonb else jsonb_build_object('tipo', 'dato', 'nodo', v_total, 'mostrar', 'monto') end,
                            jsonb_build_object('tamano', 16, 'negrita', true, 'alinear', 'derecha', 'bordes', v_fino), null, 2));
  if 'leyenda' = any (v_ids) then
    v_piezas := v_piezas
      || case when btrim(v_ley) <> ''
              then public._plantilla_pieza('leyenda', null, null, jsonb_build_object('tipo', 'texto', 'texto', v_ley), jsonb_build_object('tamano', 11, 'bordes', v_fino), v_ley, null)
              else public._plantilla_pieza('leyenda', null, null, '{"tipo": "vacio"}', jsonb_build_object('tamano', 11, 'bordes', v_fino), null, null) end;
  end if;
  v_a := public._plantilla_conversion_fila(v_a, v_cols, 'total', v_piezas, null);
  if not ('leyenda' = any (v_ids)) and btrim(v_ley) <> '' then
    v_a := public._plantilla_conversion_fila(v_a, v_cols, 'total_leyenda', jsonb_build_array(
             public._plantilla_pieza(v_primera, v_ultima, null, jsonb_build_object('tipo', 'texto', 'texto', v_ley), '{"tamano": 11}', v_ley, null)), null);
  end if;

  -- Lo aparte (se oculta si no aplica) y la nota.
  for v_s in select s from jsonb_array_elements_text(coalesce(p_diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality t (s, o) order by o loop
    v_et := case when coalesce(p_plantilla -> 'etiquetas' ? v_s, false) then p_plantilla -> 'etiquetas' ->> v_s end;
    v_piezas := jsonb_build_array(
      case when v_et is not null and btrim(v_et) <> ''
           then public._plantilla_pieza(v_desde, 'concepto', null, jsonb_build_object('tipo', 'texto', 'texto', v_et), jsonb_build_object('bordes', v_fino), v_et, null)
           else public._plantilla_pieza(v_desde, 'concepto', null, jsonb_build_object('tipo', 'dato', 'nodo', v_s, 'mostrar', 'etiqueta'), jsonb_build_object('bordes', v_fino),
                  coalesce((select n ->> 'etiqueta' from jsonb_array_elements(v_nodos) with ordinality t (n, o) where n ->> 'id' = v_s order by o limit 1), ''), null) end,
      public._plantilla_pieza('monto', null, null, jsonb_build_object('tipo', 'dato', 'nodo', v_s, 'mostrar', 'monto'), jsonb_build_object('alinear', 'derecha', 'bordes', v_fino), null, null));
    v_a := public._plantilla_conversion_fila(v_a, v_cols, public._plantilla_id_derivado('a_' || v_s), v_piezas, v_s);
  end loop;
  v_nota := coalesce(p_plantilla ->> 'nota', '');
  if btrim(v_nota) <> '' then
    v_a := public._plantilla_conversion_fila(v_a, v_cols, 'nota', jsonb_build_array(
             public._plantilla_pieza(v_primera, v_ultima, null, jsonb_build_object('tipo', 'texto', 'texto', v_nota), '{"tamano": 11, "cursiva": true}', v_nota, null)), null);
  end if;

  return jsonb_build_object('forma', 2, 'columnas', v_cols, 'filas', v_a -> 'filas', 'celdas', v_a -> 'celdas');
end;
$$;
comment on function public._plantilla_convertir(jsonb, jsonb, jsonb, jsonb, text[]) is
  'Interna: la plantilla de la tarjeta de hoy (forma 1) convertida a la cuadrícula (forma 2) al leerla, espejo de convertirPlantilla() (entities/plantilla/convertir-plantilla.ts). docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';
revoke all on function public._plantilla_convertir(jsonb, jsonb, jsonb, jsonb, text[]) from public, anon, authenticated;
grant execute on function public._plantilla_convertir(jsonb, jsonb, jsonb, jsonb, text[]) to service_role;
