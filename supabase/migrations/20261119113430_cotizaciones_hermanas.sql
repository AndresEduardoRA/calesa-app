-- Las cotizaciones hermanas (glosario: «Cotizaciones hermanas»; docs/COTIZADOR.md › «Lo que se guarda en una cotización» y «La lectura que abre la hoja»):
-- dos cotizaciones de una variante en par, creadas y guardadas juntas, que se apuntan entre sí por `hermana_id`. Esta migración trae lo que se lee:
-- - la columna (FK diferida a la misma tabla, `on delete set null`: purgar una suelta a la otra; nunca la misma fila; única), que sólo escriben las RPC;
-- - el invariante, un trigger de constraint diferido: la hermana existe, apunta de vuelta y tiene el mismo lead, vehículo, origen y versión de la fórmula;
-- - la versión y las revisiones no miran `hermana_id` (el `set null` de una purga no es un cambio de la que queda);
-- - qué nodos cambian según la opción (`_nodos_en_par()`, espejo de `nodosEnPar()` con el juego `casos-de-en-par.json`) y la hoja que lo dice
--   (`par` arriba y `en_par` en cada celda y subtotal que va en par; con par, la variante no se dibuja);
-- - la hoja de una guardada con su `hermana` y la opción de esta (`par.opcion`), y si se puede cotizar encima del par;
-- - `cotizacion_evaluar(…, p_opcion)`: la opción del par la pone la base, no la persona (un nivel que esconde la variante cotiza igual).

alter table public.cotizaciones add column hermana_id uuid;
alter table public.cotizaciones
  add constraint cotizaciones_hermana_id_fkey foreign key (hermana_id) references public.cotizaciones (id) on delete set null deferrable initially deferred;
alter table public.cotizaciones add constraint cotizaciones_hermana_distinta check (hermana_id <> id);
-- Sostiene la lectura de quién apunta a una cotización (la papelera, el `set null` de la purga) y que a una la apunte una sola.
create unique index cotizaciones_hermana_unica on public.cotizaciones (hermana_id) where hermana_id is not null;
comment on column public.cotizaciones.hermana_id is 'La cotización hermana (glosario: «Cotizaciones hermanas»): la otra opción de una variante en par. Las dos se apuntan entre sí y comparten lead, vehículo, origen y versión (trg_cotizaciones_hermanas). La escriben sólo cotizacion_crear_en_par y cotizacion_encima_en_par; purgar una la pone en nulo en la otra.';
grant select (hermana_id) on public.cotizaciones to authenticated;

create or replace function public._cotizaciones_hermanas_comprobar() returns trigger
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  yo public.cotizaciones; h public.cotizaciones; v_ok boolean;
begin
  -- Diferido: al confirmar se mira la fila como quedó (otra sentencia de la transacción pudo cambiarla o borrarla después).
  select * into yo from public.cotizaciones x where x.id = new.id;
  if not found or yo.hermana_id is null then
    return null;
  end if;
  select * into h from public.cotizaciones x where x.id = yo.hermana_id;
  v_ok := found and h.hermana_id = yo.id and h.lead_id is not distinct from yo.lead_id and h.vehiculo_id is not distinct from yo.vehiculo_id
          and h.origen_id = yo.origen_id and h.formula_id = yo.formula_id;
  if v_ok is not true then
    raise exception 'Las cotizaciones hermanas se apuntan entre sí y comparten el lead, el vehículo, el origen y la versión de la fórmula.'
      using errcode = '23514', detail = 'hermanas';
  end if;
  return null;
end $$;
comment on function public._cotizaciones_hermanas_comprobar() is 'Trigger de constraint diferido de cotizaciones: dos hermanas se apuntan entre sí y comparten lead, vehículo, origen y versión de la fórmula (23514 si no). No compara creado_por: las bajas reasignan la cartera por lotes y podrían separar el par entre transacciones. Glosario: «Cotizaciones hermanas».';
revoke all on function public._cotizaciones_hermanas_comprobar() from public, anon, authenticated;
grant execute on function public._cotizaciones_hermanas_comprobar() to service_role;

create constraint trigger trg_cotizaciones_hermanas
  after insert or update of hermana_id, lead_id, vehiculo_id, origen_id, formula_id on public.cotizaciones
  deferrable initially deferred
  for each row when (new.hermana_id is not null)
  execute function public._cotizaciones_hermanas_comprobar();

CREATE OR REPLACE FUNCTION "public"."cotizacion_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v public.cotizaciones;
begin
  -- Una copia de la fila nueva con lo que no cuenta puesto como estaba: si queda igual a la vieja, sólo cambiaron los contadores.
  v := new;
  v.actualizado_en := old.actualizado_en;
  v.reportes_count := old.reportes_count;
  v.favoritos_count := old.favoritos_count;
  -- La hermana se suelta sola cuando se purga la otra (`on delete set null`): no es un cambio de esta.
  v.hermana_id := old.hermana_id;
  if v is not distinct from old then
    new.actualizado_en := old.actualizado_en;
    return new;
  end if;
  new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  return new;
