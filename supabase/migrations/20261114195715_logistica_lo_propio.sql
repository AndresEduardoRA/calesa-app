-- Lo propio de una persona en la cadena de logística sin recorrer la fase. Con el alcance «propios» (lo creado por quien mira o de un lead de su
-- cartera) la columna de una fase evaluaba el predicado por cada fila de la fase: un pedido que crecía con la tabla cuando lo propio es escaso.
-- `_logistica_lo_propio` junta, una vez por llamada, hasta 10.001 ids propios de un origen (la cartera de una persona lo acota) y la columna
-- parte de ese conjunto. Es el único lugar que lee `vehiculos.lead_id` para el alcance (supabase/tests/auditoria-leads.sql).
-- Pruebas: supabase/tests/areas/mover/cadena.sql (CA2) y areas/situacion/cuenta.sql (C4); medición: medir-logistica.sql.

create function public._logistica_lo_propio(p_origen uuid) returns uuid[]
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or p_origen is null then
    return '{}'::uuid[];
  end if;
  -- El conjunto se corta siempre por el mismo orden (lo más nuevo primero): con más de 10.001 propios, la página de un cursor se arma sobre lo mismo que la anterior.
  return array(
    select x.id from (
      -- vehiculos_creador_idx (creado_por, origen_id, creado_en desc, id desc).
      (select v.id, v.creado_en from public.vehiculos v
        where v.creado_por = v_uid and v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada'
        order by v.creado_en desc, v.id desc
        limit 10001)
      union
      -- leads_asesores_usuario_vigente_idx (usuario_id, lead_id) y vehiculos_lead_id_idx.
      (select v.id, v.creado_en from public.leads_asesores la
         join public.vehiculos v on v.lead_id = la.lead_id
        where la.usuario_id = v_uid and la.revocado_en is null
          and v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada'
        order by v.creado_en desc, v.id desc
        limit 10001)
    ) x
    order by x.creado_en desc, x.id desc
    limit 10001);
end;
$$;

revoke all on function public._logistica_lo_propio(uuid) from public, anon, authenticated;
grant execute on function public._logistica_lo_propio(uuid) to service_role;

comment on function public._logistica_lo_propio(uuid) is 'Hasta 10.001 ids de lo propio de quien mira en un origen: lo que creó (vehiculos_creador_idx) y lo de los leads de su cartera (leads_asesores_usuario_vigente_idx, vehiculos_lead_id_idx), vivo y sin las no ganadas. Un 10.001.º dice que se cortó.';

