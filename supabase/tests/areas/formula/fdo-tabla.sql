-- La tabla de las fórmulas del origen (docs/COTIZADOR.md › «Fórmulas del origen»): se lee con `cotizaciones.configurar` del origen y se escribe sólo por RPC;
-- el nombre es único por origen sin distinguir mayúsculas (también entre las archivadas), hay a lo sumo una activa por origen, una versión nunca cuelga de
-- la fórmula de otro origen, y el trigger de compatibilidad (`trg_fdo_asignar`) cuelga lo que se inserta sin fórmula de la de trabajo y activa la primera
-- publicada. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

create or replace function pg_temp.ftab_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Una persona con un rol propio y esas claves en ese origen.
create or replace function pg_temp.ftab_persona(p_id uuid, p_origen uuid, p_claves text[]) returns void language plpgsql as $f$
declare v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Tabla ' || right(p_id::text, 4), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('ftab_' || right(p_id::text, 4), 'Tabla ' || right(p_id::text, 4)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c, p_origen, 'todos');
  end loop;
end $f$;

-- Un origen nuevo, sin fórmulas.
create or replace function pg_temp.ftab_origen(p_clave text) returns uuid language sql as $f$
  insert into public.origenes (clave, nombre) values (p_clave, 'Tabla ' || p_clave) returning id
$f$;

