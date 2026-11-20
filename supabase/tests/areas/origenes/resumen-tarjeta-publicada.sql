-- `origenes_resumen()` dice si cada origen tiene la tarjeta de la cotización publicada (`tarjeta_publicada`): verdadero con una plantilla
-- `publicada`, falso sin plantilla o con sólo un borrador. Lo ve quien entra con cualquiera de los tres permisos (también con sólo
-- `flujos.configurar`, a quien la RLS de `plantillas_tarjeta` le esconde la fila); sin ninguno, 42501. Cada bloque arma su terreno y lo revierte.

-- @test resumen con la tarjeta: los ayudantes
reset role;
create or replace function pg_temp.rtp_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- `tarjeta_publicada` del origen, leída como esa persona (un error sube).
create or replace function pg_temp.rtp_publicada(p_quien uuid, p_origen uuid) returns boolean language plpgsql as $f$
declare r boolean;
begin
  perform pg_temp.rtp_como(p_quien);
  set local role authenticated;
  select x.tarjeta_publicada into r from public.origenes_resumen() x where x.origen_id = p_origen;
  reset role;
  return r;
end $f$;

-- El sqlstate de leer el resumen como esa persona, o «sin error».
create or replace function pg_temp.rtp_codigo(p_quien uuid) returns text language plpgsql as $f$
begin
  perform pg_temp.rtp_como(p_quien);
  set local role authenticated;
  perform public.origenes_resumen();
  reset role;
  return 'sin error';
exception when others then
  reset role;
  return sqlstate;
end $f$;

-- Tres orígenes (uno con plantilla publicada, uno con sólo un borrador y uno sin plantilla) y tres personas con rol propio (la primera
-- cuenta nace dueña: se le quita): Pía configura el cotizador, Flor sólo el flujo y Ana no tiene claves. Las plantillas entran sin sus
-- triggers: lo que se prueba es el resumen, no la validación de la definición.
create or replace function pg_temp.rtp_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0; con uuid; bor uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_rtp_con', 'Prueba rtp con') returning id into con;
  insert into public.origenes (clave, nombre) values ('prueba_rtp_bor', 'Prueba rtp borrador') returning id into bor;
  insert into public.origenes (clave, nombre) values ('prueba_rtp_sin', 'Prueba rtp sin');
  set local session_replication_role = replica;
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion, publicado_en) values (con, 1, 'publicada', '{}'::jsonb, now());
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion) values (bor, null, 'borrador', '{}'::jsonb);
  set local session_replication_role = origin;
  foreach p in array array['00000000-0000-4000-8000-00000007e00f', '00000000-0000-4000-8000-00000007e00b', '00000000-0000-4000-8000-00000007e00a']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'RTP ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('rtp_rol_' || i, 'RTP rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.configurar', null, 'todos');
    elsif i = 2 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'flujos.configurar', null, 'todos');
    end if;
  end loop;
end $f$;

create or replace function pg_temp.rtp_origen(p_clave text) returns uuid language sql as $f$
  select id from public.origenes where clave = p_clave
$f$;

-- @test resumen con la tarjeta: verdadero con una plantilla publicada; falso sin plantilla o con sólo un borrador
begin;
select pg_temp.rtp_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-00000007e00f';
begin
  if pg_temp.rtp_publicada(pia, pg_temp.rtp_origen('prueba_rtp_con')) is distinct from true then
    raise exception 'con plantilla publicada, el resumen no la ve';
  end if;
  if pg_temp.rtp_publicada(pia, pg_temp.rtp_origen('prueba_rtp_bor')) is distinct from false then
    raise exception 'con sólo un borrador, el resumen la da por publicada';
  end if;
  if pg_temp.rtp_publicada(pia, pg_temp.rtp_origen('prueba_rtp_sin')) is distinct from false then
    raise exception 'sin plantilla, el resumen la da por publicada';
  end if;
end $$;
rollback;

-- @test resumen con la tarjeta: con sólo flujos.configurar se ve publicada aunque la RLS esconda la plantilla
begin;
select pg_temp.rtp_preparar();
do $$
declare flor uuid := '00000000-0000-4000-8000-00000007e00b'; n int;
begin
  perform pg_temp.rtp_como(flor);
  set local role authenticated;
  select count(*) into n from public.plantillas_tarjeta where origen_id = pg_temp.rtp_origen('prueba_rtp_con');
  reset role;
  if n <> 0 then raise exception 'la RLS de plantillas_tarjeta le deja leer % a quien sólo configura el flujo', n; end if;
  if pg_temp.rtp_publicada(flor, pg_temp.rtp_origen('prueba_rtp_con')) is distinct from true then
    raise exception 'quien sólo configura el flujo no ve la tarjeta publicada en el resumen';
  end if;
end $$;
rollback;

-- @test resumen con la tarjeta: sin ninguno de los tres permisos, 42501
begin;
select pg_temp.rtp_preparar();
do $$
declare r text := pg_temp.rtp_codigo('00000000-0000-4000-8000-00000007e00a');
begin
  if r <> '42501' then raise exception 'sin permisos leyó el resumen: %', r; end if;
end $$;
rollback;
