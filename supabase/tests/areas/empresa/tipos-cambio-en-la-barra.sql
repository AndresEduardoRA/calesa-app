-- «En la barra» (`tipos_cambio.en_la_barra`, escrito por `tipo_cambio_guardar(… p_en_la_barra)`) y el último cambio de cada tipo de cambio para el popover de la
-- barra superior (`tipos_cambio_vigentes()`). Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno con `tcb_preparar()`
-- dentro de su transacción y la revierte. La concurrencia (dos personas que marcan a la vez) está en `carreras.mjs` de esta carpeta.

-- @test empresa: los ayudantes de «En la barra»
reset role;
create or replace function pg_temp.tcb_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Una persona con nombre y un rol propio con esas claves (sin origen). Si corre sola (`SOLO=`) la primera cuenta nace dueña: se le deja sólo su rol.
create or replace function pg_temp.tcb_persona(p_id uuid, p_nombre text, p_claves text[]) returns void language plpgsql as $f$
declare v_rol uuid; k text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre, invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('tcb_' || substr(p_id::text, 25, 12), 'TCB ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach k in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, k, 'todos');
  end loop;
end $f$;

-- El terreno: nadie en la barra y cinco tipos de cambio activos propios (`tcb_a` … `tcb_e`), ninguno por defecto. Las personas:
--   g (Gina Barra)    gestiona los tipos de cambio
--   h (Hugo Nombre)   gestiona los tipos de cambio
--   s (Sara Sin)      no los gestiona
create or replace function pg_temp.tcb_preparar() returns void language plpgsql as $f$
begin
  update public.tipos_cambio set en_la_barra = false where en_la_barra;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, orden)
  select 'tcb_' || l, 'TCB ' || upper(l), 'USD', 'BOB', 7, 900 + n
    from unnest(array['a', 'b', 'c', 'd', 'e']) with ordinality as x(l, n);
  perform pg_temp.tcb_persona('00000000-0000-4000-8000-0000000cb001', 'Gina Barra', array['empresa.tipos_cambio.gestionar']);
  perform pg_temp.tcb_persona('00000000-0000-4000-8000-0000000cb002', 'Hugo Nombre', array['empresa.tipos_cambio.gestionar']);
  perform pg_temp.tcb_persona('00000000-0000-4000-8000-0000000cb003', 'Sara Sin', array['leads.ver']);
end $f$;

create or replace function pg_temp.tcb_id(p_letra text) returns uuid language sql as $f$
  select id from public.tipos_cambio where clave = 'tcb_' || p_letra
$f$;

create or replace function pg_temp.tcb_version(p_letra text) returns timestamptz language sql as $f$
  select actualizado_en from public.tipos_cambio where clave = 'tcb_' || p_letra
$f$;

-- `tipo_cambio_guardar` como esa persona, con la versión de la tabla (o la que se pase); un error sube tal cual.
create or replace function pg_temp.tcb_guardar(
  p_quien uuid, p_letra text, p_en_la_barra boolean default null, p_activo boolean default null, p_valor numeric default null,
  p_nombre text default null, p_esperada timestamptz default null
) returns timestamptz language plpgsql as $f$
declare v timestamptz;
begin
  perform pg_temp.tcb_como(p_quien);
  set local role authenticated;
  v := public.tipo_cambio_guardar(pg_temp.tcb_id(p_letra), coalesce(p_esperada, pg_temp.tcb_version(p_letra)),
                                  p_nombre => p_nombre, p_valor => p_valor, p_activo => p_activo, p_en_la_barra => p_en_la_barra);
  reset role;
  return v;
end $f$;

-- El sqlstate y el hint con que cae un guardado, o 'ok'.
create or replace function pg_temp.tcb_rechazo(
  p_quien uuid, p_letra text, p_en_la_barra boolean default null, p_activo boolean default null, p_esperada timestamptz default null
) returns text language plpgsql as $f$
declare v_estado text; v_hint text;
begin
  perform pg_temp.tcb_guardar(p_quien, p_letra, p_en_la_barra, p_activo, p_esperada => p_esperada);
  return 'ok';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  reset role;
  return v_estado || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

-- Lo que esa persona recibe de `tipos_cambio_vigentes()` (como `authenticated`), por clave.
create or replace function pg_temp.tcb_vigentes(p_quien uuid) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform pg_temp.tcb_como(p_quien);
  set local role authenticated;
  select coalesce(jsonb_object_agg(t.clave, to_jsonb(r)), '{}') into v
    from public.tipos_cambio_vigentes() r join public.tipos_cambio t on t.id = r.id;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.tcb_marcados() returns text language sql as $f$
  select coalesce(string_agg(substr(clave, 5) || case when activo then '' else '(inactivo)' end, ',' order by clave), '')
    from public.tipos_cambio where en_la_barra
$f$;

-- @test empresa: marcar en la barra pide el permiso y la versión
begin;
select pg_temp.tcb_preparar();
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000cb001';
  s constant uuid := '00000000-0000-4000-8000-0000000cb003';
  v_r text; v_nueva timestamptz;
