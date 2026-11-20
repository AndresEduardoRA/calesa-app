-- Renombrar, archivar y eliminar una fórmula del origen (docs/COTIZADOR.md › «Fórmulas del origen»): cada una con la `actualizado_en` que se tenía en
-- pantalla (PT409 con quién y cuándo), la activa no se archiva ni se elimina, se elimina sólo la que nunca estuvo activa ni se usó para cotizar, y la que no
-- existe o es de otro origen da el mismo 42501. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su
-- transacción y la revierte.

create or replace function pg_temp.fra_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.fra_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_h text; v_e text; v_m text;
begin
  perform pg_temp.fra_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Una persona que configura en ese origen.
create or replace function pg_temp.fra_persona(p_id uuid, p_nombre text, p_origen uuid) returns void language plpgsql as $f$
declare v_rol uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre, invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('fra_' || right(p_id::text, 4), p_nombre) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.configurar', p_origen, 'todos');
end $f$;

create or replace function pg_temp.fra_renombrar(p_quien uuid, p_id uuid, p_esperada timestamptz, p_nombre text) returns jsonb language sql as $f$
  select pg_temp.fra_corre(p_quien, format('select to_jsonb(public.formula_del_origen_renombrar(%L, %L, %L))', p_id, p_esperada, p_nombre))
$f$;

create or replace function pg_temp.fra_archivar(p_quien uuid, p_id uuid, p_esperada timestamptz) returns jsonb language sql as $f$
  select pg_temp.fra_corre(p_quien, format('select to_jsonb(public.formula_del_origen_archivar(%L, %L))', p_id, p_esperada))
$f$;

create or replace function pg_temp.fra_eliminar(p_quien uuid, p_id uuid, p_esperada timestamptz) returns jsonb language sql as $f$
  select pg_temp.fra_corre(p_quien, format('select ''"ok"''::jsonb from (select public.formula_del_origen_eliminar(%L, %L)) x', p_id, p_esperada))
$f$;

