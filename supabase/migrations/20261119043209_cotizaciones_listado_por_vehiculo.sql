-- La lista de cotizaciones agrupada por vehículo (`docs/UX.md` › «Cotizaciones»): una página de grupos y sueltas por cursor, y el nombre del modo de una página.
-- Una lectura aparte: `cotizaciones_listado()` y `cotizaciones_buscar()` no cambian su retorno.
--
-- La clave de un grupo es su cotización más reciente que quien mira ve y coincide con los filtros (la «cabeza» por la que se ordena): se recorren las
-- cotizaciones por las rutas del listado y se queda con la que no tiene otra más nueva del mismo vehículo (una sonda por cotizaciones_vehiculo_creado_idx).
-- No se lee `vehiculos`: un vehículo que quien mira no ve igual forma su grupo, y `vehiculos.cotizado_en` no sirve (nunca retrocede y cuenta lo que no se ve).

-- Un lote de las cotizaciones que quien mira ve, de la más nueva a la más vieja, por las mismas rutas e índices que `cotizaciones_listado()` (sin la del
-- vehículo) y con un tamaño propio: lo que `cotizaciones_listado_por_vehiculo()` recorre para hallar las cabezas sin pagar la cartera en cada página de 101.
-- Espejo de `cotizaciones_listado()`: si cambia una ruta, cambia la otra (L7 de `supabase/tests/areas/cotizaciones/listado-por-vehiculo.sql`).
create or replace function public._cotizaciones_lote_del_listado(
  p_tamano integer,
  p_origen uuid default null,
  p_clase public.clase_cotizacion default null,
  p_mias boolean default false,
  p_lead uuid default null,
  p_cursor_en timestamptz default null,
  p_cursor_id uuid default null,
  p_hacia_atras boolean default false
)
returns table (id uuid, vehiculo_id uuid, creado_en timestamptz)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- Un lote de `cotizaciones_listado_por_vehiculo()`: empieza en 4 × su página (4 × 51) y nunca pasa su tope de recorrido (2.020).
  v_n integer := public._acotar_pagina(p_tamano, 204, 2020);
  v_uid uuid := (select auth.uid());
  v_t uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_p uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  v_clases public.clase_cotizacion[] := case when p_clase is null then enum_range(null::public.clase_cotizacion) else array[p_clase] end;
  v_mias_en uuid[]; v_ver uuid[];
  -- Con el lead, la ruta es la del lead.
  v_final boolean := p_clase is not distinct from 'final'; v_por_lead boolean := p_lead is not null; v_todos boolean;
  v_listado boolean; v_finales boolean; v_por_origen boolean; v_origen_finales boolean; v_propias boolean; v_cartera boolean;