begin
  v_r := pg_temp.tcb_rechazo(s, 'a', p_en_la_barra => true);
  if v_r <> '42501' then raise exception 'sin el permiso esperaba 42501, dio %', v_r; end if;
  v_r := pg_temp.tcb_rechazo(g, 'a', p_en_la_barra => true, p_esperada => pg_temp.tcb_version('a') - interval '1 microsecond');
  if v_r <> 'PT409' then raise exception 'con una versión vieja esperaba PT409, dio %', v_r; end if;
  if pg_temp.tcb_marcados() <> '' then raise exception 'un rechazo marcó: %', pg_temp.tcb_marcados(); end if;
  v_nueva := pg_temp.tcb_guardar(g, 'a', p_en_la_barra => true);
  if pg_temp.tcb_marcados() <> 'a' then raise exception 'con permiso y versión no quedó marcado: %', pg_temp.tcb_marcados(); end if;
  if v_nueva is distinct from pg_temp.tcb_version('a') then raise exception 'no devolvió la versión de la fila: %', v_nueva; end if;
end $$;
rollback;

-- @test empresa: la barra admite hasta 3 activos y sólo activos
begin;
select pg_temp.tcb_preparar();
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000cb001';
  v_r text;
begin
  perform pg_temp.tcb_guardar(g, 'a', p_en_la_barra => true);
  perform pg_temp.tcb_guardar(g, 'b', p_en_la_barra => true);
  perform pg_temp.tcb_guardar(g, 'c', p_en_la_barra => true);
  v_r := pg_temp.tcb_rechazo(g, 'd', p_en_la_barra => true);
  if v_r <> '22023/en_la_barra' then raise exception 'el cuarto activo esperaba 22023 con hint en_la_barra, dio %', v_r; end if;
  -- Volver a marcar uno ya marcado no cuenta como sumar.
  v_r := pg_temp.tcb_rechazo(g, 'c', p_en_la_barra => true);
  if v_r <> 'ok' then raise exception 'volver a marcar uno ya marcado dio %', v_r; end if;
  -- Desmarcar siempre pasa, también con el tope lleno.
  perform pg_temp.tcb_guardar(g, 'a', p_en_la_barra => false);
  perform pg_temp.tcb_guardar(g, 'd', p_en_la_barra => true);
  if pg_temp.tcb_marcados() <> 'b,c,d' then raise exception 'desmarcar y marcar otro dejó %', pg_temp.tcb_marcados(); end if;
  -- Un inactivo no se marca; activarlo en el mismo guardado sí, si hay lugar.
  perform pg_temp.tcb_guardar(g, 'e', p_activo => false);
  v_r := pg_temp.tcb_rechazo(g, 'e', p_en_la_barra => true);
  if v_r <> '22023/en_la_barra' then raise exception 'marcar un inactivo esperaba 22023 con hint en_la_barra, dio %', v_r; end if;
  -- Desactivar uno marcado conserva la marca, y un marcado inactivo no cuenta para el tope.
  perform pg_temp.tcb_guardar(g, 'b', p_activo => false);
  if pg_temp.tcb_marcados() <> 'b(inactivo),c,d' then raise exception 'desactivar cambió la marca: %', pg_temp.tcb_marcados(); end if;
  perform pg_temp.tcb_guardar(g, 'e', p_en_la_barra => true, p_activo => true);
  if pg_temp.tcb_marcados() <> 'b(inactivo),c,d,e' then raise exception 'un marcado inactivo contó para el tope: %', pg_temp.tcb_marcados(); end if;
  v_r := pg_temp.tcb_rechazo(g, 'a', p_en_la_barra => true);
  if v_r <> '22023/en_la_barra' then raise exception 'con 3 activos marcados y uno inactivo, el cuarto activo dio %', v_r; end if;
end $$;
rollback;

-- @test empresa: marcar no toca el valor, el historial ni las cotizaciones guardadas
begin;
select pg_temp.tcb_preparar();
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000cb001';
  v_huella text; v_historial int; v_valor numeric;
begin
  select md5(string_agg(c.tipos_cambio::text, '|' order by c.id)) into v_huella from public.cotizaciones c;
  select count(*) into v_historial from public.tipos_cambio_historial h where h.tipo_cambio_id = pg_temp.tcb_id('a');
  select valor into v_valor from public.tipos_cambio where id = pg_temp.tcb_id('a');
  perform pg_temp.tcb_guardar(g, 'a', p_en_la_barra => true);
  perform pg_temp.tcb_guardar(g, 'a', p_en_la_barra => false);
  if (select md5(string_agg(c.tipos_cambio::text, '|' order by c.id)) from public.cotizaciones c) is distinct from v_huella then
    raise exception 'marcar cambió los tipos de cambio congelados en las cotizaciones';
  end if;
  if (select count(*) from public.tipos_cambio_historial h where h.tipo_cambio_id = pg_temp.tcb_id('a')) <> v_historial then
    raise exception 'marcar escribió en el historial';
  end if;
  if (select valor from public.tipos_cambio where id = pg_temp.tcb_id('a')) is distinct from v_valor then
    raise exception 'marcar cambió el valor';
  end if;
