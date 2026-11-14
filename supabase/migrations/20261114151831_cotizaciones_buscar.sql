-- La búsqueda del listado `/cotizaciones`: por número, por cliente, por vehículo (título, VIN o lote) y por quien la creó. Es una función aparte de
-- `cotizaciones_listado()` (que queda como está) porque cada fuente es una ruta propia por su índice y el texto no es una condición de índice bajo la RLS.
--
-- Invocadora: la RLS de `cotizaciones` decide qué se ve (policy «cotizaciones: leer»), la de `leads` (por `leads_candidatos()` y `leads_vista_por_ids()`) qué clientes
-- se pueden nombrar y la de `vehiculos` qué vehículos; quien no ve a un lead o a un vehículo no encuentra por él. Cada fuente da a lo sumo `v_tope` ids (el más
-- nuevo primero); si alguna se pasó, `acotada` lo dice (el listado avisa «afina la búsqueda»). De cada id sale una página por su índice (`cotizaciones_numero_key`,
-- `cotizaciones_lead_creado_idx`, `cotizaciones_vehiculo_creado_idx`, `cotizaciones_creador_idx`) y todas se funden en el orden del listado
-- (`creado_en desc, id desc`), sin repetir, con su cursor.

create or replace function public.cotizaciones_buscar(
  p_texto text,
  p_tamano integer,
  p_origen uuid default null,
  p_clase public.clase_cotizacion default null,
  p_mias boolean default false,
  p_vehiculo uuid default null,
  p_lead uuid default null,
  p_cursor_en timestamptz default null,
  p_cursor_id uuid default null,
  p_hacia_atras boolean default false
) returns table (
  id uuid, numero bigint, origen_id uuid, lead_id uuid, vehiculo_id uuid, creado_por uuid, clase public.clase_cotizacion, estado public.estado_cotizacion,
  titulo text, total_base numeric, moneda_mostrar character, creado_en timestamptz, vence_el date, vencida boolean, acotada boolean
)
language plpgsql stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- MAXIMO_DE_PAGINA_DE_COTIZACIONES (src/modules/cotizaciones/entities/listado/listado.ts), más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 100, 100) + 1;
  -- TOPE_DE_COINCIDENCIAS (src/modules/cotizaciones/entities/listado/listado.ts): cuántos clientes, vehículos o autores nombra una búsqueda.
  v_tope constant integer := 50;
  v_uid uuid := (select auth.uid());
  -- Los orígenes donde quien busca ve «todos» y todos los que ve: lo ajeno sólo se busca por autor donde ve «todos» (abajo).
  v_todos uuid[] := coalesce((select public.origenes_con_alcance('cotizaciones.ver', 'todos')), '{}');
  v_ver uuid[] := coalesce((select public.origenes_con_alcance('cotizaciones.ver', 'propios')), '{}');
  b record;
  v_patron text;
  v_candidatos uuid[];
  v_leads uuid[] := '{}'::uuid[];
  v_vehiculos uuid[] := '{}'::uuid[];
  v_autores uuid[] := '{}'::uuid[];
  v_acotada boolean;
  v_clases public.clase_cotizacion[] := case when p_clase is null then enum_range(null::public.clase_cotizacion) else array[p_clase] end;
  v_zona text; v_dias integer; v_hoy date;
  v_sentido text := case when p_hacia_atras then 'asc' else 'desc' end;
  v_cursor text := case
    when p_cursor_en is null then ''
    when p_hacia_atras then 'and (c.creado_en, c.id) > ($12, $13)'
    else 'and (c.creado_en, c.id) < ($12, $13)' end;
  v_filtros text;
  v_columnas constant text := 'c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en';
  v_ruta text;
