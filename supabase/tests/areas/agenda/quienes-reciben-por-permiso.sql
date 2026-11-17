-- «Pedirlo» de «Qué falta»: `agenda_quienes_reciben` con `p_permiso` y `p_vehiculo` lista a quien tiene esa clave en el origen de la unidad, la ve y puede
-- recibir tareas. No depende de otro archivo (`SOLO=areas/agenda/quienes-reciben-por-permiso.sql`). Cada bloque abre su transacción y la revierte. Prefijo
-- `qrp_`; los nombres llevan «Qpxz», que no está en lo sembrado.
--
-- Qué asegura:
--   P1. Sin `agenda.tareas.asignar`, 42501; permiso sin unidad (o con conversación), 22023 hint `p_permiso`; un permiso que no existe o que no es de los
--       que pide «Qué falta» (`equipo.roles.gestionar`), 22023 hint `p_permiso`; quien pide no ve la unidad, 42501 hint `acceso`.
--   P2. Lista sólo a quien tiene la clave en **ese** origen, ve la unidad y puede recibir: no a quien la tiene en otro origen, ni a una persona bloqueada o
--       inactiva, ni a quien no recibe, ni a quien pide. Con alcance «propios», sólo si creó la unidad.
--   P3. Sin texto lista hasta 20 con `hay_mas`; con 3 letras filtra.
--   P4. Una clave global (`logistica.pagos.confirmar`) cuenta en todo origen.
--   P5. La firma de siempre: texto corto sin permiso sigue devolviendo vacío.

-- Una persona activa con un rol propio: cada concesión es `clave` o `clave@origen`, todas con el mismo alcance. La primera cuenta de una base vacía queda
-- dueña: se la lleva una aparte.
create or replace function pg_temp.qrp_persona(p_nombre text, p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'qrp-duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('qrp_' || substr(v_id::text, 1, 8), 'QRP ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  update public.perfiles set nombre = p_nombre where id = v_id;
  return v_id;
end $f$;

create or replace function pg_temp.qrp_origen() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('qrp_' || s, 'qrp origen ' || s, 'manual') returning id into o;
  return o;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.qrp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  return coalesce(v, 'null'::jsonb);
end $f$;

create or replace function pg_temp.qrp_pide(p_quien uuid, p_texto text, p_permiso text, p_vehiculo uuid) returns jsonb language sql as $f$
  select pg_temp.qrp_corre(p_quien, format('select public.agenda_quienes_reciben(p_texto => %L, p_permiso => %L, p_vehiculo => %L)', p_texto, p_permiso, p_vehiculo));
$f$;

-- Los ids que devolvió, en orden.
create or replace function pg_temp.qrp_ids(r jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg((x #>> '{}')::uuid order by o), '{}') from jsonb_path_query(r, '$.personas[*].id') with ordinality as t(x, o);
$f$;

create or replace function pg_temp.qrp_es(p_que text, r jsonb, p_estado text, p_hint text) returns void language plpgsql as $f$
begin
  if r ->> 'error' is distinct from p_estado or r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, r;
  end if;
end $f$;

-- @test agenda: quién puede por permiso: los rechazos (P1)
begin;
do $$
declare
  o uuid := pg_temp.qrp_origen(); otro uuid := pg_temp.qrp_origen();
  sin_asignar uuid; pide uuid; ciego uuid; v uuid;
begin
  sin_asignar := pg_temp.qrp_persona('Qpxz Sin asignar', array['logistica.ver@' || o, 'vehiculos.ver@' || o]);
  pide := pg_temp.qrp_persona('Qpxz Pide', array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'agenda.tareas.asignar']);
  ciego := pg_temp.qrp_persona('Qpxz Ciego', array['logistica.ver@' || otro, 'vehiculos.ver@' || otro, 'agenda.tareas.asignar']);
  insert into public.vehiculos (origen_id, titulo) values (o, 'qrp vehículo') returning id into v;

  perform pg_temp.qrp_es('sin asignar', pg_temp.qrp_pide(sin_asignar, null, 'logistica.documentos.subir', v), '42501', null);
  perform pg_temp.qrp_es('permiso sin unidad', pg_temp.qrp_pide(pide, null, 'logistica.documentos.subir', null), '22023', 'p_permiso');
  perform pg_temp.qrp_es('unidad sin permiso', pg_temp.qrp_pide(pide, null, null, v), '22023', 'p_permiso');
  perform pg_temp.qrp_es('permiso con conversación', pg_temp.qrp_corre(pide, format(
    'select public.agenda_quienes_reciben(null, %L, %L, %L)', gen_random_uuid(), 'logistica.documentos.subir', v)), '22023', 'p_permiso');
  perform pg_temp.qrp_es('permiso desconocido', pg_temp.qrp_pide(pide, null, 'logistica.no.existe', v), '22023', 'p_permiso');
  perform pg_temp.qrp_es('permiso que no se pide', pg_temp.qrp_pide(pide, null, 'equipo.roles.gestionar', v), '22023', 'p_permiso');
  perform pg_temp.qrp_es('quien pide no ve la unidad', pg_temp.qrp_pide(ciego, null, 'logistica.documentos.subir', v), '42501', 'acceso');
  perform pg_temp.qrp_es('unidad inexistente', pg_temp.qrp_pide(pide, null, 'logistica.documentos.subir', gen_random_uuid()), '42501', 'acceso');
  update public.vehiculos set eliminado_en = now() where id = v;
  perform pg_temp.qrp_es('unidad en la papelera', pg_temp.qrp_pide(pide, null, 'logistica.documentos.subir', v), '42501', 'acceso');
end $$;
rollback;

-- @test agenda: quién puede por permiso: sólo quien tiene la clave en ese origen, ve la unidad y recibe (P2)
begin;
do $$
declare
  o uuid := pg_temp.qrp_origen(); otro uuid := pg_temp.qrp_origen();
  pide uuid; recibe uuid; de_otro uuid; bloqueada uuid; inactiva uuid; no_recibe uuid; no_ve uuid; propia uuid; ajena uuid; v uuid; r jsonb;
  base text[] := array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'agenda.tareas.recibir'];
begin
  pide := pg_temp.qrp_persona('Qpxz Pide', base || array['agenda.tareas.asignar', 'logistica.documentos.subir@' || o]);
  recibe := pg_temp.qrp_persona('Qpxz Recibe', base || array['logistica.documentos.subir@' || o]);
  de_otro := pg_temp.qrp_persona('Qpxz De otro', base || array['logistica.documentos.subir@' || otro]);
  bloqueada := pg_temp.qrp_persona('Qpxz Bloqueada', base || array['logistica.documentos.subir@' || o]);
  inactiva := pg_temp.qrp_persona('Qpxz Inactiva', base || array['logistica.documentos.subir@' || o]);
  no_recibe := pg_temp.qrp_persona('Qpxz No recibe', array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'logistica.documentos.subir@' || o]);
  no_ve := pg_temp.qrp_persona('Qpxz No ve', array['logistica.ver@' || o, 'agenda.tareas.recibir', 'logistica.documentos.subir@' || o]);
  update public.perfiles set bloqueado = true where id = bloqueada;
  update public.perfiles set activo = false where id = inactiva;
  propia := pg_temp.qrp_persona('Qpxz Propia', base || array['logistica.documentos.subir@' || o], 'propios');
  ajena := pg_temp.qrp_persona('Qpxz Ajena', base || array['logistica.documentos.subir@' || o], 'propios');
  insert into public.vehiculos (origen_id, titulo, creado_por) values (o, 'qrp vehículo', propia) returning id into v;

  r := pg_temp.qrp_pide(pide, 'Qpxz', 'logistica.documentos.subir', v);
  if pg_temp.qrp_ids(r) is distinct from array[propia, recibe] or (r -> 'hay_mas')::boolean then
    raise exception 'debía listar sólo a Propia y Recibe (en orden de nombre): %', r; end if;
end $$;
rollback;

-- @test agenda: quién puede por permiso: sin texto lista hasta 20 con hay_mas y con texto filtra (P3)
begin;
do $$
declare
  o uuid := pg_temp.qrp_origen(); pide uuid; v uuid; r jsonb; i int; uno uuid;
begin
  pide := pg_temp.qrp_persona('Qpxz Pide', array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'agenda.tareas.asignar']);
  for i in 1 .. 21 loop
    uno := pg_temp.qrp_persona('Qpxz Muchos ' || lpad(i::text, 2, '0'),
      array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'agenda.tareas.recibir', 'logistica.documentos.aprobar@' || o]);
  end loop;
  insert into public.vehiculos (origen_id, titulo) values (o, 'qrp vehículo') returning id into v;

  -- La semilla puede traer más personas con la clave en todo origen: se cuenta lo que pasa del tope, no los nombres.
  r := pg_temp.qrp_pide(pide, null, 'logistica.documentos.aprobar', v);
  if jsonb_array_length(r -> 'personas') <> 20 or not (r -> 'hay_mas')::boolean then
    raise exception 'sin texto debía dar 20 y hay_mas: %', r; end if;
  r := pg_temp.qrp_pide(pide, 'Muchos 21', 'logistica.documentos.aprobar', v);
  if pg_temp.qrp_ids(r) is distinct from array[uno] then
    raise exception 'con texto debía filtrar a la última: %', r; end if;
