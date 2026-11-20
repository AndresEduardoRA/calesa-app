-- La imagen de la tarjeta (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): `cotizacion_imagen_huella()`, la ETag de `GET /cotizaciones/<id>/imagen`, y que
-- de la portada guardada no quede nada.
-- No depende de otro archivo (`SOLO=areas/tarjeta/imagen.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   I1. La huella se mueve con cada cosa que la imagen dibuja (la cotización, la plantilla publicada, la fórmula, los colores, los tipos de cambio, el cliente, el
--       vehículo, los ajustes y los datos de quien mira) y no con lo que no se ve (el valor del día, la fase, el nombre de un color, el perfil del creador).
--   I2. Dos personas sobre la misma cotización tienen huellas distintas; quitarle `leads.ver` a una cambia la suya.
--   I3. 42501 igual para quien no ve la cotización, una en la papelera y un id que no existe.
--   I4. Es definer con search_path vacío; EXECUTE sólo para authenticated y service_role, nada para anon ni PUBLIC.
--   I5. `validar_plantilla` acepta la foto del asesor y sus variables, y rechaza la foto con otra clave (humo: el juego entero va en plantilla-validar.sql).
--   I6. El refcount, el barrido, la purga y la policy del bucket ya no nombran la portada; no quedan su tabla ni sus funciones.
--   I7. Ningún objeto `<cotización>/portada/…` del bucket queda fuera de la cola de limpieza.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.im_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('im_' || substr(v_id::text, 1, 8), 'IM ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.im_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

-- La huella como esa persona: el texto, o {error, mensaje} como texto si falla.
create or replace function pg_temp.im_huella(p_quien uuid, p_c uuid) returns text language sql as $f$
  select (select case when r ? 'error' then r::text else r #>> '{}' end
            from (select pg_temp.im_corre(p_quien, format('select to_jsonb(public.cotizacion_imagen_huella(%L))', p_c)) as r) x);
$f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.im_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('im_' || substr(gen_random_uuid()::text, 1, 8), 'IM origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Un lead de quien lo crea (su cartera), un vehículo del origen y una cotización viva de esa persona.
create or replace function pg_temp.im_lead(p_quien uuid) returns uuid language sql as $f$
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('IM cliente', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), p_quien)
  returning id;
$f$;
create or replace function pg_temp.im_vehiculo(p_quien uuid, e jsonb) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, marca, lote, vin, creado_por) values ((e ->> 'o')::uuid, 'IM vehículo', 'toyota', 'L-1', 'JTD00000001', p_quien) returning id;
$f$;
create or replace function pg_temp.im_cot(p_quien uuid, e jsonb, p_lead uuid default null, p_vehiculo uuid default null) returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_lead, p_vehiculo, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- @test imagen: la huella se mueve con lo que la imagen dibuja (I1)
begin;
do $$
declare
  duena uuid := pg_temp.im_persona(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver']);
  e jsonb := pg_temp.im_origen(); c uuid; v_lead uuid; v_veh uuid; v_antes text; v_tono uuid; v_tc uuid; v_pla uuid; v_fase uuid;
begin
  v_lead := pg_temp.im_lead(duena);
  v_veh := pg_temp.im_vehiculo(duena, e);
  c := pg_temp.im_cot(duena, e, v_lead, v_veh);
  perform set_config('session_replication_role', 'replica', true);
  insert into public.tonos (clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
  values ('im_tono', 'IM', '#112233', '#112233', '#112233', '#112233', '#112233', '#112233', '#112233') returning id into v_tono;
  select id into v_tc from public.tipos_cambio order by clave collate "C" limit 1;
  if v_tc is null then
    insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('im_tc', 'IM', 'USD', 'BOB', 7) returning id into v_tc;
  end if;
  if pg_temp.im_huella(duena, c) !~ '^i-[0-9a-f]{32}$' then raise exception 'la huella no tiene la forma i-md5: %', pg_temp.im_huella(duena, c); end if;

  v_antes := pg_temp.im_huella(duena, c);
  update public.cotizaciones set actualizado_en = actualizado_en + interval '1 second' where id = c;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'cotizaciones.actualizado_en no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion) values ((e ->> 'o')::uuid, 1, 'publicada', '{}') returning id into v_pla;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'publicar una plantilla no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.plantillas_tarjeta set actualizado_en = actualizado_en + interval '1 second' where id = v_pla;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'la plantilla publicada cambiada no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.formulas set actualizado_en = actualizado_en + interval '1 second' where id = (e ->> 'f')::uuid;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'la versión de la fórmula no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.tonos set hex = '#445566' where id = v_tono;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el hex de un color no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.tipos_cambio set nombre = nombre || ' IM' where id = v_tc;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el nombre de un tipo de cambio no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.tipos_cambio set activo = not activo where id = v_tc;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'activar o desactivar un tipo de cambio no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.tipos_cambio set moneda_a = 'EUR' where id = v_tc;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'la moneda de un tipo de cambio no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.leads set nombre = 'IM otro cliente' where id = v_lead;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el nombre del cliente no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.vehiculos set titulo = 'IM otro' where id = v_veh;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el título del vehículo no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.vehiculos set lote = 'L-2' where id = v_veh;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el lote del vehículo no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.vehiculos set vin = 'JTD00000002' where id = v_veh;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el VIN del vehículo no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.ajustes_empresa set actualizado_en = actualizado_en + interval '1 second' where id = 1;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'los ajustes de la empresa no movieron la huella'; end if;
  -- Los datos de quien mira, el asesor de la tarjeta.
  v_antes := pg_temp.im_huella(duena, c);
  update public.perfiles set nombre = 'IM otra asesora' where id = duena;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el nombre de quien mira no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.perfiles set whatsapp_web = '+59170000009' where id = duena;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el WhatsApp de quien mira no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.perfiles set cargo_web = 'IM cargo' where id = duena;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el cargo de quien mira no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.perfiles set avatar_ruta = duena || '/' || lpad('a', 64, '0') || '.webp' where id = duena;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'la foto de quien mira no movió la huella'; end if;

  -- No se mueve: el valor del día de un tipo de cambio, la fase del vehículo y el nombre de un color.
  v_antes := pg_temp.im_huella(duena, c);
  update public.tipos_cambio set valor = valor + 1, actualizado_en = actualizado_en + interval '1 second' where id = v_tc;
  if pg_temp.im_huella(duena, c) <> v_antes then raise exception 'el valor de un tipo de cambio movió la huella'; end if;
  select id into v_fase from public.fases where id is distinct from (select fase_id from public.vehiculos where id = v_veh) limit 1;
  update public.vehiculos set fase_id = coalesce(v_fase, fase_id), fase_desde = case when coalesce(v_fase, fase_id) is not null then now() end,
                              actualizado_en = actualizado_en + interval '1 day' where id = v_veh;
  if pg_temp.im_huella(duena, c) <> v_antes then raise exception 'la fase o la hora del vehículo movieron la huella'; end if;
  update public.tonos set nombre = 'IM otro nombre' where id = v_tono;
  if pg_temp.im_huella(duena, c) <> v_antes then raise exception 'el nombre de un color (que la tarjeta no lee) movió la huella'; end if;

  -- Mandar el lead o el vehículo a la papelera la mueve (dejan de dibujarse).
  update public.leads set eliminado_en = now() where id = v_lead;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el lead en la papelera no movió la huella'; end if;
  v_antes := pg_temp.im_huella(duena, c);
  update public.vehiculos set eliminado_en = now() where id = v_veh;
  if pg_temp.im_huella(duena, c) = v_antes then raise exception 'el vehículo en la papelera no movió la huella'; end if;
end $$;
rollback;

-- @test imagen: cada persona tiene su huella, y quitarle leads.ver mueve la suya; el perfil del creador no mueve la de otro (I1, I2)
begin;
do $$
declare
  ana uuid := pg_temp.im_persona(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver']);
  e jsonb := pg_temp.im_origen(); luis uuid; c uuid; v_luis text;
begin
  luis := pg_temp.im_persona(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver']);
  c := pg_temp.im_cot(ana, e, pg_temp.im_lead(ana), pg_temp.im_vehiculo(ana, e));
  v_luis := pg_temp.im_huella(luis, c);
  if v_luis !~ '^i-' then raise exception 'Luis no tiene huella: %', v_luis; end if;
  if pg_temp.im_huella(ana, c) = v_luis then raise exception 'Ana y Luis tienen la misma huella'; end if;

  -- El perfil de quien la creó no entra en la huella de otro.
  perform set_config('session_replication_role', 'replica', true);
  update public.perfiles set nombre = 'IM otra creadora', whatsapp_web = '+59170000008', cargo_web = 'IM jefa' where id = ana;
  perform set_config('session_replication_role', 'origin', true);
  if pg_temp.im_huella(luis, c) <> v_luis then raise exception 'el perfil de la creadora movió la huella de Luis'; end if;

  -- Sin leads.ver, el cliente deja de dibujarse para Luis.
  delete from public.roles_permisos rp using public.usuarios_roles ur
   where ur.usuario_id = luis and rp.rol_id = ur.rol_id and rp.permiso_clave = 'leads.ver';
  if pg_temp.im_huella(luis, c) = v_luis then raise exception 'quitarle leads.ver a Luis no movió su huella'; end if;
  v_luis := pg_temp.im_huella(luis, c);
  delete from public.roles_permisos rp using public.usuarios_roles ur
   where ur.usuario_id = luis and rp.rol_id = ur.rol_id and rp.permiso_clave = 'vehiculos.ver';
  if pg_temp.im_huella(luis, c) = v_luis then raise exception 'quitarle vehiculos.ver a Luis no movió su huella'; end if;
end $$;
rollback;

-- @test imagen: 42501 igual para quien no la ve, una en la papelera y una que no existe (I3)
begin;
do $$
declare
  duena uuid := pg_temp.im_persona(array['cotizaciones.ver']);
  e jsonb := pg_temp.im_origen(); propios uuid; nadie uuid; c uuid; c_papelera uuid; r jsonb;
  leer constant text := 'select to_jsonb(public.cotizacion_imagen_huella(%L))';
begin
  propios := pg_temp.im_persona(array['cotizaciones.ver:propios']);
  nadie := pg_temp.im_persona(array['leads.ver']);
  c := pg_temp.im_cot(duena, e);
  c_papelera := pg_temp.im_cot(duena, e);
  update public.cotizaciones set eliminado_en = now() where id = c_papelera;
  foreach r in array array[
    pg_temp.im_corre(nadie, format(leer, c)),
    pg_temp.im_corre(propios, format(leer, c)),
    pg_temp.im_corre(duena, format(leer, c_papelera)),
    pg_temp.im_corre(duena, format(leer, gen_random_uuid()))] loop
    if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then
      raise exception 'no dio el 42501 de siempre: %', r; end if;
  end loop;
  r := pg_temp.im_corre(duena, format(leer, c));
  if r ? 'error' then raise exception 'quien la ve no tuvo su huella: %', r; end if;
end $$;
rollback;

-- @test imagen: es definer con search_path vacío y la ejecutan sólo authenticated y service_role (I4)
begin;
do $$
declare v_oid oid := 'public.cotizacion_imagen_huella(uuid)'::regprocedure;
begin
  if not (select p.prosecdef from pg_proc p where p.oid = v_oid) then raise exception 'cotizacion_imagen_huella no es definer'; end if;
  if (select p.proconfig from pg_proc p where p.oid = v_oid) is distinct from array['search_path=""'] then raise exception 'cotizacion_imagen_huella sin el search_path vacío'; end if;
  if not has_function_privilege('authenticated', v_oid, 'execute') or not has_function_privilege('service_role', v_oid, 'execute') then
    raise exception 'authenticated o service_role no pueden ejecutarla'; end if;
  if has_function_privilege('anon', v_oid, 'execute') then raise exception 'anon puede ejecutarla'; end if;
  if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
              where p.oid = v_oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then raise exception 'PUBLIC puede ejecutarla'; end if;
end $$;
rollback;

-- @test imagen: la forma de la cuadrícula (la que valida validar_plantilla) acepta la foto del asesor y sus variables, y rechaza la foto con otra clave (I5)
begin;
do $$
declare v_def jsonb; v_celdas jsonb; v_regla text; v_donde text;
begin
  v_def := jsonb_build_object('forma', 2,
    'columnas', jsonb_build_array(jsonb_build_object('id', 'k1', 'ancho', 100)),
    'filas', jsonb_build_array(jsonb_build_object('id', 'f1', 'alto', 24, 'ocultar_si', 'nunca'), jsonb_build_object('id', 'f2', 'alto', 24, 'ocultar_si', 'nunca')),
    'celdas', jsonb_build_array(
      jsonb_build_object('id', 'c1', 'fila', 'f1', 'columna', 'k1', 'contenido', jsonb_build_object('tipo', 'foto_del_asesor')),
      jsonb_build_object('id', 'c2', 'fila', 'f2', 'columna', 'k1', 'contenido',
        jsonb_build_object('tipo', 'texto', 'texto', '{asesor_telefono} · {asesor_cargo}'))));
  perform public._plantilla_cuadricula_forma(v_def, true);
  v_celdas := jsonb_set(v_def -> 'celdas', '{0,contenido}', '{"tipo": "foto_del_asesor", "texto": "Foto"}');
  begin
    perform public._plantilla_cuadricula_forma(jsonb_set(v_def, '{celdas}', v_celdas), true);
    raise exception 'la foto del asesor con texto pasó';
  exception when sqlstate '22023' then
    get stacked diagnostics v_regla = pg_exception_detail, v_donde = pg_exception_hint;
    if v_regla is distinct from 'forma' or v_donde is distinct from 'celdas[0].contenido' then
      raise exception 'la foto del asesor con texto no dio forma@celdas[0].contenido: %@%', v_regla, v_donde; end if;
  end;
end $$;
rollback;

-- @test imagen: de la portada guardada no queda nada (I6)
begin;
do $$
declare f text;
begin
  foreach f in array array['public.storage_refcount(text, text)', 'public.storage_gc_encolar_huerfanos(text, interval)',
                           'public._papelera_purgar_cotizaciones(uuid, uuid[])', 'public._papelera_purgar_vehiculos(uuid, uuid[])'] loop
    -- `web_guias.portada_ruta` es la portada de una guía de la web, otra cosa.
    if pg_get_functiondef(f::regprocedure) ~* 'cotizaciones_portadas|cotizacion_portada|/portada/' then raise exception '% todavía nombra la portada', f; end if;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'cotizaciones: leer'
              and (qual ~* 'portada' or with_check ~* 'portada')) then raise exception 'la policy «cotizaciones: leer» todavía nombra la portada'; end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'cotizaciones: leer') then
    raise exception 'falta la policy «cotizaciones: leer»'; end if;
  if to_regclass('public.cotizaciones_portadas') is not null then raise exception 'cotizaciones_portadas sigue ahí'; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and (p.proname like '%cotizacion_portada%' or p.proname like '%cotizaciones_portada%' or p.proname = '_portada_version_del_dibujo')) then
    raise exception 'quedan funciones de la portada'; end if;
end $$;
rollback;

-- @test imagen: ningún objeto de una portada queda fuera de la cola de limpieza (I7)
begin;
do $$
begin
  if exists (select 1 from storage.objects o
              where o.bucket_id = 'cotizaciones' and split_part(o.name, '/', 2) = 'portada'
                and not exists (select 1 from public.cola_gc_storage c where c.bucket = 'cotizaciones' and c.ruta = o.name)) then
    raise exception 'quedan portadas fuera de la cola de limpieza'; end if;
  -- Y una que apareciera la recoge el barrido: la rama de `cotizaciones` ya no la exceptúa.
  if public.storage_refcount('cotizaciones', gen_random_uuid() || '/portada/' || lpad('0', 64, '0') || '.webp') <> 0 then
    raise exception 'el refcount cuenta una portada'; end if;
end $$;
rollback;
