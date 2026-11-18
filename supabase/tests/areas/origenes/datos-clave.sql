-- Los datos clave de un origen: `_origen_datos_clave_error()` y `_origen_datos_clave_de_fabrica()` dan lo mismo que `errorDeDatosClave()` y
-- `DATOS_CLAVE_DE_FABRICA` (`src/modules/origenes/entities/datos-clave.ts`) en cada caso del juego común, que `scripts/probar-schema.mjs`
-- carga antes en `_casos_de_datos_clave`; el `check` rechaza las formas inválidas; `origen_datos_clave_guardar()` pide `origenes.gestionar`
-- (42501 antes que la versión), la versión del origen y campos activos de ese origen (PT409); desactivar o eliminar un campo lo quita de la
-- lista; un origen nuevo nace con los de su tipo. La carrera de desactivar y guardar a la vez, en carreras.mjs. Cada bloque arma su terreno
-- y lo revierte.

-- @test datos clave: los ayudantes
reset role;
create or replace function pg_temp.dc_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- El error de un SQL corrido como esa persona: «sqlstate: mensaje», o «sin error».
create or replace function pg_temp.dc_error(p_quien uuid, p_sql text) returns text language plpgsql as $f$
begin
  perform pg_temp.dc_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  reset role;
  return sqlstate || ': ' || sqlerrm;
end $f$;

-- El sqlstate de un SQL corrido como postgres (por encima de la RLS), o «sin error».
create or replace function pg_temp.dc_sqlstate(p_sql text) returns text language plpgsql as $f$
begin
  execute p_sql;
  return 'sin error';
exception when others then
  return sqlstate;
end $f$;

-- Un origen manual con los campos `dc_a` y `dc_b` activos y `dc_x` inactivo, uno de subasta con `dc_ajeno`, y dos personas con rol propio
-- (la primera cuenta nace dueña: se le quita): Pía gestiona los orígenes y Ana no tiene claves. Las versiones, un minuto atrás.
create or replace function pg_temp.dc_preparar() returns void language plpgsql as $f$
declare m uuid; s uuid; p uuid; v_rol uuid; i int := 0;
begin
  insert into public.origenes (clave, nombre, tipo) values ('prueba_dc_m', 'Prueba dc manual', 'manual') returning id into m;
  insert into public.origenes (clave, nombre, tipo) values ('prueba_dc_s', 'Prueba dc subasta', 'subasta') returning id into s;
  insert into public.origenes_campos (id, origen_id, clave, etiqueta, tipo, orden, activo) values
    ('00000000-0000-4000-8000-0000000dc0a1', m, 'dc_a', 'DC A', 'texto', 1001, true),
    ('00000000-0000-4000-8000-0000000dc0b1', m, 'dc_b', 'DC B', 'texto', 1002, true),
    ('00000000-0000-4000-8000-0000000dc0c1', m, 'dc_x', 'DC X', 'texto', 1003, false),
    ('00000000-0000-4000-8000-0000000dc0d1', s, 'dc_ajeno', 'DC ajeno', 'texto', 1004, true);
  set local session_replication_role = replica;
  update public.origenes_campos set actualizado_en = now() - interval '1 minute' where origen_id in (m, s);
  update public.origenes set actualizado_en = now() - interval '1 minute' where id in (m, s);
  set local session_replication_role = origin;
  foreach p in array array['00000000-0000-4000-8000-0000000dc00f', '00000000-0000-4000-8000-0000000dc00a']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'DC ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('dc_rol_' || i, 'DC rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'origenes.gestionar', null, 'todos');
    end if;
  end loop;
end $f$;

create or replace function pg_temp.dc_origen(p_clave text) returns uuid language sql as $f$
  select id from public.origenes where clave = p_clave
$f$;