end $$;

comment on function public.cotizacion_version() is 'Trigger de cotizaciones: sella la versión (actualizado_en) con greatest(clock_timestamp(), anterior + 1 µs) y no la mueve si sólo cambian los contadores de reportes o favoritos, o la hermana (purgar una la suelta en la otra). docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';
revoke all on function public.cotizacion_version() from public, anon, authenticated;
grant execute on function public.cotizacion_version() to service_role;

CREATE OR REPLACE FUNCTION "public"."cotizacion_revision"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  d jsonb := '{}'::jsonb; k text; a jsonb := to_jsonb(old); b jsonb := to_jsonb(new);
  v_de jsonb; v_a jsonb; v_g jsonb; v_gde jsonb; v_ga jsonb;
begin
  for k in select jsonb_object_keys(b) loop
    if k in ('actualizado_en', 'reportes_count', 'favoritos_count', 'hermana_id') or a -> k is not distinct from b -> k then continue; end if;
    if k in ('valores', 'fuentes') and jsonb_typeof(a -> k) = 'object' and jsonb_typeof(b -> k) = 'object' then
      -- Sólo los nodos que cambiaron (`-> clave` da el jsonb null de un valor nulo y el SQL null de una clave que no está).
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_de from jsonb_each(a -> k) e where (b -> k) -> e.key is distinct from e.value;
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_a from jsonb_each(b -> k) e where (a -> k) -> e.key is distinct from e.value;
      d := d || jsonb_build_object(k, jsonb_build_object('de', v_de, 'a', v_a));
    elsif k = 'totales' and jsonb_typeof(a -> k) = 'object' and jsonb_typeof(b -> k) = 'object' then
      -- Las claves de primer nivel que cambiaron (menos `grupos`), y de `grupos` cada grupo entero que cambió.
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_de from jsonb_each(a -> k) e where e.key <> 'grupos' and (b -> k) -> e.key is distinct from e.value;
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_a from jsonb_each(b -> k) e where e.key <> 'grupos' and (a -> k) -> e.key is distinct from e.value;
      if jsonb_typeof(a -> k -> 'grupos') = 'object' and jsonb_typeof(b -> k -> 'grupos') = 'object' then
        select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_gde from jsonb_each(a -> k -> 'grupos') e where (b -> k -> 'grupos') -> e.key is distinct from e.value;
        select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_ga from jsonb_each(b -> k -> 'grupos') e where (a -> k -> 'grupos') -> e.key is distinct from e.value;
        if v_gde <> '{}'::jsonb then v_de := v_de || jsonb_build_object('grupos', v_gde); end if;
        if v_ga <> '{}'::jsonb then v_a := v_a || jsonb_build_object('grupos', v_ga); end if;
      elsif (a -> k -> 'grupos') is distinct from (b -> k -> 'grupos') then
        -- `grupos` de un solo lado (o que no es un objeto): entero, del lado donde está.
        if (a -> k) ? 'grupos' then v_de := v_de || jsonb_build_object('grupos', a -> k -> 'grupos'); end if;
        if (b -> k) ? 'grupos' then v_a := v_a || jsonb_build_object('grupos', b -> k -> 'grupos'); end if;
      end if;
      d := d || jsonb_build_object(k, jsonb_build_object('de', v_de, 'a', v_a));
    elsif k = 'tarjeta_retoques' then
      -- Los retoques de la tarjeta no van enteros (hasta 24 KiB por lado, en cada revisión de la página): cuántas celdas y cuántas filas ocultas, o nulo.
      d := d || jsonb_build_object(k, jsonb_build_object('de', public._retoques_resumen(a -> k), 'a', public._retoques_resumen(b -> k)));
    else
      d := d || jsonb_build_object(k, jsonb_build_object('de', a -> k, 'a', b -> k));
    end if;
  end loop;
  if d <> '{}'::jsonb then
    -- Lo deja `cotizacion_guardar()`; un ajuste que alguna vez se fijó en la sesión vuelve como texto vacío, no como nulo.
    v_g := nullif(current_setting('importadora.guardado', true), '')::jsonb;
    insert into public.cotizaciones_revisiones (cotizacion_id, usuario_id, diff, intento, huella)
    values (new.id, (select auth.uid()), d, (v_g ->> 'intento')::uuid, v_g ->> 'huella');
  end if;
  return null;
end;
$$;

comment on function public.cotizacion_revision() is 'Trigger de cotizaciones: una revisión por cambio, con el diff por columna ({de, a}; en valores y fuentes sólo los nodos que cambiaron; en totales, las claves y los grupos que cambiaron, cada grupo entero) y el intento y la huella de cotizacion_guardar. La hermana no cuenta (purgar una la suelta en la otra). docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';
revoke all on function public.cotizacion_revision() from public, anon, authenticated;
grant execute on function public.cotizacion_revision() to service_role;

