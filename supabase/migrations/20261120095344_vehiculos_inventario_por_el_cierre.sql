-- El inventario se ordena también por el cierre más próximo (`p_orden = 'cierre'`, sólo en un origen de subasta): primero las subastas vivas con fecha, por su cierre
-- ascendente (tramo 0); después las vivas sin fecha (tramo 1) y las demás (tramo 2), de la más nueva a la más vieja por alta. Cada tramo es una rama con su índice
-- y su `order by … limit`; el cursor lleva el tramo (`p_cursor_tramo`). Y una condición nueva, `cierre_entre` («Cierra hoy», «en 48 h», «esta semana»): viva y con
-- el cierre en `[desde, hasta)`, que la página calcula con la zona de la empresa. Sólo lectura: corre como quien llama y la RLS decide.

-- El tramo 0 y las ventanas: las subastas vivas de un origen por su cierre. Deja fuera las «abiertas» viejas con el cierre pasado que nadie refrescó (su situación ya
-- no es `en_subasta`), que en `vehiculos_cierre_subasta_idx` (la agenda) van primero y crecen con la historia.
create index vehiculos_subasta_viva_cierre_idx on public.vehiculos using btree (origen_id, cierre_subasta_en, id)
  where eliminado_en is null and situacion = 'en_subasta' and cierre_subasta_en is not null;
comment on index public.vehiculos_subasta_viva_cierre_idx is 'Las subastas vivas (situación en_subasta) con fecha, por origen y cierre: el orden «Cierre más próximo» (tramo 0) y las ventanas de cierre_entre del inventario.';
-- El tramo 1: las vivas sin fecha por alta. Por `vehiculos_situacion_idx` habría que pasar por todas las vivas con fecha para llegar a ellas (crece con las vivas).
create index vehiculos_subasta_viva_sin_fecha_idx on public.vehiculos using btree (origen_id, creado_en desc, id desc)
  where eliminado_en is null and situacion = 'en_subasta' and cierre_subasta_en is null;
comment on index public.vehiculos_subasta_viva_sin_fecha_idx is 'Las subastas vivas (situación en_subasta) sin fecha, por origen y alta: el tramo 1 del orden «Cierre más próximo» del inventario.';

