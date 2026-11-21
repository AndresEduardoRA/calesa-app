-- `cotizaciones_de_este_vehiculo()` y `_nombre_del_modo()`: el bloque «De este vehículo» (docs/UX.md › «Cotización guardada»). No depende de otro
-- archivo (`SOLO=areas/aprobada/de-este-vehiculo.sql`).
--
-- Qué asegura:
--   D1. La primera página trae la aprobada `fijada` primero y la página en orden (creado_en desc, id desc); con cursor no hay fijada.
--   D2. Con una página de 1 la aprobada llega igual; el cursor no repite ni saltea; el tamaño se acota a 100 + 1.
--   D3. La RLS decide: «propios» ve sólo las suyas (ni la fijada ajena), sin el origen no ve nada, la papelera no sale (ni fijada).
--   D4. La vigencia coincide con `cotizaciones_listado()`; el modo sale con su nombre sin `configurar`, y nulo sin modo.
--   D5. `_nombre_del_modo()` da nulo para un borrador, una versión inexistente o sin `cotizaciones.ver` del origen; anon no ejecuta ninguna.
--   D6. Un cursor incompleto da 22023.

create or replace function pg_temp.dv_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('dv_' || substr(v_id::text, 1, 8), 'DV ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` (que devuelve un jsonb) como esa persona; un error vuelve como `{error, mensaje}`.
create or replace function pg_temp.dv_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return coalesce(v, '[]'::jsonb);
end $f$;

-- Un origen con su fórmula publicada, con dos modos de tipo de cambio en la cabecera.
create or replace function pg_temp.dv_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('dv_' || substr(gen_random_uuid()::text, 1, 8), 'DV origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))),
          '{}', jsonb_build_object('cabecera', jsonb_build_object('modos', jsonb_build_array(
            jsonb_build_object('clave', 'unificado', 'nombre', 'Unificado'), jsonb_build_object('clave', 'paralelo', 'nombre', 'Paralelo')))),
          jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

create or replace function pg_temp.dv_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'DV vehículo', 'toyota') returning id into v;
  return v;
end $f$;

-- Una cotización viva creada hace p_min minutos, con ese modo.
create or replace function pg_temp.dv_cot(p_quien uuid, e jsonb, p_vehiculo uuid, p_min integer, p_modo text default null) returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, creado_en)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10, p_modo,
          now() - make_interval(mins => p_min))
  returning id into v_c;
  return v_c;
end $f$;

-- Fuerza el trigger diferido que elige la aprobada (en un bloque revertido no correría).
create or replace function pg_temp.dv_confirmar() returns void language plpgsql as $f$
begin
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar immediate;
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar deferred;
end $f$;

-- Una página como esa persona: las filas en el orden en que llegan.
create or replace function pg_temp.dv_pagina(p_quien uuid, p_v uuid, p_tamano integer, p_en timestamptz default null, p_id uuid default null) returns jsonb language sql as $f$
  select pg_temp.dv_corre(p_quien, format(
    'select coalesce(jsonb_agg(to_jsonb(x)), ''[]'') from public.cotizaciones_de_este_vehiculo(%L, %s, %L, %L) x', p_v, p_tamano, p_en, p_id));
$f$;

-- Los ids de una página, con un «*» delante de la fijada.
create or replace function pg_temp.dv_ids(p jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(case when (r ->> 'fijada')::boolean then '*' else '' end || (r ->> 'id') order by o), '{}')
    from jsonb_array_elements(p) with ordinality x (r, o);
$f$;

-- El nombre del modo como esa persona (nulo si no lo da).
create or replace function pg_temp.dv_modo(p_quien uuid, p_formula uuid, p_clave text) returns text language sql as $f$
  select pg_temp.dv_corre(p_quien, format('select jsonb_build_object(''n'', public._nombre_del_modo(%L, %L))', p_formula, p_clave)) ->> 'n';
$f$;

create or replace function pg_temp.dv_igual(p_que text, p_dio text[], p_esperado text[]) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then
    raise exception '%: dio % y se esperaba %', p_que, p_dio, p_esperado;
  end if;
end $f$;

-- @test de este vehículo: la aprobada fijada primero y la página en orden; con cursor no hay fijada (D1)
begin;
do $$
declare
  e jsonb := pg_temp.dv_origen(); v uuid := pg_temp.dv_vehiculo(e); jefa uuid := pg_temp.dv_persona(array['cotizaciones.ver']);
  c1 uuid; c2 uuid; c3 uuid; p jsonb;
