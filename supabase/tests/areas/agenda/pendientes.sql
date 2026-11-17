-- Los pendientes de la agenda: `agenda_pendientes(p_grupo, p_hasta, p_tamano, p_despues_en, p_despues_id)`, de invocador, por cursor.
-- No depende de otro archivo (`SOLO=areas/agenda/pendientes.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   P1. «vencidas»: sólo mis tareas (responsable) pendientes, vivas y vencidas, la más vieja primero: no las hechas, canceladas, eliminadas,
--       futuras, sin fecha ni la que di a otra persona (la RLS me la deja ver: prueba el filtro). Página de 2 con 3 → 2 y `hay_mas`; el cursor
--       trae la tercera; con dos del mismo vencimiento, el cursor no pierde ni repite ninguna. Claves exactas de la fila.
--   P2. «recordatorios»: sólo los míos pendientes con recordar_en < p_hasta: no los completados, eliminados, ajenos ni posteriores. Con dos de la
--       misma hora, el cursor no pierde ni repite ninguno. Sin p_hasta → 22023 hint `hasta`.
--   P3. Errores: grupo inválido → 22023 `grupo`; cursor a medias → 22023 `cursor`; bloqueada → 42501. `p_tamano` 999 da 50 y por defecto 20.
--   P4. Catálogo: de invocador, `search_path` vacío, de authenticated y no de anon ni PUBLIC; los índices `tareas_pendientes_idx` y
--       `tareas_sin_fecha_idx` existen con `estado = 'pendiente'` en su predicado.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.apd_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de una base vacía queda dueña (con todos los permisos): se la lleva una aparte.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'apd-duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('apd_' || substr(v_id::text, 1, 8), 'APD ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.apd_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Una tarea armada como dueño de la tabla, con vencimiento a p_vence de ahora (nulo: sin fecha).
create or replace function pg_temp.apd_tarea(p_creador uuid, p_responsable uuid, p_vence interval, p_estado text default 'pendiente') returns uuid language sql as $f$
  insert into public.tareas (titulo, responsable_id, creado_por, estado, vence_en)
  values ('PE tarea', p_responsable, p_creador, p_estado::public.estado_agenda, date_trunc('second', now()) + p_vence) returning id
$f$;

-- Un recordatorio armado como dueño de la tabla, a p_cuando.
create or replace function pg_temp.apd_recordatorio(p_usuario uuid, p_cuando timestamptz) returns uuid language sql as $f$
  insert into public.recordatorios (usuario_id, titulo, recordar_en) values (p_usuario, 'PE recordatorio', p_cuando) returning id
$f$;

-- La página como esa persona.
create or replace function pg_temp.apd_pagina(p_quien uuid, p_grupo text, p_hasta timestamptz default null, p_tamano int default null,
                                             p_despues_en text default null, p_despues_id text default null) returns jsonb language sql as $f$
  select pg_temp.apd_corre(p_quien, format('select public.agenda_pendientes(%L, %L::timestamptz, %s, %L::timestamptz, %L::uuid)',
                                          p_grupo, p_hasta, coalesce(p_tamano::text, 'null'), p_despues_en, p_despues_id))
$f$;

-- Los ids de la página, en orden.
create or replace function pg_temp.apd_ids(p_r jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg((e ->> 'id')::uuid order by n), '{}') from jsonb_array_elements(p_r -> 'filas') with ordinality a(e, n)
$f$;

-- La marca del cursor de la fila i (instante del grupo).
create or replace function pg_temp.apd_cursor(p_r jsonb, p_i int, p_clave text) returns text language sql as $f$
  select p_r -> 'filas' -> p_i ->> p_clave
$f$;

-- @test agenda: pendientes «vencidas» entrega sólo mis tareas pendientes, vivas y vencidas, la más vieja primero, por cursor (P1)
begin;
do $$
declare
  yo uuid := pg_temp.apd_persona(array['agenda.tareas.recibir']); otra uuid := pg_temp.apd_persona(array['agenda.tareas.recibir']);
  v1 uuid; v2 uuid; v3 uuid; hecha uuid; cancelada uuid; borrada uuid; futura uuid; sin_fecha uuid; dada uuid; r jsonb; v_empate uuid[];
begin
  v1 := pg_temp.apd_tarea(yo, yo, interval '-3 days');
  v2 := pg_temp.apd_tarea(yo, yo, interval '-2 days');
  v3 := pg_temp.apd_tarea(yo, yo, interval '-1 hour');
  hecha := pg_temp.apd_tarea(yo, yo, interval '-1 day', 'completado');
  cancelada := pg_temp.apd_tarea(yo, yo, interval '-1 day', 'cancelado');
  borrada := pg_temp.apd_tarea(yo, yo, interval '-1 day');
  update public.tareas set eliminado_en = now() where id = borrada;
  futura := pg_temp.apd_tarea(yo, yo, interval '1 hour');
  sin_fecha := pg_temp.apd_tarea(yo, yo, null);
  dada := pg_temp.apd_tarea(yo, otra, interval '-1 day');
  -- La RLS sí me deja ver la que di: si sale, falta el filtro.
  if pg_temp.apd_corre(yo, format('select to_jsonb(count(*)) from public.tareas where id = %L', dada)) <> '1'::jsonb then
    raise exception 'el creador debía ver la tarea que dio'; end if;
  r := pg_temp.apd_pagina(yo, 'vencidas');
  if pg_temp.apd_ids(r) is distinct from array[v1, v2, v3] or r -> 'hay_mas' is distinct from 'false'::jsonb then
    raise exception 'la página entera: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['filas', 'hay_mas'] then raise exception 'las claves: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'filas' -> 0) k)
     is distinct from array['actualizado_en', 'id', 'titulo', 'vence_en'] then raise exception 'las claves de la fila: %', r -> 'filas' -> 0; end if;
  if (pg_temp.apd_cursor(r, 0, 'actualizado_en'))::timestamptz is distinct from (select actualizado_en from public.tareas where id = v1)
     or (pg_temp.apd_cursor(r, 0, 'vence_en'))::timestamptz is distinct from (select vence_en from public.tareas where id = v1) then
    raise exception 'las hojas de la fila: %', r -> 'filas' -> 0; end if;
  r := pg_temp.apd_pagina(yo, 'vencidas', null, 2);
  if pg_temp.apd_ids(r) is distinct from array[v1, v2] or r -> 'hay_mas' is distinct from 'true'::jsonb then raise exception 'la página de 2: %', r; end if;
  r := pg_temp.apd_pagina(yo, 'vencidas', null, 2, pg_temp.apd_cursor(r, 1, 'vence_en'), pg_temp.apd_cursor(r, 1, 'id'));
  if pg_temp.apd_ids(r) is distinct from array[v3] or r -> 'hay_mas' is distinct from 'false'::jsonb then raise exception 'la página del cursor: %', r; end if;
  r := pg_temp.apd_pagina(otra, 'vencidas');
  if pg_temp.apd_ids(r) is distinct from array[dada] then raise exception 'la responsable de la que di recibió %', r; end if;
  -- Empate: v2 y una más con el mismo vencimiento salen una vez cada una, de a una por página.
  update public.tareas set vence_en = (select vence_en from public.tareas where id = v2) where id = v3;
  r := pg_temp.apd_pagina(yo, 'vencidas', null, 1, pg_temp.apd_cursor(pg_temp.apd_pagina(yo, 'vencidas', null, 1), 0, 'vence_en'),
                          pg_temp.apd_cursor(pg_temp.apd_pagina(yo, 'vencidas', null, 1), 0, 'id'));
  v_empate := pg_temp.apd_ids(r);
  r := pg_temp.apd_pagina(yo, 'vencidas', null, 1, pg_temp.apd_cursor(r, 0, 'vence_en'), pg_temp.apd_cursor(r, 0, 'id'));
  v_empate := v_empate || pg_temp.apd_ids(r);
  if array_length(v_empate, 1) is distinct from 2 or not (v_empate @> array[v2, v3]) or r -> 'hay_mas' is distinct from 'false'::jsonb then
    raise exception 'el empate de vencimientos por cursor dio % (hay_mas %)', v_empate, r -> 'hay_mas'; end if;
end $$;
rollback;

-- @test agenda: pendientes «recordatorios» entrega sólo los míos pendientes antes de p_hasta, sin perder empates por cursor (P2)
begin;
do $$
declare
  yo uuid := pg_temp.apd_persona(); otra uuid := pg_temp.apd_persona();
  v_hasta timestamptz := date_trunc('second', now()) + interval '6 hours';
  v_misma timestamptz := date_trunc('second', now()) - interval '1 hour';
  r1 uuid; r2 uuid; r3 uuid; r4 uuid; completado uuid; borrado uuid; ajeno uuid; despues uuid; r jsonb; v_todos uuid[];
begin
  r1 := pg_temp.apd_recordatorio(yo, date_trunc('second', now()) - interval '2 days');
  r2 := pg_temp.apd_recordatorio(yo, v_misma);
  r3 := pg_temp.apd_recordatorio(yo, v_misma);
  r4 := pg_temp.apd_recordatorio(yo, date_trunc('second', now()) + interval '2 hours');
  completado := pg_temp.apd_recordatorio(yo, v_misma);
  update public.recordatorios set completado_en = now() where id = completado;
  borrado := pg_temp.apd_recordatorio(yo, v_misma);
  update public.recordatorios set eliminado_en = now() where id = borrado;
  ajeno := pg_temp.apd_recordatorio(otra, v_misma);
  despues := pg_temp.apd_recordatorio(yo, v_hasta);
  r := pg_temp.apd_pagina(yo, 'recordatorios', v_hasta);
  v_todos := pg_temp.apd_ids(r);
  if array_length(v_todos, 1) is distinct from 4 or v_todos[1] is distinct from r1 or v_todos[4] is distinct from r4
     or not (v_todos @> array[r2, r3]) or r -> 'hay_mas' is distinct from 'false'::jsonb then
    raise exception 'la página entera: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'filas' -> 0) k)
     is distinct from array['actualizado_en', 'id', 'recordar_en', 'titulo'] then raise exception 'las claves de la fila: %', r -> 'filas' -> 0; end if;
  -- De a uno: los dos de la misma hora salen una vez cada uno, en el orden de la página entera.
  r := pg_temp.apd_pagina(yo, 'recordatorios', v_hasta, 1);
  if pg_temp.apd_ids(r) is distinct from array[r1] or r -> 'hay_mas' is distinct from 'true'::jsonb then raise exception 'la 1.ª página: %', r; end if;
  r := pg_temp.apd_pagina(yo, 'recordatorios', v_hasta, 1, pg_temp.apd_cursor(r, 0, 'recordar_en'), pg_temp.apd_cursor(r, 0, 'id'));
  if pg_temp.apd_ids(r) is distinct from array[v_todos[2]] then raise exception 'la 2.ª página: %', r; end if;
  r := pg_temp.apd_pagina(yo, 'recordatorios', v_hasta, 1, pg_temp.apd_cursor(r, 0, 'recordar_en'), pg_temp.apd_cursor(r, 0, 'id'));
  if pg_temp.apd_ids(r) is distinct from array[v_todos[3]] then raise exception 'la 3.ª página: %', r; end if;
  r := pg_temp.apd_pagina(yo, 'recordatorios', v_hasta, 1, pg_temp.apd_cursor(r, 0, 'recordar_en'), pg_temp.apd_cursor(r, 0, 'id'));
  if pg_temp.apd_ids(r) is distinct from array[r4] or r -> 'hay_mas' is distinct from 'false'::jsonb then raise exception 'la 4.ª página: %', r; end if;
  r := pg_temp.apd_pagina(yo, 'recordatorios');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'hasta' then raise exception 'sin p_hasta dio %', r; end if;
end $$;
rollback;

-- @test agenda: pendientes rechaza un grupo inválido, un cursor a medias y a una persona bloqueada; el tamaño lo acota _acotar_pagina (P3)
begin;
do $$
declare yo uuid := pg_temp.apd_persona(array['agenda.tareas.recibir']); r jsonb;
begin
  r := pg_temp.apd_pagina(yo, 'otros');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'grupo' then raise exception 'el grupo inválido dio %', r; end if;
  r := pg_temp.apd_pagina(yo, null);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'grupo' then raise exception 'el grupo nulo dio %', r; end if;
  r := pg_temp.apd_pagina(yo, 'vencidas', null, null, now()::text, null);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'cursor' then raise exception 'el cursor a medias dio %', r; end if;
  perform pg_temp.apd_tarea(yo, yo, make_interval(days => -1, secs => -g)) from generate_series(1, 52) g;
  r := pg_temp.apd_pagina(yo, 'vencidas', null, 999);
  if jsonb_array_length(r -> 'filas') <> 50 or r -> 'hay_mas' is distinct from 'true'::jsonb then
    raise exception 'con 999: % y hay_mas %', jsonb_array_length(r -> 'filas'), r -> 'hay_mas'; end if;
  r := pg_temp.apd_pagina(yo, 'vencidas');
  if jsonb_array_length(r -> 'filas') <> 20 then raise exception 'por defecto: %', jsonb_array_length(r -> 'filas'); end if;
  update public.perfiles set bloqueado = true where id = yo;
  r := pg_temp.apd_pagina(yo, 'vencidas');
  if r ->> 'error' is distinct from '42501' then raise exception 'una persona bloqueada leyó %', r; end if;
end $$;
rollback;

-- @test agenda: agenda_pendientes es de invocador, con search_path vacío, de authenticated y no de anon ni PUBLIC; sus índices son de pendientes (P4)
begin;
do $$
declare f record; v_oid oid := 'public.agenda_pendientes(text, timestamptz, integer, timestamptz, uuid)'::regprocedure; v_idx text;
begin
  select p.prosecdef, p.proconfig into f from pg_proc p where p.oid = v_oid;
  if f.prosecdef or f.proconfig is distinct from array['search_path=""'] then raise exception 'definer % y config %', f.prosecdef, f.proconfig; end if;
  if not has_function_privilege('authenticated', v_oid, 'execute') or has_function_privilege('anon', v_oid, 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = v_oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'execute de authenticated sí, de anon y PUBLIC no'; end if;
  if (select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'agenda_pendientes') <> 1 then
    raise exception 'agenda_pendientes tiene sobrecargas'; end if;
  foreach v_idx in array array['public.tareas_pendientes_idx', 'public.tareas_sin_fecha_idx'] loop
    if to_regclass(v_idx) is null then raise exception 'falta %', v_idx; end if;
    if pg_get_indexdef(v_idx::regclass) not like '%estado = ''pendiente''%' then
      raise exception '% debía ser sólo de pendientes: %', v_idx, pg_get_indexdef(v_idx::regclass); end if;
  end loop;
end $$;
rollback;
