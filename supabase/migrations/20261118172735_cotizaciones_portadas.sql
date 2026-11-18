-- La portada de la cotización (`docs/COTIZADOR.md` › «La portada de la cotización»): la imagen de la tarjeta de una cotización guardada, un WebP por hash en
-- el bucket privado `cotizaciones` (`<cotización>/portada/<sha-256>.webp`: subir pide `cotizacion_puede_adjuntar`, como un adjunto; leer pide además ver lo que
-- dibuja, abajo). Se anota en su tabla, no en `cotizaciones` (`cotizacion_revision()` dejaría una revisión por cada cambio y un `update`
-- movería la versión esperada de quien edita), con una clave que dice de qué está hecha: si la clave vigente ya no es la guardada, la portada quedó vieja y
-- la ruta la arma otra vez.

-- 1. La tabla. Se lee como la cotización (la policy pregunta por fila con `puede_cotizacion`, como las demás hijas) y se escribe sólo por
-- `cotizacion_portada_poner()`.
create table public.cotizaciones_portadas (
  cotizacion_id uuid primary key references public.cotizaciones (id) on delete cascade,
  ruta text not null,
  clave text not null check (char_length(clave) between 1 and 64),
  generada_en timestamptz not null default now(),
  constraint cotizaciones_portadas_ruta_check check (ruta ~ ('^' || cotizacion_id::text || '/portada/[0-9a-f]{64}\.webp$'))
);
comment on table public.cotizaciones_portadas is
  'La portada de cada cotización guardada: la imagen de su tarjeta (WebP por hash en el bucket cotizaciones, <cotización>/portada/<sha-256>.webp) y la clave de lo que la armó (_cotizacion_portada_clave). Una fila por cotización; se va con ella por la cascada y su objeto, por la cola de limpieza. Sólo la escribe cotizacion_portada_poner(); se lee como la cotización.';
comment on column public.cotizaciones_portadas.clave is
  'La huella de lo que dibuja la tarjeta cuando se armó (_cotizacion_portada_clave). Distinta de la vigente: la portada quedó vieja. Es la ETag de GET /cotizaciones/<id>/portada.';

create unique index cotizaciones_portadas_ruta_key on public.cotizaciones_portadas (ruta);
comment on index public.cotizaciones_portadas_ruta_key is
  'El refcount de storage (storage_refcount(''cotizaciones'', ruta)) del barrido y de la cola de limpieza: una ruta, sin recorrer la tabla.';

alter table public.cotizaciones_portadas enable row level security;
revoke all on table public.cotizaciones_portadas from anon, authenticated;
grant select on table public.cotizaciones_portadas to authenticated;
grant all on table public.cotizaciones_portadas to service_role;

create policy "cotizaciones_portadas: leer" on public.cotizaciones_portadas for select to authenticated
  using ((select public.puede_cotizacion(cotizacion_id, 'cotizaciones.ver')));

-- 2. Insertar o cambiar la ruta la saca de la cola de limpieza (o avisa si ya se está limpiando), como un adjunto.
create or replace function public.cotizaciones_portada_rescatar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.storage_gc_rescatar('cotizaciones', new.ruta);
  return new;
end $$;
comment on function public.cotizaciones_portada_rescatar() is
  'Trigger before insert or update of ruta de cotizaciones_portadas: saca la ruta de la cola de limpieza de storage (o avisa si ya se está limpiando).';
revoke all on function public.cotizaciones_portada_rescatar() from public, anon, authenticated;
grant execute on function public.cotizaciones_portada_rescatar() to service_role;

create trigger trg_cotizaciones_portada_rescatar before insert or update of ruta on public.cotizaciones_portadas
  for each row execute function public.cotizaciones_portada_rescatar();

-- 3. La clave.

