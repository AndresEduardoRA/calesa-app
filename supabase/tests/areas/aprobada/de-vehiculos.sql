-- `cotizaciones_aprobadas_de_vehiculos()`: el «Costo estimado» de una página del inventario (docs/UX.md › «Vehículos»). No depende de otro archivo
-- (`SOLO=areas/aprobada/de-vehiculos.sql`).
--
-- Qué asegura:
--   A1. Devuelve vehículo, cotización, el monto como texto, la moneda y el nombre del modo de `diseno.cabecera.modos`; sin aprobada, el vehículo no sale.
--   A2. Sin `modo_tc`, con un modo que la versión no tiene o con el monto nulo, ese dato llega nulo y la fila sale igual.
--   A3. La RLS decide: sin `cotizaciones.ver` en el origen de la cotización no sale; «propios» recibe la suya y no la ajena.
--   A4. Quien ve la cotización pero no tiene `cotizaciones.ver` en el origen de la versión recibe la fila con el modo nulo.
--   A5. Más de 100 ids dan 22023; vacío o nulo, cero filas; anon y PUBLIC no la ejecutan.

create or replace function pg_temp.cav_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cav_' || substr(v_id::text, 1, 8), 'AV ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` (que devuelve un jsonb) como esa persona; un error vuelve como `{error, mensaje}`.
create or replace function pg_temp.cav_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
create or replace function pg_temp.cav_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('cav_' || substr(gen_random_uuid()::text, 1, 8), 'AV origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
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

create or replace function pg_temp.cav_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'AV vehículo', 'toyota') returning id into v;
  return v;
end $f$;

-- Una cotización viva de ese vehículo con ese modo; su aprobada se elige al confirmar (`cav_confirmar`).
create or replace function pg_temp.cav_cot(p_quien uuid, e jsonb, p_vehiculo uuid, p_modo text default null) returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 27999.5}', 27999.5, p_modo)
  returning id into v_c;
  return v_c;
end $f$;

-- Fuerza el trigger diferido que elige la aprobada (en un bloque revertido no correría).
create or replace function pg_temp.cav_confirmar() returns void language plpgsql as $f$
begin
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar immediate;
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar deferred;
end $f$;

-- Lo que devuelve como esa persona, por id de vehículo: `{vehiculo: {cotizacion_id, monto, moneda, modo}}` (o `{error, mensaje}`).
create or replace function pg_temp.cav_leer(p_quien uuid, p_ids uuid[]) returns jsonb language sql as $f$
  select pg_temp.cav_corre(p_quien, format(
    'select coalesce(jsonb_object_agg(x.vehiculo_id, jsonb_build_object(''cotizacion_id'', x.cotizacion_id, ''monto'', x.monto, ''moneda'', x.moneda, ''modo'', x.modo)), ''{}'') from public.cotizaciones_aprobadas_de_vehiculos(%L::uuid[]) x',
    p_ids));
$f$;

-- Una hoja exacta de la respuesta (`$."<vehiculo>".<clave>`); nulo si no está o es nula.
create or replace function pg_temp.cav_hoja(r jsonb, p_vehiculo uuid, p_clave text) returns text language sql as $f$
  select jsonb_path_query_first(r, format('$."%s".%s', p_vehiculo, p_clave)::jsonpath) #>> '{}';
$f$;

create or replace function pg_temp.cav_igual(p_que text, p_dio text, p_esperado text) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then
    raise exception '%: dio % y se esperaba %', p_que, p_dio, p_esperado;
  end if;
end $f$;

-- @test aprobadas de vehículos: vehículo, cotización, monto como texto, moneda y el nombre del modo; sin aprobada no sale (A1)
begin;
do $$
declare
  e jsonb := pg_temp.cav_origen(); v1 uuid := pg_temp.cav_vehiculo(e); v2 uuid := pg_temp.cav_vehiculo(e); sin uuid := pg_temp.cav_vehiculo(e);
  jefa uuid := pg_temp.cav_persona(array['cotizaciones.ver']); c1 uuid; c2 uuid; r jsonb;
begin
  c1 := pg_temp.cav_cot(jefa, e, v1, 'unificado'); c2 := pg_temp.cav_cot(jefa, e, v2, 'paralelo');
  perform pg_temp.cav_confirmar();
  r := pg_temp.cav_leer(jefa, array[v1, v2, sin]);
  perform pg_temp.cav_igual('A1 filas', (select count(*)::text from jsonb_object_keys(r)), '2');
  perform pg_temp.cav_igual('A1 cotización', pg_temp.cav_hoja(r, v1, 'cotizacion_id'), c1::text);
  perform pg_temp.cav_igual('A1 monto', pg_temp.cav_hoja(r, v1, 'monto'), (select a.monto::text from public.cotizaciones_aprobadas a where a.vehiculo_id = v1));
  perform pg_temp.cav_igual('A1 monto es texto', jsonb_typeof(jsonb_path_query_first(r, format('$."%s".monto', v1)::jsonpath)), 'string');
  perform pg_temp.cav_igual('A1 moneda', pg_temp.cav_hoja(r, v1, 'moneda'), (select a.moneda from public.cotizaciones_aprobadas a where a.vehiculo_id = v1));
  perform pg_temp.cav_igual('A1 modo', pg_temp.cav_hoja(r, v1, 'modo'), 'Unificado');
  perform pg_temp.cav_igual('A1 otro modo', pg_temp.cav_hoja(r, v2, 'modo'), 'Paralelo');
  perform pg_temp.cav_igual('A1 la otra cotización', pg_temp.cav_hoja(r, v2, 'cotizacion_id'), c2::text);
end $$;
rollback;

-- @test aprobadas de vehículos: sin modo, con un modo que la versión no tiene o con el monto nulo, ese dato es nulo y la fila sale (A2)
begin;
do $$
declare
  e jsonb := pg_temp.cav_origen(); v1 uuid := pg_temp.cav_vehiculo(e); v2 uuid := pg_temp.cav_vehiculo(e); v3 uuid := pg_temp.cav_vehiculo(e);
  jefa uuid := pg_temp.cav_persona(array['cotizaciones.ver']); r jsonb;
begin
  perform pg_temp.cav_cot(jefa, e, v1); perform pg_temp.cav_cot(jefa, e, v2, 'otro'); perform pg_temp.cav_cot(jefa, e, v3, 'unificado');
  perform pg_temp.cav_confirmar();
  update public.cotizaciones_aprobadas set monto = null where vehiculo_id = v3;
  r := pg_temp.cav_leer(jefa, array[v1, v2, v3]);
  perform pg_temp.cav_igual('A2 filas', (select count(*)::text from jsonb_object_keys(r)), '3');
  perform pg_temp.cav_igual('A2 sin modo', pg_temp.cav_hoja(r, v1, 'modo'), null);
  perform pg_temp.cav_igual('A2 modo que no está', pg_temp.cav_hoja(r, v2, 'modo'), null);
  perform pg_temp.cav_igual('A2 monto nulo', pg_temp.cav_hoja(r, v3, 'monto'), null);
  perform pg_temp.cav_igual('A2 monto nulo con su modo', pg_temp.cav_hoja(r, v3, 'modo'), 'Unificado');
end $$;
rollback;

-- @test aprobadas de vehículos: sin ver el origen de la cotización no sale; «propios» recibe la suya y no la ajena (A3)
begin;
do $$
declare
  e jsonb := pg_temp.cav_origen(); otro jsonb := pg_temp.cav_origen(); v1 uuid := pg_temp.cav_vehiculo(e); v2 uuid := pg_temp.cav_vehiculo(e);
  jefa uuid := pg_temp.cav_persona(array['cotizaciones.ver']); ana uuid := pg_temp.cav_persona(array['cotizaciones.ver:propios']);
  ajena uuid := pg_temp.cav_persona(array[]::text[]); rol uuid; r jsonb;
begin
  select ur.rol_id into rol from public.usuarios_roles ur where ur.usuario_id = ajena;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (rol, 'cotizaciones.ver', (otro ->> 'o')::uuid, 'todos');
  perform pg_temp.cav_cot(jefa, e, v1, 'unificado'); perform pg_temp.cav_cot(ana, e, v2, 'unificado');
  perform pg_temp.cav_confirmar();
  perform pg_temp.cav_igual('A3 sin el origen', pg_temp.cav_leer(ajena, array[v1, v2])::text, '{}');
  r := pg_temp.cav_leer(ana, array[v1, v2]);
  perform pg_temp.cav_igual('A3 propios: filas', (select count(*)::text from jsonb_object_keys(r)), '1');
  perform pg_temp.cav_igual('A3 propios: la suya con su modo', pg_temp.cav_hoja(r, v2, 'modo'), 'Unificado');
end $$;
rollback;

-- @test aprobadas de vehículos: quien ve la cotización sin `cotizaciones.ver` en el origen de la versión recibe la fila sin modo (A4)
begin;
do $$
declare
  e jsonb := pg_temp.cav_origen(); otro jsonb := pg_temp.cav_origen(); v uuid := pg_temp.cav_vehiculo(e);
  jefa uuid := pg_temp.cav_persona(array['cotizaciones.ver']); mira uuid := pg_temp.cav_persona(array[]::text[]); rol uuid; c uuid; r jsonb;
begin
  select ur.rol_id into rol from public.usuarios_roles ur where ur.usuario_id = mira;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (rol, 'cotizaciones.ver', (e ->> 'o')::uuid, 'todos');
  -- La cotización es del origen que ve, pero con la versión de otro origen (en el que no tiene `cotizaciones.ver`).
  c := pg_temp.cav_cot(jefa, e, v, 'unificado');
  update public.cotizaciones set formula_id = (otro ->> 'f')::uuid where id = c;
  perform pg_temp.cav_confirmar();
  r := pg_temp.cav_leer(mira, array[v]);
  perform pg_temp.cav_igual('A4 la fila sale', pg_temp.cav_hoja(r, v, 'cotizacion_id'), c::text);
  perform pg_temp.cav_igual('A4 sin modo', pg_temp.cav_hoja(r, v, 'modo'), null);
  perform pg_temp.cav_igual('A4 la jefa sí lo ve', pg_temp.cav_hoja(pg_temp.cav_leer(jefa, array[v]), v, 'modo'), 'Unificado');
end $$;
rollback;

-- @test aprobadas de vehículos: más de 100 ids dan 22023, vacío o nulo cero filas, y anon y PUBLIC no la ejecutan (A5)
begin;
do $$
declare jefa uuid := pg_temp.cav_persona(array['cotizaciones.ver']); r jsonb; ids uuid[];
begin
  select array_agg(gen_random_uuid()) into ids from generate_series(1, 101);
  r := pg_temp.cav_leer(jefa, ids);
  perform pg_temp.cav_igual('A5 101 ids', r ->> 'error', '22023');
  perform pg_temp.cav_igual('A5 100 ids', pg_temp.cav_leer(jefa, ids[1:100])::text, '{}');
  perform pg_temp.cav_igual('A5 vacío', pg_temp.cav_leer(jefa, '{}'::uuid[])::text, '{}');
  perform pg_temp.cav_igual('A5 nulo', pg_temp.cav_leer(jefa, null)::text, '{}');
  if has_function_privilege('anon', 'public.cotizaciones_aprobadas_de_vehiculos(uuid[])', 'execute')
     or has_function_privilege('public', 'public.cotizaciones_aprobadas_de_vehiculos(uuid[])', 'execute') then
    raise exception 'A5: anon o PUBLIC la ejecutan';
  end if;
end $$;
rollback;