begin
  c1 := pg_temp.dv_cot(jefa, e, v, 30); c2 := pg_temp.dv_cot(jefa, e, v, 20); c3 := pg_temp.dv_cot(jefa, e, v, 10);
  perform pg_temp.dv_confirmar();
  p := pg_temp.dv_pagina(jefa, v, 10);
  perform pg_temp.dv_igual('primera página', pg_temp.dv_ids(p), array['*' || c1, c3::text, c2::text, c1::text]);
  if not (p -> 0 ->> 'aprobada')::boolean or not (p -> 3 ->> 'aprobada')::boolean or (p -> 1 ->> 'aprobada')::boolean then
    raise exception 'D1: la marca de la aprobada no es la de la base: %', p;
  end if;
  if p -> 1 ->> 'editada_en' is null or p -> 1 ->> 'autor' is null or p -> 1 ->> 'origen' not like 'DV origen %' then
    raise exception 'D1: faltan la versión, el autor o el origen: %', p -> 1;
  end if;
  p := pg_temp.dv_pagina(jefa, v, 10, (select creado_en from public.cotizaciones where id = c3), c3);
  perform pg_temp.dv_igual('con cursor', pg_temp.dv_ids(p), array[c2::text, c1::text]);
end $$;
rollback;

-- @test de este vehículo: con una página de 1 la aprobada llega igual, el cursor no repite ni saltea y el tamaño se acota a 100 + 1 (D2)
begin;
do $$
declare
  e jsonb := pg_temp.dv_origen(); v uuid := pg_temp.dv_vehiculo(e); jefa uuid := pg_temp.dv_persona(array['cotizaciones.ver']);
  c1 uuid; c2 uuid; c3 uuid; p jsonb; vistos text[] := '{}'; v_en timestamptz; v_id uuid; vueltas integer := 0;
begin
  c1 := pg_temp.dv_cot(jefa, e, v, 30); c2 := pg_temp.dv_cot(jefa, e, v, 20); c3 := pg_temp.dv_cot(jefa, e, v, 10);
  perform pg_temp.dv_confirmar();
  p := pg_temp.dv_pagina(jefa, v, 1);
  perform pg_temp.dv_igual('página de 1', pg_temp.dv_ids(p), array['*' || c1, c3::text, c2::text]);
  -- Recorrer de a 1 (la fila de más dice que hay otra): cada una una vez y en orden.
  loop
    vueltas := vueltas + 1;
    p := pg_temp.dv_pagina(jefa, v, 1, v_en, v_id);
    p := coalesce((select jsonb_agg(r order by o) from jsonb_array_elements(p) with ordinality x (r, o) where not (r ->> 'fijada')::boolean), '[]');
    exit when jsonb_array_length(p) = 0;
    vistos := vistos || (p -> 0 ->> 'id');
    v_en := (p -> 0 ->> 'creado_en')::timestamptz; v_id := (p -> 0 ->> 'id')::uuid;
    exit when jsonb_array_length(p) < 2 or vueltas > 10;
  end loop;
  perform pg_temp.dv_igual('recorrido por cursor', vistos, array[c3::text, c2::text, c1::text]);
  -- El tamaño: 105 más, y un pedido de 1000 da 101 de la página y la fijada.
  perform pg_temp.dv_cot(jefa, e, v, 40 + g) from generate_series(1, 105) g;
  p := pg_temp.dv_pagina(jefa, v, 1000);
  if jsonb_array_length(p) <> 102 then raise exception 'D2: el tope dio % filas', jsonb_array_length(p); end if;
end $$;
rollback;

-- @test de este vehículo: «propios» ve sólo las suyas (ni la fijada ajena), sin el origen nada, y la papelera no sale ni fijada (D3)
begin;
do $$
declare
  e jsonb := pg_temp.dv_origen(); otro jsonb := pg_temp.dv_origen(); v uuid := pg_temp.dv_vehiculo(e);
  jefa uuid := pg_temp.dv_persona(array['cotizaciones.ver']); ana uuid := pg_temp.dv_persona(array['cotizaciones.ver:propios']);
  ajena uuid := pg_temp.dv_persona(array[]::text[]); rol uuid; c1 uuid; c2 uuid; c3 uuid;
begin
  select ur.rol_id into rol from public.usuarios_roles ur where ur.usuario_id = ajena;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (rol, 'cotizaciones.ver', (otro ->> 'o')::uuid, 'todos');
  c1 := pg_temp.dv_cot(jefa, e, v, 30); c2 := pg_temp.dv_cot(ana, e, v, 20); c3 := pg_temp.dv_cot(jefa, e, v, 10);
  perform pg_temp.dv_confirmar();
  perform pg_temp.dv_igual('propios', pg_temp.dv_ids(pg_temp.dv_pagina(ana, v, 10)), array[c2::text]);
  perform pg_temp.dv_igual('sin el origen', pg_temp.dv_ids(pg_temp.dv_pagina(ajena, v, 10)), '{}'::text[]);
  -- La aprobada a la papelera, sin que el trigger la releve todavía: no sale, ni fijada ni en la página.
  update public.cotizaciones set eliminado_en = now() where id = c1;
  perform pg_temp.dv_igual('papelera', pg_temp.dv_ids(pg_temp.dv_pagina(jefa, v, 10)), array[c3::text, c2::text]);