-- Una versión de la semilla (la publicada de subasta_usa) insertada a mano en ese origen, con ese estado, y opcionalmente en esa fórmula del origen.
create or replace function pg_temp.ftab_version(p_origen uuid, p_estado text, p_version int, p_fdo uuid default null) returns uuid language sql as $f$
  insert into public.formulas (origen_id, formula_del_origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  select p_origen, p_fdo, case when p_estado = 'borrador' then null else p_version end, p_estado::public.estado_version, s.definicion, s.params, s.diseno,
         case when p_estado = 'borrador' then null else s.visibilidad end,
         case when p_estado = 'borrador' then null else now() - interval '1 hour' end
    from public.formulas s join public.origenes x on x.id = s.origen_id where x.clave = 'subasta_usa' and s.estado = 'publicada'
  returning id
$f$;

-- @test fórmulas del origen: la tabla se lee con cotizaciones.configurar de su origen y nadie la escribe directo
begin;
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000fd001';
  s constant uuid := '00000000-0000-4000-8000-0000000fd002';
  o1 uuid := pg_temp.ftab_origen('ftab_rls_1');
  o2 uuid := pg_temp.ftab_origen('ftab_rls_2');
  n int; v_err text;
begin
  perform pg_temp.ftab_version(o1, 'publicada', 1);
  perform pg_temp.ftab_version(o2, 'publicada', 1);
  perform pg_temp.ftab_persona(a, o1, array['cotizaciones.configurar']);
  perform pg_temp.ftab_persona(s, o1, array['cotizaciones.ver', 'cotizaciones.crear']);
  -- Con configurar de o1: ve la de o1 y no la de o2.
  perform pg_temp.ftab_como(a);
  set local role authenticated;
  select count(*) into n from public.formulas_del_origen where origen_id = o1;
  if n <> 1 then raise exception 'quien configura o1 no ve su fórmula (%)', n; end if;
  select count(*) into n from public.formulas_del_origen where origen_id = o2;
  if n <> 0 then raise exception 'quien configura o1 ve la fórmula de o2'; end if;
  -- Ni insert, ni update, ni delete: sólo por RPC.
  begin
    insert into public.formulas_del_origen (origen_id, nombre) values (o1, 'Directa');
    v_err := 'insert';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.formulas_del_origen set nombre = 'Otra' where origen_id = o1;
    v_err := 'update';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.formulas_del_origen where origen_id = o1;
    v_err := 'delete';
  exception when insufficient_privilege then null;
  end;
  reset role;
  if v_err is not null then raise exception 'quien configura pudo hacer % directo', v_err; end if;
  -- Sin configurar (aunque cotice) no ve ninguna.
  perform pg_temp.ftab_como(s);
  set local role authenticated;
  select count(*) into n from public.formulas_del_origen;
  reset role;
  if n <> 0 then raise exception 'sin configurar ve % fórmulas del origen', n; end if;
  -- Los privilegios: select a authenticated, nada de escritura, nada para anon.
  if not has_table_privilege('authenticated', 'public.formulas_del_origen', 'select')
     or has_table_privilege('authenticated', 'public.formulas_del_origen', 'insert')
     or has_table_privilege('authenticated', 'public.formulas_del_origen', 'update')
     or has_table_privilege('authenticated', 'public.formulas_del_origen', 'delete')
     or has_table_privilege('anon', 'public.formulas_del_origen', 'select') then
    raise exception 'los privilegios de formulas_del_origen no son sólo select para authenticated';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.formulas_del_origen'::regclass) then raise exception 'formulas_del_origen sin RLS'; end if;
end $$;
rollback;

-- @test fórmulas del origen: el nombre es único por origen sin mayúsculas (también con una archivada), a lo sumo una activa y una activa no se archiva
begin;
do $$
declare
  o1 uuid := pg_temp.ftab_origen('ftab_unico_1');
  o2 uuid := pg_temp.ftab_origen('ftab_unico_2');
  d1 uuid; v_estado text;
begin
  insert into public.formulas_del_origen (origen_id, nombre) values (o1, 'Planilla') returning id into d1;
  begin
    insert into public.formulas_del_origen (origen_id, nombre) values (o1, 'PLANILLA');
    raise exception 'dos «Planilla» en el mismo origen';
  exception when unique_violation then
    get stacked diagnostics v_estado = constraint_name;
    if v_estado <> 'formulas_del_origen_nombre_unico' then raise exception 'el nombre repetido chocó con %', v_estado; end if;
  end;
  -- Archivada, el nombre sigue tomado.
  update public.formulas_del_origen set archivada_en = now() where id = d1;
  begin
    insert into public.formulas_del_origen (origen_id, nombre) values (o1, 'planilla');
    raise exception 'el nombre de una archivada quedó libre';
  exception when unique_violation then null;
  end;
  -- En otro origen, el mismo nombre vale.
  insert into public.formulas_del_origen (origen_id, nombre) values (o2, 'Planilla');
  -- Una activa por origen.
  insert into public.formulas_del_origen (origen_id, nombre, activa) values (o1, 'Activa 1', true);
  begin
    insert into public.formulas_del_origen (origen_id, nombre, activa) values (o1, 'Activa 2', true);
    raise exception 'dos activas en el mismo origen';
  exception when unique_violation then
    get stacked diagnostics v_estado = constraint_name;
    if v_estado <> 'formulas_del_origen_activa_unica' then raise exception 'la segunda activa chocó con %', v_estado; end if;
  end;
  insert into public.formulas_del_origen (origen_id, nombre, activa) values (o2, 'Activa de o2', true);
  -- Una activa no está archivada.
  begin
    update public.formulas_del_origen set archivada_en = now() where origen_id = o1 and activa;
    raise exception 'se archivó la activa';
  exception when check_violation then null;
  end;
  -- El nombre: sin espacios de más, de 1 a 60.
  begin
    insert into public.formulas_del_origen (origen_id, nombre) values (o1, ' Con espacio');
    raise exception 'un nombre con espacios de más entró';
  exception when check_violation then null;
  end;
  begin
    insert into public.formulas_del_origen (origen_id, nombre) values (o1, repeat('x', 61));
    raise exception 'un nombre de 61 entró';
  exception when check_violation then null;
  end;
end $$;
rollback;

-- @test fórmulas del origen: una versión o una plantilla no cuelgan de la fórmula de otro origen, y borrar la fórmula borra sus versiones y su plantilla
begin;
do $$
declare
  o1 uuid := pg_temp.ftab_origen('ftab_fk_1');
  o2 uuid := pg_temp.ftab_origen('ftab_fk_2');
  d2 uuid; d1 uuid; f uuid;
begin
  insert into public.formulas_del_origen (origen_id, nombre) values (o2, 'De o2') returning id into d2;
  begin
    perform pg_temp.ftab_version(o1, 'publicada', 1, d2);
    raise exception 'una versión de o1 colgó de una fórmula de o2';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, definicion) values (o1, d2, public._fdo_tarjeta_en_blanco());
    raise exception 'una plantilla de o1 colgó de una fórmula de o2';
  exception when foreign_key_violation then null;
  end;
  insert into public.formulas_del_origen (origen_id, nombre) values (o1, 'De o1') returning id into d1;
  f := pg_temp.ftab_version(o1, 'borrador', null, d1);
  insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, definicion) values (o1, d1, public._fdo_tarjeta_en_blanco());
  delete from public.formulas_del_origen where id = d1;
  if exists (select 1 from public.formulas where id = f) or exists (select 1 from public.plantillas_tarjeta where formula_del_origen_id = d1) then
    raise exception 'borrar la fórmula dejó sus versiones o su plantilla';
  end if;
