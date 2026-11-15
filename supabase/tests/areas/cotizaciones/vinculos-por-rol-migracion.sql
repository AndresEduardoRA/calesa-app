-- La migración de datos de T10: el ajuste global `vehiculo_obligatorio_al_cotizar` se traslada a las concesiones y desaparece. Esta prueba vuelve a ejecutar el
-- texto de la migración (`_migracion_de_vinculos`, que `scripts/probar-schema.mjs` carga por su contenido) con la columna repuesta, en una transacción revertida.
-- Es una prueba de una migración de datos: se borra al aplastar, con su entrada en `DATOS_DE_PRUEBA` de `scripts/probar-schema.mjs`.
-- No depende de otro archivo (`SOLO=areas/cotizaciones/vinculos-por-rol-migracion.sql`); la primera cuenta nace dueña, por eso cada bloque empieza por ella.
--
-- Qué asegura:
--   M1. Con el ajuste en «no»: cada concesión de `cotizaciones.crear` recibe `sin_vehiculo` con el mismo origen; quien no cotiza no recibe nada; `sin_lead` sólo el dueño;
--       la columna ya no existe.
--   M2. Con el ajuste en «sí»: sólo el dueño tiene las dos claves.
--   M3. Se puede correr dos veces (sin la columna): no cambia nada.

create or replace function pg_temp.vm_duena() returns uuid language plpgsql as $f$
declare v uuid;
begin
  select ur.usuario_id into v from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' order by ur.usuario_id limit 1;
  if v is null then
    v := gen_random_uuid();
    insert into auth.users (id, email, raw_app_meta_data) values (v, v || '@ejemplo.com', '{"invitado": true}');
  end if;
  return v;
end $f$;

-- Deja el terreno de antes de la migración: la columna repuesta con ese valor y sin ninguna concesión de las claves nuevas. Devuelve {o, r1, r2, r3}:
-- r1 cotiza en todos los orígenes, r2 sólo en o, r3 no cotiza.
create or replace function pg_temp.vm_antes(p_obligatorio boolean) returns jsonb language plpgsql as $f$
declare o uuid; r1 uuid; r2 uuid; r3 uuid;
begin
  perform pg_temp.vm_duena();
  alter table public.ajustes_empresa add column if not exists vehiculo_obligatorio_al_cotizar boolean not null default true;
  update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = p_obligatorio where id = 1;
  delete from public.roles_permisos where permiso_clave in ('cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead');
  insert into public.origenes (clave, nombre) values ('vm_' || substr(gen_random_uuid()::text, 1, 8), 'VM origen') returning id into o;
  insert into public.roles (clave, nombre) values ('vm_r1_' || substr(gen_random_uuid()::text, 1, 6), 'VM R1') returning id into r1;
  insert into public.roles (clave, nombre) values ('vm_r2_' || substr(gen_random_uuid()::text, 1, 6), 'VM R2') returning id into r2;
  insert into public.roles (clave, nombre) values ('vm_r3_' || substr(gen_random_uuid()::text, 1, 6), 'VM R3') returning id into r3;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
    (r1, 'cotizaciones.crear', null, 'todos'), (r1, 'cotizaciones.ver', null, 'todos'),
    (r2, 'cotizaciones.crear', o, 'todos'), (r2, 'cotizaciones.ver', o, 'todos'),
    (r3, 'cotizaciones.ver', null, 'todos');
  return jsonb_build_object('o', o, 'r1', r1, 'r2', r2, 'r3', r3);
end $f$;

