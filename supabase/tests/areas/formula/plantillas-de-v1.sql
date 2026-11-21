-- Empezar un origen desde una plantilla de V1 (docs/COTIZADOR.md › «Plantillas de V1»): `cotizacion_paquete_aplicar()` crea los dos borradores y los colores que
-- faltan, todo o nada, y cada uno de los cuatro paquetes del código (`_plantilla_v1_usa`, `_plantilla_v1_china`, `_plantilla_v1_oficina`,
-- `_plantilla_v1_dealer`, cargados por `scripts/probar-schema.mjs`) se publica con los validadores de verdad.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno con `pv1_preparar()` dentro de su transacción y la revierte.

-- @test plantillas de V1: los ayudantes
reset role;
create or replace function pg_temp.pv1_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Una persona con un rol propio; cada concesión es {clave, origen}.
create or replace function pg_temp.pv1_persona(p_id uuid, p_nombre text, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre, invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('pv1_' || substr(p_id::text, 25, 12), 'PV1 ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c ->> 'clave', (c ->> 'origen')::uuid, 'todos');
  end loop;
end $f$;

-- El terreno: los orígenes `prueba_pv1` y `prueba_pv1_otro`; Ana configura los dos y Otto sólo el otro. Devuelve `prueba_pv1`.
create or replace function pg_temp.pv1_preparar() returns uuid language plpgsql as $f$
declare o uuid; o2 uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_pv1', 'Prueba pv1') returning id into o;
  insert into public.origenes (clave, nombre) values ('prueba_pv1_otro', 'Prueba pv1 otro') returning id into o2;
  perform pg_temp.pv1_persona('00000000-0000-4000-8000-0000000a1001', 'Ana Pv', jsonb_build_array(
    jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
  perform pg_temp.pv1_persona('00000000-0000-4000-8000-0000000a1002', 'Otto Pv', jsonb_build_array(
    jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
  return o;
end $f$;
create or replace function pg_temp.pv1_ana() returns uuid language sql as $f$ select '00000000-0000-4000-8000-0000000a1001'::uuid $f$;
create or replace function pg_temp.pv1_otto() returns uuid language sql as $f$ select '00000000-0000-4000-8000-0000000a1002'::uuid $f$;
create or replace function pg_temp.pv1_otro() returns uuid language sql as $f$ select id from public.origenes where clave = 'prueba_pv1_otro' $f$;

-- El documento de un paquete (`usa`, `china`, `oficina`, `dealer`).
create or replace function pg_temp.pv1_doc(p_clave text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  execute format('select doc from pg_temp.%I', '_plantilla_v1_' || p_clave) into v;
  return v;
end $f$;

-- El `p_paquete` de un documento contra el catálogo de ahora, como lo arma la action: reusa la clave con el mismo hex y crea la que falta (con un id por color).
create or replace function pg_temp.pv1_paquete(p_doc jsonb) returns jsonb language sql as $f$
  select jsonb_build_object(
    'definicion', p_doc -> 'formula' -> 'definicion', 'params', p_doc -> 'formula' -> 'params', 'diseno', p_doc -> 'formula' -> 'diseno',
    'tarjeta', p_doc -> 'tarjeta', 'nota', 'Empezado desde la plantilla de V1 «' || (p_doc ->> 'nombre') || '».',
    'reusar', coalesce((select jsonb_agg(jsonb_build_object('clave', c ->> 'clave', 'hex', c ->> 'hex'))
                          from jsonb_array_elements(p_doc -> 'colores') c where exists (select 1 from public.tonos t where t.clave = c ->> 'clave')), '[]'::jsonb),
    'crear', coalesce((select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'nombre', c ->> 'nombre', 'hex', c ->> 'hex', 'clave', c ->> 'clave'))
                         from jsonb_array_elements(p_doc -> 'colores') c where not exists (select 1 from public.tonos t where t.clave = c ->> 'clave')), '[]'::jsonb))
$f$;

-- Aplicar como alguien (devuelve la respuesta) y el SQL de aplicar para `pv1_error`.
create or replace function pg_temp.pv1_aplicar(p_quien uuid, p_origen uuid, p_paquete jsonb, p_formula timestamptz, p_plantilla timestamptz) returns jsonb
language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.pv1_como(p_quien);
  set local role authenticated;
  r := public.cotizacion_paquete_aplicar(p_origen, p_paquete, p_formula, p_plantilla);
  reset role;
  return r;
end $f$;
-- Aplicar sobre una fórmula del origen elegida, y el sqlstate de hacerlo (o «sin error»).
create or replace function pg_temp.pv1_aplicar_en(p_quien uuid, p_origen uuid, p_paquete jsonb, p_fdo uuid) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.pv1_como(p_quien);
  set local role authenticated;
  r := public.cotizacion_paquete_aplicar(p_origen, p_paquete, null, null, p_fdo);
  reset role;
  return r;
end $f$;
create or replace function pg_temp.pv1_codigo_en(p_quien uuid, p_origen uuid, p_paquete jsonb, p_fdo uuid) returns text language plpgsql as $f$
begin
  perform pg_temp.pv1_aplicar_en(p_quien, p_origen, p_paquete, p_fdo);
  return 'sin error';
exception when others then
  reset role;
  return sqlstate;
end $f$;
create or replace function pg_temp.pv1_error(p_quien uuid, p_origen uuid, p_paquete jsonb, p_formula timestamptz, p_plantilla timestamptz) returns text
language plpgsql as $f$
declare v_m text; v_h text;
begin
  perform pg_temp.pv1_aplicar(p_quien, p_origen, p_paquete, p_formula, p_plantilla);
  return 'sin error';
exception when others then
  get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
  return sqlstate || '|' || coalesce(v_h, '') || '|' || v_m;
end $f$;

create or replace function pg_temp.pv1_igual(p_dio text, p_esperado text) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then raise exception 'esperaba «%», dio «%»', p_esperado, p_dio; end if;
end $f$;

-- Lo que quedó de un origen (como postgres): los dos borradores y cuántos colores `v1_` hay.
create or replace function pg_temp.pv1_formula(p_origen uuid) returns public.formulas language sql as $f$
  select * from public.formulas where origen_id = p_origen and estado = 'borrador'
$f$;
create or replace function pg_temp.pv1_tarjeta(p_origen uuid) returns public.plantillas_tarjeta language sql as $f$
  select * from public.plantillas_tarjeta where origen_id = p_origen and estado = 'borrador'
$f$;
create or replace function pg_temp.pv1_colores_v1() returns bigint language sql as $f$ select count(*) from public.tonos where clave like 'v1\_%' $f$;

-- Llena el catálogo hasta `p_n` colores (como Ana, por `tono_crear`).
create or replace function pg_temp.pv1_llenar(p_n integer) returns void language plpgsql as $f$
declare i integer := 0;
begin
  perform pg_temp.pv1_como(pg_temp.pv1_ana());
  set local role authenticated;
  while (select count(*) from public.tonos) < p_n loop
    i := i + 1;
    perform public.tono_crear(gen_random_uuid(), 'Relleno pv1 ' || i, '#' || lpad(to_hex(i), 6, '0'));
  end loop;
  reset role;
end $f$;

-- @test plantillas de V1: P1 sin `cotizaciones.configurar` del origen (con la de otro) da 42501, sin borradores ni colores
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); antes bigint := pg_temp.pv1_colores_v1();
begin
  perform pg_temp.pv1_igual(
    split_part(pg_temp.pv1_error(pg_temp.pv1_otto(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('usa')), null, null), '|', 1), '42501');
  if (pg_temp.pv1_formula(o)).id is not null or (pg_temp.pv1_tarjeta(o)).id is not null then raise exception 'quedó un borrador'; end if;
  if pg_temp.pv1_colores_v1() <> antes then raise exception 'creó colores sin permiso'; end if;
end $$;
rollback;

-- @test plantillas de V1: P2 crea los dos borradores (autor, nota, sobre la publicada) y los colores que faltan con sus claves `v1_…`
begin;
select pg_temp.pv1_preparar();
do $$
declare
  o uuid := (select id from public.origenes where clave = 'prueba_pv1');
  d jsonb := pg_temp.pv1_doc('usa');
  p jsonb;
  r jsonb;
  f public.formulas;
  t public.plantillas_tarjeta;
  esperados text[];
begin
  delete from public.tonos where clave like 'v1\_%';
  p := pg_temp.pv1_paquete(d);
  r := pg_temp.pv1_aplicar(pg_temp.pv1_ana(), o, p, null, null);
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['colores', 'formula', 'plantilla'] then
    raise exception 'la respuesta no tiene la forma: %', r;
  end if;
  f := pg_temp.pv1_formula(o);
  t := pg_temp.pv1_tarjeta(o);
  if f.id is null or (r -> 'formula' ->> 'id')::uuid is distinct from f.id then raise exception 'no devolvió el borrador de la fórmula'; end if;
  if (r -> 'formula' ->> 'actualizado_en')::timestamptz is distinct from f.actualizado_en then raise exception 'otra hora de la fórmula'; end if;
  if t.id is null or (r ->> 'plantilla')::timestamptz is distinct from t.actualizado_en then raise exception 'no devolvió el borrador de la tarjeta'; end if;
  if f.creado_por is distinct from pg_temp.pv1_ana() then raise exception 'el borrador no es de Ana'; end if;
  if f.version_origen_id is not null then raise exception 'sin publicada, version_origen_id va nulo'; end if;
  perform pg_temp.pv1_igual(f.nota, 'Empezado desde la plantilla de V1 «USA (subasta)».');
  perform pg_temp.pv1_igual(t.nota, 'Empezado desde la plantilla de V1 «USA (subasta)».');
  if f.definicion is distinct from d -> 'formula' -> 'definicion' or f.params is distinct from d -> 'formula' -> 'params'
     or f.diseno is distinct from d -> 'formula' -> 'diseno' then
    raise exception 'la fórmula no es la del paquete';
  end if;
  if t.definicion is distinct from d -> 'tarjeta' then raise exception 'la tarjeta no es la del paquete'; end if;
  select array_agg(c ->> 'clave' order by c ->> 'clave') into esperados from jsonb_array_elements(d -> 'colores') c;
  if (select array_agg(x order by x) from jsonb_array_elements_text(r -> 'colores') x) is distinct from esperados then
    raise exception 'creó otros colores: %', r -> 'colores';
  end if;
  if (select array_agg(clave order by clave) from public.tonos where clave like 'v1\_%') is distinct from esperados then
    raise exception 'el catálogo no tiene las claves v1_ del paquete';
  end if;
  if exists (select 1 from jsonb_array_elements(d -> 'colores') c join public.tonos x on x.clave = c ->> 'clave' where x.hex is distinct from c ->> 'hex') then
    raise exception 'un color con otro hex';
  end if;
end $$;
rollback;

-- @test plantillas de V1: P2b con una publicada, el borrador nace sobre ella; los colores que ya están se reusan
begin;
select pg_temp.pv1_preparar();
do $$
declare
  o uuid := (select id from public.origenes where clave = 'prueba_pv1');
  s public.formulas;
  r jsonb;
begin
  select * into s from public.formulas f where f.estado = 'publicada' and f.diseno is not null order by f.creado_en, f.id limit 1;
  insert into public.formulas (id, origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
  values ('00000000-0000-4000-8000-0000000a1f01', o, 1, 'publicada', s.definicion, s.params, s.diseno, s.visibilidad, 'v1', now());
  perform pg_temp.pv1_aplicar(pg_temp.pv1_ana(), pg_temp.pv1_otro(), pg_temp.pv1_paquete(pg_temp.pv1_doc('china')), null, null);
  r := pg_temp.pv1_aplicar(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('usa')), null, null);
  if (pg_temp.pv1_formula(o)).version_origen_id is distinct from '00000000-0000-4000-8000-0000000a1f01'::uuid then
    raise exception 'el borrador no nació sobre la publicada';
  end if;
  if (r -> 'colores') ? 'v1_verde' or (r -> 'colores') ? 'v1_amarillo_fuerte' then raise exception 'volvió a crear lo que China ya creó: %', r -> 'colores'; end if;
end $$;
rollback;

-- @test plantillas de V1: P3 con las esperadas de los dos borradores, los pisa
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); f public.formulas; t public.plantillas_tarjeta;
begin
  perform pg_temp.pv1_aplicar(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('oficina')), null, null);
  f := pg_temp.pv1_formula(o);
  t := pg_temp.pv1_tarjeta(o);
  perform pg_temp.pv1_aplicar(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('china')), f.actualizado_en, t.actualizado_en);
  if (pg_temp.pv1_formula(o)).id is distinct from f.id then raise exception 'creó otro borrador en vez de pisar'; end if;
  perform pg_temp.pv1_igual((pg_temp.pv1_formula(o)).nota, 'Empezado desde la plantilla de V1 «China».');
  if (pg_temp.pv1_tarjeta(o)).definicion is distinct from pg_temp.pv1_doc('china') -> 'tarjeta' then raise exception 'no pisó la tarjeta'; end if;
end $$;
rollback;

-- @test plantillas de V1: P4 una esperada vieja (la de la fórmula o la de la tarjeta, menos 1 µs) da el PT409 de la base y nada cambia
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); f public.formulas; t public.plantillas_tarjeta; antes bigint; e text;
begin
  perform pg_temp.pv1_aplicar(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('oficina')), null, null);
  f := pg_temp.pv1_formula(o);
  t := pg_temp.pv1_tarjeta(o);
  delete from public.tonos where clave in ('v1_azul_marino', 'v1_rojo');
  antes := pg_temp.pv1_colores_v1();
  e := pg_temp.pv1_error(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('china')), f.actualizado_en - interval '1 microsecond', t.actualizado_en);
  if e not like 'PT409||El borrador cambió%' then raise exception 'la fórmula vieja dio «%»', e; end if;
  e := pg_temp.pv1_error(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('china')), f.actualizado_en, t.actualizado_en - interval '1 microsecond');
  if e not like 'PT409||El borrador de esta plantilla cambió %, mientras lo editabas.' then raise exception 'la tarjeta vieja dio «%»', e; end if;
  if (pg_temp.pv1_formula(o)).actualizado_en is distinct from f.actualizado_en or (pg_temp.pv1_tarjeta(o)).actualizado_en is distinct from t.actualizado_en then
    raise exception 'un borrador cambió';
  end if;
  if pg_temp.pv1_colores_v1() <> antes then raise exception 'creó colores con un PT409'; end if;