-- La versión del dibujo: se sube aquí, en una migración nueva, cuando cambia cómo se dibuja la imagen (`infra/tarjeta/imagen/`, `geometriaDeLaTarjeta()`,
-- `webp-de-la-tarjeta.ts`), y todas las portadas se rehacen al pedirlas.
create or replace function public._portada_version_del_dibujo() returns integer
language sql immutable set search_path = '' as $$ select 1 $$;
comment on function public._portada_version_del_dibujo() is
  'La versión del dibujo de la portada de la cotización: se sube en una migración cuando cambia cómo se dibuja la imagen de la tarjeta (infra/tarjeta/imagen/, geometriaDeLaTarjeta, webp-de-la-tarjeta.ts). Entra en _cotizacion_portada_clave.';
revoke all on function public._portada_version_del_dibujo() from public, anon, authenticated;
grant execute on function public._portada_version_del_dibujo() to service_role;

-- La huella de todo lo que el dibujo de la tarjeta de una guardada lee, como texto opaco: `p<versión del dibujo>-<md5>`. Del vehículo, el cliente, quien la
-- creó, los colores y los tipos de cambio entra **lo que se dibuja**, no su `actualizado_en`: una fase o una foto mueven el del vehículo y el valor de un tipo
-- de cambio cambia a diario, y ninguno se ve en la tarjeta. Las horas van como epoch: el texto de un timestamptz depende de la zona de la sesión.
-- Nula si la cotización no existe. Invocadora: la llaman `cotizacion_portada()` y `cotizacion_portada_poner()`, que son definer.
create or replace function public._cotizacion_portada_clave(p_cot uuid) returns text
language sql stable set search_path = '' as $$
  select 'p' || public._portada_version_del_dibujo()::text || '-' || md5(jsonb_build_array(
    -- La cotización (cotizaciones_pkey): guardar, el título y los retoques mueven `actualizado_en`; la versión y el origen dicen qué tarjeta se dibuja.
    extract(epoch from c.actualizado_en), c.formula_id, c.origen_id,
    -- La plantilla publicada del origen (plantillas_publicada_unica), o ninguna: la tarjeta por omisión.
    (select jsonb_build_array(p.id, extract(epoch from p.actualizado_en))
       from public.plantillas_tarjeta p where p.origen_id = c.origen_id and p.estado = 'publicada'),
    -- Esa versión de la fórmula (formulas_pkey).
    (select extract(epoch from f.actualizado_en) from public.formulas f where f.id = c.formula_id),
    -- El catálogo de colores (decenas de filas, entero): la clave y el hex de cada uno, lo que lee `cotizacion_tarjeta()`.
    (select md5(string_agg(t.clave || ':' || t.hex, ',' order by t.clave collate "C")) from public.tonos t),
    -- Los tipos de cambio (decenas de filas, enteros): el nombre, si está activo y la moneda, nunca el valor del día.
    (select md5(string_agg(jsonb_build_array(t.clave, t.nombre, t.activo, t.moneda_a)::text, ',' order by t.clave collate "C", t.id))
       from public.tipos_cambio t),
    -- El cliente (leads_pkey) y el vehículo (vehiculos_pkey), vivos: en la papelera no se dibujan.
    (select l.nombre from public.leads l where l.id = c.lead_id and l.eliminado_en is null),
    (select jsonb_build_array(v.titulo, v.lote, v.vin) from public.vehiculos v where v.id = c.vehiculo_id and v.eliminado_en is null),
    -- Quien la creó (perfiles_pkey): lo que lee `autorVisible()`.
    (select jsonb_build_array(pe.nombre, pe.email) from public.perfiles pe where pe.id = c.creado_por),
    -- Los ajustes de la empresa (ajustes_empresa_pkey, la fila única): el logo, la zona, el formato regional, la vigencia y el nombre.
    (select extract(epoch from e.actualizado_en) from public.ajustes_empresa e where e.id = 1)
  )::text)
  from public.cotizaciones c where c.id = p_cot;
$$;
comment on function public._cotizacion_portada_clave(uuid) is
  'La clave de la portada de una cotización: p<_portada_version_del_dibujo>-md5 de lo que dibuja su tarjeta (la cotización, la plantilla publicada del origen, su versión de la fórmula, los colores y los tipos de cambio por contenido, el cliente y el vehículo vivos, quien la creó y los ajustes de la empresa). Todo por clave primaria o índice único, y dos catálogos de decenas de filas. De nadie; la llaman cotizacion_portada y cotizacion_portada_poner.';
