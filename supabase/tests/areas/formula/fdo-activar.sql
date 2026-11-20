-- Activar una fórmula del origen (docs/COTIZADOR.md › «Fórmulas del origen»): publica con la nota lo pendiente de la fórmula y de su tarjeta, exige que la
-- tarjeta calce con la publicada y la vuelve la que se cotiza; la anterior queda sin activar, intacta, y se puede reactivar. Cada esperada vieja es un PT409
-- con quién y cuándo, y un rechazo no deja nada a medias. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro
-- de su transacción y la revierte.

create or replace function pg_temp.fac_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.fac_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text;
begin
  perform pg_temp.fac_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', v_d, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Una persona que configura en ese origen.
create or replace function pg_temp.fac_persona(p_id uuid, p_nombre text, p_origen uuid) returns void language plpgsql as $f$
declare v_rol uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre, invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('fac_' || right(p_id::text, 4), p_nombre) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.configurar', p_origen, 'todos');
end $f$;

-- Lo que hoy se vería en pantalla de esa fórmula del origen: su hora, la activa del origen y el borrador y la publicada de la fórmula y de la tarjeta.
create or replace function pg_temp.fac_esperadas(p_id uuid) returns jsonb language sql as $f$
  select jsonb_build_object(
    'hora', d.actualizado_en,
    'activa', (select a.id from public.formulas_del_origen a where a.origen_id = d.origen_id and a.activa),
    'bor', (select f.actualizado_en from public.formulas f where f.formula_del_origen_id = d.id and f.estado = 'borrador'),
    'pub', (select f.id from public.formulas f where f.formula_del_origen_id = d.id and f.estado = 'publicada'),
    'pbor', (select p.actualizado_en from public.plantillas_tarjeta p where p.formula_del_origen_id = d.id and p.estado = 'borrador'),
    'ppub', (select p.id from public.plantillas_tarjeta p where p.formula_del_origen_id = d.id and p.estado = 'publicada'))
  from public.formulas_del_origen d where d.id = p_id
$f$;

-- Activar con lo que se ve hoy, salvo lo que cambie `p_cambios` (las mismas claves de fac_esperadas).
create or replace function pg_temp.fac_activar(p_quien uuid, p_id uuid, p_nota text, p_cambios jsonb default '{}') returns jsonb language plpgsql as $f$
declare e jsonb := pg_temp.fac_esperadas(p_id) || p_cambios;
begin
  return pg_temp.fac_corre(p_quien, format('select public.formula_del_origen_activar(%L, %L, %L, %L, %L, %L, %L, %L)',
    p_id, e ->> 'hora', p_nota, e ->> 'activa', e ->> 'bor', e ->> 'pub', e ->> 'pbor', e ->> 'ppub'));
end $f$;

create or replace function pg_temp.fac_crear(p_quien uuid, p_origen uuid, p_nombre text, p_copia uuid default null) returns uuid language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.fac_corre(p_quien, format('select public.formula_del_origen_crear(%L, %L, %L, %L)', gen_random_uuid(), p_origen, p_nombre, p_copia));
  if r ? 'error' then raise exception 'crear «%»: %', p_nombre, r; end if;
  return (r ->> 'id')::uuid;
end $f$;

-- @test fórmulas del origen: activar publica la fórmula y su tarjeta, cambia la activa y deja la anterior intacta; reactivarla y activar la activa también
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fa501';
  o uuid; a uuid; b uuid; r jsonb; pub_a uuid; plant_a uuid; d public.formulas_del_origen;