create or replace function pg_temp.vm_correr() returns void language plpgsql as $f$
begin
  execute (select doc #>> '{}' from _migracion_de_vinculos);
end $f$;

create or replace function pg_temp.vm_tiene(p_rol uuid, p_clave text, p_origen uuid) returns boolean language sql as $f$
  select exists (select 1 from public.roles_permisos rp where rp.rol_id = p_rol and rp.permiso_clave = p_clave and rp.origen_id is not distinct from p_origen and rp.alcance = 'todos')
$f$;

-- @test migración de vínculos: M1 con el ajuste en «no», cada concesión de cotizar recibe «sin vehículo» con su origen; sin_lead sólo el dueño; la columna desaparece
begin;
do $$
declare t jsonb := pg_temp.vm_antes(false); o uuid := (t ->> 'o')::uuid; r1 uuid := (t ->> 'r1')::uuid; r2 uuid := (t ->> 'r2')::uuid; r3 uuid := (t ->> 'r3')::uuid;
  v_dueno uuid := (select id from public.roles where clave = 'dueno'); v_n int;
begin
  perform pg_temp.vm_correr();
  if not pg_temp.vm_tiene(r1, 'cotizaciones.crear.sin_vehiculo', null) then raise exception 'M1: R1 (cotiza en todos) no recibió sin_vehiculo sin origen'; end if;
  if not pg_temp.vm_tiene(r2, 'cotizaciones.crear.sin_vehiculo', o) then raise exception 'M1: R2 (cotiza en O) no recibió sin_vehiculo en O'; end if;
  if pg_temp.vm_tiene(r2, 'cotizaciones.crear.sin_vehiculo', null) then raise exception 'M1: R2 recibió sin_vehiculo en todos los orígenes'; end if;
  if exists (select 1 from public.roles_permisos where rol_id = r3 and permiso_clave like 'cotizaciones.crear.sin\_%') then raise exception 'M1: R3 (no cotiza) recibió algo'; end if;
  if exists (select 1 from public.roles_permisos where rol_id in (r1, r2) and permiso_clave = 'cotizaciones.crear.sin_lead') then raise exception 'M1: el lead debía seguir obligatorio'; end if;
  if not pg_temp.vm_tiene(v_dueno, 'cotizaciones.crear.sin_vehiculo', null) or not pg_temp.vm_tiene(v_dueno, 'cotizaciones.crear.sin_lead', null) then
    raise exception 'M1: el dueño no tiene las dos claves sin origen';
  end if;
  -- Cada rol con cotizaciones.crear tiene su sin_vehiculo con el mismo origen: ninguno de más, ninguno de menos.
  select count(*) into v_n from public.roles_permisos c where c.permiso_clave = 'cotizaciones.crear'
     and not exists (select 1 from public.roles_permisos s where s.rol_id = c.rol_id and s.permiso_clave = 'cotizaciones.crear.sin_vehiculo' and s.origen_id is not distinct from c.origen_id);
  if v_n <> 0 then raise exception 'M1: % concesiones de cotizar quedaron sin su sin_vehiculo', v_n; end if;
  select count(*) into v_n from public.roles_permisos s where s.permiso_clave = 'cotizaciones.crear.sin_vehiculo' and s.rol_id <> v_dueno
     and not exists (select 1 from public.roles_permisos c where c.rol_id = s.rol_id and c.permiso_clave = 'cotizaciones.crear' and c.origen_id is not distinct from s.origen_id);
  if v_n <> 0 then raise exception 'M1: % concesiones de sin_vehiculo sin su cotizar', v_n; end if;
  if (select count(*) from public.roles_permisos where permiso_clave = 'cotizaciones.crear.sin_lead') <> 1 then raise exception 'M1: sin_lead no es sólo del dueño'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ajustes_empresa' and column_name = 'vehiculo_obligatorio_al_cotizar') then
    raise exception 'M1: la columna del ajuste sigue';
  end if;
end $$;
rollback;

-- @test migración de vínculos: M2 con el ajuste en «sí», sólo el dueño tiene las dos claves
begin;
do $$
declare t jsonb := pg_temp.vm_antes(true); r1 uuid := (t ->> 'r1')::uuid; v_dueno uuid := (select id from public.roles where clave = 'dueno');
begin
  perform pg_temp.vm_correr();
  if exists (select 1 from public.roles_permisos where rol_id <> v_dueno and permiso_clave like 'cotizaciones.crear.sin\_%') then raise exception 'M2: con el ajuste en sí alguien más recibió una clave'; end if;
  if (select count(*) from public.roles_permisos where permiso_clave like 'cotizaciones.crear.sin\_%') <> 2 then raise exception 'M2: el dueño debía tener las dos claves'; end if;
  if pg_temp.vm_tiene(r1, 'cotizaciones.crear.sin_vehiculo', null) then raise exception 'M2: R1 recibió sin_vehiculo'; end if;
end $$;
rollback;

-- @test migración de vínculos: M3 correrla dos veces (ya sin la columna) no cambia nada
begin;
do $$
declare t jsonb := pg_temp.vm_antes(false); v_antes jsonb;
begin
  perform pg_temp.vm_correr();
  v_antes := (select jsonb_agg(to_jsonb(x) order by x.rol_id, x.permiso_clave, x.origen_id) from (select rol_id, permiso_clave, origen_id, alcance from public.roles_permisos where permiso_clave like 'cotizaciones.crear.sin\_%') x);
  perform pg_temp.vm_correr();
  if v_antes is distinct from (select jsonb_agg(to_jsonb(x) order by x.rol_id, x.permiso_clave, x.origen_id) from (select rol_id, permiso_clave, origen_id, alcance from public.roles_permisos where permiso_clave like 'cotizaciones.crear.sin\_%') x) then
    raise exception 'M3: la segunda corrida cambió las concesiones';
  end if;
  if (select count(*) from public.permisos where clave like 'cotizaciones.crear.sin\_%') <> 2 then raise exception 'M3: el catálogo duplicó o perdió claves'; end if;
end $$;
rollback;