begin
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del listado está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_p := array(select x from unnest(v_p) x where x <> all (v_t));
  if p_origen is not null then
    v_t := case when p_origen = any (v_t) then array[p_origen] else '{}' end;
    v_p := case when p_origen = any (v_p) then array[p_origen] else '{}' end;
    v_todos := false;
  else
    v_todos := cardinality(v_t) > 0 and not exists (select 1 from public.origenes o where o.id <> all (v_t));
  end if;
  v_ver := v_t || v_p;
  v_mias_en := case when p_mias then v_ver else v_p end;
  -- La clase nunca es columna de un índice (`enum_eq` no es leakproof: bajo la RLS no sería condición de índice): la final va por sus parciales, con `'final'` literal.
  v_listado := not p_mias and not v_por_lead and v_todos and not v_final;
  v_finales := not p_mias and not v_por_lead and v_todos and v_final;
  v_por_origen := not p_mias and not v_por_lead and not v_todos and cardinality(v_t) > 0 and not v_final;
  v_origen_finales := not p_mias and not v_por_lead and not v_todos and cardinality(v_t) > 0 and v_final;
  v_propias := not v_por_lead and cardinality(v_mias_en) > 0;
  v_cartera := not p_mias and not v_por_lead and cardinality(v_p) > 0;

  if p_cursor_en is null then
    return query
    with filas as (
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_listado_idx
      union all
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_finales_idx
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.vehiculo_id, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_origen_creado_idx
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.vehiculo_id, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_origen_finales_idx
        where v_origen_finales)
      union all
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases)
        order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_creador_idx
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.vehiculo_id, c.creado_en
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases)
          order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_lead_creado_idx
        where v_cartera)
      union all
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_lead_creado_idx
    )
    select f.id, f.vehiculo_id, f.creado_en from filas f order by f.creado_en desc, f.id desc limit v_n;
  elsif not p_hacia_atras then
    return query
    with filas as (
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.vehiculo_id, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n) x
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.vehiculo_id, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n) x
        where v_origen_finales)
      union all
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
        order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.vehiculo_id, c.creado_en
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
          order by c.creado_en desc, c.id desc limit v_n) x
        where v_cartera)
      union all
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
        order by c.creado_en desc, c.id desc limit v_n))
    select f.id, f.vehiculo_id, f.creado_en from filas f order by f.creado_en desc, f.id desc limit v_n;
  else
    -- Hacia atrás: lo estrictamente anterior, en orden ascendente (`armarPagina` lo da vuelta).
    return query
    with filas as (
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.vehiculo_id, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n) x
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.vehiculo_id, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n) x
        where v_origen_finales)
      union all
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
        order by c.creado_en, c.id limit v_n)
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.vehiculo_id, c.creado_en
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
          order by c.creado_en, c.id limit v_n) x
        where v_cartera)
      union all
      (select c.id, c.vehiculo_id, c.creado_en
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
        order by c.creado_en, c.id limit v_n))
    select f.id, f.vehiculo_id, f.creado_en from filas f order by f.creado_en, f.id limit v_n;
  end if;
end $$;

revoke all on function public._cotizaciones_lote_del_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) from public, anon;
grant execute on function public._cotizaciones_lote_del_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) to authenticated;

comment on function public._cotizaciones_lote_del_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) is
  'Un lote del listado /cotizaciones (id, vehículo y alta), de la más nueva a la más vieja por cursor (hacia atrás, ascendente), con los filtros origen, clase, mías y lead: espejo de las rutas e índices de cotizaciones_listado() sin la del vehículo, de hasta 2.020 filas (204 sin pedido). Corre como quien la llama: la RLS decide. La llama cotizaciones_listado_por_vehiculo.';