create or replace function pg_temp.fra_hora(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.formulas_del_origen where id = p_id
$f$;

-- @test fórmulas del origen: renombrar con la esperada (también una archivada); vieja o nula, PT409 con quién; el nombre repetido 23505
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fa401';
  ana constant uuid := '00000000-0000-4000-8000-0000000fa402';
  o uuid; a uuid; b uuid; vieja timestamptz; r jsonb;
begin
  insert into public.origenes (clave, nombre) values ('fra_uno', 'Renombrar uno') returning id into o;
  perform pg_temp.fra_persona(q, 'Quien renombra', o);
  perform pg_temp.fra_persona(ana, 'Ana Renombra', o);
  insert into public.formulas_del_origen (origen_id, nombre) values (o, 'Planilla') returning id into a;
  insert into public.formulas_del_origen (origen_id, nombre, archivada_en) values (o, 'Vieja', now() - interval '1 day') returning id into b;
  -- Ana la renombra; quien tenía la de antes recibe el PT409 con su nombre (dentro de la transacción `now()` no avanza: la de antes va un segundo atrás).
  vieja := pg_temp.fra_hora(a) - interval '1 second';
  r := pg_temp.fra_renombrar(ana, a, pg_temp.fra_hora(a), '  Planilla 2026 ');
  if r ? 'error' or (r #>> '{}')::timestamptz is distinct from pg_temp.fra_hora(a) then raise exception 'renombrar dio %', r; end if;
  if (select nombre from public.formulas_del_origen where id = a) is distinct from 'Planilla 2026' then raise exception 'renombrar no cambió el nombre'; end if;
  if not exists (select 1 from public.actividad where accion = 'formula_del_origen.renombrar' and registro_id = a::text and actor_id = ana
                   and antes ->> 'nombre' = 'Planilla' and despues ->> 'nombre' = 'Planilla 2026') then
    raise exception 'renombrar no dejó su actividad';
  end if;
  r := pg_temp.fra_renombrar(q, a, vieja, 'Otra');
  if r ->> 'error' is distinct from 'PT409' or coalesce(r ->> 'mensaje', '') not like 'Ana Renombra cambió esta fórmula hace %.' then raise exception 'renombrar con la vieja dio %', r; end if;
  r := pg_temp.fra_renombrar(q, a, null, 'Otra');
  if r ->> 'error' is distinct from 'P0001' or coalesce(r ->> 'mensaje', '') not like 'Falta la versión que tenías en pantalla.%' then raise exception 'renombrar sin esperada dio %', r; end if;
  -- El nombre de otra, aun archivada y con otras mayúsculas, no; el largo, tampoco.
  r := pg_temp.fra_renombrar(q, a, pg_temp.fra_hora(a), 'VIEJA');
  if r ->> 'error' is distinct from '23505' or r ->> 'hint' is distinct from 'nombre' or r ->> 'mensaje' is distinct from 'Ya hay una fórmula «VIEJA» en este origen.' then raise exception 'renombrar a un nombre usado dio %', r; end if;
  r := pg_temp.fra_renombrar(q, a, pg_temp.fra_hora(a), repeat('x', 61));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'nombre' then raise exception 'renombrar con 61 dio %', r; end if;
  -- Una archivada también se renombra.
  r := pg_temp.fra_renombrar(q, b, pg_temp.fra_hora(b), 'Vieja de 2025');
  if r ? 'error' or (select nombre from public.formulas_del_origen where id = b) is distinct from 'Vieja de 2025' then raise exception 'renombrar la archivada dio %', r; end if;
end $$;
rollback;

-- @test fórmulas del origen: archivar deja quién y cuándo; la activa y la ya archivada no se archivan
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fa403';
  o uuid; a uuid; b uuid; r jsonb; d public.formulas_del_origen; e jsonb := public._fdo_formula_en_blanco();
begin
  insert into public.origenes (clave, nombre) values ('fra_dos', 'Archivar dos') returning id into o;
  perform pg_temp.fra_persona(q, 'Quien archiva', o);
  insert into public.formulas_del_origen (origen_id, nombre) values (o, 'Activa') returning id into a;
  insert into public.formulas (origen_id, formula_del_origen_id, estado, version, definicion, params, diseno, visibilidad, publicado_en)
  values (o, a, 'publicada', 1, e -> 'definicion', e -> 'params', e -> 'diseno', '{}', now());
  insert into public.formulas_del_origen (origen_id, nombre) values (o, 'Otra') returning id into b;
  if not (select activa from public.formulas_del_origen where id = a) then raise exception 'el terreno no tiene activa'; end if;
  r := pg_temp.fra_archivar(q, a, pg_temp.fra_hora(a));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'activa' or r ->> 'mensaje' is distinct from 'La fórmula activa no se archiva ni se elimina: activa otra primero.' then
    raise exception 'archivar la activa dio %', r;
  end if;
  r := pg_temp.fra_archivar(q, b, pg_temp.fra_hora(b));
  select * into d from public.formulas_del_origen where id = b;
  if r ? 'error' or d.archivada_en is null or d.archivada_por is distinct from q or (r #>> '{}')::timestamptz is distinct from d.actualizado_en then
    raise exception 'archivar dio % y dejó %', r, to_jsonb(d);
  end if;
  if not exists (select 1 from public.actividad where accion = 'formula_del_origen.archivar' and registro_id = b::text and despues ->> 'archivada_en' is not null) then
    raise exception 'archivar no dejó su actividad';
  end if;
  r := pg_temp.fra_archivar(q, b, pg_temp.fra_hora(b));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'Esta fórmula está archivada.' then raise exception 'archivar la archivada dio %', r; end if;
  r := pg_temp.fra_archivar(q, a, null);
  if r ->> 'error' is distinct from 'P0001' then raise exception 'archivar sin esperada dio %', r; end if;
end $$;
rollback;

-- @test fórmulas del origen: se elimina con sus versiones la que nunca estuvo activa ni cotizó; la activa, la que lo estuvo y la usada para cotizar no
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fa404';
  o uuid; a uuid; b uuid; c uuid; x uuid; pub_c uuid; r jsonb; e jsonb := public._fdo_formula_en_blanco();
begin
  insert into public.origenes (clave, nombre) values ('fra_tres', 'Eliminar tres') returning id into o;
  perform pg_temp.fra_persona(q, 'Quien elimina', o);
  insert into public.formulas_del_origen (origen_id, nombre) values (o, 'Activa') returning id into a;
  insert into public.formulas (origen_id, formula_del_origen_id, estado, version, definicion, params, diseno, visibilidad, publicado_en)
  values (o, a, 'publicada', 1, e -> 'definicion', e -> 'params', e -> 'diseno', '{}', now());
  -- La que estuvo activa, la usada para cotizar y una nueva con su borrador, su publicada y su tarjeta.
  insert into public.formulas_del_origen (origen_id, nombre, activada_en, desactivada_en, archivada_en) values (o, 'Estuvo activa', now() - interval '2 day', now() - interval '1 day', now())
  returning id into b;
  insert into public.formulas_del_origen (origen_id, nombre) values (o, 'Cotizó') returning id into c;
  insert into public.formulas (origen_id, formula_del_origen_id, estado, version, definicion, params, diseno, visibilidad, publicado_en)
  values (o, c, 'publicada', 1, e -> 'definicion', e -> 'params', e -> 'diseno', '{}', now()) returning id into pub_c;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
  values (o, q, pub_c, '{"total": 10}', '{"total": "input"}', '{}', '{"usd": 10}', 10);
  insert into public.formulas_del_origen (origen_id, nombre, archivada_en) values (o, 'Nueva', now()) returning id into x;
  insert into public.formulas (origen_id, formula_del_origen_id, estado, version, definicion, params, diseno, visibilidad, publicado_en)
  values (o, x, 'publicada', 1, e -> 'definicion', e -> 'params', e -> 'diseno', '{}', now()), (o, x, 'borrador', null, e -> 'definicion', e -> 'params', e -> 'diseno', null, null);
  insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, estado, definicion) values (o, x, 'borrador', public._fdo_tarjeta_en_blanco());
  r := pg_temp.fra_eliminar(q, a, pg_temp.fra_hora(a));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'La fórmula activa no se archiva ni se elimina: activa otra primero.' then raise exception 'eliminar la activa dio %', r; end if;
  r := pg_temp.fra_eliminar(q, b, pg_temp.fra_hora(b));
  if r ->> 'error' is distinct from '23503' or r ->> 'mensaje' is distinct from 'Esta fórmula ya se usó para cotizar o estuvo activa: archívala.' then raise exception 'eliminar la que estuvo activa dio %', r; end if;
  r := pg_temp.fra_eliminar(q, c, pg_temp.fra_hora(c));
  if r ->> 'error' is distinct from '23503' then raise exception 'eliminar la que cotizó dio %', r; end if;
  r := pg_temp.fra_eliminar(q, x, pg_temp.fra_hora(x) - interval '1 second');
  if r ->> 'error' is distinct from 'PT409' then raise exception 'eliminar con la vieja dio %', r; end if;
  -- La nueva, aunque esté archivada, se va con sus versiones y su tarjeta.
  r := pg_temp.fra_eliminar(q, x, pg_temp.fra_hora(x));
  if r ? 'error' then raise exception 'eliminar la nueva dio %', r; end if;
  if exists (select 1 from public.formulas_del_origen where id = x) or exists (select 1 from public.formulas where formula_del_origen_id = x)
     or exists (select 1 from public.plantillas_tarjeta where formula_del_origen_id = x) then
    raise exception 'eliminar dejó algo de la fórmula';
  end if;
  if not exists (select 1 from public.actividad where accion = 'formula_del_origen.eliminar' and registro_id = x::text and antes ->> 'nombre' = 'Nueva' and despues is null) then
    raise exception 'eliminar no dejó su actividad';
  end if;
  if (select count(*) from public.formulas_del_origen where origen_id = o) is distinct from 3 then raise exception 'eliminar tocó otra fórmula'; end if;
end $$;
rollback;

-- @test fórmulas del origen: la que no existe y la de otro origen dan el mismo 42501 en renombrar, archivar, eliminar y activar
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fa405';
  o uuid; o2 uuid; ajena uuid; nada uuid := gen_random_uuid(); r jsonb; r2 jsonb; quien text;
begin
  insert into public.origenes (clave, nombre) values ('fra_cuatro', 'Ajeno cuatro') returning id into o;
  insert into public.origenes (clave, nombre) values ('fra_cuatro_otro', 'Ajeno cuatro otro') returning id into o2;
  perform pg_temp.fra_persona(q, 'Quien no puede', o);
  insert into public.formulas_del_origen (origen_id, nombre) values (o2, 'Ajena') returning id into ajena;
  foreach quien in array array['renombrar', 'archivar', 'eliminar', 'activar'] loop
    r := case quien
      when 'renombrar' then pg_temp.fra_renombrar(q, ajena, pg_temp.fra_hora(ajena), 'X')
      when 'archivar' then pg_temp.fra_archivar(q, ajena, pg_temp.fra_hora(ajena))
      when 'eliminar' then pg_temp.fra_eliminar(q, ajena, pg_temp.fra_hora(ajena))
      else pg_temp.fra_corre(q, format('select public.formula_del_origen_activar(%L, %L, %L, null, null, null, null, null)', ajena, pg_temp.fra_hora(ajena), 'nota')) end;
    r2 := case quien
      when 'renombrar' then pg_temp.fra_renombrar(q, nada, now(), 'X')
      when 'archivar' then pg_temp.fra_archivar(q, nada, now())
      when 'eliminar' then pg_temp.fra_eliminar(q, nada, now())
      else pg_temp.fra_corre(q, format('select public.formula_del_origen_activar(%L, %L, %L, null, null, null, null, null)', nada, now(), 'nota')) end;
    if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes el permiso «cotizaciones.configurar».' or r is distinct from r2 then
      raise exception '% de otro origen dio % y una que no existe %', quien, r, r2;
    end if;
  end loop;
  if (select nombre from public.formulas_del_origen where id = ajena) is distinct from 'Ajena' then raise exception 'un rechazo tocó la ajena'; end if;
end $$;
rollback;