end $$;
rollback;

-- @test de este vehículo: la vigencia es la del listado y el modo sale con su nombre sin `configurar`; sin modo, nulo (D4)
begin;
do $$
declare
  e jsonb := pg_temp.dv_origen(); v uuid := pg_temp.dv_vehiculo(e); jefa uuid := pg_temp.dv_persona(array['cotizaciones.ver']);
  c1 uuid; c2 uuid; p jsonb; l jsonb;
begin
  c1 := pg_temp.dv_cot(jefa, e, v, 60 * 24 * 400, 'paralelo'); c2 := pg_temp.dv_cot(jefa, e, v, 10);
  perform pg_temp.dv_confirmar();
  p := pg_temp.dv_corre(jefa, format('select jsonb_object_agg(x.id, jsonb_build_array(x.vencida, x.vence_el)) from public.cotizaciones_de_este_vehiculo(%L, 10) x where not x.fijada', v));
  l := pg_temp.dv_corre(jefa, format('select jsonb_object_agg(x.id, jsonb_build_array(x.vencida, x.vence_el)) from public.cotizaciones_listado(p_tamano := 10, p_vehiculo := %L) x', v));
  if p is distinct from l or not (p -> c1::text ->> 0)::boolean or (p -> c2::text ->> 0)::boolean then
    raise exception 'D4: la vigencia no es la del listado: % contra %', p, l;
  end if;
  p := pg_temp.dv_corre(jefa, format('select jsonb_object_agg(x.id, x.modo) from public.cotizaciones_de_este_vehiculo(%L, 10) x where not x.fijada', v));
  if p ->> c1::text is distinct from 'Paralelo' or p -> c2::text <> 'null'::jsonb then
    raise exception 'D4: el modo no es el de la fórmula: %', p;
  end if;
end $$;
rollback;

-- @test de este vehículo: `_nombre_del_modo()` es nulo para un borrador, una versión inexistente o sin ver el origen; anon no ejecuta ninguna (D5)
begin;
do $$
declare
  e jsonb := pg_temp.dv_origen(); otro jsonb := pg_temp.dv_origen(); jefa uuid := pg_temp.dv_persona(array['cotizaciones.ver']);
  ajena uuid := pg_temp.dv_persona(array[]::text[]); rol uuid; borrador uuid;
begin
  select ur.rol_id into rol from public.usuarios_roles ur where ur.usuario_id = ajena;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (rol, 'cotizaciones.ver', (otro ->> 'o')::uuid, 'todos');
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  select f.origen_id, 2, 'borrador', f.definicion, f.params, f.diseno, f.visibilidad from public.formulas f where f.id = (e ->> 'f')::uuid
  returning id into borrador;
  perform pg_temp.dv_igual('la publicada', array[pg_temp.dv_modo(jefa, (e ->> 'f')::uuid, 'unificado')], array['Unificado']);
  perform pg_temp.dv_igual('un modo que no está', array[pg_temp.dv_modo(jefa, (e ->> 'f')::uuid, 'otro')], array[null]);
  perform pg_temp.dv_igual('el borrador', array[pg_temp.dv_modo(jefa, (borrador)::uuid, 'unificado')], array[null]);
  perform pg_temp.dv_igual('inexistente', array[pg_temp.dv_modo(jefa, gen_random_uuid(), 'unificado')], array[null]);
  perform pg_temp.dv_igual('sin ver el origen', array[pg_temp.dv_modo(ajena, (e ->> 'f')::uuid, 'unificado')], array[null]);
  if has_function_privilege('anon', 'public._nombre_del_modo(uuid, text)', 'execute')
     or has_function_privilege('anon', 'public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid)', 'execute') then
    raise exception 'D5: anon ejecuta una de las dos';
  end if;
end $$;
rollback;

-- @test de este vehículo: un cursor incompleto da 22023 (D6)
begin;
do $$
declare jefa uuid := pg_temp.dv_persona(array['cotizaciones.ver']); r jsonb;
begin
  r := pg_temp.dv_pagina(jefa, gen_random_uuid(), 10, now(), null);
  if r ->> 'error' is distinct from '22023' then raise exception 'D6: dio %', r; end if;
end $$;
rollback;