-- Una página de la lista agrupada por vehículo: hasta `p_tamano` (≤ 50) + 1 entradas (`grupo` o `suelta`) por cursor `(orden_en, orden_id)` = la cabeza (la más reciente que
-- coincide) de la última entrada vista. Recorre lotes del listado (de 4 × la página, duplicándose) hasta llenar la página o leer 2.020 cotizaciones: entonces
-- suma una fila `cortada` con dónde siguió, y la pantalla ofrece «Seguir buscando». Cada grupo devuelve la cotización que lo representa (la aprobada del vehículo si
-- quien mira la ve y coincide; si no, la cabeza) y cuántas suyas coinciden, hasta 101.
create or replace function public.cotizaciones_listado_por_vehiculo(
  p_tamano integer,
  p_origen uuid default null,
  p_clase public.clase_cotizacion default null,
  p_mias boolean default false,
  p_lead uuid default null,
  p_cursor_en timestamptz default null,
  p_cursor_id uuid default null,
  p_hacia_atras boolean default false
)
returns table (
  tipo text,
  orden_en timestamptz,
  orden_id uuid,
  id uuid,
  numero bigint,
  origen_id uuid,
  lead_id uuid,
  vehiculo_id uuid,
  creado_por uuid,
  clase public.clase_cotizacion,
  estado public.estado_cotizacion,
  titulo text,
  total_base numeric,
  moneda_mostrar character,
  creado_en timestamptz,
  vence_el date,
  vencida boolean,
  grupo_n integer
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- MAXIMO_DE_PAGINA_DE_COTIZACIONES (src/modules/cotizaciones/entities/listado/listado.ts), más una para saber si hay otra.
  v_meta integer := public._acotar_pagina(p_tamano, 50, 50) + 1;
  -- Lo más que se recorre para una página: sin completarla, `cortada`.
  c_recorrido constant integer := 2020;
  v_uid uuid := (select auth.uid());
  v_clases public.clase_cotizacion[] := case when p_clase is null then enum_range(null::public.clase_cotizacion) else array[p_clase] end;
  v_ids uuid[] := array[]::uuid[];
  v_lote integer;
  v_pedidas integer;
  v_vino integer;
  v_leidas integer := 0;
  v_en timestamptz := p_cursor_en;
  v_id uuid := p_cursor_id;
  v_cortada boolean := false;
  -- Hacia adelante: los vehículos ya vistos en esta lectura y cuántas suyas se leyeron, y si se leyó todo (sin cursor y hasta el final: el conteo sale de ahí).
  v_vistos uuid[] := array[]::uuid[];
  v_cuantas integer[] := array[]::integer[];
  v_todo boolean := false;
  v_pos integer;
  v_hay boolean;
  v_zona text;
  v_dias integer;
  v_hoy date;
  r record;
begin
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del listado está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_lote := 4 * v_meta;
  loop
    v_pedidas := least(v_lote, c_recorrido - v_leidas);
    v_vino := 0;
    -- Con y sin sentido, dos consultas: cada una recorre su lote en su orden. Una cotización sin vehículo es una suelta; una con vehículo es cabeza si quien mira no
    -- ve otra más nueva del mismo vehículo que coincida. Hacia adelante se recorre de la más nueva a la más vieja: la primera de un vehículo en esta lectura es la
    -- única candidata (las siguientes tienen una más nueva que ya pasó), y sólo hace falta preguntar por las anteriores al cursor (la sonda, con `limit 1`: nunca
    -- `exists`); sin cursor, ni eso.
    if not p_hacia_atras then
      for r in
        select l.id, l.vehiculo_id, l.creado_en
          from public._cotizaciones_lote_del_listado(v_pedidas, p_origen, p_clase, p_mias, p_lead, v_en, v_id, false) l
         order by l.creado_en desc, l.id desc
      loop
        v_vino := v_vino + 1;
        v_en := r.creado_en;
        v_id := r.id;
        if r.vehiculo_id is null then
          v_ids := v_ids || r.id;
        else
          v_pos := array_position(v_vistos, r.vehiculo_id);
          if v_pos is not null then
            v_cuantas[v_pos] := v_cuantas[v_pos] + 1;
          else
            v_vistos := v_vistos || r.vehiculo_id;
            v_cuantas := v_cuantas || 1;
            v_hay := null;
            if p_cursor_en is not null then
              select true into v_hay from public.cotizaciones c2
               where c2.vehiculo_id = r.vehiculo_id and (c2.creado_en, c2.id) >= (p_cursor_en, p_cursor_id)
                 and c2.clase = any (v_clases) and (p_origen is null or c2.origen_id = p_origen)
                 and (not p_mias or c2.creado_por = v_uid) and (p_lead is null or c2.lead_id = p_lead)
               order by c2.creado_en, c2.id limit 1;  -- cotizaciones_vehiculo_creado_idx
            end if;
            if v_hay is null then
              v_ids := v_ids || r.id;
            end if;
          end if;
        end if;
        exit when cardinality(v_ids) >= v_meta;
      end loop;
    else
      for r in
        select l.id, l.vehiculo_id, l.creado_en, s.hay
          from public._cotizaciones_lote_del_listado(v_pedidas, p_origen, p_clase, p_mias, p_lead, v_en, v_id, true) l
          left join lateral (
            select true as hay from public.cotizaciones c2
             where c2.vehiculo_id = l.vehiculo_id and (c2.creado_en, c2.id) > (l.creado_en, l.id)
               and c2.clase = any (v_clases) and (p_origen is null or c2.origen_id = p_origen)
               and (not p_mias or c2.creado_por = v_uid) and (p_lead is null or c2.lead_id = p_lead)
             order by c2.creado_en, c2.id limit 1) s on true  -- cotizaciones_vehiculo_creado_idx
         order by l.creado_en, l.id
      loop
        v_vino := v_vino + 1;
        v_en := r.creado_en;
        v_id := r.id;
        if r.vehiculo_id is null or r.hay is null then
          v_ids := v_ids || r.id;
          exit when cardinality(v_ids) >= v_meta;
        end if;
      end loop;
    end if;
    v_leidas := v_leidas + v_vino;
    -- La página está llena, o el lote vino incompleto: no hay más (y, sin cursor ni página llena, se leyó todo lo que coincide).
    v_todo := not p_hacia_atras and p_cursor_en is null and cardinality(v_ids) < v_meta and v_vino < v_pedidas;
    exit when cardinality(v_ids) >= v_meta or v_vino < v_pedidas;
    if v_leidas >= c_recorrido then
      v_cortada := true;
      exit;
    end if;
    v_lote := least(2 * v_lote, c_recorrido - v_leidas);
  end loop;

  -- La vigencia, espejo de `cotizaciones_listado()`: si una cambia, cambia la otra.
  select e.zona_horaria, e.vigencia_dias into v_zona, v_dias from public.ajustes_empresa e where e.id = 1;
  v_hoy := (now() at time zone v_zona)::date;

  -- Lo derivado, sobre las ≤ 51 cabezas ya elegidas: la que representa al grupo (la aprobada que coincide, por cotizaciones_aprobadas_pkey, o la cabeza) por
  -- la PK, y el conteo acotado del grupo por cotizaciones_vehiculo_creado_idx (o lo leído, si se leyó todo). Todo con la RLS de quien mira. Cada lectura es un lateral con `limit`: así el
  -- planificador no la aplana en un hash join que recorre `cotizaciones` entera (con el plan genérico no sabe cuántas cabezas trae el arreglo).
  return query
  select case when n.vehiculo_id is null then 'suelta' else 'grupo' end,
         n.creado_en, n.id,
         h.id, h.numero, h.origen_id, h.lead_id, h.vehiculo_id, h.creado_por, h.clase, h.estado, h.titulo, h.total_base, h.moneda_mostrar, h.creado_en,
         (h.creado_en at time zone v_zona)::date + v_dias, (h.creado_en at time zone v_zona)::date + v_dias < v_hoy,
         case when n.vehiculo_id is null then null
              -- Se leyó todo lo que coincide: el conteo es lo leído de su vehículo (acotado como el otro), sin volver a pasar la RLS por sus filas.
              when v_todo then least(v_cuantas[array_position(v_vistos, n.vehiculo_id)], 101)
              else (select count(*)::integer
                      from (select 1 from public.cotizaciones c3
                             where c3.vehiculo_id = n.vehiculo_id
                               and c3.clase = any (v_clases) and (p_origen is null or c3.origen_id = p_origen)
                               and (not p_mias or c3.creado_por = v_uid) and (p_lead is null or c3.lead_id = p_lead)
                             order by c3.creado_en desc, c3.id desc limit 101) z)  -- cotizaciones_vehiculo_creado_idx
         end
    from unnest(v_ids) with ordinality u (id, k)
   cross join lateral (
     select c.id, c.vehiculo_id, c.creado_en from public.cotizaciones c where c.id = u.id limit 1  -- cotizaciones_pkey
   ) n
   cross join lateral (
     (select a.id, a.numero, a.origen_id, a.lead_id, a.vehiculo_id, a.creado_por, a.clase, a.estado, a.titulo, a.total_base, a.moneda_mostrar, a.creado_en
        from public.cotizaciones_aprobadas ap
       cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c
          where c.id = ap.cotizacion_id  -- cotizaciones_pkey
            and c.clase = any (v_clases) and (p_origen is null or c.origen_id = p_origen)
            and (not p_mias or c.creado_por = v_uid) and (p_lead is null or c.lead_id = p_lead)
          limit 1) a
       where ap.vehiculo_id = n.vehiculo_id)  -- cotizaciones_aprobadas_pkey
     union all
     (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
        from public.cotizaciones c where c.id = n.id)  -- cotizaciones_pkey
     limit 1
   ) h
   order by u.k;

  if v_cortada then
    return query
    select 'cortada'::text, v_en, v_id, null::uuid, null::bigint, null::uuid, null::uuid, null::uuid, null::uuid, null::public.clase_cotizacion,
           null::public.estado_cotizacion, null::text, null::numeric, null::character, null::timestamptz, null::date, null::boolean, null::integer;
  end if;