begin
  insert into public.origenes (clave, nombre) values ('fac_uno', 'Activar uno') returning id into o;
  perform pg_temp.fac_persona(q, 'Quien activa', o);
  a := pg_temp.fac_crear(q, o, 'Fórmula');
  -- La primera: publica los dos borradores y queda activa.
  r := pg_temp.fac_activar(q, a, 'la primera');
  if r ? 'error' then raise exception 'activar la primera dio %', r; end if;
  select id into pub_a from public.formulas where formula_del_origen_id = a and estado = 'publicada' and version = 1;
  select id into plant_a from public.plantillas_tarjeta where formula_del_origen_id = a and estado = 'publicada' and version = 1;
  select * into d from public.formulas_del_origen where id = a;
  if r is distinct from jsonb_build_object('activa', a, 'formula', pub_a, 'plantilla', plant_a, 'actualizado_en', d.actualizado_en) then raise exception 'activar devolvió %', r; end if;
  if not d.activa or d.activada_por is distinct from q or d.activada_en is null then raise exception 'la primera no quedó activa: %', to_jsonb(d); end if;
  if exists (select 1 from public.formulas where formula_del_origen_id = a and estado = 'borrador')
     or exists (select 1 from public.plantillas_tarjeta where formula_del_origen_id = a and estado = 'borrador') then
    raise exception 'activar dejó borradores';
  end if;
  if (select nota from public.formulas where id = pub_a) is distinct from 'la primera' or (select nota from public.plantillas_tarjeta where id = plant_a) is distinct from 'la primera' then
    raise exception 'activar no publicó con su nota';
  end if;
  if not exists (select 1 from public.actividad where accion = 'formula_del_origen.activar' and registro_id = a::text and detalle ->> 'nota' = 'la primera'
                   and detalle -> 'anterior' = 'null'::jsonb) then
    raise exception 'activar no dejó su actividad';
  end if;
  -- Otra: la anterior queda sin activar, con sus versiones.
  b := pg_temp.fac_crear(q, o, 'Otra', a);
  r := pg_temp.fac_activar(q, b, 'la otra');
  if r ? 'error' or r ->> 'activa' is distinct from b::text then raise exception 'activar la otra dio %', r; end if;
  select * into d from public.formulas_del_origen where id = a;
  if d.activa or d.desactivada_en is null or not (select activa from public.formulas_del_origen where id = b) then raise exception 'cambiar de activa dejó %', to_jsonb(d); end if;
  if (select estado from public.formulas where id = pub_a) is distinct from 'publicada' or (select estado from public.plantillas_tarjeta where id = plant_a) is distinct from 'publicada' then
    raise exception 'cambiar de activa tocó las versiones de la anterior';
  end if;
  if not exists (select 1 from public.actividad where accion = 'formula_del_origen.desactivar' and registro_id = a::text and detalle ->> 'nueva' = b::text) then
    raise exception 'la anterior no dejó su actividad';
  end if;
  if (select count(*) from public.formulas_del_origen where origen_id = o and activa) is distinct from 1 then raise exception 'quedaron dos activas'; end if;
  -- Reactivar la anterior: sin nada pendiente, no publica nada.
  r := pg_temp.fac_activar(q, a, 'volver');
  if r ? 'error' or r -> 'formula' is distinct from to_jsonb(pub_a) or r -> 'plantilla' is distinct from to_jsonb(plant_a) then raise exception 'reactivar dio %', r; end if;
  if not (select activa from public.formulas_del_origen where id = a) or (select activa from public.formulas_del_origen where id = b) then raise exception 'reactivar no cambió la activa'; end if;
  if (select count(*) from public.formulas where formula_del_origen_id = a) is distinct from 1 then raise exception 'reactivar publicó otra versión'; end if;
  -- Activar la activa sin nada pendiente: lo mismo.
  r := pg_temp.fac_activar(q, a, 'otra vez');
  if r ? 'error' or r ->> 'activa' is distinct from a::text or (select count(*) from public.formulas where formula_del_origen_id = a) is distinct from 1 then raise exception 'activar la activa dio %', r; end if;
end $$;
rollback;

-- @test fórmulas del origen: una tarjeta que no calza, sin versión, sin tarjeta, archivada o sin nota: rechazo y nada cambia
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fa502';
  o uuid; a uuid; c uuid; x uuid; r jsonb; e jsonb := public._fdo_formula_en_blanco();