end $$;
rollback;

-- @test empresa: tipos_cambio_vigentes da los activos con su último cambio y el nombre, nunca el correo
begin;
select pg_temp.tcb_preparar();
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000cb001';
  h constant uuid := '00000000-0000-4000-8000-0000000cb002';
  s constant uuid := '00000000-0000-4000-8000-0000000cb003';
  v jsonb; v_claves text[];
begin
  perform pg_temp.tcb_guardar(g, 'a', p_valor => 7.5);
  perform pg_temp.tcb_guardar(g, 'e', p_activo => false);
  -- El alta y el cambio del valor, a horas fijas del pasado: así se ve que renombrar no mueve el último cambio (dentro de la transacción `now()` no avanza).
  update public.tipos_cambio_historial
     set cambiado_en = case when valor_anterior is null then '2026-01-01 00:00:00+00'::timestamptz else '2026-01-02 03:04:05.123456+00' end
   where tipo_cambio_id = pg_temp.tcb_id('a');
  perform pg_temp.tcb_guardar(h, 'a', p_nombre => 'TCB A renombrado');

  -- Quien no gestiona los tipos de cambio igual los ve, con el último cambio.
  v := pg_temp.tcb_vigentes(s);
  select array_agg(k order by k) into v_claves from jsonb_object_keys(v) k where k like 'tcb_%';
  if v_claves is distinct from array['tcb_a', 'tcb_b', 'tcb_c', 'tcb_d'] then raise exception 'esperaba los 4 activos, llegó %', v_claves; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(v -> 'tcb_a') k) is distinct from
     array['actualizado_en', 'actualizado_por', 'id', 'moneda_a', 'moneda_de', 'nombre', 'valor', 'valor_cambiado_en', 'valor_cambiado_por'] then
    raise exception 'la fila no trae exactamente sus 9 claves: %', v -> 'tcb_a';
  end if;
  if v -> 'tcb_a' ->> 'valor_cambiado_por' is distinct from 'Gina Barra' then
    raise exception 'valor_cambiado_por no es quien cambió el valor: %', v -> 'tcb_a';
  end if;
  if (v -> 'tcb_a' ->> 'valor_cambiado_en')::timestamptz is distinct from '2026-01-02 03:04:05.123456+00'::timestamptz then
    raise exception 'renombrar movió el último cambio del valor: %', v -> 'tcb_a' ->> 'valor_cambiado_en';
  end if;
  if v -> 'tcb_a' ->> 'actualizado_por' is distinct from 'Hugo Nombre' or v -> 'tcb_a' ->> 'nombre' is distinct from 'TCB A renombrado'
     or (v -> 'tcb_a' ->> 'valor')::numeric is distinct from 7.5 or v -> 'tcb_a' ->> 'moneda_de' is distinct from 'USD'
     or (v -> 'tcb_a' ->> 'actualizado_en')::timestamptz is distinct from pg_temp.tcb_version('a') then
    raise exception 'la fila no es la de la tabla: %', v -> 'tcb_a';
  end if;
  if position('@' in v::text) > 0 then raise exception 'salió un correo: %', v; end if;

  -- Un nombre vacío da null, nunca el correo.
  update public.perfiles set nombre = '  ' where id = g;
  v := pg_temp.tcb_vigentes(s);
  if v -> 'tcb_a' -> 'valor_cambiado_por' is distinct from 'null'::jsonb then
    raise exception 'con el nombre vacío esperaba null, llegó %', v -> 'tcb_a' -> 'valor_cambiado_por';
  end if;

  -- Una cuenta que no está activa no recibe nada.
  update public.perfiles set bloqueado = true where id = s;
  if pg_temp.tcb_vigentes(s) <> '{}'::jsonb then raise exception 'una cuenta bloqueada recibió filas'; end if;

  if has_function_privilege('anon', 'public.tipos_cambio_vigentes()', 'execute')
     or has_function_privilege('anon', 'public.tipo_cambio_guardar(uuid, timestamptz, text, numeric, boolean, boolean, boolean)', 'execute') then
    raise exception 'anon puede ejecutar la lectura o el guardado de los tipos de cambio';
  end if;
end $$;
rollback;

-- @test empresa: tipo_cambio_guardar toma el candado de la barra antes que la fila
do $$
declare v_def text := pg_get_functiondef('public.tipo_cambio_guardar(uuid, timestamptz, text, numeric, boolean, boolean, boolean)'::regprocedure);
begin
  if position('pg_advisory_xact_lock(hashtextextended(''tipos_cambio:en_la_barra''' in v_def) = 0 then
    raise exception 'tipo_cambio_guardar no toma el candado de la barra';
  end if;
  if position('pg_advisory_xact_lock' in v_def) > position('for update' in v_def) then
    raise exception 'tipo_cambio_guardar toma la fila antes que el candado de la barra (40P01 con el desmarcado del por defecto)';
  end if;
end $$;