end $$;

revoke all on function public.cotizaciones_listado_por_vehiculo(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) from public, anon;
grant execute on function public.cotizaciones_listado_por_vehiculo(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) to authenticated;

comment on function public.cotizaciones_listado_por_vehiculo(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) is
  'Una página de la lista /cotizaciones agrupada por vehículo (docs/UX.md › «Cotizaciones»): grupos (la cabeza: la cotización más reciente de un vehículo que quien mira ve y coincide) y sueltas (sin vehículo), de la más nueva a la más vieja por cursor (orden_en, orden_id), con los filtros del listado. Recorre lotes de _cotizaciones_lote_del_listado (las rutas e índices de cotizaciones_listado()) con una sonda por cotizaciones_vehiculo_creado_idx, hasta llenar la página o leer 2.020 (entonces una fila cortada con dónde siguió). Cada grupo trae su aprobada si quien mira la ve y coincide (cotizaciones_aprobadas_pkey), si no la cabeza, y su conteo acotado a 101 (cotizaciones_vehiculo_creado_idx). No lee vehiculos. Corre como quien la llama: la RLS decide. Lo mide supabase/tests/medir-cotizaciones-listado-por-vehiculo.sql.';

-- El nombre del modo de tipo de cambio de hasta 100 cotizaciones (el «Total» de la tarjeta de la lista lo dice al lado): por la PK, con la RLS de quien
-- mira, y `_nombre_del_modo()` una vez por versión y modo. Sólo las que tienen un modo con nombre.
create or replace function public.cotizaciones_modos_de(p_ids uuid[])
returns table (id uuid, modo text)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- La lista recortada en una variable antes de la consulta: bajo la RLS, `= any (p_ids[1:100])` no entra al índice.
  v_ids uuid[] := coalesce(p_ids[1:100], array[]::uuid[]);
