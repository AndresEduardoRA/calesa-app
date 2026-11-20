-- La imagen de la tarjeta se arma al pedirla, para quien la mira (`GET /cotizaciones/<id>/imagen`, `docs/COTIZADOR.md` › «La imagen de la tarjeta»): deja de
-- guardarse la portada. Se va la tabla cotizaciones_portadas con sus funciones, la policy del bucket `cotizaciones` deja de pedir lo que dibujaba la compartida,
-- el refcount, el barrido y la papelera dejan de nombrarla, sus objetos se encolan para limpiar, y nace cotizacion_imagen_huella(), la ETag de la imagen.

-- 1. La policy «cotizaciones: leer» de storage.objects, sin la cláusula de la portada: lo del bucket lo lee quien ve la cotización.
drop policy "cotizaciones: leer" on storage.objects;
create policy "cotizaciones: leer" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'cotizaciones'::text) AND ( SELECT public.puede_cotizacion(public._cotizacion_de_objeto(objects.name), 'cotizaciones.ver'::text) AS puede_cotizacion)));

-- 2. El refcount y el barrido de huérfanos, sin las portadas (la definición vigente, sin esa línea).
CREATE OR REPLACE FUNCTION "public"."storage_refcount"("p_bucket" "text", "p_ruta" "text") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  select (
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta = p_ruta) +
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta_miniatura = p_ruta) +
    (select count(*) from public.repuestos_items_imagenes where p_bucket = 'repuestos' and ruta = p_ruta) +
    (select count(*) from public.documentos where p_bucket = 'documentos' and ruta = p_ruta and eliminado_en is null) +
    (select count(*) from public.cotizaciones_adjuntos where p_bucket = 'cotizaciones' and ruta = p_ruta) +
    (select count(*) from public.gastos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.pagos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.repuestos_compras where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_miniatura_ruta = p_ruta) +
    (select count(*) from public.web_guias where p_bucket = 'web' and portada_ruta = p_ruta) +
    (select count(*) from public.web_guias where p_bucket = 'web' and cuerpo_doc is not null
       and jsonb_path_exists(cuerpo_doc, 'lax $.content[*] ? (@.type == "image").attrs.ruta ? (@ == $r)', jsonb_build_object('r', p_ruta))) +
    (select count(*) from public.web_testimonios where p_bucket = 'web' and foto_ruta = p_ruta) +
    (select count(*) from public.ajustes_empresa where p_bucket = 'marca' and (logo_ruta = p_ruta or logo_oscuro_ruta = p_ruta)) +
    (select count(*) from public.ajustes_empresa e, jsonb_each_text(coalesce(e.iconos, '{}'::jsonb)) i where p_bucket = 'marca' and i.value = p_ruta)
  )::int;
$_$;

CREATE OR REPLACE FUNCTION "public"."storage_gc_encolar_huerfanos"("p_bucket" "text", "p_gracia" interval) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_ventana constant int := 10000;
  v_desde text;
  v_ultimo text;
  v_vistos int;
  n int;