end $$;
rollback;

-- @test plantillas de V1: P5 esperada nula con un borrador existente: el PT409 de crear, que nombra a quien lo empezó
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); e text;
begin
  perform pg_temp.pv1_aplicar(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('oficina')), null, null);
  e := pg_temp.pv1_error(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('usa')), null, null);
  if e not like 'PT409||Ya hay un borrador: % y se guardó %.' then raise exception 'dio «%»', e; end if;
  -- Con la de la fórmula al día y la de la tarjeta nula: el de la tarjeta.
  e := pg_temp.pv1_error(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('usa')), (pg_temp.pv1_formula(o)).actualizado_en, null);
  if e not like 'PT409||Ya hay un borrador de esta plantilla, guardado %.' then raise exception 'la tarjeta dio «%»', e; end if;
  perform pg_temp.pv1_igual((pg_temp.pv1_formula(o)).nota, 'Empezado desde la plantilla de V1 «Oficina».');
end $$;
rollback;

-- @test plantillas de V1: P6 sin lugar en el catálogo (47 y el paquete pide 2): 22023 `colores` con el texto, sin borradores ni colores
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); p jsonb; e text;
begin
  delete from public.tonos where clave like 'v1\_%';
  perform pg_temp.pv1_llenar(47);
  -- Oficina reusa todos menos dos.
  perform pg_temp.pv1_como(pg_temp.pv1_ana());
  p := pg_temp.pv1_paquete(pg_temp.pv1_doc('oficina'));
  p := jsonb_set(p, '{crear}', (select jsonb_agg(c) from jsonb_array_elements(p -> 'crear') with ordinality x (c, n) where n <= 2));
  e := pg_temp.pv1_error(pg_temp.pv1_ana(), o, p, null, null);
  perform pg_temp.pv1_igual(e, '22023|colores|No hay lugar para 2 colores más en el catálogo (máximo 48): elimina alguno que no se use.');
  if (pg_temp.pv1_formula(o)).id is not null or (pg_temp.pv1_tarjeta(o)).id is not null then raise exception 'quedó un borrador'; end if;
  if (select count(*) from public.tonos) <> 47 then raise exception 'creó colores sin lugar'; end if;
  -- Uno cabe.
  p := jsonb_set(p, '{crear}', jsonb_build_array(p -> 'crear' -> 0));
  perform pg_temp.pv1_igual(pg_temp.pv1_error(pg_temp.pv1_ana(), o, p, null, null), 'sin error');
  if (select count(*) from public.tonos) <> 48 then raise exception 'no creó el que cabía'; end if;