begin
  return query
  with filas as (
    select c.id, c.formula_id, c.modo_tc from public.cotizaciones c where c.id = any (v_ids) and c.modo_tc is not null  -- cotizaciones_pkey
  ),
  modos as (
    select d.formula_id, d.modo_tc, public._nombre_del_modo(d.formula_id, d.modo_tc) as nombre
      from (select distinct x.formula_id, x.modo_tc from filas x) d
  )
  select f.id, m.nombre from filas f join modos m on m.formula_id = f.formula_id and m.modo_tc = f.modo_tc where m.nombre is not null;
end $$;

revoke all on function public.cotizaciones_modos_de(uuid[]) from public, anon;
grant execute on function public.cotizaciones_modos_de(uuid[]) to authenticated;

comment on function public.cotizaciones_modos_de(uuid[]) is
  'El nombre del modo de tipo de cambio (_nombre_del_modo, una vez por versión y modo) de hasta 100 cotizaciones por la PK, con la RLS de quien mira: el «Total» de la tarjeta de la lista /cotizaciones. Sólo las que tienen un modo con nombre.';

-- La lista nace en tarjetas con su portada: con 100 por página no cabe en el presupuesto de nodos y bytes del listado (`docs/RENDIMIENTO.md`), así que
-- `MAXIMO_DE_PAGINA_DE_COTIZACIONES` baja a 50 y es lo que el listado y la búsqueda dan sin pedido (`scripts/guardas/paginas.test.ts`). Siguen admitiendo hasta 100
-- (lo medido): sólo cambia el valor por defecto; el resto, la definición vigente tal cual.
CREATE OR REPLACE FUNCTION "public"."cotizaciones_listado"("p_tamano" integer, "p_origen" "uuid" DEFAULT NULL::"uuid", "p_clase" "public"."clase_cotizacion" DEFAULT NULL::"public"."clase_cotizacion", "p_mias" boolean DEFAULT false, "p_vehiculo" "uuid" DEFAULT NULL::"uuid", "p_cursor_en" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid", "p_hacia_atras" boolean DEFAULT false, "p_lead" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "numero" bigint, "origen_id" "uuid", "lead_id" "uuid", "vehiculo_id" "uuid", "creado_por" "uuid", "clase" "public"."clase_cotizacion", "estado" "public"."estado_cotizacion", "titulo" "text", "total_base" numeric, "moneda_mostrar" character, "creado_en" timestamp with time zone, "vence_el" "date", "vencida" boolean)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
declare
  -- MAXIMO_DE_PAGINA_DE_COTIZACIONES (src/modules/cotizaciones/entities/listado/listado.ts) por defecto; hasta 100, lo medido; más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 50, 100) + 1;
  v_uid uuid := (select auth.uid());
  v_t uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_p uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  v_clases public.clase_cotizacion[] := case when p_clase is null then enum_range(null::public.clase_cotizacion) else array[p_clase] end;
  v_mias_en uuid[]; v_ver uuid[]; v_zona text; v_dias integer; v_hoy date;
  -- Con el lead, la ruta es la del lead y el vehículo, si llega, es un filtro sobre sus filas (4.17-4a).
  v_final boolean := p_clase is not distinct from 'final'; v_por_lead boolean := p_lead is not null; v_por_vehiculo boolean := p_vehiculo is not null and p_lead is null; v_todos boolean;
  v_listado boolean; v_finales boolean; v_por_origen boolean; v_origen_finales boolean; v_propias boolean; v_cartera boolean;