begin
  insert into public.cola_gc_barrido (bucket) values (p_bucket) on conflict (bucket) do nothing;
  -- Una pasada a la vez por bucket: dos corridas que se cruzan no examinan la misma ventana.
  select b.ultimo_nombre into v_desde from public.cola_gc_barrido b where b.bucket = p_bucket for update;
  select count(*), max(o.name) into v_vistos, v_ultimo
    from (select o.name from storage.objects o
           where o.bucket_id = p_bucket and o.name > v_desde
           order by o.name limit v_ventana) o;
  if p_bucket = 'vehiculos' then
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'vehiculos' and o.name > v_desde and o.name <= v_ultimo
      and o.created_at < now() - p_gracia
      and not exists (select 1 from public.vehiculos_imagenes i where i.ruta = o.name)
      and not exists (select 1 from public.vehiculos_imagenes i where i.ruta_miniatura = o.name)
      and not exists (select 1 from public.cola_gc_storage c where c.bucket = 'vehiculos' and c.ruta = o.name)
    on conflict do nothing;
  elsif p_bucket = 'cotizaciones' then
    -- Lo que cuenta `storage_refcount('cotizaciones', …)`: una tabla nueva con rutas de este bucket va aquí y allá (si falta aquí, `storage_gc_reclamar()`
    -- igual la deja al ver el refcount).
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'cotizaciones' and o.name > v_desde and o.name <= v_ultimo
      and o.created_at < now() - p_gracia
      and not exists (select 1 from public.cotizaciones_adjuntos a where a.ruta = o.name)
      and not exists (select 1 from public.cola_gc_storage c where c.bucket = 'cotizaciones' and c.ruta = o.name)
    on conflict do nothing;
  else
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = p_bucket and o.name > v_desde and o.name <= v_ultimo
      and o.created_at < now() - p_gracia
      and public.storage_refcount(o.bucket_id, o.name) = 0
    on conflict do nothing;
  end if;
  get diagnostics n = row_count;
  -- La ventana no se llenó: se llegó al final del bucket y la próxima pasada empieza otra vuelta.
  update public.cola_gc_barrido
     set ultimo_nombre = case when v_vistos < v_ventana then '' else v_ultimo end,
         vuelta_desde = case when v_vistos < v_ventana then now() else vuelta_desde end,
         actualizado_en = now()
   where bucket = p_bucket;
  return n;
end;
$$;

-- 3. La purga de la papelera, sin las portadas: de una cotización sólo quedan sus adjuntos en el bucket.
CREATE OR REPLACE FUNCTION "public"."_papelera_purgar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c record; v_rutas text[]; v_quedan int; v_version timestamptz;
  v_purgados jsonb := '[]'::jsonb; v_bloqueados jsonb := '[]'::jsonb;
