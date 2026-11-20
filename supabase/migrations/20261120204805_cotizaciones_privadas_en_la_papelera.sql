-- Cotizaciones privadas en la papelera (glosario: «Cotización privada»; docs/COTIZADOR.md › «Cotizaciones privadas»): una privada ajena no existe para quien
-- no puede verla, tampoco en la papelera. La policy «cotizaciones: leer» exige estar fuera de la papelera, así que estas funciones definer llevan la regla
-- escrita: el lote de la pantalla y su cuenta, la sonda de la lista de lotes, un lote, la lista por tipo, y las respuestas de restaurar y purgar (que actúan
-- sobre todo el lote, como el job, pero no nombran lo que quien llama no ve).

CREATE OR REPLACE FUNCTION "public"."_cotizaciones_papelera_lote_json"("p_lote" "public"."lotes_papelera", "p_dias" integer, "p_yo" "uuid", "p_primeros" integer) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select jsonb_build_object(
    'id', p_lote.id, 'actualizado_en', p_lote.actualizado_en, 'creado_en', p_lote.creado_en,
    'creado_por_nombre', (select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = p_lote.creado_por),
    'es_mio', p_lote.creado_por is not distinct from p_yo,
    'purga_el', p_lote.creado_en + make_interval(days => p_dias),
    'enviados', coalesce((p_lote.resumen ->> 'cantidad')::int, 0),
    -- Un lote tiene a lo sumo 200 (por `cotizaciones_lote_papelera_idx`); sin `p_primeros`, todas.
    'cotizaciones', (
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'numero', c.numero, 'titulo', coalesce(c.titulo, 'Cotización #' || c.numero), 'clase', c.clase, 'origen_id', c.origen_id,
        'creado_en', c.creado_en) order by c.numero)
      from public.cotizaciones c
      where c.id = any (array(select c0.id from public.cotizaciones c0
                                where c0.lote_papelera_id = p_lote.id and c0.eliminado_en is not null
                                  -- Una privada ajena (glosario: «Cotización privada») no existe para quien no puede verla, tampoco en la papelera.
                                  and (not c0.privada or c0.creado_por = p_yo or public.tiene_permiso('cotizaciones.privadas.ver', c0.origen_id))
                                order by c0.numero limit p_primeros))),
    -- Cuántas quedan en la papelera, exacto: un lote tiene a lo sumo 200 (contado sobre 201 para la guarda de escala).
    'en_papelera', (select count(*) from (select 1 from public.cotizaciones c where c.lote_papelera_id = p_lote.id
                                           and c.eliminado_en is not null
                                           and (not c.privada or c.creado_por = p_yo or public.tiene_permiso('cotizaciones.privadas.ver', c.origen_id)) limit 201) n));
$$;

CREATE OR REPLACE FUNCTION "public"."cotizaciones_papelera_listar"("p_antes_en" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_antes_id" "uuid" DEFAULT NULL::"uuid", "p_hacia_atras" boolean DEFAULT false, "p_tope" integer DEFAULT 6, "p_primeros" integer DEFAULT 20) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); v_n int := public._acotar_pagina(p_tope, 6, 51);
        v_primeros int := public._acotar_pagina(p_primeros, 20, 200); v_ids uuid[];
begin
  perform public.assert_activo();
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_todo := public.tiene_permiso('cotizaciones.papelera.purgar');
  -- Las tres por `lotes_papelera_tipo_idx` (tipo, creado_en desc, id desc) where pendientes: sin cursor, hacia adelante y hacia atrás. «Le queda alguna en
  -- la papelera» es una sonda por lote (`cotizaciones_lote_papelera_idx`, `limit 1`) y no un `exists`: con pocas en la papelera, el `exists` del plan genérico
  -- se vuelve un semi join que lee entero ese índice (crece con la papelera, no con la página; medido en el 4.24-1a, `medir-escala.sql`).
  if p_antes_en is null then
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'cotizaciones' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and (select true from public.cotizaciones c where c.lote_papelera_id = l.id
           and (not c.privada or c.creado_por = v_yo or public.tiene_permiso('cotizaciones.privadas.ver', c.origen_id))
           and c.eliminado_en is not null limit 1)
      order by l.creado_en desc, l.id desc limit v_n);
  elsif not coalesce(p_hacia_atras, false) then
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'cotizaciones' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and (l.creado_en, l.id) < (p_antes_en, p_antes_id)
        and (select true from public.cotizaciones c where c.lote_papelera_id = l.id
           and (not c.privada or c.creado_por = v_yo or public.tiene_permiso('cotizaciones.privadas.ver', c.origen_id))
           and c.eliminado_en is not null limit 1)
      order by l.creado_en desc, l.id desc limit v_n);
  else
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'cotizaciones' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and (l.creado_en, l.id) > (p_antes_en, p_antes_id)
        and (select true from public.cotizaciones c where c.lote_papelera_id = l.id
           and (not c.privada or c.creado_por = v_yo or public.tiene_permiso('cotizaciones.privadas.ver', c.origen_id))
           and c.eliminado_en is not null limit 1)
      order by l.creado_en, l.id limit v_n);
  end if;
  return coalesce((
    select jsonb_agg(public._cotizaciones_papelera_lote_json(l, v_dias, v_yo, v_primeros) order by o.ord)
    from unnest(v_ids) with ordinality o (id, ord) join public.lotes_papelera l on l.id = o.id), '[]'::jsonb);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."cotizaciones_papelera_lote"("p_lote" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); l public.lotes_papelera;