begin
  insert into public.origenes (clave, nombre) values ('fac_dos', 'Activar dos') returning id into o;
  perform pg_temp.fac_persona(q, 'Quien activa dos', o);
  a := pg_temp.fac_crear(q, o, 'Fórmula');
  r := pg_temp.fac_activar(q, a, 'la primera');
  if r ? 'error' then raise exception 'activar la primera dio %', r; end if;
  -- La tarjeta de «C» nombra un nodo que su fórmula no tiene.
  c := pg_temp.fac_crear(q, o, 'C');
  update public.plantillas_tarjeta set definicion = jsonb_set(definicion, '{celdas,9,contenido,nodo}', '"nada"') where formula_del_origen_id = c;
  r := pg_temp.fac_activar(q, c, 'no calza');
  if r ->> 'error' is distinct from '22023' or coalesce(r ->> 'detail', '') = '' or r ->> 'hint' is distinct from 'celdas.c_total_monto' then raise exception 'la tarjeta que no calza dio %', r; end if;
  if exists (select 1 from public.formulas where formula_del_origen_id = c and estado = 'publicada') or not (select activa from public.formulas_del_origen where id = a)
     or exists (select 1 from public.actividad where accion = 'formula.publicada' and detalle ->> 'formula_del_origen_id' = c::text) then
    raise exception 'el rechazo dejó algo a medias';
  end if;
  -- Sin versión ni borrador; sin tarjeta.
  insert into public.formulas_del_origen (origen_id, nombre) values (o, 'Vacía') returning id into x;
  insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, estado, definicion) values (o, x, 'borrador', public._fdo_tarjeta_en_blanco());
  r := pg_temp.fac_activar(q, x, 'nada');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'formula' or r ->> 'mensaje' is distinct from 'Esta fórmula no tiene una versión que se pueda publicar.' then raise exception 'sin versión dio %', r; end if;
  delete from public.plantillas_tarjeta where formula_del_origen_id = x;
  insert into public.formulas (origen_id, formula_del_origen_id, estado, definicion, params, diseno) values (o, x, 'borrador', e -> 'definicion', e -> 'params', e -> 'diseno');
  r := pg_temp.fac_activar(q, x, 'sin tarjeta');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'tarjeta' or r ->> 'mensaje' is distinct from 'Esta fórmula no tiene tarjeta: guarda una antes de activarla.' then raise exception 'sin tarjeta dio %', r; end if;
  -- Sin nota; archivada; sin la esperada.
  r := pg_temp.fac_activar(q, c, '  ');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'nota' or r ->> 'mensaje' is distinct from 'Activar pide una nota.' then raise exception 'sin nota dio %', r; end if;
  update public.formulas_del_origen set archivada_en = now() where id = c;
  r := pg_temp.fac_activar(q, c, 'archivada');
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'Esta fórmula está archivada.' then raise exception 'la archivada dio %', r; end if;
  r := pg_temp.fac_activar(q, x, 'sin esperada', '{"hora": null}');
  if r ->> 'error' is distinct from 'P0001' then raise exception 'sin la esperada dio %', r; end if;
end $$;
rollback;

-- @test fórmulas del origen: cada esperada vieja de activar es un PT409 que dice quién y cuándo
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fa503';
  ana constant uuid := '00000000-0000-4000-8000-0000000fa504';
  o uuid; a uuid; c uuid; r jsonb; vio jsonb;