end $$;
rollback;

-- @test plantillas de V1: P7 un rechazo a mitad (un color que se reusa cambió de hex) deshace también los dos borradores
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); p jsonb; e text;
begin
  p := pg_temp.pv1_paquete(pg_temp.pv1_doc('usa'));
  p := jsonb_set(p, '{reusar}', jsonb_build_array(jsonb_build_object('clave', 'v1_falso', 'hex', '#123456')));
  e := pg_temp.pv1_error(pg_temp.pv1_ana(), o, p, null, null);
  perform pg_temp.pv1_igual(e, 'PT409||Mientras elegías, cambiaron los colores del catálogo. Vuelve a elegir la plantilla.');
  if (pg_temp.pv1_formula(o)).id is not null or (pg_temp.pv1_tarjeta(o)).id is not null then raise exception 'quedó un borrador tras el rechazo'; end if;
end $$;
rollback;

-- @test plantillas de V1: P8 un color nuevo cuya clave ya tomó otro (la base le daría `_2`): PT409 y nada creado
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); p jsonb; e text; antes bigint;
begin
  delete from public.tonos where clave like 'v1\_%';
  p := pg_temp.pv1_paquete(pg_temp.pv1_doc('oficina'));
  -- Otra persona crea `v1_gris` con otro nombre mientras se elegía.
  perform pg_temp.pv1_como(pg_temp.pv1_ana());
  set local role authenticated;
  perform public.tono_crear(gen_random_uuid(), 'V1 gris', '#000000');
  reset role;
  update public.tonos set nombre = 'Gris de otra persona' where clave = 'v1_gris';
  antes := (select count(*) from public.tonos);
  e := pg_temp.pv1_error(pg_temp.pv1_ana(), o, p, null, null);
  perform pg_temp.pv1_igual(e, 'PT409||Mientras elegías, cambiaron los colores del catálogo. Vuelve a elegir la plantilla.');
  if (select count(*) from public.tonos) <> antes then raise exception 'quedaron colores'; end if;
  if (pg_temp.pv1_formula(o)).id is not null then raise exception 'quedó el borrador'; end if;