create or replace function public._variante_en_par(p_def jsonb) returns text
    language sql stable
    set search_path to ''
    as $$
  select n ->> 'id' from jsonb_array_elements(case when jsonb_typeof(p_def -> 'nodos') = 'array' then p_def -> 'nodos' else '[]'::jsonb end) n
   where n ->> 'tipo' = 'opcion' and n -> 'en_par' = 'true'::jsonb
   limit 1;
$$;
comment on function public._variante_en_par(jsonb) is 'El id de la variante que se cotiza en par de una definición (glosario: «Variante en par»), o nulo. De nadie.';
revoke all on function public._variante_en_par(jsonb) from public, anon, authenticated;
grant execute on function public._variante_en_par(jsonb) to service_role;

create or replace function public._nodos_en_par(p_def jsonb) returns text[]
    language plpgsql stable
    set search_path to ''
    as $$
declare
  v_variante text := public._variante_en_par(p_def);
  v_marcados jsonb;
  v_salida text[] := '{}'::text[];
  v_n jsonb;
  v_refs text[];
  v_va boolean;
begin
  if v_variante is null then
    return v_salida;
  end if;
  v_marcados := jsonb_build_object(v_variante, true);
  -- Una sola pasada en el orden de la lista: un nodo sólo nombra lo anterior (`referencia_hacia_adelante`), así que lo que nombra ya está decidido.
  for v_n in select x.value from jsonb_array_elements(p_def -> 'nodos') with ordinality x (value, ord) order by x.ord loop
    continue when v_n ->> 'tipo' in ('opcion', 'tipo_cambio');
    -- Lo que nombra, como `referenciasDe()`: de, pct, sobre, condicion, requerido_si, sugerido_de y los valores del match (un valor que no es un nodo no está marcado).
    v_refs := array(select jsonb_array_elements_text(case when jsonb_typeof(v_n -> 'de') = 'array' then v_n -> 'de' else '[]'::jsonb end))
           || array[v_n ->> 'pct', v_n ->> 'sobre', v_n ->> 'condicion', v_n ->> 'requerido_si', v_n ->> 'sugerido_de']
           || array(select e.value from jsonb_each_text(case when jsonb_typeof(v_n -> 'match') = 'object' then v_n -> 'match' else '{}'::jsonb end) e);
    v_va := v_n ? 'solo_en' or exists (select 1 from unnest(v_refs) r where r is not null and v_marcados ? r);
    if v_va then
      v_marcados := v_marcados || jsonb_build_object(v_n ->> 'id', true);
      v_salida := v_salida || (v_n ->> 'id');
    end if;
  end loop;
  return v_salida;
end $$;
comment on function public._nodos_en_par(jsonb) is 'Los nodos que cambian según la opción de la variante en par, en el orden de la lista (glosario: «Variante en par»): los que tienen solo_en o nombran la variante o un nodo que ya cambia; nunca la variante ni un tipo de cambio. Regla estática, sin evaluar. Espejo de nodosEnPar() (entities/en-par.ts) con el juego casos-de-en-par.json. De nadie.';
revoke all on function public._nodos_en_par(jsonb) from public, anon, authenticated;
grant execute on function public._nodos_en_par(jsonb) to service_role;