revoke all on function public._cotizacion_portada_clave(uuid) from public, anon, authenticated;
grant execute on function public._cotizacion_portada_clave(uuid) to service_role;

-- Si quien llama ve todo lo que la portada compartida dibuja: el cliente (si la cotización tiene uno vivo) con `leads.ver` y el vehículo (si tiene uno vivo)
-- con `vehiculos.ver`. Quien no, recibe una imagen armada con lo suyo y no guarda la compartida. Invocadora; la llaman las dos RPC de la portada.
create or replace function public._cotizacion_portada_ve_todo(p_lead uuid, p_vehiculo uuid) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(
    (p_lead is null
       or not exists (select 1 from public.leads l where l.id = p_lead and l.eliminado_en is null)
       or public.puede_lead(p_lead, 'leads.ver'))
    and (p_vehiculo is null
       or not exists (select 1 from public.vehiculos v where v.id = p_vehiculo and v.eliminado_en is null)
       or public.puede_vehiculo(p_vehiculo, 'vehiculos.ver')),
    false);
$$;
comment on function public._cotizacion_portada_ve_todo(uuid, uuid) is
  'Si quien llama ve lo que la portada compartida de una cotización dibuja: el cliente vivo con leads.ver y el vehículo vivo con vehiculos.ver (leads_pkey, vehiculos_pkey). De nadie; la llaman cotizacion_portada y cotizacion_portada_poner.';
revoke all on function public._cotizacion_portada_ve_todo(uuid, uuid) from public, anon, authenticated;
grant execute on function public._cotizacion_portada_ve_todo(uuid, uuid) to service_role;

-- Si quien llama puede bajar la portada de una cotización del bucket: la ve y ve todo lo que dibuja la compartida. La usa la policy «cotizaciones: leer» de
-- storage para los objetos de `portada/`: con sólo `cotizaciones.ver`, la imagen nombraría un cliente que la lista le oculta. Falso para lo que no existe.
create or replace function public.cotizacion_portada_visible(p_cot uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select public.puede_cotizacion(c.id, 'cotizaciones.ver') and public._cotizacion_portada_ve_todo(c.lead_id, c.vehiculo_id)
      from public.cotizaciones c where c.id = p_cot), false);
$$;
comment on function public.cotizacion_portada_visible(uuid) is
  'Si quien llama ve la cotización y todo lo que dibuja su portada compartida (_cotizacion_portada_ve_todo). La pide la policy «cotizaciones: leer» de storage.objects para los objetos de <cotización>/portada/. Nunca nula.';
revoke all on function public.cotizacion_portada_visible(uuid) from public, anon;
grant execute on function public.cotizacion_portada_visible(uuid) to authenticated, service_role;

-- La policy de leer el bucket: lo de siempre (ver la cotización de la carpeta) y, en `portada/`, además ver lo que dibuja. Los adjuntos no cambian.
drop policy "cotizaciones: leer" on storage.objects;
create policy "cotizaciones: leer" on storage.objects as permissive for select to authenticated
  using (bucket_id = 'cotizaciones'
         and (select public.puede_cotizacion(public._cotizacion_de_objeto(objects.name), 'cotizaciones.ver'))
         and (split_part(objects.name, '/', 2) <> 'portada'
              or (select public.cotizacion_portada_visible(public._cotizacion_de_objeto(objects.name)))));

-- 4. Las RPC.

