-- El número de cada fase de la cadena para `/logistica`: cuántos vehículos hay, cuántos están demorados y cuántos trabados. Un conteo con tope
-- por índice (`limit tope + 1` sobre `vehiculos_cadena_idx`, «1.000+»), no una tabla resumen mantenida por triggers: el costo depende de las fases
-- por 1.001 entradas y no de la tabla, el número siempre está fresco (la demora depende del reloj) y respeta el alcance de quien mira; una tabla
-- resumen pondría una fila caliente en cada mover y en cada lote de 200, y seguiría necesitando el conteo vivo para «propios».
-- Con el alcance «propios» cuenta sobre `_logistica_lo_propio` (hasta 10.001 ids) en una sola pasada.
-- Pruebas: supabase/tests/areas/mover/resumen.sql; medición: medir-logistica.sql.

create function public.logistica_cadena_resumen(p_origen uuid, p_tope integer default 1000) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_n integer := public._acotar_pagina(p_tope, 1000, 1000);
  v_alcance public.alcance_permiso;
  v_todos boolean;
  v_propios uuid[] := '{}'::uuid[];
  v_cortado boolean := false;
  v_cuentas jsonb := '{}'::jsonb;
  v_filas jsonb := '[]'::jsonb;
  v_vehiculos jsonb; v_demorados jsonb; v_trabados jsonb;
  c integer; d integer; t integer;
  v_sig uuid; v_ids uuid[]; v_id uuid;
  r record;