begin
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del listado está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_p := array(select x from unnest(v_p) x where x <> all (v_t));
  if p_origen is not null then
    v_t := case when p_origen = any (v_t) then array[p_origen] else '{}' end;
    v_p := case when p_origen = any (v_p) then array[p_origen] else '{}' end;
    v_todos := false;
  else
    v_todos := cardinality(v_t) > 0 and not exists (select 1 from public.origenes o where o.id <> all (v_t));
  end if;
  v_ver := v_t || v_p;
  v_mias_en := case when p_mias then v_ver else v_p end;
  -- La clase nunca es columna de un índice (`enum_eq` no es leakproof: bajo la RLS no sería condición de índice): la final va por sus parciales, con `'final'` literal.
  v_listado := not p_mias and not v_por_vehiculo and not v_por_lead and v_todos and not v_final;
  v_finales := not p_mias and not v_por_vehiculo and not v_por_lead and v_todos and v_final;
  v_por_origen := not p_mias and not v_por_vehiculo and not v_por_lead and not v_todos and cardinality(v_t) > 0 and not v_final;
  v_origen_finales := not p_mias and not v_por_vehiculo and not v_por_lead and not v_todos and cardinality(v_t) > 0 and v_final;
  v_propias := not v_por_vehiculo and not v_por_lead and cardinality(v_mias_en) > 0;
  v_cartera := not p_mias and not v_por_vehiculo and not v_por_lead and cardinality(v_p) > 0;
  select e.zona_horaria, e.vigencia_dias into v_zona, v_dias from public.ajustes_empresa e where e.id = 1;
  v_hoy := (now() at time zone v_zona)::date;

  if p_cursor_en is null then
    return query
    with filas as (
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_listado_idx
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_finales_idx
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_origen_creado_idx
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_origen_finales_idx
        where v_origen_finales)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases)
        order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_creador_idx
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases)
          order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_lead_creado_idx
        where v_cartera)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_vehiculo and c.vehiculo_id = p_vehiculo and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_vehiculo_creado_idx
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (p_vehiculo is null or c.vehiculo_id = p_vehiculo) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_lead_creado_idx
    )
    select f.*, (f.creado_en at time zone v_zona)::date + v_dias, (f.creado_en at time zone v_zona)::date + v_dias < v_hoy
      from filas f order by f.creado_en desc, f.id desc limit v_n;
  elsif not p_hacia_atras then
    return query
    with filas as (
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n) x
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n) x
        where v_origen_finales)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
        order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
          order by c.creado_en desc, c.id desc limit v_n) x
        where v_cartera)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_vehiculo and c.vehiculo_id = p_vehiculo and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (p_vehiculo is null or c.vehiculo_id = p_vehiculo) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
        order by c.creado_en desc, c.id desc limit v_n))
    select f.*, (f.creado_en at time zone v_zona)::date + v_dias, (f.creado_en at time zone v_zona)::date + v_dias < v_hoy
      from filas f order by f.creado_en desc, f.id desc limit v_n;
  else
    -- Hacia atrás: lo estrictamente anterior, en orden ascendente (`armarPagina` lo da vuelta).
    return query
    with filas as (
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n) x
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n) x
        where v_origen_finales)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
        order by c.creado_en, c.id limit v_n)
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
          order by c.creado_en, c.id limit v_n) x
        where v_cartera)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_vehiculo and c.vehiculo_id = p_vehiculo and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (p_vehiculo is null or c.vehiculo_id = p_vehiculo) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
        order by c.creado_en, c.id limit v_n))
    select f.*, (f.creado_en at time zone v_zona)::date + v_dias, (f.creado_en at time zone v_zona)::date + v_dias < v_hoy
      from filas f order by f.creado_en, f.id limit v_n;
  end if;