-- El estado de la portada para quien pide: la guardada (ruta y clave, o nulas), la clave vigente, si ve todo lo que dibuja la compartida y si puede
-- guardarla. Con `ve_todo`, el contexto que dibuja la compartida (los mismos campos que mira la clave): el cliente, el vehículo y quien la creó.
create or replace function public.cotizacion_portada(p_cotizacion uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c public.cotizaciones; p public.cotizaciones_portadas; v_ve_todo boolean; v_contexto jsonb;
begin
  perform public.assert_activo();
  -- Lo que no existe, está en la papelera o no se ve, lo mismo (puede_cotizacion: cotizaciones_pkey).
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into c from public.cotizaciones x where x.id = p_cotizacion;
  select * into p from public.cotizaciones_portadas x where x.cotizacion_id = p_cotizacion;
  v_ve_todo := public._cotizacion_portada_ve_todo(c.lead_id, c.vehiculo_id);
  if v_ve_todo then
    v_contexto := jsonb_build_object(
      'cliente', (select l.nombre from public.leads l where l.id = c.lead_id and l.eliminado_en is null),
      'vehiculo', (select jsonb_build_object('titulo', v.titulo, 'lote', v.lote, 'vin', v.vin)
                     from public.vehiculos v where v.id = c.vehiculo_id and v.eliminado_en is null),
      'asesor', (select jsonb_build_object('nombre', pe.nombre, 'email', pe.email) from public.perfiles pe where pe.id = c.creado_por));
  end if;
  return jsonb_build_object(
    'ruta', p.ruta,
    'clave', p.clave,
    'clave_vigente', public._cotizacion_portada_clave(p_cotizacion),
    've_todo', v_ve_todo,
    'puede_guardarla', v_ve_todo and coalesce(public._cotizacion_puede_guardar(c.id, c.clase, c.origen_id), false),
    'contexto', v_contexto);
end;
$$;
comment on function public.cotizacion_portada(uuid) is
  'El estado de la portada de una cotización para quien pide: {ruta, clave} de la guardada (nulas si no hay), clave_vigente, ve_todo (ve el cliente y el vehículo vivos que dibuja la compartida), puede_guardarla (ve_todo y _cotizacion_puede_guardar) y, sólo con ve_todo, el contexto que dibuja la compartida ({cliente, vehiculo: {titulo, lote, vin}, asesor: {nombre, email}}). Pide ver la cotización: 42501 igual para lo que no existe, está en la papelera o no se ve.';
revoke all on function public.cotizacion_portada(uuid) from public, anon;
grant execute on function public.cotizacion_portada(uuid) to authenticated, service_role;

-- Anota la portada ya subida. Pide poder guardar la cotización y ver todo lo que dibuja la compartida (antes de mirar la ruta y otra vez tras el candado);
-- la ruta en la carpeta `portada/` de la cotización y el objeto en storage, WebP de hasta 5 MB (22023 con `hint`); la clave, la vigente tras el candado
-- (si no, PT409 y quien llama devuelve su imagen sin guardarla). Reemplaza la fila y manda la ruta vieja a la cola si nadie más la usa.
create or replace function public.cotizacion_portada_poner(p_cotizacion uuid, p_ruta text, p_clave text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.cotizaciones; v_meta jsonb; v_vieja text;
  v_no_puede constant text := 'No puedes guardar la vista previa de esta cotización.';
begin
  perform public.assert_activo();
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into c from public.cotizaciones x where x.id = p_cotizacion;
  if not coalesce(public._cotizacion_puede_guardar(c.id, c.clase, c.origen_id) and public._cotizacion_portada_ve_todo(c.lead_id, c.vehiculo_id), false) then
    raise exception '%', v_no_puede using errcode = '42501';
  end if;
  if p_ruta is null or p_ruta !~ ('^' || p_cotizacion::text || '/portada/[0-9a-f]{64}\.webp$') then
    raise exception 'La imagen no está en la carpeta de esta cotización.' using errcode = '22023', hint = 'ruta';
  end if;
  select o.metadata into v_meta from storage.objects o where o.bucket_id = 'cotizaciones' and o.name = p_ruta;
  if not found then
    raise exception 'La imagen no terminó de subir.' using errcode = '22023', hint = 'ruta';
  end if;
  -- Lo que dice storage, si lo dice.
  if v_meta ->> 'mimetype' is not null and v_meta ->> 'mimetype' <> 'image/webp' then
    raise exception 'La vista previa tiene que ser una imagen WebP.' using errcode = '22023', hint = 'mime';
  end if;
  if v_meta ->> 'size' is not null and (v_meta ->> 'size')::bigint > 5242880 then
    raise exception 'La vista previa pesa más de 5 MB.' using errcode = '22023', hint = 'bytes';
  end if;

  -- El candado de la cotización: serializa con `cotizacion_guardar` sin chocar con el `key share` de quien inserta hijas (comentarios, adjuntos, la portada).
  select * into c from public.cotizaciones x where x.id = p_cotizacion for no key update;
  if not found or c.eliminado_en is not null
     or not coalesce(public._cotizacion_puede_guardar(c.id, c.clase, c.origen_id) and public._cotizacion_portada_ve_todo(c.lead_id, c.vehiculo_id), false) then
    raise exception '%', v_no_puede using errcode = '42501';
  end if;
  -- En una sentencia aparte, tras el candado: ve lo que otro acaba de confirmar.
  if p_clave is distinct from public._cotizacion_portada_clave(p_cotizacion) then
    raise exception 'La tarjeta cambió mientras se armaba la imagen.' using errcode = 'PT409';
  end if;

  select x.ruta into v_vieja from public.cotizaciones_portadas x where x.cotizacion_id = p_cotizacion;
  insert into public.cotizaciones_portadas (cotizacion_id, ruta, clave) values (p_cotizacion, p_ruta, p_clave)
  on conflict (cotizacion_id) do update set ruta = excluded.ruta, clave = excluded.clave, generada_en = now();
  -- Después de reemplazarla: el refcount ya no cuenta la vieja (cotizaciones_portadas_ruta_key).
  if v_vieja is not null and v_vieja <> p_ruta then
    perform public._encolar_para_limpiar('cotizaciones', array[v_vieja], false);
  end if;
end;
$$;
comment on function public.cotizacion_portada_poner(uuid, text, text) is
  'Anota la portada de una cotización ya subida al bucket cotizaciones. Pide verla (42501 «No tienes acceso…», igual para lo que no existe o está en la papelera), poder guardarla y ver lo que dibuja la compartida (42501 «No puedes guardar la vista previa…», antes de mirar la ruta y otra vez tras el candado for no key update). La ruta, <cotización>/portada/<sha-256>.webp, existente en storage.objects, WebP de hasta 5 MB según su metadata (22023 con hint ruta, mime o bytes). La clave, la vigente tras el candado (PT409 «La tarjeta cambió mientras se armaba la imagen.»). Reemplaza la fila y encola la ruta vieja si nadie más la usa.';
revoke all on function public.cotizacion_portada_poner(uuid, text, text) from public, anon;
grant execute on function public.cotizacion_portada_poner(uuid, text, text) to authenticated, service_role;

-- 5. El refcount suma las portadas.
create or replace function public.storage_refcount(p_bucket text, p_ruta text) returns integer
language sql stable security definer set search_path = '' as $_$
  select (
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta = p_ruta) +
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta_miniatura = p_ruta) +
    (select count(*) from public.repuestos_items_imagenes where p_bucket = 'repuestos' and ruta = p_ruta) +
    (select count(*) from public.documentos where p_bucket = 'documentos' and ruta = p_ruta and eliminado_en is null) +
    (select count(*) from public.cotizaciones_adjuntos where p_bucket = 'cotizaciones' and ruta = p_ruta) +
    (select count(*) from public.cotizaciones_portadas where p_bucket = 'cotizaciones' and ruta = p_ruta) +
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
revoke all on function public.storage_refcount(text, text) from public, anon;
grant execute on function public.storage_refcount(text, text) to authenticated, service_role;

-- 6. El barrido de huérfanos suma el bucket `cotizaciones`, con su rama propia: la forma de `storage_refcount('cotizaciones', …)` por `not exists` (adjuntos
-- y portadas, por el índice de `ruta` de cada una). La rama genérica llama a `storage_refcount()` por objeto, que mira las dieciséis fuentes: diez veces
-- más por ventana (`supabase/tests/medir-jobs.sql`).
create or replace function public.storage_gc_encolar_huerfanos(p_bucket text, p_gracia interval) returns integer
language plpgsql security definer set search_path = '' as $$
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
      and not exists (select 1 from public.cotizaciones_portadas p where p.ruta = o.name)
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
revoke all on function public.storage_gc_encolar_huerfanos(text, interval) from public, anon, authenticated;
grant execute on function public.storage_gc_encolar_huerfanos(text, interval) to service_role;

-- El job barre también el bucket `cotizaciones`, con la gracia de siempre.
create or replace function public.storage_gc_reclamar(p_max integer default 100) returns table (bucket text, ruta text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  r record;
  v_vencido constant interval := interval '1 hour';
begin
  perform public.storage_gc_encolar_huerfanos('vehiculos', public._gracia_de_storage());
  perform public.storage_gc_encolar_huerfanos('cotizaciones', public._gracia_de_storage());
  for r in
    select c.bucket as su_bucket, c.ruta as su_ruta
    from public.cola_gc_storage c
    where c.encolado_en < now() - public._gracia_de_storage()
      and (c.reclamado_en is null or c.reclamado_en < now() - v_vencido)
    order by c.encolado_en
    limit greatest(coalesce(p_max, 0), 0)
  loop
    -- Alguien lo está referenciando ahora mismo: se deja para la próxima pasada.
    if not pg_try_advisory_xact_lock(public._candado_de_objeto(r.su_bucket, r.su_ruta)) then
      continue;
    end if;
    -- Con el candado tomado, toda referencia confirmada ya se ve, y ninguna puede nacer.
    if public.storage_refcount(r.su_bucket, r.su_ruta) > 0 then
      delete from public.cola_gc_storage c where c.bucket = r.su_bucket and c.ruta = r.su_ruta;
    else
      update public.cola_gc_storage c set reclamado_en = now()
      where c.bucket = r.su_bucket and c.ruta = r.su_ruta;
      if found then
        bucket := r.su_bucket;
        ruta := r.su_ruta;
        return next;
      end if;
    end if;
  end loop;
end;
$$;
revoke all on function public.storage_gc_reclamar(integer) from public, anon, authenticated;
grant execute on function public.storage_gc_reclamar(integer) to service_role;

-- 7. Purgar una cotización (o el vehículo con las suyas del lote) encola también la ruta de su portada, que la cascada borra.
create or replace function public._papelera_purgar_cotizaciones(p_lote uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
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
      select array_agg(r.ruta) into v_rutas from (
        select a.ruta from public.cotizaciones_adjuntos a where a.cotizacion_id = c.id
        union all
        select p.ruta from public.cotizaciones_portadas p where p.cotizacion_id = c.id
      ) r;
      delete from public.cotizaciones x where x.id = c.id;
      -- Después del borrado: el refcount ya no la cuenta (cotizaciones_adjuntos_ruta_idx, cotizaciones_portadas_ruta_key).
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
revoke all on function public._papelera_purgar_cotizaciones(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public._papelera_purgar_cotizaciones(uuid, uuid[]) to service_role;

create or replace function public._papelera_purgar_vehiculos(p_lote uuid, p_vehiculos uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
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
        -- Los adjuntos y las portadas de sus cotizaciones del lote, que se van con ellas.
        select array_agg(r.ruta) into v_adjuntos from (
          select a.ruta from public.cotizaciones_adjuntos a join public.cotizaciones c on c.id = a.cotizacion_id
          where c.vehiculo_id = v.id and c.lote_papelera_id = p_lote
          union all
          select p.ruta from public.cotizaciones_portadas p join public.cotizaciones c on c.id = p.cotizacion_id
          where c.vehiculo_id = v.id and c.lote_papelera_id = p_lote
        ) r;

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
revoke all on function public._papelera_purgar_vehiculos(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public._papelera_purgar_vehiculos(uuid, uuid[]) to service_role;