begin
  if p_origen is null then
    raise exception 'Falta el origen.' using errcode = '22023', hint = 'p_origen';
  end if;
  v_alcance := public._logistica_alcance(p_origen);
  if v_alcance is null then
    raise exception 'No tienes acceso a la logística de este origen.' using errcode = '42501', hint = 'acceso';
  end if;
  v_todos := v_alcance = 'todos';

  if not v_todos then
    -- Una sola pasada sobre lo propio (acotado por la cartera de la persona): vehiculos_pkey por cada id.
    v_propios := public._logistica_lo_propio(p_origen);
    v_cortado := cardinality(v_propios) > 10000;
    -- Los días con que alerta cada fase se calculan una vez por fase (materializados): unidos fila a fila, `_logistica_dias` se pagaba por vehículo.
    with d as materialized (
      select f.id, public._logistica_dias(f.id) as dias
        from public.fases f join public.flujos fl on fl.id = f.flujo_id
       where fl.ambito = 'vehiculos' and fl.origen_id = p_origen),
    m as materialized (
      select v.fase_id, v.fase_desde from unnest(v_propios[1:10000]) as u(id) join public.vehiculos v on v.id = u.id)
    select coalesce(jsonb_object_agg(g.k, jsonb_build_object('n', g.n, 'dem', g.dem)), '{}'::jsonb) into v_cuentas
      from (select coalesce(m.fase_id::text, 'sin') as k, count(*) as n,
                   count(*) filter (where d.dias is not null and m.fase_desde < now() - make_interval(days => d.dias)) as dem
              from m left join d on d.id = m.fase_id
             group by 1) g;
  end if;

  for r in
    select null::uuid as id, null::text as nombre, null::text as color, null::smallint as orden, null::boolean as activa, false as es_final,
           null::integer as dias, 0 as k
    union all
    select f.id, f.nombre, f.color, f.orden, f.activa, f.es_final, public._logistica_dias(f.id), 1
      from public.fases f join public.flujos fl on fl.id = f.flujo_id
     where fl.ambito = 'vehiculos' and fl.origen_id = p_origen and f.es_logistica
     order by k, 5 desc nulls last, 4, 1
  loop
    -- Los vehículos de la fase (o de «Sin fase»).
    if v_todos then
      if r.id is null then
        -- vehiculos_cadena_idx (parcial: sin las no ganadas): origen_id fijo, fase_id is null (fase_desde también es nulo).
        select count(*) into c from (select 1 from public.vehiculos v
                                      where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada'
                                        and v.fase_id is null and v.fase_desde is null
                                      order by v.fase_id, v.fase_desde, v.id
                                      limit v_n + 1) x;
      else
        -- vehiculos_cadena_idx: (origen_id, fase_id) fijos. El `order by` es el del índice: sin él el planificador puede preferir recorrer vehiculos_fase_id_idx.
        select count(*) into c from (select 1 from public.vehiculos v
                                      where v.origen_id = p_origen and v.fase_id = r.id and v.eliminado_en is null and v.situacion <> 'no_ganada'
                                      order by v.fase_id, v.fase_desde, v.id
                                      limit v_n + 1) x;
      end if;
      v_vehiculos := jsonb_build_object('n', least(c, v_n), 'hay_mas', c > v_n);
    else
      c := coalesce((v_cuentas -> coalesce(r.id::text, 'sin') ->> 'n')::integer, 0);
      v_vehiculos := jsonb_build_object('n', least(c, v_n), 'hay_mas', c > v_n or v_cortado);
    end if;

    -- «Sin fase» y una jubilada sólo con vehículos.
    continue when c = 0 and (r.id is null or not r.activa);

    v_demorados := null; v_trabados := null;
    if r.id is not null and r.dias is not null then
      if v_todos then
        -- vehiculos_cadena_idx: (origen_id, fase_id) fijos, rango de fase_desde.
        select count(*) into d from (select 1 from public.vehiculos v
                                      where v.origen_id = p_origen and v.fase_id = r.id and v.eliminado_en is null and v.situacion <> 'no_ganada'
                                        and v.fase_desde < now() - make_interval(days => r.dias)
                                      order by v.fase_id, v.fase_desde, v.id
                                      limit v_n + 1) x;
        v_demorados := jsonb_build_object('n', least(d, v_n), 'hay_mas', d > v_n);
      else
        d := coalesce((v_cuentas -> r.id::text ->> 'dem')::integer, 0);
        v_demorados := jsonb_build_object('n', least(d, v_n), 'hay_mas', d > v_n or v_cortado);
      end if;

      -- Trabados: de las primeras 50 demoradas, las que no cumplen un requisito bloqueante de su fase siguiente.
      t := 0;
      if d > 0 then
        select f2.id into v_sig
          from public.fases_transiciones tr join public.fases f2 on f2.id = tr.a_fase_id
         where tr.de_fase_id = r.id and f2.activa
         order by f2.orden, f2.id limit 1;
        if v_sig is not null and exists (select 1 from public.fases_requisitos fr where fr.fase_id = v_sig and fr.bloqueante) then
          if v_todos then
            -- vehiculos_cadena_idx: (origen_id, fase_id) fijos, rango de fase_desde.
            v_ids := array(select v.id from public.vehiculos v
                            where v.origen_id = p_origen and v.fase_id = r.id and v.eliminado_en is null and v.situacion <> 'no_ganada'
                              and v.fase_desde < now() - make_interval(days => r.dias)
                            order by v.fase_desde, v.id limit 50);
          else
            v_ids := array(select v.id from unnest(v_propios[1:10000]) as u(id) join public.vehiculos v on v.id = u.id
                            where v.fase_id = r.id and v.fase_desde < now() - make_interval(days => r.dias)
                            order by v.fase_desde, v.id limit 50);
          end if;
          foreach v_id in array v_ids loop
            if exists (select 1 from public.evaluar_requisitos(v_id, null, v_sig) q where q.bloqueante and not q.cumplido) then
              t := t + 1;
            end if;
          end loop;
        end if;
      end if;
      v_trabados := jsonb_build_object('n', t, 'hay_mas', d > 50 or (not v_todos and v_cortado));
    end if;

    v_filas := v_filas || jsonb_build_array(jsonb_build_object(
      'fase_id', r.id, 'nombre', r.nombre, 'color', r.color, 'orden', r.orden, 'activa', r.activa, 'es_final', r.es_final,
      'demora_dias', r.dias, 'vehiculos', v_vehiculos, 'demorados', v_demorados, 'trabados', v_trabados));
  end loop;

  return jsonb_build_object('fases', v_filas);
end;
$$;

revoke all on function public.logistica_cadena_resumen(uuid, integer) from public, anon;
grant execute on function public.logistica_cadena_resumen(uuid, integer) to authenticated, service_role;

comment on function public.logistica_cadena_resumen(uuid, integer) is 'El número de cada fase de la cadena de logística de un origen: {fases: [{fase_id, nombre, color, orden, activa, es_final, demora_dias, vehiculos: {n, hay_mas}, demorados: {n, hay_mas} | null, trabados: {n, hay_mas} | null}]}. Conteo con tope por vehiculos_cadena_idx (limit tope + 1; _acotar_pagina 1.000/1.000), nunca un total. «Sin fase» (fase_id nulo) primero y sólo con vehículos; activas con es_logistica por orden; jubiladas al final y sólo con vehículos. Demorados sólo si la fase alerta (regla alerta_demora); trabados = de las primeras 50 demoradas, las que no cumplen un requisito bloqueante de su fase siguiente (hay_mas si quedaron sin mirar). Con el alcance «propios» cuenta sobre _logistica_lo_propio. Definer: el alcance es el menor de logistica.ver y vehiculos.ver (42501 hint acceso si no lo hay). No cuenta las no ganadas.';
