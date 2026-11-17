-- El cliente de un proyecto de repuestos como lead (T35). No depende de otro archivo (`SOLO=areas/repuestos/proyectos-con-lead.sql`); cada bloque
-- abre su transacción y la revierte.
--
-- Qué asegura:
--   R1. Con `repuestos.editar`, `vehiculos.ver@o` y `leads.ver`, un proyecto de un vehículo nace con un lead que se ve: queda `lead_id` y
--       `cliente_telefono` sigue nulo (nada se copia del lead).
--   R2. Un lead en la papelera da 42501 hint lead_id, con el texto de uno que no se ve, y no crea nada.
--   R3. Un lead en el limbo (sin asesores vigentes) da lo mismo.

create or replace function pg_temp.rp_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-rpl@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`.
create or replace function pg_temp.rp_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.rp_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rpl_' || substr(v_id::text, 1, 8), 'rpl ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.rp_origen() returns uuid language plpgsql as $f$
declare s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); o uuid;
begin
  insert into public.origenes (clave, nombre, tipo) values ('rpl_' || s, 'rpl origen ' || s, 'manual') returning id into o;
  return o;
end $f$;

create or replace function pg_temp.rp_vehiculo(p_origen uuid) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo) values (p_origen, 'rpl vehículo') returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.rp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.rp_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.rp_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

create or replace function pg_temp.rp_crear(p_quien uuid, p_id uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', p_id, p_datos));
$f$;

-- Un lead creado por `p_quien` con su alta de siempre (`crear_lead`): nace en su cartera. El teléfono, al azar (único entre los vivos).
create or replace function pg_temp.rp_lead(p_quien uuid) returns uuid language plpgsql as $f$
declare l uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('crear el lead', pg_temp.rp_corre(p_quien, format('select public.crear_lead(%L, %L)', l, jsonb_build_object(
    'nombre', 'rpl lead',
    'telefono_principal', '7' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 10000000)::text, 7, '0'),
    'origen_lead_id', (select id from public.origenes_lead where clave = 'web')))));
  return l;
end $f$;

-- @test repuestos con lead: un proyecto de un vehículo nace con un lead que se ve, sin copiar su teléfono (R1)
begin;
do $$
declare
  o uuid := pg_temp.rp_origen(); v uuid := pg_temp.rp_vehiculo(o);
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'vehiculos.ver@' || o, 'leads.ver', 'leads.crear']);
  l uuid := pg_temp.rp_lead(ed); i uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('R1 crear', pg_temp.rp_crear(ed, i, jsonb_build_object('vehiculo_id', v, 'lead_id', l)));
  if not exists (select 1 from public.repuestos_proyectos where id = i and vehiculo_id = v and lead_id = l
                 and cliente_telefono is null and cliente_nombre is null) then
    raise exception 'R1: el proyecto no quedó con su vehículo y su lead, sin cliente ni teléfono escritos: %',
      (select to_jsonb(p) from public.repuestos_proyectos p where p.id = i);
  end if;
end $$;
rollback;

-- @test repuestos con lead: un lead en la papelera da 42501 hint lead_id y no crea nada (R2)
begin;
do $$
declare
  o uuid := pg_temp.rp_origen(); v uuid := pg_temp.rp_vehiculo(o);
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'vehiculos.ver@' || o, 'leads.ver', 'leads.crear']);
  l uuid := pg_temp.rp_lead(ed); i uuid := gen_random_uuid();
begin
  update public.leads set eliminado_en = now() where id = l;
  perform pg_temp.rp_es('R2 lead en la papelera', pg_temp.rp_crear(ed, i, jsonb_build_object('vehiculo_id', v, 'lead_id', l)), '42501', 'lead_id',
    'No encontramos este lead o no tienes acceso.');
  if exists (select 1 from public.repuestos_proyectos where id = i) then raise exception 'R2: el rechazo dejó el proyecto creado'; end if;
end $$;
rollback;

-- @test repuestos con lead: un lead en el limbo da 42501 hint lead_id, también a quien ve «todos» (R3)
begin;
do $$
declare
  o uuid := pg_temp.rp_origen(); v uuid := pg_temp.rp_vehiculo(o);
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'vehiculos.ver@' || o, 'leads.ver', 'leads.crear']);
  l uuid := pg_temp.rp_lead(ed); i uuid := gen_random_uuid();
begin
  update public.leads_asesores set revocado_en = now() where lead_id = l and revocado_en is null;
  perform pg_temp.rp_es('R3 lead en el limbo', pg_temp.rp_crear(ed, i, jsonb_build_object('vehiculo_id', v, 'lead_id', l)), '42501', 'lead_id',
    'No encontramos este lead o no tienes acceso.');
  if exists (select 1 from public.repuestos_proyectos where id = i) then raise exception 'R3: el rechazo dejó el proyecto creado'; end if;
end $$;
rollback;