end $$;
rollback;

-- @test plantillas de V1: P8b un color nuevo cuyo nombre ya tomó otro mientras se elegía (23505 de `tono_crear`): el mismo PT409 y nada creado
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); p jsonb; e text; antes bigint;
begin
  delete from public.tonos where clave like 'v1\_%';
  p := pg_temp.pv1_paquete(pg_temp.pv1_doc('oficina'));
  perform pg_temp.pv1_como(pg_temp.pv1_ana());
  set local role authenticated;
  perform public.tono_crear(gen_random_uuid(), 'v1 GRIS', '#000000');
  reset role;
  update public.tonos set clave = 'gris_de_otra' where nombre = 'v1 GRIS';
  antes := (select count(*) from public.tonos);
  e := pg_temp.pv1_error(pg_temp.pv1_ana(), o, p, null, null);
  perform pg_temp.pv1_igual(e, 'PT409||Mientras elegías, cambiaron los colores del catálogo. Vuelve a elegir la plantilla.');
  if (select count(*) from public.tonos) <> antes then raise exception 'quedaron colores'; end if;
  if (pg_temp.pv1_formula(o)).id is not null or (pg_temp.pv1_tarjeta(o)).id is not null then raise exception 'quedó un borrador'; end if;
end $$;
rollback;