begin
  for c in
    select x.id, x.numero, coalesce(x.titulo, 'Cotización #' || x.numero) as titulo from public.cotizaciones x
     where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids))
     order by x.id for update
  loop
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
      'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera l
  set resumen = l.resumen || jsonb_build_object('purgados', coalesce((l.resumen ->> 'purgados')::int, 0) + jsonb_array_length(v_purgados)),
      purgado_en = case when v_quedan = 0 then now() else l.purgado_en end
  where l.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'cotizaciones', 'cantidad', jsonb_array_length(v_purgados), 'automatica', (select auth.uid()) is null));
  return jsonb_build_object('actualizado_en', v_version, 'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."_papelera_purgar_vehiculos"("p_lote" "uuid", "p_vehiculos" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v public.vehiculos; v_motivo text; v_fotos text[]; v_documentos text[]; v_adjuntos text[]; v_quedan int; v_version timestamptz;
  v_purgados jsonb := '[]'::jsonb; v_bloqueados jsonb := '[]'::jsonb;
begin
  for v in
    select * from public.vehiculos x
    where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_vehiculos is null or x.id = any (p_vehiculos))
    order by x.id for update
  loop
    v_motivo := public._vehiculo_motivo_de_bloqueo(v, false);
    if v_motivo is null then
      begin
        select array_agg(distinct r) into v_fotos from (
          select unnest(array[i.ruta, i.ruta_miniatura]) as r from public.vehiculos_imagenes i where i.vehiculo_id = v.id
          union all
          select o.name from storage.objects o where o.bucket_id = 'vehiculos' and o.name like v.id::text || '/%'
          union all
          select c.ruta from public.cola_gc_storage c where c.bucket = 'vehiculos' and c.ruta like v.id::text || '/%' and c.reclamado_en is null
        ) x;
        select array_agg(d.ruta) into v_documentos from public.documentos d where d.vehiculo_id = v.id and d.ruta is not null;
        -- Los adjuntos de sus cotizaciones del lote, que se van con ellas.
        select array_agg(a.ruta) into v_adjuntos
          from public.cotizaciones_adjuntos a join public.cotizaciones c on c.id = a.cotizacion_id
         where c.vehiculo_id = v.id and c.lote_papelera_id = p_lote;

        delete from public.cotizaciones c where c.vehiculo_id = v.id and c.lote_papelera_id = p_lote;
        delete from public.vehiculos x where x.id = v.id;

        perform public._encolar_para_limpiar('vehiculos', v_fotos, true);
        perform public._encolar_para_limpiar('documentos', v_documentos, false);
        perform public._encolar_para_limpiar('cotizaciones', v_adjuntos, false);
        v_purgados := v_purgados || jsonb_build_object('id', v.id, 'numero', v.numero, 'titulo', v.titulo);
      -- La red por si otra tabla suma un `check` sobre una FK `set null`: el vehículo queda bloqueado y el lote sigue.
      exception when foreign_key_violation or check_violation then
        v_motivo := 'Otros registros dependen de él.';
      end;
    end if;
    if v_motivo is not null then
      v_bloqueados := v_bloqueados || jsonb_build_object('id', v.id, 'numero', v.numero, 'titulo', v.titulo, 'motivo', v_motivo);
    end if;
  end loop;

  select count(*) into v_quedan from public.vehiculos x where x.lote_papelera_id = p_lote and x.eliminado_en is not null;
  if jsonb_array_length(v_purgados) = 0 then
    return jsonb_build_object('actualizado_en', (select l.actualizado_en from public.lotes_papelera l where l.id = p_lote),
      'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera l
  set resumen = l.resumen || jsonb_build_object('purgados', coalesce((l.resumen ->> 'purgados')::int, 0) + jsonb_array_length(v_purgados)),
      purgado_en = case when v_quedan = 0 then now() else l.purgado_en end
  where l.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('cantidad', jsonb_array_length(v_purgados), 'automatica', (select auth.uid()) is null));
  return jsonb_build_object('actualizado_en', v_version, 'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
end;
$$;

-- 4. Las portadas guardadas, a la cola de limpieza: tras el paso 2 el refcount ya no las cuenta (si faltara, el barrido de huérfanos igual las recoge). Con la
-- gracia de siempre (p_ya falso), como las rutas que suelta la purga.
select public._encolar_para_limpiar('cotizaciones', coalesce((select array_agg(p.ruta) from public.cotizaciones_portadas p), '{}'::text[]), false);

-- 5. La tabla (con su trigger y su policy) y las funciones de la portada.
drop table public.cotizaciones_portadas;
drop function public.cotizaciones_portada_rescatar();
drop function public.cotizacion_portada(uuid);
drop function public.cotizacion_portada_poner(uuid, text, text);
drop function public.cotizacion_portada_visible(uuid);
drop function public._cotizacion_portada_clave(uuid);
drop function public._cotizacion_portada_ve_todo(uuid, uuid);
drop function public._portada_version_del_dibujo();

-- 6. La huella de la imagen de la tarjeta para quien la pide: la ETag de `GET /cotizaciones/<id>/imagen` (con la versión del dibujo y el ancho, que suma la app).
-- Definer porque lee `formulas` y `plantillas_tarjeta`, que bajo la RLS sólo lee quien configura; devuelve sólo un md5. Todo por clave primaria o índice único
-- (cotizaciones_pkey, plantillas_publicada_unica, formulas_pkey, leads_pkey, vehiculos_pkey, perfiles_pkey, ajustes_empresa_pkey) y dos catálogos de decenas
-- de filas (tonos, tipos_cambio).
create function public.cotizacion_imagen_huella(p_cotizacion uuid) returns text
  language plpgsql stable security definer
  set search_path = ''
  as $$
declare
  v_c public.cotizaciones; v_yo uuid := (select auth.uid()); v_ve_cliente boolean; v_ve_vehiculo boolean;
begin
  perform public.assert_activo();
  -- Lo que no existe, está en la papelera o no se ve, lo mismo (puede_cotizacion: cotizaciones_pkey).
  select * into v_c from public.cotizaciones c where c.id = p_cotizacion and c.eliminado_en is null;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- El cliente y el vehículo entran sólo si quien pide los ve: la imagen los dibuja sólo entonces.
  v_ve_cliente := v_c.lead_id is not null and public.puede_lead(v_c.lead_id, 'leads.ver');
  v_ve_vehiculo := v_c.vehiculo_id is not null and public.puede_vehiculo(v_c.vehiculo_id, 'vehiculos.ver');
  return 'i-' || md5(jsonb_build_array(
    -- La cotización: guardar, el título y los retoques mueven `actualizado_en`; la versión y el origen dicen qué tarjeta se dibuja.
    extract(epoch from v_c.actualizado_en), v_c.formula_id, v_c.origen_id,
    -- La plantilla publicada del origen (plantillas_publicada_unica), o ninguna: la tarjeta por omisión.
    (select jsonb_build_array(p.id, extract(epoch from p.actualizado_en))
       from public.plantillas_tarjeta p where p.origen_id = v_c.origen_id and p.estado = 'publicada'),
    -- Esa versión de la fórmula (formulas_pkey).
    (select extract(epoch from f.actualizado_en) from public.formulas f where f.id = v_c.formula_id),
    -- El catálogo de colores (decenas de filas, entero): la clave y el hex de cada uno, lo que lee `cotizacion_tarjeta()`.
    (select md5(string_agg(t.clave || ':' || t.hex, ',' order by t.clave collate "C")) from public.tonos t),
    -- Los tipos de cambio (decenas de filas, enteros): el nombre, si está activo y la moneda, nunca el valor del día.
    (select md5(string_agg(jsonb_build_array(t.clave, t.nombre, t.activo, t.moneda_a)::text, ',' order by t.clave collate "C", t.id))
       from public.tipos_cambio t),
    -- El cliente (leads_pkey) y el vehículo (vehiculos_pkey), vivos y si quien pide los ve.
    v_ve_cliente,
    case when v_ve_cliente then (select l.nombre from public.leads l where l.id = v_c.lead_id and l.eliminado_en is null) end,
    v_ve_vehiculo,
    case when v_ve_vehiculo then (select jsonb_build_array(v.titulo, v.lote, v.vin) from public.vehiculos v
                                   where v.id = v_c.vehiculo_id and v.eliminado_en is null) end,
    -- Quien pide, el asesor de la tarjeta (perfiles_pkey): lo que lee `getAsesorQueMira()`.
    v_yo,
    (select jsonb_build_array(pe.nombre, pe.email, pe.whatsapp_web, pe.cargo_web, pe.avatar_ruta) from public.perfiles pe where pe.id = v_yo),
    -- Los ajustes de la empresa (ajustes_empresa_pkey, la fila única): el logo, la zona, el formato regional, la vigencia y el nombre.
    (select extract(epoch from e.actualizado_en) from public.ajustes_empresa e where e.id = 1)
  )::text);
end;
$$;

revoke all on function public.cotizacion_imagen_huella(uuid) from public, anon, authenticated;
grant execute on function public.cotizacion_imagen_huella(uuid) to authenticated, service_role;

comment on function public.cotizacion_imagen_huella(uuid) is 'La huella de la imagen de la tarjeta de una cotización para quien la pide: i-md5 de lo que dibuja (la cotización, la plantilla publicada del origen, su versión de la fórmula, los colores y los tipos de cambio por contenido, el cliente y el vehículo vivos sólo si quien pide los ve, quien pide como asesor y los ajustes de la empresa). Todo por clave primaria o índice único, y dos catálogos de decenas de filas. Pide ver la cotización: 42501 igual para lo que no existe, está en la papelera o no se ve. La ETag de GET /cotizaciones/<id>/imagen la arma la app con esta huella, quien pide, la versión del dibujo y el ancho.';