create or replace function pg_temp.dc_version(p_origen uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.origenes where id = p_origen
$f$;

create or replace function pg_temp.dc_datos(p_origen uuid) returns jsonb language sql as $f$
  select datos_clave from public.origenes where id = p_origen
$f$;

create or replace function pg_temp.dc_campo_version(p_campo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.origenes_campos where id = p_campo
$f$;

-- Guarda una lista como esa persona con la versión vigente del origen.
create or replace function pg_temp.dc_guardar(p_quien uuid, p_origen uuid, p_datos text) returns text language sql as $f$
  select pg_temp.dc_error(p_quien, format('select public.origen_datos_clave_guardar(%L, %L::jsonb, %L)', p_origen, p_datos, pg_temp.dc_version(p_origen)))
$f$;

-- @test datos clave: el juego común da lo mismo en la base y en TS; el check rechaza sólo la forma y el tope
begin;
select pg_temp.dc_preparar();
do $$
declare c jsonb; v jsonb; r text; v_n int := 0; m uuid := pg_temp.dc_origen('prueba_dc_m'); s uuid := pg_temp.dc_origen('prueba_dc_s');
begin
  for c in select x from _casos_de_datos_clave j, jsonb_array_elements(j.doc -> 'casos') x loop
    v := coalesce(public._origen_datos_clave_error(
      (c ->> 'tipo')::public.tipo_origen, c -> 'datos', array(select jsonb_array_elements_text(c -> 'camposActivos'))), 'null'::jsonb);
    if v is distinct from c -> 'error' then
      raise exception 'caso «%»: la base % y datos-clave.ts %', c ->> 'nombre', v, c -> 'error';
    end if;
    r := pg_temp.dc_sqlstate(format('update public.origenes set datos_clave = %L::jsonb where id = %L',
      c -> 'datos', case when c ->> 'tipo' = 'subasta' then s else m end));
    if coalesce(c -> 'error' ->> 'codigo' in ('forma', 'tope'), false) is distinct from (r = '23514') then
      raise exception 'caso «%»: el check dio %', c ->> 'nombre', r;
    end if;
    v_n := v_n + 1;
  end loop;
  if v_n < 20 then raise exception 'el juego trae % casos', v_n; end if;
  select j.doc -> 'deFabrica' into c from _casos_de_datos_clave j;
  if public._origen_datos_clave_de_fabrica('subasta') is distinct from c -> 'subasta'
     or public._origen_datos_clave_de_fabrica('manual') is distinct from c -> 'manual' then
    raise exception 'los de fábrica no son los de datos-clave.ts: %', c;
  end if;
end $$;
rollback;

-- @test datos clave: sin origenes.gestionar, 42501 (también con una versión vieja) y nada cambia
begin;
select pg_temp.dc_preparar();
do $$
declare ana uuid := '00000000-0000-4000-8000-0000000dc00a'; m uuid := pg_temp.dc_origen('prueba_dc_m'); r text; antes jsonb := pg_temp.dc_datos(m);
begin
  r := pg_temp.dc_guardar(ana, m, '[{"comun": "anio"}]');
  if r not like '42501:%' then raise exception 'Ana guardó: %', r; end if;
  r := pg_temp.dc_error(ana, format('select public.origen_datos_clave_guardar(%L, %L::jsonb, %L)', m, '[{"comun": "anio"}]', '2000-01-01'));
  if r not like '42501:%' then raise exception 'Ana con versión vieja no recibió 42501: %', r; end if;
  if pg_temp.dc_datos(m) is distinct from antes then raise exception 'la lista cambió: %', pg_temp.dc_datos(m); end if;
end $$;
rollback;

-- @test datos clave: más de 4, repetidos o un dato de subasta en un manual dan 22023; el lote en una subasta se guarda
begin;
select pg_temp.dc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-0000000dc00f'; m uuid := pg_temp.dc_origen('prueba_dc_m'); s uuid := pg_temp.dc_origen('prueba_dc_s'); r text;
begin
  r := pg_temp.dc_guardar(pia, m, '[{"comun": "anio"}, {"comun": "vin"}, {"comun": "marca"}, {"comun": "modelo"}, {"comun": "placado"}]');
  if r <> '22023: Ya hay 4 datos clave: quita uno para sumar este.' then raise exception 'más de 4: %', r; end if;
  r := pg_temp.dc_guardar(pia, m, '[{"comun": "anio"}, {"comun": "anio"}]');
  if r <> '22023: Un dato clave está repetido.' then raise exception 'repetido: %', r; end if;
  r := pg_temp.dc_guardar(pia, m, '[{"comun": "plataforma"}]');
  if r <> '22023: Ese dato sólo existe en un origen de subasta.' then raise exception 'plataforma en el manual: %', r; end if;
  r := pg_temp.dc_guardar(pia, m, 'null');
  if r <> '22023: Los datos clave no tienen la forma esperada.' then raise exception 'nulo: %', r; end if;
  r := pg_temp.dc_guardar(pia, s, '[{"comun": "lote"}, {"campo": "dc_ajeno"}]');
  if r <> 'sin error' then raise exception 'el lote en la subasta: %', r; end if;
  if pg_temp.dc_datos(s) <> '[{"comun": "lote"}, {"campo": "dc_ajeno"}]'::jsonb then raise exception 'la subasta quedó con %', pg_temp.dc_datos(s); end if;
end $$;
rollback;

-- @test datos clave: un campo inactivo o de otro origen da PT409 con su motivo
begin;
select pg_temp.dc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-0000000dc00f'; m uuid := pg_temp.dc_origen('prueba_dc_m'); r text;
        motivo constant text := 'PT409: Uno de los campos elegidos ya no está activo en este origen. Recarga para ver los de ahora.';
begin
  r := pg_temp.dc_guardar(pia, m, '[{"campo": "dc_x"}]');
  if r <> motivo then raise exception 'campo inactivo: %', r; end if;
  r := pg_temp.dc_guardar(pia, m, '[{"comun": "anio"}, {"campo": "dc_ajeno"}]');
  if r <> motivo then raise exception 'campo de otro origen: %', r; end if;
end $$;
rollback;

-- @test datos clave: la versión vieja del origen da PT409 sin tocar la lista; un origen que no existe, PT409
begin;
select pg_temp.dc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-0000000dc00f'; m uuid := pg_temp.dc_origen('prueba_dc_m'); r text; antes jsonb := pg_temp.dc_datos(m);
begin
  r := pg_temp.dc_error(pia, format('select public.origen_datos_clave_guardar(%L, %L::jsonb, %L)', m,
    '[{"comun": "anio"}]', pg_temp.dc_version(m) - interval '1 microsecond'));
  if r <> 'PT409: Otra persona cambió este origen mientras lo editabas.' then raise exception 'versión vieja: %', r; end if;
  if pg_temp.dc_datos(m) is distinct from antes then raise exception 'la versión vieja cambió la lista: %', pg_temp.dc_datos(m); end if;
  r := pg_temp.dc_error(pia, format('select public.origen_datos_clave_guardar(%L, %L::jsonb, %L)',
    '00000000-0000-4000-8000-0000000dcfff', '[]', now()));
  if r <> 'PT409: Ese origen ya no existe.' then raise exception 'origen inexistente: %', r; end if;
end $$;
rollback;

-- @test datos clave: guardar deja la lista exacta, en su orden, y devuelve la versión nueva del origen
begin;
select pg_temp.dc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-0000000dc00f'; m uuid := pg_temp.dc_origen('prueba_dc_m'); antes timestamptz := pg_temp.dc_version(m); v timestamptz;
begin
  perform pg_temp.dc_como(pia);
  set local role authenticated;
  v := public.origen_datos_clave_guardar(m, '[{"campo": "dc_a"}, {"comun": "anio"}]', antes);
  reset role;
  if pg_temp.dc_datos(m) <> '[{"campo": "dc_a"}, {"comun": "anio"}]'::jsonb then raise exception 'quedó %', pg_temp.dc_datos(m); end if;
  if v is distinct from pg_temp.dc_version(m) or v = antes then raise exception 'la versión devuelta % (antes %, ahora %)', v, antes, pg_temp.dc_version(m); end if;
  -- Una lista vacía se guarda vacía.
  if pg_temp.dc_guardar(pia, m, '[]') <> 'sin error' or pg_temp.dc_datos(m) <> '[]'::jsonb then raise exception 'la vacía: %', pg_temp.dc_datos(m); end if;
end $$;
rollback;

-- @test datos clave: desactivar un campo lo quita y deja el resto en orden; desactivar otro no mueve la versión del origen
begin;
select pg_temp.dc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-0000000dc00f'; m uuid := pg_temp.dc_origen('prueba_dc_m');
        a uuid := '00000000-0000-4000-8000-0000000dc0a1'; b uuid := '00000000-0000-4000-8000-0000000dc0b1'; antes timestamptz; r text;
begin
  set local session_replication_role = replica;
  update public.origenes set datos_clave = '[{"comun": "vin"}, {"campo": "dc_a"}, {"comun": "anio"}]' where id = m;
  set local session_replication_role = origin;
  antes := pg_temp.dc_version(m);
  r := pg_temp.dc_error(pia, format('select public.origen_campo_guardar(%L, %L, %L)', b, pg_temp.dc_campo_version(b), '{"activo": false}'));
  if r <> 'sin error' then raise exception 'desactivar b: %', r; end if;
  if pg_temp.dc_version(m) <> antes then raise exception 'desactivar un campo que no es dato clave movió la versión del origen'; end if;
  r := pg_temp.dc_error(pia, format('select public.origen_campo_guardar(%L, %L, %L)', a, pg_temp.dc_campo_version(a), '{"activo": false}'));
  if r <> 'sin error' then raise exception 'desactivar a: %', r; end if;
  if pg_temp.dc_datos(m) <> '[{"comun": "vin"}, {"comun": "anio"}]'::jsonb then raise exception 'quedó %', pg_temp.dc_datos(m); end if;
  if pg_temp.dc_version(m) = antes then raise exception 'quitar a no movió la versión del origen'; end if;
  -- Reactivarlo no lo vuelve a sumar.
  r := pg_temp.dc_error(pia, format('select public.origen_campo_guardar(%L, %L, %L)', a, pg_temp.dc_campo_version(a), '{"activo": true}'));
  if r <> 'sin error' or pg_temp.dc_datos(m) <> '[{"comun": "vin"}, {"comun": "anio"}]'::jsonb then raise exception 'reactivar a: % / %', r, pg_temp.dc_datos(m); end if;
end $$;
rollback;

-- @test datos clave: eliminar un campo lo quita de la lista; la RPC toma el origen antes que el campo
begin;
select pg_temp.dc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-0000000dc00f'; m uuid := pg_temp.dc_origen('prueba_dc_m');
        b uuid := '00000000-0000-4000-8000-0000000dc0b1'; r text; d text;
begin
  set local session_replication_role = replica;
  update public.origenes set datos_clave = '[{"campo": "dc_b"}, {"comun": "anio"}]' where id = m;
  set local session_replication_role = origin;
  r := pg_temp.dc_error(pia, format('select public.origen_campo_eliminar(%L, %L)', b, pg_temp.dc_campo_version(b)));
  if r <> 'sin error' then raise exception 'eliminar b: %', r; end if;
  if pg_temp.dc_datos(m) <> '[{"comun": "anio"}]'::jsonb then raise exception 'quedó %', pg_temp.dc_datos(m); end if;
  d := pg_get_functiondef('public.origen_campo_eliminar(uuid, timestamptz)'::regprocedure);
  if position('for no key update' in d) = 0 or position('for no key update' in d) > position('x.id = p_campo for update' in d) then
    raise exception 'origen_campo_eliminar no toma el origen antes que el campo';
  end if;
end $$;
rollback;

-- @test datos clave: un origen nuevo nace con los de su tipo (por origen_crear o por insert directo) y conserva una lista propia
begin;
select pg_temp.dc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-0000000dc00f'; r text; o uuid;
begin
  r := pg_temp.dc_error(pia, $q$select public.origen_crear('dc_nuevo_m', 'DC nuevo manual', 'vehículo', 'm', 'manual')$q$);
  if r <> 'sin error' then raise exception 'crear el manual: %', r; end if;
  r := pg_temp.dc_error(pia, $q$select public.origen_crear('dc_nuevo_s', 'DC nuevo subasta', 'vehículo', 'm', 'subasta')$q$);
  if r <> 'sin error' then raise exception 'crear la subasta: %', r; end if;
  if pg_temp.dc_datos(pg_temp.dc_origen('dc_nuevo_m')) <> public._origen_datos_clave_de_fabrica('manual')
     or pg_temp.dc_datos(pg_temp.dc_origen('dc_nuevo_s')) <> public._origen_datos_clave_de_fabrica('subasta') then
    raise exception 'origen_crear: % / %', pg_temp.dc_datos(pg_temp.dc_origen('dc_nuevo_m')), pg_temp.dc_datos(pg_temp.dc_origen('dc_nuevo_s'));
  end if;
  if pg_temp.dc_datos(pg_temp.dc_origen('prueba_dc_m')) <> '[{"comun": "anio"}, {"comun": "kilometraje"}, {"comun": "vin"}, {"comun": "categoria_id"}]'::jsonb
     or pg_temp.dc_datos(pg_temp.dc_origen('prueba_dc_s')) <> '[{"comun": "plataforma"}, {"comun": "url_origen"}, {"comun": "kilometraje"}, {"comun": "anio"}]'::jsonb then
    raise exception 'insert directo: %', pg_temp.dc_datos(pg_temp.dc_origen('prueba_dc_m'));
  end if;
  insert into public.origenes (clave, nombre, datos_clave) values ('dc_propia', 'DC propia', '[{"comun": "marca"}]') returning id into o;
  if pg_temp.dc_datos(o) <> '[{"comun": "marca"}]'::jsonb then raise exception 'la lista propia quedó %', pg_temp.dc_datos(o); end if;
end $$;
rollback;

-- @test datos clave: ningún rol de la app escribe la columna directo
begin;
select pg_temp.dc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-0000000dc00f'; m uuid := pg_temp.dc_origen('prueba_dc_m'); antes jsonb := pg_temp.dc_datos(m); r text;
begin
  r := pg_temp.dc_error(pia, format($q$update public.origenes set datos_clave = '[{"comun": "marca"}]' where id = %L$q$, m));
  if pg_temp.dc_datos(m) is distinct from antes then raise exception 'Pía escribió la columna directo (%): %', r, pg_temp.dc_datos(m); end if;
end $$;
rollback;