-- @test plantillas de V1: P9 cada una de las cuatro se aplica y se publica (fórmula y tarjeta) con los validadores completos
begin;
select pg_temp.pv1_preparar();
do $$
declare v_clave text; o uuid; d jsonb; f public.formulas; t public.plantillas_tarjeta; v_niveles text[]; v_tonos text[];
begin
  for v_clave in select unnest(array['usa', 'china', 'oficina', 'dealer']) loop
    insert into public.origenes (clave, nombre) values ('prueba_pv1_' || v_clave, 'Prueba pv1 ' || v_clave) returning id into o;
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    select ur.rol_id, 'cotizaciones.configurar', o, 'todos' from public.usuarios_roles ur where ur.usuario_id = pg_temp.pv1_ana();
    d := pg_temp.pv1_doc(v_clave);
    perform pg_temp.pv1_aplicar(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(d), null, null);
    f := pg_temp.pv1_formula(o);
    select array_agg(clave) into v_niveles from public.cotizaciones_niveles;
    select array_agg(clave) into v_tonos from public.tonos;
    perform public.validar_diseno(f.definicion, f.diseno, coalesce(v_niveles, '{}'), '{}', v_tonos);
    perform pg_temp.pv1_como(pg_temp.pv1_ana());
    set local role authenticated;
    perform public.formula_publicar(p_origen => o, p_nota => 'Plantilla de V1', p_publicada_esperada => null, p_actualizado_en_esperado => f.actualizado_en);
    t := (select x from public.plantillas_tarjeta x where x.origen_id = o and x.estado = 'borrador');
    perform public.plantilla_publicar(o, t.actualizado_en, 'Plantilla de V1');
    reset role;
    if not exists (select 1 from public.formulas x where x.origen_id = o and x.estado = 'publicada') then raise exception '%: sin fórmula publicada', v_clave; end if;
    if not exists (select 1 from public.plantillas_tarjeta x where x.origen_id = o and x.estado = 'publicada' and x.definicion = d -> 'tarjeta') then
      raise exception '%: sin tarjeta publicada', v_clave;
    end if;
  end loop;