CREATE OR REPLACE FUNCTION "public"."_logistica_columna"("p_origen" "uuid", "p_fase" "uuid", "p_desde" timestamp with time zone, "p_id" "uuid", "p_n" integer, "p_f" "jsonb", "p_todos" boolean, "p_dias" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_patron text := p_f ->> 'patron';
  v_prefijo text := p_f ->> 'prefijo';
  v_cont text := p_f ->> 'contenedor';
  v_book text := p_f ->> 'booking';
  v_nav uuid := (p_f ->> 'naviera')::uuid;
  v_apr boolean := coalesce((p_f ->> 'por_aprobar')::boolean, false);
  v_trans boolean := (p_f ->> 'naviera') is not null or (p_f ->> 'contenedor') is not null or (p_f ->> 'booking') is not null;
  v_corte timestamptz := 'infinity'::timestamptz;
  v_ids uuid[];
  v_tarjetas jsonb;
begin
  if coalesce((p_f ->> 'demoradas')::boolean, false) then
    if p_fase is null or p_dias is null then
      return jsonb_build_object('tarjetas', '[]'::jsonb, 'hay_mas', false);
    end if;
    v_corte := now() - make_interval(days => p_dias);
  end if;

  if p_todos then
    if p_fase is not null and p_id is null then
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): (origen_id, fase_id) fijos, rango de fase_desde.
      v_ids := array(
        select v.id from public.vehiculos v
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = p_fase and v.fase_desde < v_corte
           and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
                 and (v_book is null or upper(t.booking) = v_book)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_id, v.fase_desde, v.id
         limit p_n + 1);
    elsif p_fase is not null then
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): (origen_id, fase_id) fijos, desde el cursor (fase_desde, id).
      v_ids := array(
        select v.id from public.vehiculos v
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = p_fase and v.fase_desde < v_corte
           and (v.fase_desde, v.id) > (p_desde, p_id)
           and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
                 and (v_book is null or upper(t.booking) = v_book)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_id, v.fase_desde, v.id
         limit p_n + 1);
    elsif p_id is null then
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): origen_id fijo, fase_id is null (fase_desde también es nulo), por id.
      v_ids := array(
        select v.id from public.vehiculos v
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null
           and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
                 and (v_book is null or upper(t.booking) = v_book)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_id, v.fase_desde, v.id
         limit p_n + 1);
    else
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): origen_id fijo, fase_id is null, desde el cursor id.
      v_ids := array(
        select v.id from public.vehiculos v
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null
           and v.id > p_id
           and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
                 and (v_book is null or upper(t.booking) = v_book)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_id, v.fase_desde, v.id
         limit p_n + 1);
    end if;
  else
    if p_fase is not null and p_id is null then
      -- Sólo lo propio: parte de _logistica_lo_propio (vehiculos_creador_idx y leads_asesores_usuario_vigente_idx, hasta 10.001) y lee cada fila por vehiculos_pkey. (origen_id, fase_id) fijos, rango de fase_desde.
      v_ids := array(
        select v.id from unnest(public._logistica_lo_propio(p_origen)) as u(id)
         join public.vehiculos v on v.id = u.id
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = p_fase and v.fase_desde < v_corte
           and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
                 and (v_book is null or upper(t.booking) = v_book)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_desde, v.id
         limit p_n + 1);
    elsif p_fase is not null then
      -- Sólo lo propio: parte de _logistica_lo_propio (vehiculos_creador_idx y leads_asesores_usuario_vigente_idx, hasta 10.001) y lee cada fila por vehiculos_pkey. (origen_id, fase_id) fijos, desde el cursor (fase_desde, id).
      v_ids := array(
        select v.id from unnest(public._logistica_lo_propio(p_origen)) as u(id)
         join public.vehiculos v on v.id = u.id
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = p_fase and v.fase_desde < v_corte
           and (v.fase_desde, v.id) > (p_desde, p_id)
           and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
                 and (v_book is null or upper(t.booking) = v_book)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_desde, v.id
         limit p_n + 1);
    elsif p_id is null then
      -- Sólo lo propio: parte de _logistica_lo_propio (vehiculos_creador_idx y leads_asesores_usuario_vigente_idx, hasta 10.001) y lee cada fila por vehiculos_pkey. origen_id fijo, fase_id is null (fase_desde también es nulo), por id.
      v_ids := array(
        select v.id from unnest(public._logistica_lo_propio(p_origen)) as u(id)
         join public.vehiculos v on v.id = u.id
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null
           and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
                 and (v_book is null or upper(t.booking) = v_book)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.id
         limit p_n + 1);
    else
      -- Sólo lo propio: parte de _logistica_lo_propio (vehiculos_creador_idx y leads_asesores_usuario_vigente_idx, hasta 10.001) y lee cada fila por vehiculos_pkey. origen_id fijo, fase_id is null, desde el cursor id.
      v_ids := array(
        select v.id from unnest(public._logistica_lo_propio(p_origen)) as u(id)
         join public.vehiculos v on v.id = u.id
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null
           and v.id > p_id
           and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
                 and (v_book is null or upper(t.booking) = v_book)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.id
         limit p_n + 1);
    end if;
  end if;

  -- La tarjeta, sobre las filas ya leídas (por su clave primaria y `transportes_vehiculo_id_key`).
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', v.id, 'titulo', v.titulo, 'vin', v.vin, 'lote', v.lote, 'fase_desde', v.fase_desde, 'situacion', v.situacion,
           'demorada', coalesce(p_dias > 0 and v.fase_desde < now() - make_interval(days => p_dias), false),
           'contenedor', t.contenedor, 'booking', t.booking, 'eta_el', t.eta_el) order by u.k), '[]'::jsonb)
    into v_tarjetas
    from unnest(v_ids[1:p_n]) with ordinality as u(id, k)
    join public.vehiculos v on v.id = u.id
    left join public.transportes t on t.vehiculo_id = v.id;

  return jsonb_build_object('tarjetas', v_tarjetas, 'hay_mas', coalesce(cardinality(v_ids), 0) > p_n);
end;
$$;

revoke all on function "public"."_logistica_columna"("p_origen" "uuid", "p_fase" "uuid", "p_desde" timestamp with time zone, "p_id" "uuid", "p_n" integer, "p_f" "jsonb", "p_todos" boolean, "p_dias" integer) from public, anon, authenticated;
grant execute on function "public"."_logistica_columna"("p_origen" "uuid", "p_fase" "uuid", "p_desde" timestamp with time zone, "p_id" "uuid", "p_n" integer, "p_f" "jsonb", "p_todos" boolean, "p_dias" integer) to service_role;