end $$;

CREATE OR REPLACE FUNCTION "public"."cotizaciones_buscar"("p_texto" "text", "p_tamano" integer, "p_origen" "uuid" DEFAULT NULL::"uuid", "p_clase" "public"."clase_cotizacion" DEFAULT NULL::"public"."clase_cotizacion", "p_mias" boolean DEFAULT false, "p_vehiculo" "uuid" DEFAULT NULL::"uuid", "p_lead" "uuid" DEFAULT NULL::"uuid", "p_cursor_en" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid", "p_hacia_atras" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "numero" bigint, "origen_id" "uuid", "lead_id" "uuid", "vehiculo_id" "uuid", "creado_por" "uuid", "clase" "public"."clase_cotizacion", "estado" "public"."estado_cotizacion", "titulo" "text", "total_base" numeric, "moneda_mostrar" character, "creado_en" timestamp with time zone, "vence_el" "date", "vencida" boolean, "acotada" boolean)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
#variable_conflict use_column
declare
  -- MAXIMO_DE_PAGINA_DE_COTIZACIONES (src/modules/cotizaciones/entities/listado/listado.ts) por defecto; hasta 100, lo medido; más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 50, 100) + 1;
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
  v_titulos uuid[] := '{}'::uuid[];
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
    -- Las cotizaciones por su título (T307): un ayudante definer por `cotizaciones_titulo_trgm` (bajo la RLS el `ilike` no es condición de índice) que sólo
    -- nombra las que quien busca ve, hasta v_tope + 1. Abajo se leen otra vez por la PK, bajo la RLS.
    v_titulos := public._cotizaciones_ids_por_titulo(p_texto, p_origen);
  end if;
  v_acotada := cardinality(v_leads) > v_tope or cardinality(v_vehiculos) > v_tope or cardinality(v_autores) > v_tope
               or cardinality(v_titulos) > v_tope;
  v_leads := v_leads[1:v_tope];
  v_vehiculos := v_vehiculos[1:v_tope];
  v_autores := v_autores[1:v_tope];
  v_titulos := v_titulos[1:v_tope];
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
    -- Cada cotización nombrada por su título, por la PK.
    || ' union all (select x.* from unnest($20) t (id) cross join lateral (' || v_ruta || 'c.id = t.id' || v_filtros || ') x)'
    || ') select d.id, d.numero, d.origen_id, d.lead_id, d.vehiculo_id, d.creado_por, d.clase, d.estado, d.titulo, d.total_base, d.moneda_mostrar, d.creado_en,'
    || ' (d.creado_en at time zone $14)::date + $15, (d.creado_en at time zone $14)::date + $15 < $16, $17'
    || ' from (select distinct on (f.id) f.* from filas f) d'
    || ' order by d.creado_en ' || v_sentido || ', d.id ' || v_sentido || ' limit $11'
    using b.numero, v_leads, v_vehiculos, v_autores, p_origen, v_clases, coalesce(p_mias, false), v_uid, p_vehiculo, p_lead, v_n, p_cursor_en, p_cursor_id,
          v_zona, v_dias, v_hoy, v_acotada, v_todos, v_ver || v_todos, v_titulos;
end $_$;