end $$;
rollback;

-- @test plantillas de V1: P10 la forma del paquete: falta la tarjeta (hint `paquete.tarjeta`), no es un objeto (`paquete`), un color sin id (`paquete.crear`)
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); p jsonb := pg_temp.pv1_paquete(pg_temp.pv1_doc('usa'));
begin
  perform pg_temp.pv1_igual(pg_temp.pv1_error(pg_temp.pv1_ana(), o, p - 'tarjeta', null, null), '22023|paquete.tarjeta|El paquete está incompleto.');
  perform pg_temp.pv1_igual(pg_temp.pv1_error(pg_temp.pv1_ana(), o, '[]'::jsonb, null, null), '22023|paquete|El paquete está incompleto.');
  perform pg_temp.pv1_igual(pg_temp.pv1_error(pg_temp.pv1_ana(), o, jsonb_set(p, '{nota}', '1'), null, null), '22023|paquete.nota|El paquete está incompleto.');
  perform pg_temp.pv1_igual(
    pg_temp.pv1_error(pg_temp.pv1_ana(), o, jsonb_set(p, '{crear}', '[{"nombre": "V1 x", "hex": "#000000", "clave": "v1_x"}]'), null, null),
    '22023|paquete.crear|El paquete está incompleto.');
  -- El permiso va antes que la forma.
  perform pg_temp.pv1_igual(split_part(pg_temp.pv1_error(pg_temp.pv1_otto(), o, '[]'::jsonb, null, null), '|', 1), '42501');
  if (pg_temp.pv1_formula(o)).id is not null then raise exception 'quedó un borrador'; end if;