-- La validación: `cierre_entre` con dos instantes ISO con zona, `desde < hasta`, y a lo sumo una por pedido (contada con «Situación»: la página arma una u otra).
CREATE OR REPLACE FUNCTION "public"."_vehiculos_inventario_validar"("p_filtros" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  c jsonb; v_t text; v_ok boolean; v_total integer := 0; v_arr text; v_sits integer := 0;
  v_uuid constant text := '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$';
  v_clave constant text := '^[a-z][a-z0-9_]{1,40}$';
  v_instante constant text := '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$';
begin
  -- Un `or` o un `and` de SQL no fija el orden: lo que sólo vale tras comprobar el tipo va en un `case`.
  v_ok := case when jsonb_typeof(p_filtros) = 'array' then jsonb_array_length(p_filtros) <= 100 else false end;
  for c in select x from jsonb_array_elements(case when v_ok then p_filtros else '[]' end) x loop
    exit when not v_ok;
    v_t := case when jsonb_typeof(c) = 'object' then c ->> 'tipo' end;
    v_ok := case v_t
      when 'busqueda' then jsonb_typeof(c -> 'texto') = 'string'
      when 'columna_en' then c ->> 'columna' in ('fase_id', 'categoria_id') and jsonb_typeof(c -> 'valores') = 'array' and jsonb_typeof(c -> 'incluirNulo') = 'boolean'
      when 'columna_rango' then c ->> 'columna' = 'anio' and jsonb_typeof(coalesce(c -> 'min', 'null')) in ('number', 'null') and jsonb_typeof(coalesce(c -> 'max', 'null')) in ('number', 'null')
      when 'en_vitrina' then jsonb_typeof(c -> 'valor') = 'boolean' and jsonb_typeof(c -> 'fases') = 'array'
      when 'por_limpiar' then jsonb_typeof(c -> 'valor') = 'boolean' and jsonb_typeof(c -> 'hasta') = 'string' and c ->> 'hasta' ~ '^\d{4}-\d{2}-\d{2}$'
      -- Hasta las tres situaciones propias (sin repetir: cada una es una rama del armador), las fases (uuids, más abajo) y «sin fase»: cada parte puede venir vacía. Sin `else`:
      -- lo que no es un arreglo da nulo, y nulo es rechazo. Una sola por pedido (se cuenta abajo).
      when 'situacion_en' then jsonb_typeof(c -> 'situaciones') = 'array' and jsonb_typeof(c -> 'fases') = 'array' and jsonb_typeof(c -> 'sinFase') = 'boolean'
        and case when jsonb_typeof(c -> 'situaciones') = 'array' then jsonb_array_length(c -> 'situaciones') <= 3
          and (select coalesce(bool_and(jsonb_typeof(u) = 'string' and u #>> '{}' in ('en_subasta', 'sin_resolver', 'no_ganada')), true)
                 from jsonb_array_elements(c -> 'situaciones') u)
          and cardinality(array(select distinct u #>> '{}' from jsonb_array_elements(c -> 'situaciones') u)) = jsonb_array_length(c -> 'situaciones') end
      -- Viva y con el cierre en [desde, hasta): dos instantes ISO con zona (los arma la página, nunca la persona).
      when 'cierre_entre' then jsonb_typeof(c -> 'desde') = 'string' and jsonb_typeof(c -> 'hasta') = 'string' and c ->> 'desde' ~ v_instante and c ->> 'hasta' ~ v_instante
      when 'atributos_contienen' then jsonb_typeof(c -> 'alternativas') = 'array'
      when 'atributo_rango_numero' then c ->> 'clave' ~ v_clave and jsonb_typeof(c -> 'clave') = 'string'
        and jsonb_typeof(coalesce(c -> 'min', 'null')) in ('number', 'null') and jsonb_typeof(coalesce(c -> 'max', 'null')) in ('number', 'null')
      when 'atributo_rango_texto' then c ->> 'clave' ~ v_clave and jsonb_typeof(c -> 'clave') = 'string'
        and jsonb_typeof(coalesce(c -> 'desde', 'null')) in ('string', 'null') and jsonb_typeof(coalesce(c -> 'antesDe', 'null')) in ('string', 'null')
      when 'atributo_texto' then c ->> 'clave' ~ v_clave and jsonb_typeof(c -> 'clave') = 'string' and jsonb_typeof(c -> 'texto') = 'string'
      -- Entre 1 y 4 situaciones conocidas (SITUACIONES de src/modules/vehiculos/entities/situacion.ts).
      when 'situacion_fuera_de' then case when jsonb_typeof(c -> 'valores') = 'array' then jsonb_array_length(c -> 'valores') between 1 and 4
        and (select coalesce(bool_and(jsonb_typeof(u) = 'string' and u #>> '{}' in ('en_subasta', 'sin_resolver', 'no_ganada', 'fase')), false)
               from jsonb_array_elements(c -> 'valores') u) else false end
      else false end;
    exit when not coalesce(v_ok, false);
    v_sits := v_sits + case when v_t in ('situacion_en', 'cierre_entre') then 1 else 0 end;
    v_ok := v_sits <= 1;
    exit when not v_ok;
    -- Los textos (≤ 1.000 caracteres), el año (un entero de smallint) y la fecha (un día que existe).
    v_ok := (select coalesce(bool_and(length(c ->> k) <= 1000), true) from unnest(array['texto', 'desde', 'antesDe']) k where jsonb_typeof(c -> k) = 'string');
    if v_ok and v_t = 'columna_rango' then
      -- Entero también en su forma (`2010.0` no lo es: `::integer` caería con 22P02 al leer una fila).
      v_ok := (select coalesce(bool_and(case when (c ->> k) ~ '^-?[0-9]{1,5}$' then abs((c ->> k)::integer) <= 32767 else false end), true)
                 from unnest(array['min', 'max']) k where jsonb_typeof(c -> k) = 'number');
    end if;
    if v_ok and v_t = 'cierre_entre' then
      -- Un instante que no existe cae con 22008 (abajo, a 22023).
      v_ok := (c ->> 'desde')::timestamptz < (c ->> 'hasta')::timestamptz;
    end if;
    if v_ok and v_t = 'por_limpiar' then
      v_ok := to_char(to_date(c ->> 'hasta', 'YYYY-MM-DD'), 'YYYY-MM-DD') = c ->> 'hasta';
    end if;
    -- Los arreglos: a lo sumo 500 elementos; los ids, uuids; cada alternativa, un objeto de una clave del layout cuyo valor es texto, booleano o lista de textos.
    v_arr := case v_t when 'columna_en' then 'valores' when 'en_vitrina' then 'fases' when 'situacion_en' then 'fases' when 'atributos_contienen' then 'alternativas' end;
    if v_ok and v_arr is not null then
      v_ok := jsonb_array_length(c -> v_arr) <= 500;
      v_total := v_total + jsonb_array_length(c -> v_arr);
      if v_ok and v_arr = 'alternativas' then
        -- Una sola clave: sin la menor, el objeto queda vacío.
        v_ok := (select coalesce(bool_and(case when jsonb_typeof(a) = 'object' and a <> '{}' and length(a::text) <= 1000
                   then a - (select min(k) from jsonb_object_keys(a) k) = '{}'
                        and (select bool_and(k ~ v_clave and case jsonb_typeof(w) when 'string' then true when 'boolean' then true
                               when 'array' then (select coalesce(bool_and(jsonb_typeof(z) = 'string'), true) from jsonb_array_elements(w) z) else false end)
                               from jsonb_each(a) e (k, w))
                   else false end), true)
                   from jsonb_array_elements(c -> v_arr) a);
      elsif v_ok then
        v_ok := (select coalesce(bool_and(jsonb_typeof(u) = 'string' and u #>> '{}' ~ v_uuid), true) from jsonb_array_elements(c -> v_arr) u);
      end if;
    end if;
    exit when not v_ok;
  end loop;
  if not coalesce(v_ok, false) or v_total > 1000 then
    raise exception 'Los filtros del inventario no son válidos.' using errcode = '22023', hint = 'filtros';
  end if;
exception when invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
  raise exception 'Los filtros del inventario no son válidos.' using errcode = '22023', hint = 'filtros';
end $_$;

-- La condición `cierre_entre`.
CREATE OR REPLACE FUNCTION "public"."_vehiculos_inventario_condicion"("p_tipo" "text", "p_columna" "text", "p_i" integer, "p_filtro" "jsonb" DEFAULT NULL::"jsonb") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  c constant text := format('($1 -> %s)', p_i);
  v_col text;
  v_clave constant text := format('(%s ->> ''clave'')', c);
  v_fases constant text := format('array(select jsonb_array_elements_text(%s -> ''fases''))::uuid[]', c);
  v_hasta constant text := format('(%s ->> ''hasta'')::date', c);
  v_partes text[] := '{}'::text[];
begin
  if p_i is null or p_i < 0 then
    raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end if;
  v_col := case p_tipo when 'columna_en' then case p_columna when 'fase_id' then 'v.fase_id' when 'categoria_id' then 'v.categoria_id' end
                       when 'columna_rango' then case p_columna when 'anio' then 'v.anio' end end;
  if p_tipo in ('columna_en', 'columna_rango') and v_col is null then
    raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end if;
  case p_tipo
    when 'busqueda' then
      return format('(v.titulo ilike %1$s or v.vin ilike %1$s or v.lote ilike %1$s)', public._vehiculos_inventario_patron(p_i));
    when 'columna_en' then
      return format('((%1$s ->> ''incluirNulo'')::boolean and %2$s is null or %2$s = any (array(select jsonb_array_elements_text(%1$s -> ''valores''))::uuid[]))', c, v_col);
    when 'columna_rango' then
      return format('((%1$s ->> ''min'') is null or %2$s >= (%1$s ->> ''min'')::integer) and ((%1$s ->> ''max'') is null or %2$s <= (%1$s ->> ''max'')::integer)', c, v_col);
    when 'en_vitrina' then
      return format('(case when (%1$s ->> ''valor'')::boolean then v.publicado_web = true and v.fase_id = any (%2$s) '
        || 'else (cardinality(%2$s) = 0 or v.publicado_web is false or v.fase_id is null or not (v.fase_id = any (%2$s))) end)', c, v_fases);
    when 'por_limpiar' then
      return format('(case when (%1$s ->> ''valor'')::boolean then v.importado_apibara = true and public.limpieza_el(v) <= %2$s '
        || 'else (v.importado_apibara is false or public.limpieza_el(v) is null or public.limpieza_el(v) > %2$s) end)', c, v_hasta);
    when 'atributos_contienen' then
      return format('(jsonb_array_length(%1$s -> ''alternativas'') = 0 or v.atributos @> any (array(select jsonb_array_elements(%1$s -> ''alternativas''))))', c);
    when 'atributo_rango_numero' then
      return format('((%1$s ->> ''min'') is null or v.atributos -> %2$s >= %1$s -> ''min'') and ((%1$s ->> ''max'') is null or v.atributos -> %2$s <= %1$s -> ''max'')', c, v_clave);
    when 'atributo_rango_texto' then
      return format('((%1$s ->> ''desde'') is null or v.atributos ->> %2$s >= (%1$s ->> ''desde'')) and ((%1$s ->> ''antesDe'') is null or v.atributos ->> %2$s < (%1$s ->> ''antesDe''))', c, v_clave);
    when 'atributo_texto' then
      return format('(v.atributos ->> %s ilike %s)', v_clave, public._vehiculos_inventario_patron(p_i));
    when 'cierre_entre' then
      -- La situación va como literal en el texto: así calza el predicado de `vehiculos_subasta_viva_cierre_idx` (y el de `vehiculos_situacion_idx`, ordenando por alta).
      -- Los instantes, por `$1`. La misma condición en PostgREST: `infra/queries/condiciones.ts`.
      return format('(v.situacion = ''en_subasta'' and v.cierre_subasta_en >= (%1$s ->> ''desde'')::timestamptz and v.cierre_subasta_en < (%1$s ->> ''hasta'')::timestamptz)', c);
    when 'situacion_fuera_de' then
      -- Como el complemento (`= any` de las que quedan) y no como `<> all`: con un arreglo que no es constante el planificador estima `<> all` casi
      -- nulo (1/ndistinct por elemento) y deja de leer la ruta en orden por su índice; `= any` lo estima casi 1. `situacion` nunca es nula.
      return format('(v.situacion = any (array(select s from unnest(array[''en_subasta'', ''sin_resolver'', ''no_ganada'', ''fase'']) s '
        || 'except select jsonb_array_elements_text(%1$s -> ''valores''))))', c);
    when 'situacion_en' then
      -- Sin el filtro (la forma la arma `_vehiculos_inventario_sql`, que lo trae) no hay con qué armarla. Son términos de un `or`: cada situación propia por igualdad (con
      -- el valor ya plegado, `vehiculos_situacion_idx` conduce el orden de una sola), las fases (su situación es `fase`) y «sin fase». Con más de una rama el armador pide
      -- una por una (`p_columna`: 'p0'…'p2' la propia de ese lugar, 'resto' las fases y «sin fase») y las junta con `union all`: Postgres no ordena por `creado_en`
      -- a través de varios valores de un índice. Sin `p_columna`, todo en un `or`. Todo valor por `$1`.
      if p_filtro is null or jsonb_typeof(p_filtro) <> 'object' or p_columna is not null and p_columna not in ('p0', 'p1', 'p2', 'resto') then
        raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
      end if;
      if p_columna is null or p_columna <> 'resto' then
        for k in 0 .. jsonb_array_length(p_filtro -> 'situaciones') - 1 loop
          if p_columna is null or p_columna = 'p' || k then
            v_partes := v_partes || format('v.situacion = (%s -> ''situaciones'' ->> %s)', c, k);
          end if;
        end loop;
      end if;
      if (p_columna is null or p_columna = 'resto') and jsonb_array_length(p_filtro -> 'fases') > 0 then
        v_partes := v_partes || format('(v.situacion = ''fase'' and v.fase_id = any (%s))', format('array(select jsonb_array_elements_text(%s -> ''fases''))::uuid[]', c));
      end if;
      if (p_columna is null or p_columna = 'resto') and (p_filtro ->> 'sinFase')::boolean then
        v_partes := v_partes || '(v.situacion = ''fase'' and v.fase_id is null)'::text;
      end if;
      return case when cardinality(v_partes) = 0 then 'false' else '(' || array_to_string(v_partes, ' or ') || ')' end;
    else
      raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end case;
end $_$;

-- El armador suma el orden y el tramo del cursor: se recrea (otra firma), con sus grants. Las llamadas de tres argumentos siguen andando (`reciente`, sin tramo).
drop function public._vehiculos_inventario_sql(jsonb, text, text);

CREATE FUNCTION "public"."_vehiculos_inventario_sql"("p_filtros" "jsonb", "p_rutas" "text", "p_sentido" "text", "p_orden" "text" DEFAULT 'reciente'::"text", "p_tramo" smallint DEFAULT NULL::smallint) RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  v_cols constant text := 'v.id, v.numero, v.origen_id, v.titulo, v.marca, v.modelo, v.anio, v.vin, v.lote, v.plataforma, v.url_origen, v.precio, v.precio_negociable, '
    || 'v.acepta_permuta, v.placado, v.kilometraje, v.categoria_id, v.fase_id, v.atributos, v.lead_id, v.publicado_web, v.destacado_web, v.precio_web, v.precio_web_hasta, '
    || 'v.precio_web_nota, v.creado_por, v.creado_en, v.actualizado_en, v.estado_subasta, v.situacion, v.cierre_subasta_en';
  v_f jsonb := coalesce(p_filtros, '[]'::jsonb);
  v_d text; v_cursor text; v_pred text := ''; v_rutas text; v_sit integer; v_preds text[]; v_p text; v_ramas text[] := '{}'::text[]; k integer; v_resto boolean;
  -- Por el cierre: qué tramos puede traer cada rama ('0', '1', '2' en un texto), y lo de cada tramo.
  v_cierre boolean := false; v_tramos text[]; v_desde integer; v_hasta integer; v_tp text; v_c text; v_o text; v_a text; v_b text;
begin
  if p_rutas is null or p_rutas not in ('origen', 'propios') or p_sentido is null or p_sentido not in ('primera', 'siguiente', 'anterior') then
    raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end if;
  if p_orden is null or p_orden not in ('reciente', 'cierre') then
    raise exception 'El orden del inventario no es válido.' using errcode = '22023', hint = 'orden';
  end if;
  -- El tramo sólo con un cursor del cierre, y entonces es obligatorio.
  if (p_tramo is not null) <> (p_orden = 'cierre' and p_sentido <> 'primera') or p_tramo not between 0 and 2 then
    raise exception 'El cursor del inventario está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  perform public._vehiculos_inventario_validar(v_f);
  for i in 0 .. jsonb_array_length(v_f) - 1 loop
    if v_f -> i ->> 'tipo' = 'situacion_en' then
      v_sit := i;
    else
      v_cierre := v_cierre or v_f -> i ->> 'tipo' = 'cierre_entre';
      v_pred := v_pred || ' and ' || public._vehiculos_inventario_condicion(v_f -> i ->> 'tipo', v_f -> i ->> 'columna', i, v_f -> i);
    end if;
  end loop;
  -- «Situación» (a lo sumo una, lo validó): con una sola rama, su predicado va con los demás; con varias, una ruta completa por rama (`union all`, cada una con su `order by … limit`).
  -- Al lado, los tramos del cierre que puede traer cada rama: una situación propia es un valor cerrado (lo validó) y nunca entra al texto; sólo poda ramas que darían
  -- vacío y recorrerían un índice en vano.
  v_preds := array[v_pred];
  v_tramos := array['012'];
  if v_sit is not null then
    k := jsonb_array_length(v_f -> v_sit -> 'situaciones');
    v_resto := jsonb_array_length(v_f -> v_sit -> 'fases') > 0 or (v_f -> v_sit ->> 'sinFase')::boolean;
    if k + (v_resto::integer) <= 1 then
      v_preds := array[v_pred || ' and ' || public._vehiculos_inventario_condicion('situacion_en', null, v_sit, v_f -> v_sit)];
      v_tramos := array[case when v_f -> v_sit -> 'situaciones' ->> 0 = 'en_subasta' then '01' else '2' end];
    else
      v_preds := '{}'; v_tramos := '{}';
      for i in 0 .. k - 1 loop
        v_preds := v_preds || (v_pred || ' and ' || public._vehiculos_inventario_condicion('situacion_en', 'p' || i, v_sit, v_f -> v_sit));
        v_tramos := v_tramos || case when v_f -> v_sit -> 'situaciones' ->> i = 'en_subasta' then '01' else '2' end;
      end loop;
      if v_resto then
        v_preds := v_preds || (v_pred || ' and ' || public._vehiculos_inventario_condicion('situacion_en', 'resto', v_sit, v_f -> v_sit));
        v_tramos := v_tramos || '2'::text;
      end if;
    end if;
  end if;
  v_d := case p_sentido when 'anterior' then 'asc' else 'desc' end;
  v_cursor := case p_sentido when 'siguiente' then ' and (v.creado_en, v.id) < ($5, $6)' when 'anterior' then ' and (v.creado_en, v.id) > ($5, $6)' else '' end;
  -- `reciente`: una pasada sin tramo (-1). `cierre`: un tramo por pasada; hacia adelante, el del cursor y los que siguen; hacia atrás, el del cursor y los de antes.
  v_desde := case when p_orden = 'reciente' then -1 when p_sentido = 'siguiente' then p_tramo else 0 end;
  v_hasta := case when p_orden = 'reciente' then -1 when p_sentido = 'anterior' then p_tramo else 2 end;
  for i in 1 .. cardinality(v_preds) loop
    v_p := v_preds[i];
    for t in v_desde .. v_hasta loop
      if t = -1 then
        v_tp := ''; v_c := v_cursor; v_o := format('v.creado_en %1$s, v.id %1$s', v_d);
      else
        -- Una ventana (`cierre_entre`) sólo trae vivas con fecha.
        continue when position(t::text in v_tramos[i]) = 0 or v_cierre and t > 0;
        -- Los tramos, como `tramoDelCierre()` de src/modules/vehiculos/entities/cursor-del-cierre.ts (si se separan, el cursor saltea filas). La situación, literal:
        -- el 0 por vehiculos_subasta_viva_cierre_idx, el 1 por vehiculos_subasta_viva_sin_fecha_idx, el 2 por vehiculos_origen_listado_idx.
        v_tp := case t when 0 then ' and v.situacion = ''en_subasta'' and v.cierre_subasta_en is not null'
                       when 1 then ' and v.situacion = ''en_subasta'' and v.cierre_subasta_en is null'
                       else ' and v.situacion = any (array[''sin_resolver'', ''no_ganada'', ''fase''])' end;
        -- El cursor, sólo en su tramo: en el 0 es el cierre; en los otros, el alta.
        v_c := case when t <> p_tramo or p_tramo is null then ''
                    when t = 0 then case p_sentido when 'siguiente' then ' and (v.cierre_subasta_en, v.id) > ($5, $6)' else ' and (v.cierre_subasta_en, v.id) < ($5, $6)' end
                    else v_cursor end;
        v_o := case when t = 0 then format('v.cierre_subasta_en %1$s, v.id %1$s', case p_sentido when 'anterior' then 'desc' else 'asc' end)
                    else format('v.creado_en %1$s, v.id %1$s', v_d) end;
      end if;
      if p_rutas = 'origen' then
        -- R1: el índice del origen (o el de su tramo).
        v_ramas := v_ramas || format('(select %s, public.limpieza_el(v) as limpieza_el, false as releer from public.vehiculos v where v.origen_id = $2 and v.eliminado_en is null%s%s%s '
          || 'order by %s limit $3)', v_cols, v_c, v_p, v_tp, v_o);
      else
        -- R2: lo que creó quien mira, vehiculos_creador_idx. R3: su cartera que crearon otros (o nadie: `creado_por` admite nulo), un lateral por lead sobre vehiculos_lead_id_idx.
        v_ramas := v_ramas || format('(select %1$s, public.limpieza_el(v) as limpieza_el, false as releer from public.vehiculos v where v.creado_por = $4 and v.origen_id = $2 '
          || 'and v.eliminado_en is null%2$s%3$s%5$s order by %4$s limit $3) '
          || 'union all (select x.* from public.mis_leads() m (lead_id) cross join lateral (select %1$s, null::date as limpieza_el, true as releer from public.vehiculos v '
          || 'where v.lead_id = m.lead_id and v.origen_id = $2 '
          || 'and v.creado_por is distinct from $4 and v.eliminado_en is null%2$s%3$s%5$s order by %4$s limit $3) x)', v_cols, v_c, v_p, v_o, v_tp);
      end if;
    end loop;
  end loop;
  if cardinality(v_ramas) = 0 then
    -- Todo podado (una ventana con «Sin resolver», o un cursor más allá del último tramo): ninguna fila.
    v_ramas := array[format('(select %s, null::date as limpieza_el, false as releer from public.vehiculos v where false)', v_cols)];
  end if;
  v_rutas := array_to_string(v_ramas, ' union all ');
  if p_orden = 'reciente' then
    -- `limpieza_el` se calcula sobre la fila que la ruta ya leyó bajo la RLS: releerla por id paga otra pasada de la policy (sus InitPlans y un en_cartera por fila; Beto
    -- 10,3 → 8,6 ms, S0'' del 4.16-2a). R1 y R2 cortan en n + 1 antes de proyectar; R3 emite lo de toda la cartera, así que relee sólo las filas de la página, con una
    -- subconsulta escalar dentro de un `case` (sólo se evalúa si `releer`; una lateral con `where f.releer` relee igual). La portada, sólo para la página.
    return format('select %3$s, case when f.releer then (select public.limpieza_el(w) from public.vehiculos w where w.id = f.id) else f.limpieza_el end, p.ruta_miniatura '
      || 'from (select * from (%1$s) u order by u.creado_en %2$s, u.id %2$s limit $3) f '
      || 'left join lateral (select i.ruta_miniatura from public.vehiculos_imagenes i where i.vehiculo_id = f.id and i.es_portada limit 1) p on true '
      || 'order by f.creado_en %2$s, f.id %2$s', v_rutas, v_d, replace(v_cols, 'v.', 'f.'));
  end if;
  -- Por el cierre, afuera: el tramo y, dentro de él, su clave (el cierre ascendente en el 0; el alta descendente en los otros). Hacia atrás, todo al revés.
  v_a := case p_sentido when 'anterior' then 'desc' else 'asc' end;
  v_b := case p_sentido when 'anterior' then 'asc' else 'desc' end;
  return format('select %3$s, case when f.releer then (select public.limpieza_el(w) from public.vehiculos w where w.id = f.id) else f.limpieza_el end, p.ruta_miniatura '
    || 'from (select * from (%1$s) u order by %2$s limit $3) f '
    || 'left join lateral (select i.ruta_miniatura from public.vehiculos_imagenes i where i.vehiculo_id = f.id and i.es_portada limit 1) p on true '
    || 'order by %4$s', v_rutas,
    replace(format('(case when ¤.situacion = ''en_subasta'' and ¤.cierre_subasta_en is not null then 0 when ¤.situacion = ''en_subasta'' then 1 else 2 end) %1$s, '
      || 'case when ¤.situacion = ''en_subasta'' and ¤.cierre_subasta_en is not null then ¤.cierre_subasta_en end %1$s, '
      || 'case when ¤.situacion = ''en_subasta'' and ¤.cierre_subasta_en is not null then ¤.id end %1$s, '
      || 'case when not (¤.situacion = ''en_subasta'' and ¤.cierre_subasta_en is not null) then ¤.creado_en end %2$s, '
      || 'case when not (¤.situacion = ''en_subasta'' and ¤.cierre_subasta_en is not null) then ¤.id end %2$s', v_a, v_b), '¤', 'u'),
    replace(v_cols, 'v.', 'f.'),
    replace(format('(case when ¤.situacion = ''en_subasta'' and ¤.cierre_subasta_en is not null then 0 when ¤.situacion = ''en_subasta'' then 1 else 2 end) %1$s, '
      || 'case when ¤.situacion = ''en_subasta'' and ¤.cierre_subasta_en is not null then ¤.cierre_subasta_en end %1$s, '
      || 'case when ¤.situacion = ''en_subasta'' and ¤.cierre_subasta_en is not null then ¤.id end %1$s, '
      || 'case when not (¤.situacion = ''en_subasta'' and ¤.cierre_subasta_en is not null) then ¤.creado_en end %2$s, '
      || 'case when not (¤.situacion = ''en_subasta'' and ¤.cierre_subasta_en is not null) then ¤.id end %2$s', v_a, v_b), '¤', 'f'));
end $_$;

COMMENT ON FUNCTION "public"."_vehiculos_inventario_sql"("p_filtros" "jsonb", "p_rutas" "text", "p_sentido" "text", "p_orden" "text", "p_tramo" smallint) IS 'El texto de la consulta de vehiculos_inventario(): las rutas, el sentido, el orden (reciente, o cierre por tramos con el tramo del cursor) y los predicados; depende sólo de la forma del pedido y ningún valor entra al texto. Invocadora; no lee tablas.';

REVOKE ALL ON FUNCTION "public"."_vehiculos_inventario_sql"("p_filtros" "jsonb", "p_rutas" "text", "p_sentido" "text", "p_orden" "text", "p_tramo" smallint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_vehiculos_inventario_sql"("p_filtros" "jsonb", "p_rutas" "text", "p_sentido" "text", "p_orden" "text", "p_tramo" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_vehiculos_inventario_sql"("p_filtros" "jsonb", "p_rutas" "text", "p_sentido" "text", "p_orden" "text", "p_tramo" smallint) TO "service_role";

-- La función suma el orden y el tramo del cursor: se recrea (otra firma), con sus grants.
drop function public.vehiculos_inventario(uuid, integer, jsonb, timestamp with time zone, uuid, boolean);

CREATE FUNCTION "public"."vehiculos_inventario"("p_origen" "uuid", "p_tamano" integer DEFAULT NULL::integer, "p_filtros" "jsonb" DEFAULT '[]'::"jsonb", "p_cursor_en" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid", "p_hacia_atras" boolean DEFAULT false, "p_orden" "text" DEFAULT 'reciente'::"text", "p_cursor_tramo" smallint DEFAULT NULL::smallint) RETURNS TABLE("id" "uuid", "numero" bigint, "origen_id" "uuid", "titulo" "text", "marca" "text", "modelo" "text", "anio" smallint, "vin" "text", "lote" "text", "plataforma" "text", "url_origen" "text", "precio" numeric, "precio_negociable" boolean, "acepta_permuta" boolean, "placado" boolean, "kilometraje" integer, "categoria_id" "uuid", "fase_id" "uuid", "atributos" "jsonb", "lead_id" "uuid", "publicado_web" boolean, "destacado_web" boolean, "precio_web" numeric, "precio_web_hasta" numeric, "precio_web_nota" "text", "creado_por" "uuid", "creado_en" timestamp with time zone, "actualizado_en" timestamp with time zone, "estado_subasta" "public"."estado_subasta", "situacion" "text", "cierre_subasta_en" timestamp with time zone, "limpieza_el" "date", "portada_ruta" "text")
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  -- MAXIMO_DE_PAGINA_DE_VEHICULOS (src/modules/vehiculos/entities/vehiculo.ts), más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 100, 100) + 1;
  v_uid uuid := (select auth.uid());
  v_filtros jsonb := coalesce(p_filtros, '[]'::jsonb);
  v_rutas text; v_sentido text; v_sql text;
begin
  if p_origen is null then
    raise exception 'Falta el origen del inventario.' using errcode = '22023', hint = 'origen';
  end if;
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del inventario está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_sentido := case when p_cursor_en is null then 'primera' when p_hacia_atras then 'anterior' else 'siguiente' end;
  if p_origen = any (public.origenes_con_alcance('vehiculos.ver', 'todos')) then
    v_rutas := 'origen';
  elsif p_origen = any (public.origenes_con_alcance('vehiculos.ver', 'propios')) then
    -- Con más de 5.000 leads en la cartera, lo de hoy: el origen, y la RLS pregunta en_cartera() por fila.
    v_rutas := case when public.leads_cartera_corta() then 'propios' else 'origen' end;
  end if;
  -- Los filtros, el orden y el tramo se validan también sin ruta: un pedido que no vale falla igual para todos.
  v_sql := public._vehiculos_inventario_sql(v_filtros, coalesce(v_rutas, 'origen'), v_sentido, p_orden, p_cursor_tramo);
  if v_rutas is null then
    return;
  end if;
  return query execute v_sql using v_filtros, p_origen, v_n, v_uid, p_cursor_en, p_cursor_id;
end $$;

COMMENT ON FUNCTION "public"."vehiculos_inventario"("p_origen" "uuid", "p_tamano" integer, "p_filtros" "jsonb", "p_cursor_en" timestamp with time zone, "p_cursor_id" "uuid", "p_hacia_atras" boolean, "p_orden" "text", "p_cursor_tramo" smallint) IS 'Una página del inventario de un origen, de lo más nuevo a lo más viejo (creado_en desc, id desc) o por el cierre más próximo, por tramos (p_orden = cierre: las vivas con fecha por su cierre, las vivas sin fecha y las demás por alta; el cursor lleva su tramo), por cursor (hacia atrás, en orden inverso), con los filtros del layout (Condicion[]) y, por fila, limpieza_el, la portada, el estado de la subasta, la situación y el cierre de la subasta viva. Corre como quien la llama: la RLS decide qué se ve; cada ruta (el origen, lo creado, la cartera de mis_leads()) y cada tramo van por su índice con su propio limit. Lo miden supabase/tests/medir-vehiculos-inventario.sql y medir-vehiculos-inventario-cierre.sql.';

REVOKE ALL ON FUNCTION "public"."vehiculos_inventario"("p_origen" "uuid", "p_tamano" integer, "p_filtros" "jsonb", "p_cursor_en" timestamp with time zone, "p_cursor_id" "uuid", "p_hacia_atras" boolean, "p_orden" "text", "p_cursor_tramo" smallint) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION "public"."vehiculos_inventario"("p_origen" "uuid", "p_tamano" integer, "p_filtros" "jsonb", "p_cursor_en" timestamp with time zone, "p_cursor_id" "uuid", "p_hacia_atras" boolean, "p_orden" "text", "p_cursor_tramo" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vehiculos_inventario"("p_origen" "uuid", "p_tamano" integer, "p_filtros" "jsonb", "p_cursor_en" timestamp with time zone, "p_cursor_id" "uuid", "p_hacia_atras" boolean, "p_orden" "text", "p_cursor_tramo" smallint) TO "service_role";