begin
  perform public.assert_activo();
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_todo := public.tiene_permiso('cotizaciones.papelera.purgar');
  select * into l from public.lotes_papelera x
   where x.id = p_lote and x.tipo = 'cotizaciones' and x.purgado_en is null and x.restaurado_en is null
     and (v_todo or x.creado_por = v_yo)
     and exists (select 1 from public.cotizaciones y where y.lote_papelera_id = x.id and y.eliminado_en is not null
                   and (not y.privada or y.creado_por = v_yo or public.tiene_permiso('cotizaciones.privadas.ver', y.origen_id)));
  if not found then
    return null;
  end if;
  return public._cotizaciones_papelera_lote_json(l, v_dias, v_yo, null);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."papelera_listar"("p_tipo" "public"."tipo_lote_papelera") RETURNS TABLE("registro_id" "uuid", "titulo" "text", "borrado_en" timestamp with time zone, "borrado_por" "uuid", "lote_id" "uuid", "purga_el" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_dias int;
begin
  perform public.assert_activo();
  perform public._papelera_solo_cotizaciones(p_tipo);
  select papelera_dias into v_dias from public.ajustes_empresa where id = 1;
  return query select c.id, coalesce(c.titulo, 'Cotización #' || c.numero), c.eliminado_en, c.eliminado_por, c.lote_papelera_id, c.eliminado_en + make_interval(days => v_dias)
    from public.cotizaciones c where c.eliminado_en is not null and (c.eliminado_por = (select auth.uid()) or public.tiene_permiso('cotizaciones.papelera.purgar'))
       and (not c.privada or c.creado_por = (select auth.uid()) or public.tiene_permiso('cotizaciones.privadas.ver', c.origen_id));
end;
$$;

CREATE OR REPLACE FUNCTION "public"."_papelera_restaurar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c record; v_vehiculo uuid; v_lead uuid; v_clase public.clase_cotizacion; v_vehiculo_fuera boolean; v_lead_fuera boolean;
  v_motivo text; v_restriccion text; v_quedan int; v_version timestamptz;
  v_restaurados jsonb := '[]'::jsonb; v_pendientes jsonb := '[]'::jsonb;
  -- Las privadas ajenas del lote (glosario: «Cotización privada»): se restauran o purgan con él, pero la respuesta no las nombra.
  v_ocultas uuid[] := '{}'::uuid[];
begin
  -- 0. Antes de tomar cotización alguna, sus leads y después sus vehículos, por id (cotizaciones_lote_papelera_idx; las PK): el orden lead → vehículo de
  -- vincular, que toma el lead y después el vehículo (al revés, 40P01).
  perform 1 from public.leads d
   where d.id in (select x.lead_id from public.cotizaciones x
                   where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids)))
   order by d.id for key share;
  perform 1 from public.vehiculos v
   where v.id in (select x.vehiculo_id from public.cotizaciones x
                   where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids)))
   order by v.id for key share;

  for c in
    select x.id, x.numero, coalesce(x.titulo, 'Cotización #' || x.numero) as titulo,
           (x.privada and x.creado_por is distinct from (select auth.uid()) and not public.tiene_permiso('cotizaciones.privadas.ver', x.origen_id)) as oculta from public.cotizaciones x
     where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids))
     order by x.id for no key update
  loop
    if c.oculta then v_ocultas := v_ocultas || c.id; end if;
    begin
      -- 1. Sobre la fila tomada (la FK pudo poner nulos el vehículo o el lead mientras se esperaba).
      select x.vehiculo_id, x.lead_id, x.clase into v_vehiculo, v_lead, v_clase from public.cotizaciones x where x.id = c.id;
      v_vehiculo_fuera := false; v_lead_fuera := false;
      if v_lead is not null then
        select d.eliminado_en is not null into v_lead_fuera from public.leads d where d.id = v_lead for key share;
      end if;
      if v_vehiculo is not null then
        select v.eliminado_en is not null into v_vehiculo_fuera from public.vehiculos v where v.id = v_vehiculo for key share;
      end if;
      v_motivo := case
        when v_vehiculo_fuera then 'Su vehículo está en la papelera.'
        when v_lead_fuera then 'Su cliente está en la papelera.'
        when v_clase = 'final' and v_vehiculo is null then 'Su vehículo ya no existe.'
      end;
      -- 2. Si nada la detiene, vuelve.
      if v_motivo is null then
        update public.cotizaciones x set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where x.id = c.id;
      end if;
    exception
      when unique_violation then
        get stacked diagnostics v_restriccion = constraint_name;
        v_motivo := case v_restriccion
          when 'cotizaciones_encima_unica' then 'Esa cotización ya tiene otra versión nueva.'
          when 'cotizaciones_final_por_vehiculo' then 'Ese vehículo ya tiene otra cotización final.'
          else 'Choca con otro registro que ya existe.'
        end;
      when check_violation then
        -- La red por si la tabla suma reglas: su texto es nuestro.
        get stacked diagnostics v_motivo = message_text;
    end;
    if v_motivo is null then
      v_restaurados := v_restaurados || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo);
    else
      v_pendientes := v_pendientes || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'motivo', v_motivo);
    end if;
  end loop;

  -- Cuántas siguen en la papelera del lote (a lo sumo 200 por lote; cotizaciones_lote_papelera_idx).
  select count(*) into v_quedan from (
    select 1 from public.cotizaciones x where x.lote_papelera_id = p_lote and x.eliminado_en is not null limit 201) q;
  if jsonb_array_length(v_restaurados) = 0 then
    return jsonb_build_object('actualizado_en', (select l.actualizado_en from public.lotes_papelera l where l.id = p_lote),
      'restaurados', (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(v_restaurados) with ordinality x (e, o) where not ((e ->> 'id')::uuid = any (v_ocultas))), 'pendientes', (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(v_pendientes) with ordinality x (e, o) where not ((e ->> 'id')::uuid = any (v_ocultas))), 'quedan', v_quedan);
  end if;
  update public.lotes_papelera l
  set resumen = l.resumen || jsonb_build_object('restaurados', coalesce((l.resumen ->> 'restaurados')::int, 0) + jsonb_array_length(v_restaurados)),
      restaurado_en = case when v_quedan = 0 then now() else l.restaurado_en end,
      restaurado_por = case when v_quedan = 0 then (select auth.uid()) else l.restaurado_por end
  where l.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'cotizaciones', 'cantidad', jsonb_array_length(v_restaurados)));
  return jsonb_build_object('actualizado_en', v_version, 'restaurados', (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(v_restaurados) with ordinality x (e, o) where not ((e ->> 'id')::uuid = any (v_ocultas))), 'pendientes', (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(v_pendientes) with ordinality x (e, o) where not ((e ->> 'id')::uuid = any (v_ocultas))), 'quedan', v_quedan);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."_papelera_purgar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c record; v_rutas text[]; v_quedan int; v_version timestamptz;
  v_purgados jsonb := '[]'::jsonb; v_bloqueados jsonb := '[]'::jsonb;
  -- Las privadas ajenas del lote (glosario: «Cotización privada»): se purgan con él, pero la respuesta no las nombra.
  v_ocultas uuid[] := '{}'::uuid[];