end $$;
rollback;

-- @test agenda: quién puede por permiso: una clave global cuenta en todo origen (P4) y la firma de siempre no cambia (P5)
begin;
do $$
declare
  o uuid := pg_temp.qrp_origen(); pide uuid; confirma uuid; v uuid; r jsonb;
begin
  pide := pg_temp.qrp_persona('Qpxz Pide', array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'agenda.tareas.asignar']);
  confirma := pg_temp.qrp_persona('Qpxz Confirma', array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'agenda.tareas.recibir', 'logistica.pagos.confirmar']);
  insert into public.vehiculos (origen_id, titulo) values (o, 'qrp vehículo') returning id into v;

  r := pg_temp.qrp_pide(pide, 'Qpxz', 'logistica.pagos.confirmar', v);
  if pg_temp.qrp_ids(r) is distinct from array[confirma] then
    raise exception 'una clave global debía listar a Confirma: %', r; end if;
  r := pg_temp.qrp_corre(pide, 'select public.agenda_quienes_reciben(''Qp'')');
  if jsonb_array_length(r -> 'personas') <> 0 or (r -> 'hay_mas')::boolean then
    raise exception 'la firma de siempre con texto corto debía dar vacío: %', r; end if;
  r := pg_temp.qrp_corre(pide, 'select public.agenda_quienes_reciben(p_texto => ''Qpxz Conf'', p_conversacion => null)');
  if pg_temp.qrp_ids(r) is distinct from array[confirma] then
    raise exception 'la firma de siempre con texto debía buscar como siempre: %', r; end if;
end $$;
rollback;
