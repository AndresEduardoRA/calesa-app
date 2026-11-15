-- La bandeja del día de `/logistica`: lo que le toca hoy a quien mira, en siete grupos (demorados, trabados, documentos por aprobar, documentos por
-- vencer, llegadas esperadas, salen hoy y subastas sin resolver), cada uno por cursor y con su conteo con tope. Una RPC (`logistica_bandeja_grupo`)
-- despacha a un ayudante por grupo; cada ayudante lee con su índice y su `limit`. Quien mira ve lo de los orígenes que ve (el menor de logistica.ver y
-- vehiculos.ver; por aprobar y por vencer, además su permiso de documentos); con el alcance «propios» parte de `_logistica_lo_propio` y nunca lee
-- `vehiculos.lead_id`. «Hoy» es el día de la empresa, como `documentos_vencimientos()`. Nada cuenta las subastas no ganadas.
-- La bandeja de Inicio (`logistica_bandeja`) no cambia.
-- Pruebas: supabase/tests/areas/alertas/bandeja-del-dia.sql; medición: medir-logistica.sql.

-- 1. Los índices de las llegadas y las salidas (el resto de las rutas ya tiene el suyo).
create index transportes_llegadas_idx on public.transportes (eta_el, id)
  where arribo_el is null and vehiculo_id is not null and eta_el is not null;
comment on index public.transportes_llegadas_idx is 'Llegadas esperadas de la bandeja del día: los transportes de un vehículo con ETA y sin arribo, recorridos hacia atrás desde hoy.';
create index transportes_salidas_idx on public.transportes (zarpe_el, id)
  where vehiculo_id is not null and zarpe_el is not null;
comment on index public.transportes_salidas_idx is 'Salen hoy de la bandeja del día: los transportes de un vehículo con zarpe, por fecha.';