begin
  insert into public.origenes (clave, nombre) values ('fac_tres', 'Activar tres') returning id into o;
  perform pg_temp.fac_persona(q, 'Quien activa tres', o);
  perform pg_temp.fac_persona(ana, 'Ana Activa', o);
  a := pg_temp.fac_crear(q, o, 'Fórmula');
  r := pg_temp.fac_activar(q, a, 'la primera');
  if r ? 'error' then raise exception 'activar la primera dio %', r; end if;
  c := pg_temp.fac_crear(q, o, 'C');
  vio := pg_temp.fac_esperadas(c);
  -- La fila: Ana la renombró (dentro de la transacción `now()` no avanza: la que se vio va un segundo atrás).
  r := pg_temp.fac_corre(ana, format('select to_jsonb(public.formula_del_origen_renombrar(%L, %L, %L))', c, vio ->> 'hora', 'C de Ana'));
  if r ? 'error' then raise exception 'Ana renombró: %', r; end if;
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('hora', (vio ->> 'hora')::timestamptz - interval '1 second'));
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'Ana Activa cambió esta fórmula hace %.' then raise exception 'la fila vieja dio %', r; end if;
  -- La activa que se vio.
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('activa', gen_random_uuid()));
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'Activaste «Fórmula» hace %.' then raise exception 'la activa vieja dio %', r; end if;
  r := pg_temp.fac_activar(ana, c, 'n', jsonb_build_object('activa', null));
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'Quien activa tres activó «Fórmula» hace %.' then raise exception 'la activa vieja, para Ana, dio %', r; end if;
  -- El borrador de la fórmula: no se vio, cambió.
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('bor', null));
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'Ya hay un borrador: lo empezaste tú y se guardó %.' then raise exception 'el borrador que no se vio dio %', r; end if;
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('bor', (vio ->> 'bor')::timestamptz - interval '1 second'));
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'El borrador cambió después de que lo abriste:%' then raise exception 'el borrador viejo dio %', r; end if;
  -- El borrador y la publicada de la tarjeta.
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('pbor', null));
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'Ya hay un borrador de esta plantilla, guardado %.' then raise exception 'el borrador de la tarjeta que no se vio dio %', r; end if;
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('pbor', (vio ->> 'pbor')::timestamptz - interval '1 second'));
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'El borrador de esta plantilla cambió %' then raise exception 'el borrador viejo de la tarjeta dio %', r; end if;
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('ppub', gen_random_uuid()));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'La tarjeta que tenías ya no es la publicada, y la fórmula no tiene otra.' then raise exception 'la tarjeta publicada vieja dio %', r; end if;
  -- Ana publica la fórmula y la tarjeta mientras tanto.
  r := pg_temp.fac_corre(ana, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L, p_formula_del_origen => %L))', o, 'de Ana', c));
  if r ? 'error' then raise exception 'Ana publicó la fórmula: %', r; end if;
  r := pg_temp.fac_corre(ana, format('select to_jsonb(public.plantilla_publicar(%L, %L, %L, %L))', o, vio ->> 'pbor', 'de Ana', c));
  if r ? 'error' then raise exception 'Ana publicó la tarjeta: %', r; end if;
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('bor', vio -> 'bor'));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'El borrador que abriste ya no está: se publicó o se descartó.' then raise exception 'el borrador publicado dio %', r; end if;
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('pub', null));
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'Ana Activa publicó la versión 1 hace %.' then raise exception 'la publicada vieja dio %', r; end if;
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('pbor', vio -> 'pbor'));
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'El borrador ya no está: la versión 1 se publicó %.' then raise exception 'el borrador de la tarjeta publicado dio %', r; end if;
  r := pg_temp.fac_activar(q, c, 'n', jsonb_build_object('ppub', null));
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'Se publicó la versión 1 de la tarjeta hace %.' then raise exception 'la tarjeta publicada que no se vio dio %', r; end if;
  -- Nada cambió con los rechazos; con lo de hoy, activa.
  if not (select activa from public.formulas_del_origen where id = a) then raise exception 'un rechazo cambió la activa'; end if;
  r := pg_temp.fac_activar(q, c, 'ahora sí');
  if r ? 'error' or r ->> 'activa' is distinct from c::text then raise exception 'activar con lo de hoy dio %', r; end if;
end $$;
rollback;