end $$;
rollback;

-- @test plantillas de V1: P11 los privilegios: la invocadora corre como quien llama y el ayudante es definer, los dos sin PUBLIC ni anon
reset role;
do $$
declare v_p regprocedure;
begin
  v_p := to_regprocedure('public.cotizacion_paquete_aplicar(uuid,jsonb,timestamptz,timestamptz,uuid)');
  if v_p is null then raise exception 'no existe cotizacion_paquete_aplicar'; end if;
  if (select prosecdef from pg_proc where oid = v_p) then raise exception 'cotizacion_paquete_aplicar tiene que ser invocadora'; end if;
  if not (select prosecdef from pg_proc where oid = 'public._paquete_colores_preparar(jsonb,integer)'::regprocedure) then
    raise exception '_paquete_colores_preparar tiene que ser definer';
  end if;
  if not (select coalesce(proconfig, '{}') @> array['search_path=""'] from pg_proc where oid = v_p) then raise exception 'sin search_path vacío'; end if;
end $$;

-- @test plantillas de V1: P12 sobre una fórmula del origen que no es la de trabajo, escribe sus borradores y la de trabajo no cambia
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); vieja uuid; nueva uuid;
begin
  -- La de trabajo es la más nueva sin archivar: «Nueva». Se aplica a «Vieja».
  insert into public.formulas_del_origen (origen_id, nombre, creado_en) values (o, 'Vieja', now() - interval '1 day') returning id into vieja;
  insert into public.formulas_del_origen (origen_id, nombre) values (o, 'Nueva') returning id into nueva;
  perform pg_temp.pv1_aplicar_en(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('usa')), vieja);
  if not exists (select 1 from public.formulas f where f.formula_del_origen_id = vieja and f.estado = 'borrador') then
    raise exception 'no escribió el borrador de la fórmula elegida';
  end if;
  if not exists (select 1 from public.plantillas_tarjeta p where p.formula_del_origen_id = vieja and p.estado = 'borrador') then
    raise exception 'no escribió el borrador de la tarjeta de la fórmula elegida';
  end if;
  if exists (select 1 from public.formulas f where f.formula_del_origen_id = nueva)
     or exists (select 1 from public.plantillas_tarjeta p where p.formula_del_origen_id = nueva) then
    raise exception 'escribió en la fórmula de trabajo';
  end if;
end $$;
rollback;

-- @test plantillas de V1: P13 sobre una fórmula archivada, 22023; sobre una de otro origen, 42501; nada escrito
begin;
select pg_temp.pv1_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_pv1'); archivada uuid; ajena uuid;
begin
  insert into public.formulas_del_origen (origen_id, nombre, archivada_en) values (o, 'Archivada', now()) returning id into archivada;
  insert into public.formulas_del_origen (origen_id, nombre) values (pg_temp.pv1_otro(), 'Ajena') returning id into ajena;
  perform pg_temp.pv1_igual(pg_temp.pv1_codigo_en(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('usa')), archivada), '22023');
  perform pg_temp.pv1_igual(pg_temp.pv1_codigo_en(pg_temp.pv1_ana(), o, pg_temp.pv1_paquete(pg_temp.pv1_doc('usa')), ajena), '42501');
  if exists (select 1 from public.formulas f where f.formula_del_origen_id in (archivada, ajena))
     or exists (select 1 from public.plantillas_tarjeta p where p.formula_del_origen_id in (archivada, ajena)) then
    raise exception 'escribió en una archivada o de otro origen';
  end if;
end $$;
rollback;