-- 1b. Los requisitos de una unidad se evalúan por su índice. `evaluar_requisitos` contaba los documentos aprobados de la unidad con
-- `vehiculo_id is not distinct from p_vehiculo`, que no usa un índice: cada llamada recorría los documentos de todas las unidades, y los trabados de la
-- bandeja la llaman por cada demorada. Mismo resultado (un documento es de un vehículo o de un ítem), por documentos_unidad_tipo_idx.
CREATE OR REPLACE FUNCTION "public"."evaluar_requisitos"("p_vehiculo" "uuid", "p_repuesto" "uuid", "p_fase" "uuid") RETURNS TABLE("requisito_id" "uuid", "tipo" "public"."tipo_requisito", "bloqueante" boolean, "descripcion" "text", "cumplido" boolean, "detalle" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r record; n int; ok boolean; d jsonb; v_padre uuid; v_hijos int; v_hijos_ok int; v_sin_llegar int;
begin
  for r in select q.*, td.nombre as tipo_doc_nombre, td.formatos as tipo_doc_formatos, fe.nombre as espera_nombre
           from public.fases_requisitos q
           left join public.tipos_documento td on td.id = q.tipo_documento_id
           left join public.fases fe on fe.id = q.espera_fase_id
           where q.fase_id = p_fase order by q.orden loop
    d := '{}'::jsonb;
    if r.tipo = 'documento' then
      -- documentos_unidad_tipo_idx (vehiculo_id, tipo_documento_id, estado) o documentos_repuesto_idx: la unidad es un vehículo o un ítem (uno y sólo uno), así
      -- que se pregunta por la columna de la que viene, no con `is not distinct from`, que no usa el índice y recorría los documentos de todas las unidades.
      if p_vehiculo is not null then
        select count(*) into n from public.documentos doc
        where doc.vehiculo_id = p_vehiculo and doc.repuesto_id is null
          and doc.tipo_documento_id = r.tipo_documento_id and doc.estado = 'aprobado' and doc.eliminado_en is null
          and (doc.vence_el is null or doc.vence_el >= current_date)
          and (r.formatos is null or doc.mime is null or doc.mime = any (r.formatos));
      else
        select count(*) into n from public.documentos doc
        where doc.repuesto_id = p_repuesto and doc.vehiculo_id is null
          and doc.tipo_documento_id = r.tipo_documento_id and doc.estado = 'aprobado' and doc.eliminado_en is null
          and (doc.vence_el is null or doc.vence_el >= current_date)
          and (r.formatos is null or doc.mime is null or doc.mime = any (r.formatos));
      end if;
      ok := n >= coalesce(r.min_archivos, 1) and (r.max_archivos is null or n <= r.max_archivos);
      d := jsonb_build_object('aprobados', n, 'min', coalesce(r.min_archivos, 1), 'max', r.max_archivos, 'tipo_documento_id', r.tipo_documento_id);
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Documento: ' || r.tipo_doc_nombre; cumplido := ok; detalle := d;
      return next;
    elsif r.tipo = 'dato' then
      ok := public._requisito_dato_cumplido(p_vehiculo, p_repuesto, r.clave_dato, r.config);
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Dato: ' || r.clave_dato; cumplido := ok; detalle := coalesce(r.config, '{}'::jsonb) || jsonb_build_object('clave_dato', r.clave_dato);
      return next;
    elsif r.tipo = 'espera' then
      if r.espera_ambito = 'hijos' then
        -- vehículo espera a sus repuestos (los en stock no cuentan). Sin hijos = no aplica = cumple. Un ítem que terminó sin llegar (en una fase
        -- final que no es la esperada: «Perdido») no frena (8.08-1, C10): cuenta en `sin_llegar`. La regla vive en `_repuesto_ante_espera`.
        select count(*), count(*) filter (where e.estado = 'llego'), count(*) filter (where e.estado = 'sin_llegar')
          into v_hijos, v_hijos_ok, v_sin_llegar
        from public.repuestos_items i join public.repuestos_proyectos pr on pr.id = i.proyecto_id
        cross join lateral (select public._repuesto_ante_espera(i.id, r.espera_fase_id) as estado) e
        where pr.vehiculo_id = p_vehiculo and i.eliminado_en is null and i.en_stock_desde is null and pr.eliminado_en is null;
        ok := v_hijos = v_hijos_ok + v_sin_llegar;
        d := jsonb_build_object('hijos', v_hijos, 'llegaron', v_hijos_ok, 'sin_llegar', v_sin_llegar);
      else
        select pr.vehiculo_id into v_padre from public.repuestos_items i join public.repuestos_proyectos pr on pr.id = i.proyecto_id where i.id = p_repuesto;
        ok := v_padre is null or public.unidad_llego_a_fase(v_padre, null, r.espera_fase_id);
        d := jsonb_build_object('padre', v_padre);
      end if;
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Espera: ' || r.espera_nombre; cumplido := ok; detalle := d;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.evaluar_requisitos(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.evaluar_requisitos(uuid, uuid, uuid) to service_role;

-- 2. Los ayudantes comunes.
create function public._bandeja_dia_hoy() returns date
  language sql stable security definer
  set search_path = ''
as $$
  select (now() at time zone e.zona_horaria)::date from public.ajustes_empresa e where e.id = 1;
$$;
revoke all on function public._bandeja_dia_hoy() from public, anon, authenticated;
grant execute on function public._bandeja_dia_hoy() to service_role;

-- Los orígenes que quien mira ve en la bandeja (el menor de logistica.ver y vehiculos.ver y, si hay clave, también esa), en cuáles lo ve todo y,
-- de los demás, lo propio (hasta 10.001 ids por origen).
create function public._bandeja_dia_alcance(p_clave text)
  returns table (origenes uuid[], todos uuid[], propios uuid[])
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_o uuid[]; v_t uuid[]; v_p uuid[] := '{}'::uuid[]; o uuid;
begin
  if (select auth.uid()) is null then
    return query select '{}'::uuid[], '{}'::uuid[], '{}'::uuid[];
    return;
  end if;
  select coalesce(array_agg(x.o), '{}'::uuid[]), coalesce(array_agg(x.o) filter (where x.alc = 'todos' and x.ex = 'todos'), '{}'::uuid[])
    into v_o, v_t
    from (select fl.origen_id as o, public._logistica_alcance(fl.origen_id) as alc,
                 case when p_clave is null then 'todos'::public.alcance_permiso else public.alcance_de(p_clave, fl.origen_id) end as ex
            from public.flujos fl where fl.ambito = 'vehiculos' and fl.origen_id is not null) x
   where x.alc is not null and x.ex is not null;
  foreach o in array v_o loop
    if o <> all (v_t) then
      v_p := v_p || public._logistica_lo_propio(o);
    end if;
  end loop;
  return query select v_o, v_t, v_p;
end;
$$;
revoke all on function public._bandeja_dia_alcance(text) from public, anon, authenticated;
grant execute on function public._bandeja_dia_alcance(text) to service_role;

-- Las primeras p_n filas de un arreglo json, en su orden.
create function public._bandeja_dia_recortar(p_filas jsonb, p_n integer) returns jsonb
  language sql immutable
  set search_path = ''
as $$
  select coalesce(jsonb_agg(z.e order by z.i), '[]'::jsonb) from jsonb_array_elements(p_filas) with ordinality z(e, i) where z.i <= p_n;
$$;
revoke all on function public._bandeja_dia_recortar(jsonb, integer) from public, anon, authenticated;
grant execute on function public._bandeja_dia_recortar(jsonb, integer) to service_role;

-- 3. Demorados: por par (origen, fase que alerta). Orden y cursor: (vence = fase_desde + días, id).
create function public._bandeja_dia_demorados(p_leer integer, p_desde timestamptz, p_id uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  a record; r record; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance(null);
  -- Los orígenes donde lo ve todo: una consulta por par, por su índice.
  for r in
    select fl.origen_id as o, f.id as f, f.nombre, x.dias
      from public.flujos fl
      join public.fases f on f.flujo_id = fl.id
      cross join lateral (select public._logistica_dias(f.id) as dias) x
     where fl.ambito = 'vehiculos' and fl.origen_id = any (a.todos) and x.dias is not null
  loop
    if p_desde is null then
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): (origen_id, fase_id) fijos, rango de fase_desde.
      select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'origen_id', r.o, 'titulo', y.titulo, 'fase_id', r.f, 'fase', r.nombre,
               'fase_desde', y.fase_desde, 'situacion', y.situacion, 'dias', r.dias,
               'clave_desde', y.fase_desde + make_interval(days => r.dias), 'clave_id', y.id) order by y.fase_desde, y.id), '[]'::jsonb)
        into v_parte
        from (select v.id, v.titulo, v.fase_desde, v.situacion from public.vehiculos v
               where v.origen_id = r.o and v.fase_id = r.f and v.eliminado_en is null and v.situacion <> 'no_ganada'
                 and v.fase_desde < now() - make_interval(days => r.dias)
               order by v.fase_desde, v.id limit p_leer) y;
    else
      -- Lo mismo, desde el cursor (fase_desde, id); la fecha del cursor es el vencimiento, y el de un par se resta con sus días.
      select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'origen_id', r.o, 'titulo', y.titulo, 'fase_id', r.f, 'fase', r.nombre,
               'fase_desde', y.fase_desde, 'situacion', y.situacion, 'dias', r.dias,
               'clave_desde', y.fase_desde + make_interval(days => r.dias), 'clave_id', y.id) order by y.fase_desde, y.id), '[]'::jsonb)
        into v_parte
        from (select v.id, v.titulo, v.fase_desde, v.situacion from public.vehiculos v
               where v.origen_id = r.o and v.fase_id = r.f and v.eliminado_en is null and v.situacion <> 'no_ganada'
                 and v.fase_desde < now() - make_interval(days => r.dias)
                 and (v.fase_desde, v.id) > (p_desde - make_interval(days => r.dias), p_id)
               order by v.fase_desde, v.id limit p_leer) y;
    end if;
    v_filas := v_filas || v_parte;
  end loop;

  -- Los orígenes donde ve lo propio: una sola pasada sobre sus ids (vehiculos_pkey), con el cursor sobre la fila. Los vehículos propios se leen primero
  -- (materializados) y recién después se unen a los pares: unidos a la vez, el planificador recorría `vehiculos` entera por el origen.
  if cardinality(a.propios) > 0 then
    with q as materialized (
      -- Los pares (origen, fase que alerta) de lo propio, con sus días: pocos, y `_logistica_dias` se paga una vez por par y no por vehículo.
      select fl.origen_id as o, f.id as f, f.nombre, x.dias
        from public.flujos fl
        join public.fases f on f.flujo_id = fl.id
        cross join lateral (select public._logistica_dias(f.id) as dias) x
       where fl.ambito = 'vehiculos' and fl.origen_id = any (a.origenes) and fl.origen_id <> all (a.todos) and x.dias is not null),
    m as materialized (
      select v.id, v.titulo, v.origen_id, v.fase_id, v.fase_desde, v.situacion
        from unnest(a.propios) as u(id)
        join public.vehiculos v on v.id = u.id
       where v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is not null)
    select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'origen_id', y.origen_id, 'titulo', y.titulo, 'fase_id', y.fase_id, 'fase', y.nombre,
             'fase_desde', y.fase_desde, 'situacion', y.situacion, 'dias', y.dias, 'clave_desde', y.vence, 'clave_id', y.id)
             order by y.vence, y.id), '[]'::jsonb)
      into v_parte
      from (select m.id, m.titulo, m.origen_id, m.fase_id, q.nombre, m.fase_desde, m.situacion, q.dias,
                   m.fase_desde + make_interval(days => q.dias) as vence
              from m
              join q on q.o = m.origen_id and q.f = m.fase_id
             where m.fase_desde < now() - make_interval(days => q.dias)
               and (p_desde is null or (m.fase_desde + make_interval(days => q.dias), m.id) > (p_desde, p_id))
             order by vence, m.id
             limit p_leer) y;
    v_filas := v_filas || v_parte;
  end if;

  -- Las partes se juntan y se ordenan: son pocas (un par por origen y fase, cada una de a lo sumo p_leer).
  select coalesce(jsonb_agg(z.e order by (z.e ->> 'clave_desde')::timestamptz, (z.e ->> 'clave_id')::uuid), '[]'::jsonb) into v_parte
    from (select e from jsonb_array_elements(v_filas) e
           order by (e ->> 'clave_desde')::timestamptz, (e ->> 'clave_id')::uuid limit p_leer) z;
  return jsonb_build_object('filas', v_parte, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_demorados(integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_demorados(integer, timestamptz, uuid) to service_role;

-- 4. Trabados: recorre los demorados en el mismo orden y evalúa hasta 200 por llamada. Una demorada está trabada si le falta un requisito
-- bloqueante para su fase siguiente (la primera transición activa por orden).
create function public._bandeja_dia_trabados(p_leer integer, p_desde timestamptz, p_id uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  -- TOPE_DE_EVALUADAS: las demoradas que se evalúan por llamada, de una sola lectura (cada lectura de lo propio paga una pasada por sus ids).
  c_tope constant integer := 200;
  c_lote constant integer := 200;
  v_desde timestamptz := p_desde; v_id uuid := p_id;
  v_lote jsonb; v_filas jsonb := '[]'::jsonb; v_cache jsonb := '{}'::jsonb; v_ultimo jsonb := null;
  v_eval integer := 0; e jsonb; v_sig uuid; v_sig_nombre text; v_motivo text;
begin
  loop
    v_lote := (public._bandeja_dia_demorados(c_lote, v_desde, v_id)) -> 'filas';
    exit when jsonb_array_length(v_lote) = 0;
    for e in select x from jsonb_array_elements(v_lote) x loop
      v_eval := v_eval + 1;
      v_ultimo := jsonb_build_object('desde', e -> 'clave_desde', 'id', e -> 'clave_id');
      if not v_cache ? (e ->> 'fase_id') then
        select f.id, f.nombre into v_sig, v_sig_nombre
          from public.fases_transiciones t join public.fases f on f.id = t.a_fase_id
         where t.de_fase_id = (e ->> 'fase_id')::uuid and f.activa
         order by f.orden, f.id limit 1;
        v_cache := v_cache || jsonb_build_object(e ->> 'fase_id',
          case when v_sig is null then 'null'::jsonb else jsonb_build_object('id', v_sig, 'nombre', v_sig_nombre) end);
      end if;
      v_sig := (v_cache -> (e ->> 'fase_id') ->> 'id')::uuid;
      v_sig_nombre := v_cache -> (e ->> 'fase_id') ->> 'nombre';
      continue when v_sig is null;
      select q.descripcion into v_motivo
        from public.evaluar_requisitos((e ->> 'id')::uuid, null, v_sig) q join public.fases_requisitos fr on fr.id = q.requisito_id
       where q.bloqueante and not q.cumplido
       order by fr.orden, fr.id limit 1;
      continue when v_motivo is null;
      v_filas := v_filas || jsonb_build_array(e || jsonb_build_object('fase_siguiente', v_sig_nombre, 'motivo', v_motivo));
      if jsonb_array_length(v_filas) >= p_leer then
        return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
      end if;
    end loop;
    exit when jsonb_array_length(v_lote) < c_lote;
    if v_eval >= c_tope then
      return jsonb_build_object('filas', v_filas, 'cortada', true, 'ultimo', v_ultimo);
    end if;
    v_desde := (v_ultimo ->> 'desde')::timestamptz; v_id := (v_ultimo ->> 'id')::uuid;
  end loop;
  return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_trabados(integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_trabados(integer, timestamptz, uuid) to service_role;

-- 5. Documentos por aprobar. Orden y cursor: (creado_en, id).
create function public._bandeja_dia_por_aprobar(p_leer integer, p_desde timestamptz, p_id uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  c_lote constant integer := 200; c_tope constant integer := 2000;
  a record; v_d timestamptz := p_desde; v_i uuid := p_id; v_ids uuid[]; v_leidas integer := 0; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance('logistica.documentos.aprobar');
  if cardinality(a.origenes) = 0 then
    return jsonb_build_object('filas', '[]'::jsonb, 'cortada', false, 'ultimo', null);
  end if;
  loop
    if v_i is null then
      -- documentos_por_revisar_idx (creado_en, id) where subido y vivo: una cola corta.
      v_ids := array(select d.id from public.documentos d where d.estado = 'subido' and d.eliminado_en is null
                      order by d.creado_en, d.id limit c_lote);
    else
      v_ids := array(select d.id from public.documentos d where d.estado = 'subido' and d.eliminado_en is null and (d.creado_en, d.id) > (v_d, v_i)
                      order by d.creado_en, d.id limit c_lote);
    end if;
    exit when cardinality(v_ids) = 0;
    v_leidas := v_leidas + cardinality(v_ids);
    select d.creado_en, d.id into v_d, v_i from public.documentos d where d.id = any (v_ids) order by d.creado_en desc, d.id desc limit 1;
    -- De las leídas, las que quien mira ve (por su clave primaria).
    select coalesce(jsonb_agg(jsonb_build_object('documento_id', d.id, 'vehiculo_id', d.vehiculo_id, 'origen_id', v.origen_id, 'titulo', v.titulo,
             'tipo', t.nombre, 'creado_en', d.creado_en, 'clave_desde', d.creado_en, 'clave_id', d.id) order by d.creado_en, d.id), '[]'::jsonb)
      into v_parte
      from public.documentos d
      join public.vehiculos v on v.id = d.vehiculo_id
      join public.tipos_documento t on t.id = d.tipo_documento_id
     where d.id = any (v_ids) and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.origen_id = any (a.origenes)
       and (v.origen_id = any (a.todos) or v.id in (select p from unnest(a.propios) p));
    v_filas := v_filas || v_parte;
    if jsonb_array_length(v_filas) >= p_leer then
      return jsonb_build_object('filas', public._bandeja_dia_recortar(v_filas, p_leer), 'cortada', false, 'ultimo', null);
    end if;
    exit when cardinality(v_ids) < c_lote;
    if v_leidas >= c_tope then
      return jsonb_build_object('filas', v_filas, 'cortada', true, 'ultimo', jsonb_build_object('desde', v_d, 'id', v_i));
    end if;
  end loop;
  return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_por_aprobar(integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_por_aprobar(integer, timestamptz, uuid) to service_role;

-- 6. Documentos por vencer: aprobados que vencen entre hoy y hoy + el aviso de su tipo (renovar o solicitar). Orden y cursor: (vence_el, id).
create function public._bandeja_dia_por_vencer(p_leer integer, p_desde timestamptz, p_id uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  c_lote constant integer := 200; c_tope constant integer := 2000;
  a record; v_hoy date := public._bandeja_dia_hoy(); v_max integer;
  v_d date := (p_desde at time zone 'UTC')::date; v_i uuid := p_id; v_ids uuid[]; v_leidas integer := 0; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance('logistica.documentos.subir');
  select max(t.aviso_dias) into v_max from public.tipos_documento t where t.modo_vencimiento in ('renovar', 'solicitar') and t.aviso_dias is not null;
  if cardinality(a.origenes) = 0 or v_hoy is null or v_max is null then
    return jsonb_build_object('filas', '[]'::jsonb, 'cortada', false, 'ultimo', null);
  end if;
  loop
    if v_i is null then
      -- documentos_vencen_idx (vence_el) where aprobado y vivo: el rango [hoy, hoy + el mayor aviso].
      v_ids := array(select x.id from public.documentos x
                      where x.estado = 'aprobado' and x.eliminado_en is null and x.vence_el is not null and x.vence_el between v_hoy and v_hoy + v_max
                      order by x.vence_el, x.id limit c_lote);
    else
      v_ids := array(select x.id from public.documentos x
                      where x.estado = 'aprobado' and x.eliminado_en is null and x.vence_el is not null and x.vence_el between v_hoy and v_hoy + v_max
                        and (x.vence_el, x.id) > (v_d, v_i)
                      order by x.vence_el, x.id limit c_lote);
    end if;
    exit when cardinality(v_ids) = 0;
    v_leidas := v_leidas + cardinality(v_ids);
    select x.vence_el, x.id into v_d, v_i from public.documentos x where x.id = any (v_ids) order by x.vence_el desc, x.id desc limit 1;
    select coalesce(jsonb_agg(jsonb_build_object('documento_id', d.id, 'vehiculo_id', d.vehiculo_id, 'origen_id', v.origen_id, 'titulo', v.titulo,
             'tipo', t.nombre, 'vence_el', d.vence_el, 'modo', t.modo_vencimiento,
             'clave_desde', d.vence_el::timestamp at time zone 'UTC', 'clave_id', d.id) order by d.vence_el, d.id), '[]'::jsonb)
      into v_parte
      from public.documentos d
      join public.tipos_documento t on t.id = d.tipo_documento_id
      join public.vehiculos v on v.id = d.vehiculo_id
     where d.id = any (v_ids) and t.modo_vencimiento in ('renovar', 'solicitar') and t.aviso_dias is not null and d.vence_el - t.aviso_dias <= v_hoy
       and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.origen_id = any (a.origenes)
       and (v.origen_id = any (a.todos) or v.id in (select p from unnest(a.propios) p));
    v_filas := v_filas || v_parte;
    if jsonb_array_length(v_filas) >= p_leer then
      return jsonb_build_object('filas', public._bandeja_dia_recortar(v_filas, p_leer), 'cortada', false, 'ultimo', null);
    end if;
    exit when cardinality(v_ids) < c_lote;
    if v_leidas >= c_tope then
      return jsonb_build_object('filas', v_filas, 'cortada', true,
                                'ultimo', jsonb_build_object('desde', v_d::timestamp at time zone 'UTC', 'id', v_i));
    end if;
  end loop;
  return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_por_vencer(integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_por_vencer(integer, timestamptz, uuid) to service_role;

-- 7. Llegadas esperadas: ETA de hoy o anterior, sin arribo, con la fase no final; de la más reciente a la más vieja. Orden y cursor: (eta_el desc, id desc).
create function public._bandeja_dia_llegadas(p_leer integer, p_desde timestamptz, p_id uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  c_lote constant integer := 200; c_tope constant integer := 2000;
  a record; v_hoy date := public._bandeja_dia_hoy();
  v_d date := (p_desde at time zone 'UTC')::date; v_i uuid := p_id; v_ids uuid[]; v_leidas integer := 0; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance(null);
  if cardinality(a.origenes) = 0 or v_hoy is null then
    return jsonb_build_object('filas', '[]'::jsonb, 'cortada', false, 'ultimo', null);
  end if;
  loop
    if v_i is null then
      -- transportes_llegadas_idx (eta_el, id) where sin arribo, de un vehículo y con ETA: hacia atrás desde hoy.
      v_ids := array(select t.id from public.transportes t
                      where t.arribo_el is null and t.vehiculo_id is not null and t.eta_el is not null and t.eta_el <= v_hoy
                      order by t.eta_el desc, t.id desc limit c_lote);
    else
      v_ids := array(select t.id from public.transportes t
                      where t.arribo_el is null and t.vehiculo_id is not null and t.eta_el is not null and t.eta_el <= v_hoy
                        and (t.eta_el, t.id) < (v_d, v_i)
                      order by t.eta_el desc, t.id desc limit c_lote);
    end if;
    exit when cardinality(v_ids) = 0;
    v_leidas := v_leidas + cardinality(v_ids);
    select t.eta_el, t.id into v_d, v_i from public.transportes t where t.id = any (v_ids) order by t.eta_el, t.id limit 1;
    select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', v.id, 'origen_id', v.origen_id, 'titulo', v.titulo, 'fase', f.nombre,
             'eta_el', t.eta_el, 'contenedor', t.contenedor, 'clave_desde', t.eta_el::timestamp at time zone 'UTC', 'clave_id', t.id)
             order by t.eta_el desc, t.id desc), '[]'::jsonb)
      into v_parte
      from public.transportes t
      join public.vehiculos v on v.id = t.vehiculo_id
      join public.fases f on f.id = v.fase_id
     where t.id = any (v_ids) and not f.es_final and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.origen_id = any (a.origenes)
       and (v.origen_id = any (a.todos) or v.id in (select p from unnest(a.propios) p));
    v_filas := v_filas || v_parte;
    if jsonb_array_length(v_filas) >= p_leer then
      return jsonb_build_object('filas', public._bandeja_dia_recortar(v_filas, p_leer), 'cortada', false, 'ultimo', null);
    end if;
    exit when cardinality(v_ids) < c_lote;
    if v_leidas >= c_tope then
      return jsonb_build_object('filas', v_filas, 'cortada', true,
                                'ultimo', jsonb_build_object('desde', v_d::timestamp at time zone 'UTC', 'id', v_i));
    end if;
  end loop;
  return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_llegadas(integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_llegadas(integer, timestamptz, uuid) to service_role;

-- 8. Salen hoy: zarpe de hoy (el día de la empresa). No hay zarpe real, así que no se detecta uno atrasado. Orden y cursor: (zarpe_el, id).
create function public._bandeja_dia_salidas(p_leer integer, p_desde timestamptz, p_id uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  c_lote constant integer := 200; c_tope constant integer := 2000;
  a record; v_hoy date := public._bandeja_dia_hoy();
  v_i uuid := p_id; v_ids uuid[]; v_leidas integer := 0; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance(null);
  if cardinality(a.origenes) = 0 or v_hoy is null then
    return jsonb_build_object('filas', '[]'::jsonb, 'cortada', false, 'ultimo', null);
  end if;
  loop
    if v_i is null then
      -- transportes_salidas_idx (zarpe_el, id) where de un vehículo y con zarpe: el día de hoy.
      v_ids := array(select t.id from public.transportes t
                      where t.vehiculo_id is not null and t.zarpe_el = v_hoy
                      order by t.id limit c_lote);
    else
      v_ids := array(select t.id from public.transportes t
                      where t.vehiculo_id is not null and t.zarpe_el = v_hoy and t.id > v_i
                      order by t.id limit c_lote);
    end if;
    exit when cardinality(v_ids) = 0;
    v_leidas := v_leidas + cardinality(v_ids);
    select x into v_i from unnest(v_ids) x order by x desc limit 1;
    select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', v.id, 'origen_id', v.origen_id, 'titulo', v.titulo, 'fase', f.nombre,
             'zarpe_el', t.zarpe_el, 'booking', t.booking, 'contenedor', t.contenedor,
             'clave_desde', t.zarpe_el::timestamp at time zone 'UTC', 'clave_id', t.id) order by t.id), '[]'::jsonb)
      into v_parte
      from public.transportes t
      join public.vehiculos v on v.id = t.vehiculo_id
      left join public.fases f on f.id = v.fase_id
     where t.id = any (v_ids) and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.origen_id = any (a.origenes)
       and (v.origen_id = any (a.todos) or v.id in (select p from unnest(a.propios) p));
    v_filas := v_filas || v_parte;
    if jsonb_array_length(v_filas) >= p_leer then
      return jsonb_build_object('filas', public._bandeja_dia_recortar(v_filas, p_leer), 'cortada', false, 'ultimo', null);
    end if;
    exit when cardinality(v_ids) < c_lote;
    if v_leidas >= c_tope then
      return jsonb_build_object('filas', v_filas, 'cortada', true,
                                'ultimo', jsonb_build_object('desde', v_hoy::timestamp at time zone 'UTC', 'id', v_i));
    end if;
  end loop;
  return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_salidas(integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_salidas(integer, timestamptz, uuid) to service_role;

-- 9. Subastas sin resolver: de la más vieja a la más nueva. Orden y cursor: (creado_en, id).
create function public._bandeja_dia_sin_resolver(p_leer integer, p_desde timestamptz, p_id uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  a record; o uuid; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance(null);
  foreach o in array a.todos loop
    if p_desde is null then
      -- vehiculos_situacion_idx (origen_id, situacion, creado_en desc, id desc), recorrido hacia atrás.
      select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', y.id, 'origen_id', o, 'titulo', y.titulo, 'creado_en', y.creado_en,
               'clave_desde', y.creado_en, 'clave_id', y.id) order by y.creado_en, y.id), '[]'::jsonb)
        into v_parte
        from (select v.id, v.titulo, v.creado_en from public.vehiculos v
               where v.origen_id = o and v.situacion = 'sin_resolver' and v.eliminado_en is null
               order by v.creado_en, v.id limit p_leer) y;
    else
      select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', y.id, 'origen_id', o, 'titulo', y.titulo, 'creado_en', y.creado_en,
               'clave_desde', y.creado_en, 'clave_id', y.id) order by y.creado_en, y.id), '[]'::jsonb)
        into v_parte
        from (select v.id, v.titulo, v.creado_en from public.vehiculos v
               where v.origen_id = o and v.situacion = 'sin_resolver' and v.eliminado_en is null and (v.creado_en, v.id) > (p_desde, p_id)
               order by v.creado_en, v.id limit p_leer) y;
    end if;
    v_filas := v_filas || v_parte;
  end loop;
  if cardinality(a.propios) > 0 then
    select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', y.id, 'origen_id', y.origen_id, 'titulo', y.titulo, 'creado_en', y.creado_en,
             'clave_desde', y.creado_en, 'clave_id', y.id) order by y.creado_en, y.id), '[]'::jsonb)
      into v_parte
      from (select v.id, v.titulo, v.origen_id, v.creado_en
              from unnest(a.propios) as u(id)
              join public.vehiculos v on v.id = u.id
             where v.situacion = 'sin_resolver' and v.eliminado_en is null and v.origen_id = any (a.origenes) and v.origen_id <> all (a.todos)
               and (p_desde is null or (v.creado_en, v.id) > (p_desde, p_id))
             order by v.creado_en, v.id limit p_leer) y;
    v_filas := v_filas || v_parte;
  end if;
  select coalesce(jsonb_agg(z.e order by (z.e ->> 'clave_desde')::timestamptz, (z.e ->> 'clave_id')::uuid), '[]'::jsonb) into v_parte
    from (select e from jsonb_array_elements(v_filas) e
           order by (e ->> 'clave_desde')::timestamptz, (e ->> 'clave_id')::uuid limit p_leer) z;
  return jsonb_build_object('filas', v_parte, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_sin_resolver(integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_sin_resolver(integer, timestamptz, uuid) to service_role;

-- 10. La RPC: valida, despacha al grupo y arma la respuesta. Cada ruta lee max(tope, conteo) + 1 claves; el JSON de la fila sólo de las primeras `tope`.
create function public.logistica_bandeja_grupo(
  p_grupo text, p_tope integer default 20, p_conteo integer default null, p_desde timestamptz default null, p_id uuid default null
) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_n integer := public._acotar_pagina(p_tope, 20, 50);
  v_c integer := case when p_conteo is null or p_desde is not null then null else public._acotar_pagina(p_conteo, 100, 100) end;
  v_leer integer;
  r jsonb; v_leidas integer; v_cortada boolean; v_siguiente jsonb := null;
begin
  v_leer := greatest(v_n, coalesce(v_c, 0)) + 1;
  if p_grupo is null or p_grupo not in ('demorados', 'trabados', 'por_aprobar', 'por_vencer', 'llegadas', 'salidas', 'sin_resolver') then
    raise exception 'Ese grupo de la bandeja no existe.' using errcode = '22023', hint = 'p_grupo';
  end if;
  if (p_desde is null) <> (p_id is null) then
    raise exception 'El cursor del grupo no es válido.' using errcode = '22023', hint = 'cursor';
  end if;
  if (select auth.uid()) is null then
    return jsonb_build_object('filas', '[]'::jsonb, 'hay_mas', false, 'siguiente', null, 'cortada', false, 'conteo', null);
  end if;
  r := case p_grupo
    when 'demorados' then public._bandeja_dia_demorados(v_leer, p_desde, p_id)
    when 'trabados' then public._bandeja_dia_trabados(v_leer, p_desde, p_id)
    when 'por_aprobar' then public._bandeja_dia_por_aprobar(v_leer, p_desde, p_id)
    when 'por_vencer' then public._bandeja_dia_por_vencer(v_leer, p_desde, p_id)
    when 'llegadas' then public._bandeja_dia_llegadas(v_leer, p_desde, p_id)
    when 'salidas' then public._bandeja_dia_salidas(v_leer, p_desde, p_id)
    else public._bandeja_dia_sin_resolver(v_leer, p_desde, p_id)
  end;
  v_leidas := jsonb_array_length(r -> 'filas');
  v_cortada := coalesce((r ->> 'cortada')::boolean, false);
  if v_leidas > v_n then
    v_siguiente := jsonb_build_object('desde', r -> 'filas' -> (v_n - 1) -> 'clave_desde', 'id', r -> 'filas' -> (v_n - 1) -> 'clave_id');
  elsif v_cortada then
    v_siguiente := r -> 'ultimo';
  end if;
  return jsonb_build_object(
    'filas', (select coalesce(jsonb_agg(z.e - 'clave_desde' - 'clave_id' order by z.i), '[]'::jsonb)
                from jsonb_array_elements(r -> 'filas') with ordinality z(e, i) where z.i <= v_n),
    'hay_mas', v_leidas > v_n,
    'siguiente', v_siguiente,
    'cortada', v_cortada and v_leidas <= v_n,
    'conteo', case when v_c is null then null
                   else jsonb_build_object('n', least(v_leidas, v_c), 'hay_mas', v_leidas > v_c or v_cortada) end);
end;
$$;
revoke all on function public.logistica_bandeja_grupo(text, integer, integer, timestamptz, uuid) from public, anon;
grant execute on function public.logistica_bandeja_grupo(text, integer, integer, timestamptz, uuid) to authenticated, service_role;

comment on function public.logistica_bandeja_grupo(text, integer, integer, timestamptz, uuid) is 'Un grupo de la bandeja del día de logística (demorados, trabados, por_aprobar, por_vencer, llegadas, salidas, sin_resolver): {filas, hay_mas, siguiente: {desde, id} | null, cortada, conteo: {n, hay_mas} | null}. Por cursor (p_desde, p_id; los dos o ninguno), _acotar_pagina(p_tope, 20, 50); el conteo (hasta p_conteo, 100) sólo sin cursor. Lo de los orígenes que quien mira ve (el menor de logistica.ver y vehiculos.ver; por_aprobar además logistica.documentos.aprobar, por_vencer además logistica.documentos.subir); con «propios», lo suyo y lo de su cartera. Sin las no ganadas ni la papelera. cortada = la base paró de recorrer (trabados: 200 evaluadas; documentos y transportes: 2.000 leídas) y siguiente dice por dónde seguir. Grupo inválido 22023 hint p_grupo; cursor a medias 22023 hint cursor.';