CREATE OR REPLACE FUNCTION "public"."_cotizacion_hoja"("p_formula" "uuid", "p_origen" "uuid", "p_edita" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  fo public.formulas;
  v_cfg boolean; v_tc boolean; v_arr text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_nodos jsonb; v_grupos jsonb; v_niveles jsonb; v_visib jsonb; v_lee jsonb; v_vivas jsonb; v_opcion text; v_opcion_ok boolean;
  v_secciones jsonb; v_claves text[]; v_tarjeta jsonb; v_tonos jsonb; v_moneda_bs text; v_datos jsonb; v_cab jsonb;
  v_par_nodo text; v_en_par text[] := '{}'::text[]; v_par jsonb;
begin
  select * into fo from public.formulas x where x.id = p_formula;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', p_origen);
  v_tc := public.tiene_permiso('empresa.tipos_cambio.gestionar');
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_arr, v_editables from public._nodos_visibles(p_formula) n;
  v_ctx := public._cotizacion_contexto(v_arr, fo.definicion, fo.visibilidad);
  v_ok := v_ctx -> 'ok';
  -- Copias en memoria de lo que se busca por nodo (un jsonb que viene de la tabla se vuelve a leer entero en cada operador).
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  -- La moneda en que se escribe el total en Bs: la `moneda_a` del tipo de cambio ACTIVO que nombra el `total_en` de esta versión (una fila: tipos_cambio_clave_key).
  -- Nula sin `total_en` o sin ese tipo de cambio; no dice si `totales.bs` tiene valor (el Bs sale del tipo de cambio de cada bucket).
  select t.moneda_a::text into v_moneda_bs from public.tipos_cambio t
   where t.activo and t.clave = ((v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave');
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g ->> 'tono') from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g where (g ->> 'tono') is not null), '{}'::jsonb);
  v_niveles := coalesce((select jsonb_object_agg(l.clave, l.nombre) from public.cotizaciones_niveles l), '{}'::jsonb);
  v_visib := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(coalesce(fo.visibilidad, '{}'::jsonb)) e), '{}'::jsonb);
  -- Quien no puede guardar esa cotización (4.15-2, `p_edita` falso): ninguna celda se edita y el motivo no es un nivel (`no_se_edita`, o `se_calcula`/`del_vehiculo`).
  if p_edita is not true then
    v_editables := '{}'::jsonb;
    v_visib := '{}'::jsonb;
  end if;
  -- Las tablas que lee algún nodo que quien llama ve (la regla de `cotizacion_tabla()`) y las que existen vivas para este origen.
  v_lee := coalesce((select jsonb_object_agg(t.nombre, true)
                       from (select distinct n ->> 'tabla' as nombre from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                              where (n ->> 'tabla') is not null and n ->> 'id' = any (v_arr)) t), '{}'::jsonb);
  v_vivas := coalesce((select jsonb_object_agg(r.clave, true) from public.tablas_referencia r where r.activa and (r.origen_id = p_origen or r.origen_id is null)), '{}'::jsonb);
  -- El dato del vehículo de cada nodo `tabla` (4.14-2c2), armado una vez; viaja sólo en la celda de un nodo que se ve.
  v_datos := public._hoja_datos_del_vehiculo(v_nodos, p_origen, fo.params -> 'tablas', v_vivas);
  select n ->> 'id' into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;
  v_opcion_ok := v_opcion is not null and v_ok ? v_opcion;
  -- La variante en par (glosario: «Variante en par»): viaja a todo el que abre la hoja, aunque su nivel esconda el nodo (las etiquetas de sus dos opciones
  -- son configuración, no dinero), con los nodos que cambian según la opción; su ítem `variante` no se dibuja (la opción no la elige la persona).
  v_par_nodo := public._variante_en_par(fo.definicion);
  if v_par_nodo is not null then
    v_en_par := public._nodos_en_par(fo.definicion);
    v_par := jsonb_build_object('nodo', v_par_nodo, 'etiqueta', v_nodos -> v_par_nodo ->> 'etiqueta',
               'opciones', (select jsonb_agg(jsonb_build_object('clave', x.o ->> 'clave', 'etiqueta', x.o ->> 'etiqueta') order by x.k)
                              from jsonb_array_elements(v_nodos -> v_par_nodo -> 'opciones') with ordinality x (o, k)));
  end if;

  -- El aspecto de cada ítem y de cada sección se copia del diseño ya leído (con `->`: un número de columnas sigue siendo un número); sin él,
  -- la clave no viaja. Los niveles de una sección (`nivel_*`) nunca viajan.
  with it as (
    select s.ord as so, i.ord as io, s.value - 'items' as cab, i.value as item, i.value ->> 'tipo' as t, i.value ->> 'nodo' as nid
      from jsonb_array_elements(fo.diseno -> 'secciones') with ordinality s (value, ord)
     cross join lateral jsonb_array_elements(s.value -> 'items') with ordinality i (value, ord)
  ), vis as (
    -- Sólo viaja lo que su nodo (y, en un par, su porcentaje) permite.
    select it.*, v_nodos -> it.nid as n,
           jsonb_strip_nulls(jsonb_build_object('ancho', it.item -> 'ancho', 'alto', it.item -> 'alto', 'letra', it.item -> 'letra',
                                                'enfasis', it.item -> 'enfasis')) as asp
      from it
     where v_ok ? it.nid and v_nodos ? it.nid
       and not (it.t = 'variante' and v_par_nodo is not null)
       and (it.t <> 'celda' or not (it.item ? 'secundario') or v_ok ? (v_nodos -> it.nid ->> 'pct'))
  ), obj as (
    select vis.so, vis.io, vis.cab,
           case when vis.t in ('celda', 'subtotal') then v_grupos ->> (vis.n ->> 'grupo') end as tono,
           case vis.t
             when 'celda' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'celda', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'tipo_nodo', vis.n ->> 'tipo',
                 'formato', coalesce(vis.n ->> 'formato', 'usd'),
                 'tono', v_grupos ->> (vis.n ->> 'grupo'),
                 'ayuda', case
                            when (vis.item -> 'ayuda') ? 'texto' then jsonb_build_object('texto', vis.item -> 'ayuda' ->> 'texto')
                                                                      || jsonb_strip_nulls(jsonb_build_object('enlaces', vis.item -> 'ayuda' -> 'enlaces'))
                            when (vis.item -> 'ayuda') ? 'tabla'
                                 and (v_cfg or v_lee ? (vis.item -> 'ayuda' ->> 'tabla'))
                                 and ((jsonb_typeof(fo.params -> 'tablas') = 'object' and (fo.params -> 'tablas') ? (vis.item -> 'ayuda' ->> 'tabla'))
                                      or v_vivas ? (vis.item -> 'ayuda' ->> 'tabla'))
                              then jsonb_build_object('tabla', vis.item -> 'ayuda' ->> 'tabla') end,
                 'dato_del_vehiculo', v_datos -> vis.nid,
                 'en_par', case when vis.nid = any (v_en_par) then true end,
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end,
                 'condicion', case when v_ok ? (vis.n ->> 'condicion') then vis.n ->> 'condicion' end,
                 'requerido_si', case when v_ok ? (vis.n ->> 'requerido_si') then vis.n ->> 'requerido_si' end,
                 'secundario', case when vis.item ? 'secundario' then
                     jsonb_build_object('nodo', vis.n ->> 'pct', 'como', vis.item ->> 'secundario', 'tipo_nodo', v_nodos -> (vis.n ->> 'pct') ->> 'tipo',
                                        'formato', coalesce(v_nodos -> (vis.n ->> 'pct') ->> 'formato', 'usd'))
                     || public._hoja_estado(v_nodos -> (vis.n ->> 'pct'), true, v_editables ? (vis.n ->> 'pct'),
                                            v_visib -> (vis.n ->> 'pct') ->> 'editar', v_niveles ->> (v_visib -> (vis.n ->> 'pct') ->> 'editar'), v_cfg, v_tc) end))
               || public._hoja_estado(vis.n, true, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'atajos' then jsonb_build_object('tipo', 'atajos', 'nodo', vis.nid,
                 'chips', public._hoja_chips(p_origen, fo.params, vis.n, vis.item ->> 'columna', ((vis.item -> 'filas')::numeric)::int))
               || vis.asp
             when 'variante' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'variante', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta',
                 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', o ->> 'clave', 'etiqueta', o ->> 'etiqueta', 'titulo', o ->> 'titulo'))
                                         from jsonb_array_elements(vis.n -> 'opciones') o), '[]'::jsonb),
                 'por_defecto', vis.n ->> 'por_defecto'))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'interruptor' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'interruptor', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'efecto', vis.item ->> 'efecto',
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'subtotal' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'subtotal', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'formato', coalesce(vis.n ->> 'formato', 'usd'),
                 'tono', v_grupos ->> (vis.n ->> 'grupo'), 'en_par', case when vis.nid = any (v_en_par) then true end))
               || vis.asp
           end as o
      from vis
  ), secs as (
    select o.so, jsonb_strip_nulls(jsonb_build_object(
                   'id', o.cab ->> 'id', 'titulo', o.cab ->> 'titulo', 'presentacion', o.cab ->> 'presentacion',
                   'ancho', o.cab -> 'ancho', 'alto', o.cab -> 'alto', 'relleno', o.cab -> 'relleno', 'separacion', o.cab -> 'separacion',
                   'densidad', o.cab -> 'densidad', 'letra', o.cab -> 'letra', 'enfasis', o.cab -> 'enfasis', 'tono', o.cab -> 'tono'))
                 || jsonb_build_object('items', jsonb_agg(o.o order by o.io)) as sec
      from obj o
     where o.o is not null
     group by o.so, o.cab
  )
  -- Los tonos que la hoja pinta: los de los grupos de sus celdas y franjas, los de las secciones que dibuja y el de la cabecera.
  select coalesce((select jsonb_agg(s.sec order by s.so) from secs s), '[]'::jsonb),
         coalesce((select array_agg(distinct x.tono) from (select o.tono from obj o where o.tono is not null
                                                           union all
                                                           select s.sec ->> 'tono' from secs s where s.sec ? 'tono') x), '{}'::text[])
    into v_secciones, v_claves;
  v_cab := fo.diseno -> 'cabecera';
  if jsonb_typeof(v_cab -> 'tono') = 'string' then
    v_claves := v_claves || (v_cab ->> 'tono');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('clave', t.clave,
                                               'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                                               'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.clave), '[]'::jsonb)
    into v_tonos from public.tonos t where t.clave = any (v_claves);

  v_tarjeta := jsonb_build_object('nodo', fo.diseno -> 'tarjeta_total' ->> 'nodo',
                                  'etiqueta', v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'etiqueta',
                                  'formato', coalesce(v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'formato', 'usd'),
                                  'secundarios', coalesce((select jsonb_agg(jsonb_build_object('nodo', x.s, 'etiqueta', v_nodos -> x.s ->> 'etiqueta',
                                                                                              'formato', coalesce(v_nodos -> x.s ->> 'formato', 'usd')) order by x.o)
                                                             from jsonb_array_elements_text(coalesce(fo.diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality x (s, o)
                                                            where v_ok ? x.s), '[]'::jsonb));

  -- La cabecera: los modos (clave y nombre), «Ver total», su moneda, si quien mira tiene el ⚙ de la cabecera (`ajustes`: configura el origen y hay al
  -- menos un modo), su aspecto y lo que trae por defecto (sólo las claves que el diseño trae).
  return jsonb_build_object(
    'formula', jsonb_build_object('id', fo.id, 'version', fo.version),
    'cabecera', jsonb_build_object(
      'modos', coalesce((select jsonb_agg(jsonb_build_object('clave', m ->> 'clave', 'nombre', m ->> 'nombre'))
                           from jsonb_array_elements(coalesce(v_cab -> 'modos', '[]'::jsonb)) m), '[]'::jsonb),
      'ver_total_bs', coalesce((v_cab ->> 'ver_total_bs')::boolean, false),
      'moneda_bs', v_moneda_bs,
      'ajustes', coalesce(v_cfg, false) and jsonb_array_length(coalesce(v_cab -> 'modos', '[]'::jsonb)) > 0)
      || jsonb_strip_nulls(jsonb_build_object('tono', v_cab -> 'tono', 'relleno', v_cab -> 'relleno', 'letra', v_cab -> 'letra',
                                              'enfasis', v_cab -> 'enfasis', 'modo_por_defecto', v_cab -> 'modo_por_defecto',
                                              'ver_total_bs_por_defecto', v_cab -> 'ver_total_bs_por_defecto',
                                              'modos_visibles', v_cab -> 'modos_visibles')),
    'secciones', v_secciones,
    'tarjeta_total', v_tarjeta,
    'tonos', v_tonos,
    'par', v_par);
end $$;

revoke all on function public._cotizacion_hoja(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._cotizacion_hoja(uuid, uuid, boolean) to service_role;
comment on function public._cotizacion_hoja(uuid, uuid, boolean) is 'El diseño de una versión de la fórmula recortado al nivel de quien llama: ítems cuyo nodo se ve, con su candado y su motivo, ayudas (el texto con sus enlaces, o la tabla), el dato del vehículo de una celda de tabla (dato_del_vehiculo), atajos, modos (clave y nombre), la moneda del total en Bs (moneda_bs), si quien llama tiene el ⚙ de la cabecera (ajustes), tarjeta y tonos (los de los grupos de sus celdas, de las secciones que dibuja y de la cabecera). Con una variante en par, par (nodo, etiqueta y las dos opciones con su clave y etiqueta, para todo el que abre) y en_par en cada celda y subtotal que cambia según la opción (_nodos_en_par); el ítem de la variante no viaja. Copia el aspecto (ancho, alto, letra y énfasis de cada ítem; ancho, alto, relleno, separación, densidad, letra, énfasis y tono de cada sección; tono, relleno, letra y énfasis de la cabecera) y lo que la cabecera trae por defecto (modo_por_defecto, ver_total_bs_por_defecto, modos_visibles) sólo si el diseño lo trae; nunca los niveles. Con p_edita falso (quien no puede guardar esa cotización) nada es editable y el motivo no es un nivel. De nadie; la llaman cotizacion_hoja y cotizacion_hoja_guardada. docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)».';

CREATE OR REPLACE FUNCTION "public"."cotizacion_hoja_guardada"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c public.cotizaciones; v_edita boolean; v_nombre text; v_pub record; v_vence date; v_hoy date;
  h public.cotizaciones; v_hoja jsonb; v_hermana jsonb; v_h_disponible boolean := false; v_cadena jsonb; v_encima_en_par boolean;
begin
  perform public.assert_activo();
  -- Una que no existe, una en la papelera y una que no se ve dan el mismo error que `cotizacion_leer`.
  if not public.puede_cotizacion(p_id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into c from public.cotizaciones x where x.id = p_id;
  -- Quién guarda decide también qué celdas se editan (no `_nodos_visibles()`, que da «editar» con `crear`).
  v_edita := public._cotizacion_puede_guardar(c.id, c.clase, c.origen_id);
  select o.nombre into v_nombre from public.origenes o where o.id = c.origen_id;
  select x.id, x.version into v_pub from public.formulas x where x.origen_id = c.origen_id and x.estado = 'publicada';   -- formulas_publicada_unica
  -- La vigencia, por día en la zona de la empresa (docs/GLOSARIO.md › «Vencida»): vale hasta el día de `creado_en` + `vigencia_dias`, entero.
  select (c.creado_en at time zone e.zona_horaria)::date + e.vigencia_dias, (now() at time zone e.zona_horaria)::date
    into v_vence, v_hoy from public.ajustes_empresa e where e.id = 1;
  v_hoja := public._cotizacion_hoja(c.formula_id, c.origen_id, v_edita);
  -- La opción de esta cotización en su par (la elige la base al crear: es estructura, como el par).
  if jsonb_typeof(v_hoja -> 'par') = 'object' then
    v_hoja := jsonb_set(v_hoja, '{par,opcion}', coalesce(c.valores -> (v_hoja -> 'par' ->> 'nodo'), 'null'::jsonb));
  end if;
  -- La hermana: disponible si se ve, está viva y no es inválida; de una que no, sólo su id (la guardada se abre sola, con su aviso).
  if c.hermana_id is not null then
    select * into h from public.cotizaciones x where x.id = c.hermana_id;
    v_h_disponible := found and h.eliminado_en is null and h.estado <> 'invalida' and public.puede_cotizacion(h.id, 'cotizaciones.ver');
    v_hermana := case when v_h_disponible
                      then jsonb_build_object('id', h.id, 'disponible', true, 'actualizado_en', h.actualizado_en,
                                              'puede_guardar', public._cotizacion_puede_guardar(h.id, h.clase, h.origen_id))
                      else jsonb_build_object('id', c.hermana_id, 'disponible', false) end;
  end if;
  -- Cotizar encima del par: lo de cotizar encima de esta, la hermana disponible y sin versión nueva viva, y la publicada de hoy con su variante en par.
  v_cadena := public._cotizacion_cadena(c, v_pub.id);
  v_encima_en_par := coalesce((v_cadena ->> 'puede_cotizar_encima')::boolean, false) and v_h_disponible
                     and not exists (select 1 from public.cotizaciones x where x.cotizacion_padre_id = c.hermana_id and x.eliminado_en is null)   -- cotizaciones_encima_unica
                     and public._variante_en_par((select f.definicion from public.formulas f where f.id = v_pub.id)) is not null;
  return public._cotizacion_respuesta(c)
      || v_hoja
      || jsonb_build_object(
           'estado', 'lista',
           'origen', jsonb_build_object('id', c.origen_id, 'nombre', v_nombre),
           'puede_guardar', v_edita,
           'publicada', case when v_pub.id is not null then jsonb_build_object('id', v_pub.id, 'version', v_pub.version) end,
           'vence_el', v_vence,
           'vencida', v_vence < v_hoy,
           'hermana', v_hermana)
      || v_cadena || jsonb_build_object('puede_cotizar_encima_en_par', v_encima_en_par);
end $$;

comment on function public.cotizacion_hoja_guardada(uuid) is 'La hoja de una cotización guardada, para quien la ve: la fila y el snapshot recortados (como cotizacion_leer), el diseño de SU versión (como cotizacion_hoja, con lo editable decidido por _cotizacion_puede_guardar; con una variante en par, par.opcion es la de esta), puede_guardar, el origen, la publicada de hoy, vence_el y vencida (por día, en la zona de la empresa), la hermana (id, disponible y, si lo está, actualizado_en y puede_guardar), anterior, encima, puede_cotizar_encima y puede_cotizar_encima_en_par. Lo que no existe, está en la papelera o no se ve da el 42501 de cotizacion_leer. docs/COTIZADOR.md › «La hoja de una guardada y cotizar encima (4.15-2)».';
revoke all on function public.cotizacion_hoja_guardada(uuid) from public, anon;
grant execute on function public.cotizacion_hoja_guardada(uuid) to authenticated, service_role;

drop function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text, text);

CREATE FUNCTION "public"."cotizacion_evaluar"("p_entradas" "jsonb", "p_cotizacion" "uuid" DEFAULT NULL::"uuid", "p_origen" "uuid" DEFAULT NULL::"uuid", "p_vehiculo" "uuid" DEFAULT NULL::"uuid", "p_modo" "jsonb" DEFAULT NULL::"jsonb", "p_modo_tc" "text" DEFAULT NULL::"text", "p_abierta" "text" DEFAULT NULL::"text", "p_opcion" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  a record;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_cfg boolean;
  v_ent jsonb; v_ov_ocultos text[];
  v_modo jsonb := p_modo;
  v_formula uuid; v_abierta_en timestamptz; v_publicada uuid;
  v_res jsonb;
  v_par text;
begin
  -- La hoja abierta es de una hoja nueva (por origen): una cotización ya trae su versión y sus tipos de cambio.
  if p_abierta is not null and p_cotizacion is not null then
    perform public.assert_activo();
    perform public._motor_fallar('llamada_invalida', 'p_abierta', 'Una cotización ya trae su versión de la hoja y sus tipos de cambio.');
  end if;
  -- La opción de un par es de una hoja nueva: una cotización ya trae la suya (la guardada).
  if p_opcion is not null and p_cotizacion is not null then
    perform public.assert_activo();
    perform public._motor_fallar('llamada_invalida', 'p_opcion', 'Una cotización ya trae su opción.');
  end if;
  -- Por origen se cotiza con `crear` y `ver` del origen (4-32), antes de leer la hoja abierta y de mirar nada más.
  if p_cotizacion is null and p_origen is not null then
    perform public.assert_permiso('cotizaciones.crear', p_origen);
    perform public.assert_permiso('cotizaciones.ver', p_origen);
    if p_abierta is not null then
      select l.formula_id, l.abierta_en into v_formula, v_abierta_en from public._cotizacion_abierta_leer(p_abierta, p_origen) l;
      select f.id into v_publicada from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';       -- formulas_publicada_unica
      -- Una versión que ya no es la publicada: ¿todavía se podría guardar con ella? Si no, «abierta_vencida» y la hoja pide recargar.
      if v_formula is distinct from v_publicada then
        perform public._cotizacion_abierta(p_origen, v_formula, v_abierta_en);
      end if;
    end if;
  end if;
  -- Con la hoja abierta (4-28): la versión Y las tarifas de la apertura, lo mismo que verá D2 al guardar «con la N»; sin ella, la publicada y las tarifas de hoy.
  if v_formula is not null then
    select * into a from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo, v_formula, v_abierta_en, true);
  else
    select * into a from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo);
  end if;
  -- El modo por su clave (de esa versión) se vuelve la forma del motor antes de revisar lo tipeado.
  if p_modo_tc is not null then
    if p_modo is not null then
      perform public._motor_fallar('llamada_invalida', null, 'Pide el modo por su clave o completo, no los dos.');
    end if;
    v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);
  end if;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', a.origen_id);
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  v_ok := v_ctx -> 'ok';
  v_ent := a.entrada;
  -- La variante en par (glosario: «Variante en par»): la opción la pone la base (`p_opcion`), nunca la persona; con una cotización, la guardada.
  v_par := public._variante_en_par(a.definicion);
  if p_opcion is not null and v_par is null then
    perform public._motor_fallar('sin_par', 'opcion', 'Esta hoja no cotiza dos opciones a la vez.');
  end if;
  if v_par is not null and coalesce(p_entradas ? 'variante', false) then
    perform public._motor_fallar('variante_en_par', 'variante', 'En esta hoja las dos opciones se cotizan a la vez: la opción no se elige.');
  end if;
  if p_opcion is not null and not exists (select 1 from jsonb_array_elements(a.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') o
                                           where n ->> 'id' = v_par and o ->> 'clave' = p_opcion) then
    perform public._motor_fallar('opcion_invalida', 'opcion', 'Esa opción no es de esta hoja.');
  end if;

  -- Lo tipeado (la forma, la fórmula inválida, inputs, banderas y variante que se ven): `_cotizacion_tipeado()`, la misma que revisa `cotizacion_crear()`.
  v_ov_ocultos := public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ok, p_cotizacion is not null or p_opcion is not null);
  -- Un override de un nodo que existe y no se ve se quita antes del motor; vuelve como `nodo_inexistente` (abajo).
  if cardinality(v_ov_ocultos) > 0 then
    v_ent := jsonb_set(a.entrada, '{overrides}', (a.entrada -> 'overrides') - v_ov_ocultos);
  end if;
  if p_opcion is not null then
    v_ent := v_ent || jsonb_build_object('variante', p_opcion);
  end if;
  -- Con una cotización, lo que quien llama no ve o no edita es lo GUARDADO (D7: guardar conserva lo que quien guarda no ve), y un valor distinto para un nodo que se ve y no se edita es un
  -- error. Con un origen no hay nada guardado.
  if p_cotizacion is not null then
    v_ent := public._cotizacion_conservar(a.definicion, v_ent, v_editables, a.guardado);
  end if;

  -- El modo: quien no configura sólo elige uno de los del diseño de esa versión (convertido a la forma del motor).
  if v_modo is not null and not v_cfg and not exists (
       select 1 from public.formulas f, jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m
        where f.id = a.formula_id
          and jsonb_build_object('buckets', coalesce((select jsonb_object_agg(b ->> 'bucket', b ->> 'nodo') from jsonb_array_elements(m -> 'buckets') b), '{}'::jsonb),
                                 'total_en', m ->> 'total_en') = v_modo) then
    perform public._motor_fallar('modo_invalido', null, 'El modo no es uno de los que ofrece la hoja.');
  end if;

  v_res := public.evaluar_formula(a.definicion, a.params, v_ent, v_modo);
  v_res := public._cotizacion_recorte(v_res, v_ctx);

  -- Los overrides que se quitaron vuelven como inexistentes, entre los inexistentes y en su orden (por id, en bytes), después de los descartados de nodos que existen: es lo que el
  -- motor habría dicho si el nodo no estuviera. (Se agregan después de recortar: el recorte descarta, con razón, todo lo de un nodo que existe y no se ve.)
  if cardinality(v_ov_ocultos) > 0 then
    v_res := jsonb_set(v_res, '{overrides_descartados}', (
      select coalesce(jsonb_agg(x.e order by x.grupo, x.id collate "C", x.ord), '[]'::jsonb)
        from (select d.e, case when d.e ->> 'motivo' = 'nodo_inexistente' then 1 else 0 end as grupo, d.e ->> 'id' as id, d.ord
                from jsonb_array_elements(coalesce(v_res -> 'overrides_descartados', '[]'::jsonb)) with ordinality d (e, ord)
              union all
              select jsonb_build_object('id', k, 'motivo', 'nodo_inexistente'), 1, k, 0 from unnest(v_ov_ocultos) k) x));
  end if;
  return v_res;
end $$;

comment on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text, text, text) is 'Calcula una hoja y devuelve sólo lo que quien llama ve. El modo, completo (p_modo, el editor de la fórmula) o por su clave (p_modo_tc, la hoja), no los dos. Por origen pide cotizaciones.crear y cotizaciones.ver; con p_abierta (la de cotizacion_hoja) calcula con la versión y las tarifas de esa apertura. Con una variante en par, la opción la pone p_opcion (de una hoja nueva: sin_par, opcion_invalida, llamada_invalida con p_cotizacion) o la guardada, y mandar la variante es variante_en_par. docs/COTIZADOR.md › «En la base (4.06-2)» y «La hoja abierta (4.13-3a)».';
revoke all on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text, text, text) from public, anon;
grant execute on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text, text, text) to authenticated, service_role;