begin
  for c in
    select x.id, x.numero, coalesce(x.titulo, 'Cotización #' || x.numero) as titulo,
           (x.privada and x.creado_por is distinct from (select auth.uid()) and not public.tiene_permiso('cotizaciones.privadas.ver', x.origen_id)) as oculta from public.cotizaciones x
     where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids))
     order by x.id for update
  loop
    if c.oculta then v_ocultas := v_ocultas || c.id; end if;
    begin
      select array_agg(a.ruta) into v_rutas from public.cotizaciones_adjuntos a where a.cotizacion_id = c.id;
      delete from public.cotizaciones x where x.id = c.id;
      -- Después del borrado: el refcount ya no la cuenta (cotizaciones_adjuntos_ruta_idx).
      perform public._encolar_para_limpiar('cotizaciones', v_rutas, false);
      v_purgados := v_purgados || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo);
    exception when foreign_key_violation or restrict_violation then
      v_bloqueados := v_bloqueados || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'motivo', 'Otros registros dependen de ella.');
    end;
  end loop;

  -- Cuántas siguen en la papelera del lote (a lo sumo 200 por lote; cotizaciones_lote_papelera_idx).
  select count(*) into v_quedan from (
    select 1 from public.cotizaciones x where x.lote_papelera_id = p_lote and x.eliminado_en is not null limit 201) q;
  if jsonb_array_length(v_purgados) = 0 then
    return jsonb_build_object('actualizado_en', (select l.actualizado_en from public.lotes_papelera l where l.id = p_lote),
      'purgados', (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(v_purgados) with ordinality x (e, o) where not ((e ->> 'id')::uuid = any (v_ocultas))), 'bloqueados', (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(v_bloqueados) with ordinality x (e, o) where not ((e ->> 'id')::uuid = any (v_ocultas))), 'quedan', v_quedan);
  end if;
  update public.lotes_papelera l
  set resumen = l.resumen || jsonb_build_object('purgados', coalesce((l.resumen ->> 'purgados')::int, 0) + jsonb_array_length(v_purgados)),
      purgado_en = case when v_quedan = 0 then now() else l.purgado_en end
  where l.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'cotizaciones', 'cantidad', jsonb_array_length(v_purgados), 'automatica', (select auth.uid()) is null));
  return jsonb_build_object('actualizado_en', v_version, 'purgados', (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(v_purgados) with ordinality x (e, o) where not ((e ->> 'id')::uuid = any (v_ocultas))), 'bloqueados', (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(v_bloqueados) with ordinality x (e, o) where not ((e ->> 'id')::uuid = any (v_ocultas))), 'quedan', v_quedan);
end;
$$;
