-- Publicar en una fórmula del origen que no es la activa (docs/COTIZADOR.md › «Fórmulas del origen»): crea su versión, numerada desde 1 en esa fórmula, y la
-- hoja de cotizar sigue con la activa. Sin `p_formula_del_origen`, guardar y publicar van a la fórmula de trabajo (la activa, o la más nueva sin archivar,
-- o una «Fórmula» nueva), y la primera publicada de un origen sin activa la activa. Una archivada no se edita y la fórmula de otro origen da lo mismo que
-- no tener permiso. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

create or replace function pg_temp.fpna_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado como texto, o `sqlstate:detalle@hint mensaje` si falla.
create or replace function pg_temp.fpna_corre(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v text; v_d text; v_h text; v_m text; v_e text;
begin
  perform pg_temp.fpna_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return v_e || ':' || coalesce(nullif(v_d, ''), '-') || '@' || coalesce(v_h, '') || ' ' || v_m;
  end;
  reset role;
  return v;
end $f$;

-- Una persona que configura y cotiza en ese origen.
create or replace function pg_temp.fpna_persona(p_id uuid, p_origen uuid) returns void language plpgsql as $f$
declare v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Publicar ' || right(p_id::text, 4), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('fpna_' || right(p_id::text, 4), 'Publicar ' || right(p_id::text, 4)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array array['cotizaciones.configurar', 'cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.nivel.costos.ver'] loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c, case when c like 'cotizaciones.nivel.%' then null else p_origen end, 'todos');
  end loop;
end $f$;

-- Guardar el borrador con la publicada de subasta_usa (en esa fórmula del origen, o en la de trabajo con null) y publicarlo: devuelve el error o ''.
create or replace function pg_temp.fpna_publicar(p_quien uuid, p_origen uuid, p_fdo uuid, p_nota text) returns text language plpgsql as $f$
declare s public.formulas; r text;
begin
  select f.* into s from public.formulas f join public.origenes x on x.id = f.origen_id where x.clave = 'subasta_usa' and f.estado = 'publicada';
  r := pg_temp.fpna_corre(p_quien, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_formula_del_origen => %L)',
                                         p_origen, s.definicion, s.params, s.diseno, p_fdo));
  if r ~ '^[0-9A-Z]{5}:' then return r; end if;
  r := pg_temp.fpna_corre(p_quien, format('select public.formula_publicar(p_origen => %L, p_nota => %L, p_formula_del_origen => %L)', p_origen, p_nota, p_fdo));
  if r ~ '^[0-9A-Z]{5}:' then return r; end if;
  return '';
end $f$;

-- @test fórmulas del origen: la primera publicada de un origen sin activa activa su fórmula; publicar en otra crea su v1 y la hoja sigue con la activa
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fd201';
  o uuid; a public.formulas_del_origen; b uuid; r text; v_pub_a uuid; v_pub_b public.formulas;
begin
  insert into public.origenes (clave, nombre) values ('fpna_uno', 'Publicar uno') returning id into o;
  perform pg_temp.fpna_persona(q, o);
  -- Sin fórmulas: guardar crea la «Fórmula» de trabajo y publicar la activa (D8).
  r := pg_temp.fpna_publicar(q, o, null, 'v1');
  if r <> '' then raise exception 'publicar en un origen sin fórmulas: %', r; end if;
  select * into a from public.formulas_del_origen where origen_id = o;
  if a.nombre <> 'Fórmula' or not a.activa or a.activada_en is null or a.activada_por is distinct from q then
    raise exception 'la primera publicada no activó su fórmula: %', to_jsonb(a);
  end if;
  select id into v_pub_a from public.formulas where formula_del_origen_id = a.id and estado = 'publicada';
  -- Otra fórmula del origen: su primera publicada es su v1, no la activa, y la hoja sigue con la de la activa.
  insert into public.formulas_del_origen (origen_id, nombre, creado_por) values (o, 'Planilla nueva', q) returning id into b;
  r := pg_temp.fpna_publicar(q, o, b, 'v1 de la nueva');
  if r <> '' then raise exception 'publicar en la no activa: %', r; end if;
  select * into v_pub_b from public.formulas where formula_del_origen_id = b and estado = 'publicada';
  if v_pub_b.version is distinct from 1 or v_pub_b.origen_id <> o then raise exception 'la no activa no publicó su v1: %', to_jsonb(v_pub_b); end if;
  if (select activa from public.formulas_del_origen where id = b) or not (select activa from public.formulas_del_origen where id = a.id) then
    raise exception 'publicar en la no activa cambió la activa';
  end if;
  if (select estado from public.formulas where id = v_pub_a) <> 'publicada' then raise exception 'publicar en la no activa archivó la publicada de la activa'; end if;
  r := pg_temp.fpna_corre(q, format('select public.cotizacion_hoja(%L) -> ''formula'' ->> ''id''', o));
  if r is distinct from v_pub_a::text then raise exception 'la hoja no sigue con la publicada de la activa: %', r; end if;
  r := pg_temp.fpna_corre(q, format('select public.formula_para_cotizar(%L) ->> ''id''', o));
  if r is distinct from v_pub_a::text then raise exception 'formula_para_cotizar no sigue con la publicada de la activa: %', r; end if;
  -- Sin `p_formula_del_origen`, publicar va a la activa: su v2.
  r := pg_temp.fpna_publicar(q, o, null, 'v2');
  if r <> '' then raise exception 'publicar en la de trabajo: %', r; end if;
  if (select version from public.formulas where formula_del_origen_id = a.id and estado = 'publicada') <> 2
     or (select version from public.formulas where formula_del_origen_id = b and estado = 'publicada') <> 1 then
    raise exception 'sin fórmula del origen, publicar no fue a la activa';
  end if;
  -- `formula.publicada` dice de qué fórmula del origen.
  if not exists (select 1 from public.actividad where accion = 'formula.publicada' and detalle ->> 'formula_del_origen_id' = b::text and detalle ->> 'nombre' = 'Planilla nueva') then
    raise exception 'la actividad de publicar no nombra la fórmula del origen';
  end if;
end $$;
rollback;

-- @test fórmulas del origen: una archivada no se edita (22023 con hint formula_del_origen) y la de otro origen o una que no existe dan el 42501 del permiso
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fd202';
  o uuid; o2 uuid; b uuid; ajena uuid; r text; r2 text;
begin
  insert into public.origenes (clave, nombre) values ('fpna_dos', 'Publicar dos') returning id into o;
  insert into public.origenes (clave, nombre) values ('fpna_dos_ajeno', 'Publicar dos ajeno') returning id into o2;
  perform pg_temp.fpna_persona(q, o);
  insert into public.formulas_del_origen (origen_id, nombre, archivada_en) values (o, 'Archivada', now()) returning id into b;
  insert into public.formulas_del_origen (origen_id, nombre) values (o2, 'De otro origen') returning id into ajena;
  r := pg_temp.fpna_publicar(q, o, b, 'nada');
  if r not like '22023:%@formula_del_origen Esta fórmula está archivada.' then raise exception 'guardar en una archivada dio «%»', r; end if;
  r := pg_temp.fpna_publicar(q, o, ajena, 'nada');
  r2 := pg_temp.fpna_publicar(q, o, gen_random_uuid(), 'nada');
  if r not like '42501:%cotizaciones.configurar%' or r is distinct from r2 then raise exception 'la de otro origen dio «%» y una que no existe «%»', r, r2; end if;
  if exists (select 1 from public.formulas where origen_id in (o, o2)) then raise exception 'un rechazo dejó una versión'; end if;
end $$;
rollback;