begin
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del listado está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  if v_uid is null then
    return;
  end if;
  -- Qué se busca: un número (con o sin #) y/o un texto de 3 letras o dígitos seguidos (`_buscador_interpretar`, el mismo mínimo del buscador).
  select i.numero, i.texto into b from public._buscador_interpretar(p_texto) i;
  if b.numero is null and b.texto is null then
    return;
  end if;
  if b.texto is not null then
    v_patron := '%' || replace(replace(replace(b.texto, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    -- Los clientes: la ventana de `leads_candidatos()` (índice de trigramas de `leads.nombre`) con sólo el texto, pasada por `leads_vista_por_ids()`: la RLS de
    -- leads es el único filtro. Sin `leads.ver` no hay candidatos.
    v_candidatos := array(
      select j.x::uuid
        from jsonb_array_elements_text(public.leads_candidatos(jsonb_build_object('texto', b.texto, 'sentido', 'siguiente')) -> 'ids') with ordinality j (x, o)
       order by j.o);
    v_leads := array(
      select u.id from unnest(v_candidatos) with ordinality u (id, o)
       where u.id in (select v.id from public.leads_vista_por_ids(v_candidatos) v)
       order by u.o limit v_tope + 1);
    -- Los vehículos que quien busca ve, por origen, por `vehiculos_origen_listado_idx (origen_id, creado_en desc, id desc) where eliminado_en is null`.
    v_vehiculos := array(
      select v.id
        from unnest(public.origenes_con_alcance('vehiculos.ver', 'propios')) o (id)
       cross join lateral (
         select x.id, x.creado_en from public.vehiculos x
          where x.origen_id = o.id and x.eliminado_en is null
            and (x.titulo ilike v_patron or x.vin ilike v_patron or x.lote ilike v_patron)
          order by x.creado_en desc, x.id desc
          limit v_tope + 1) v
       order by v.creado_en desc, v.id desc
       limit v_tope + 1);
    -- Las personas del equipo por nombre (decenas de filas: sin índice propio), sin tildes.
    v_autores := array(
      select p.id from public.perfiles p
       where public._sin_tildes(p.nombre) ilike public._sin_tildes(v_patron)
       order by p.nombre, p.id
       limit v_tope + 1);
  end if;
  v_acotada := cardinality(v_leads) > v_tope or cardinality(v_vehiculos) > v_tope or cardinality(v_autores) > v_tope;
  v_leads := v_leads[1:v_tope];
  v_vehiculos := v_vehiculos[1:v_tope];
  v_autores := v_autores[1:v_tope];
  select e.zona_horaria, e.vigencia_dias into v_zona, v_dias from public.ajustes_empresa e where e.id = 1;
  v_hoy := (now() at time zone v_zona)::date;
  -- Lo que todas las rutas comparten: los filtros del listado y el cursor. Los valores van por `using`.
  v_filtros := ' and c.clase = any ($6) and ($5 is null or c.origen_id = $5) and (not $7 or c.creado_por = $8) and ($9 is null or c.vehiculo_id = $9) and ($10 is null or c.lead_id = $10) '
    || v_cursor || ' order by c.creado_en ' || v_sentido || ', c.id ' || v_sentido || ' limit $11';
  v_ruta := 'select ' || v_columnas || ' from public.cotizaciones c where ';
  return query execute
    'with filas as ('
    -- El número, por `cotizaciones_numero_key`.
    || '(' || v_ruta || 'c.numero = $1' || v_filtros || ')'
    -- Cada cliente, por `cotizaciones_lead_creado_idx (lead_id, creado_en desc, id desc)`.
    || ' union all (select x.* from unnest($2) l (id) cross join lateral (' || v_ruta || 'c.lead_id = l.id' || v_filtros || ') x)'
    -- Cada vehículo, por `cotizaciones_vehiculo_creado_idx (vehiculo_id, creado_en desc, id desc) where eliminado_en is null`.
    || ' union all (select x.* from unnest($3) v (id) cross join lateral (' || v_ruta || 'c.vehiculo_id = v.id' || v_filtros || ') x)'
    -- Cada autor, por `cotizaciones_creador_idx (creado_por, creado_en desc, id desc) where eliminado_en is null`. Las propias, en todo lo que se ve; las de otra persona, sólo donde se
    -- ve «todos»: con «propios» se verían las de su cartera, y encontrarlas pagaría `en_cartera()` por cada cotización de esa persona (7.000 de un asesor: 98 ms y 6.900 llamadas
    -- para no encontrar nada). Sin ningún origen donde buscar, ni se lee el índice; si no, `origen_id = any(...)` (un operador seguro) corre antes que la RLS.
    || ' union all (select x.* from unnest($4) a (id) cross join lateral (select o from (select case when a.id = $8 then $19 else $18 end as o) y where cardinality(y.o) > 0) z cross join lateral ('
    || v_ruta || 'c.creado_por = a.id and c.origen_id = any (z.o)' || v_filtros || ') x)'
    || ') select d.id, d.numero, d.origen_id, d.lead_id, d.vehiculo_id, d.creado_por, d.clase, d.estado, d.titulo, d.total_base, d.moneda_mostrar, d.creado_en,'
    || ' (d.creado_en at time zone $14)::date + $15, (d.creado_en at time zone $14)::date + $15 < $16, $17'
    || ' from (select distinct on (f.id) f.* from filas f) d'
    || ' order by d.creado_en ' || v_sentido || ', d.id ' || v_sentido || ' limit $11'
    using b.numero, v_leads, v_vehiculos, v_autores, p_origen, v_clases, coalesce(p_mias, false), v_uid, p_vehiculo, p_lead, v_n, p_cursor_en, p_cursor_id,
          v_zona, v_dias, v_hoy, v_acotada, v_todos, v_ver || v_todos;
end $$;

revoke all on function public.cotizaciones_buscar(text, integer, uuid, public.clase_cotizacion, boolean, uuid, uuid, timestamptz, uuid, boolean) from public, anon, authenticated;
grant execute on function public.cotizaciones_buscar(text, integer, uuid, public.clase_cotizacion, boolean, uuid, uuid, timestamptz, uuid, boolean) to authenticated, service_role;

comment on function public.cotizaciones_buscar(text, integer, uuid, public.clase_cotizacion, boolean, uuid, uuid, timestamptz, uuid, boolean) is
  'La búsqueda del listado /cotizaciones: por número exacto (cotizaciones_numero_key), por cliente (leads_candidatos y leads_vista_por_ids, cotizaciones_lead_creado_idx), por vehículo (título, VIN o lote, vehiculos_origen_listado_idx y cotizaciones_vehiculo_creado_idx) y por quien la creó (por nombre en perfiles, cotizaciones_creador_idx), de la más nueva a la más vieja (creado_en desc, id desc), sin repetir, por cursor y con los filtros del listado. Invocadora: la RLS decide qué se ve y qué se puede nombrar. Cada fuente nombra hasta 50 ids (el más nuevo primero); acotada dice si alguna se pasó. Por autor, la de otra persona sólo se busca donde se ve «todos» (con «propios» se verían las de la cartera, a un en_cartera() por cotización). Mínimo de _buscador_interpretar. Lo mide supabase/tests/medir-cotizaciones-buscar.sql.';