end $$;
rollback;

-- @test fórmulas del origen: el trigger cuelga de la de trabajo lo que llega sin fórmula, crea «Fórmula» si no hay y activa la primera publicada
begin;
do $$
declare
  o1 uuid := pg_temp.ftab_origen('ftab_trg_1');
  o2 uuid := pg_temp.ftab_origen('ftab_trg_2');
  d public.formulas_del_origen; f uuid; p uuid; v_otra uuid;
begin
  -- Un borrador en un origen sin fórmulas: nace «Fórmula», no activa.
  f := pg_temp.ftab_version(o1, 'borrador', null);
  select * into d from public.formulas_del_origen where origen_id = o1;
  if d.nombre is distinct from 'Fórmula' or d.activa or (select formula_del_origen_id from public.formulas where id = f) is distinct from d.id then
    raise exception 'el borrador sin fórmula no colgó de una «Fórmula» nueva sin activar: %', to_jsonb(d);
  end if;
  -- La plantilla también cuelga de la de trabajo.
  insert into public.plantillas_tarjeta (origen_id, definicion) values (o1, public._fdo_tarjeta_en_blanco()) returning id into p;
  if (select formula_del_origen_id from public.plantillas_tarjeta where id = p) is distinct from d.id then raise exception 'la plantilla no colgó de la de trabajo'; end if;
  -- Publicar el borrador (el estado cambia) activa la fórmula: es la primera publicada del origen.
  update public.formulas set estado = 'publicada', version = 1, visibilidad = '{}', publicado_en = now() where id = f;
  select * into d from public.formulas_del_origen where origen_id = o1;
  if not d.activa or d.activada_en is null or d.desactivada_en is not null then raise exception 'la primera publicada no activó su fórmula: %', to_jsonb(d); end if;
  -- Una publicada insertada en un origen sin fórmulas: nace «Fórmula» activa, con la hora y el autor de la publicación.
  f := pg_temp.ftab_version(o2, 'publicada', 1);
  select * into d from public.formulas_del_origen where origen_id = o2;
  if not d.activa or d.activada_en is distinct from (select publicado_en from public.formulas where id = f) then
    raise exception 'la publicada sin fórmula no nació activa con su hora: %', to_jsonb(d);
  end if;
  -- Con una activa, la publicada de otra fórmula del origen no la activa.
  insert into public.formulas_del_origen (origen_id, nombre) values (o2, 'Otra') returning id into v_otra;
  perform pg_temp.ftab_version(o2, 'publicada', 1, v_otra);
  if (select activa from public.formulas_del_origen where id = v_otra) then raise exception 'con una activa, publicar otra la activó'; end if;
  -- Sin activa y con la única archivada, la de trabajo es una nueva: «Fórmula 2».
  update public.formulas_del_origen set activa = false, desactivada_en = now() where origen_id = o1;
  update public.formulas_del_origen set archivada_en = now() where origen_id = o1;
  f := pg_temp.ftab_version(o1, 'borrador', null);
  select d2.* into d from public.formulas_del_origen d2 join public.formulas x on x.formula_del_origen_id = d2.id where x.id = f;
  if d.nombre is distinct from 'Fórmula 2' or d.archivada_en is not null then raise exception 'con la única archivada, el borrador no colgó de «Fórmula 2»: %', to_jsonb(d); end if;
end $$;
rollback;
