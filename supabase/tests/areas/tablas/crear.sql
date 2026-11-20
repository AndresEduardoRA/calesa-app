-- Crear una tabla de referencia (`tabla_referencia_crear()`): la clave que sale del nombre, las columnas normalizadas, el intento idempotente, los
-- choques de clave (también con una desactivada y con una compartida activa), el tope de 100 por origen, los permisos y los privilegios.
-- docs/COTIZADOR.md › «Crear, columnas y desactivar». Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno con
-- `tc_preparar()` en su transacción y la revierte.

-- @test tablas crear: los ayudantes
reset role;
create or replace function pg_temp.tc_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Una persona con un rol propio; cada concesión es {clave, origen} (origen nulo: todos). Si corre sola, la primera cuenta nace dueña: se le deja sólo
-- su rol.
create or replace function pg_temp.tc_persona(p_id uuid, p_nombre text, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre, invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('tc_' || substr(p_id::text, 25, 12), 'TC ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c ->> 'clave', (c ->> 'origen')::uuid, 'todos');
  end loop;
end $f$;

-- El terreno: los orígenes `prueba_tc` («Prueba tc») y `prueba_tc2` («Prueba tc dos»). Las personas:
--   a  configura `prueba_tc`          b  configura `prueba_tc2`
--   v  sólo ve `prueba_tc`            g  configura todos los orígenes
create or replace function pg_temp.tc_preparar() returns void language plpgsql as $f$
declare o uuid; o2 uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_tc', 'Prueba tc') returning id into o;
  insert into public.origenes (clave, nombre) values ('prueba_tc2', 'Prueba tc dos') returning id into o2;
  perform pg_temp.tc_persona('00000000-0000-4000-8000-00000000c00a', 'Ana Tc', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o)));
  perform pg_temp.tc_persona('00000000-0000-4000-8000-00000000c00b', 'Beto Tc', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
  perform pg_temp.tc_persona('00000000-0000-4000-8000-00000000c00d', 'Vera Tc', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o)));
  perform pg_temp.tc_persona('00000000-0000-4000-8000-00000000c00e', 'Gala Tc', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', null)));
end $f$;

create or replace function pg_temp.tc_origen(p_clave text) returns uuid language sql as $f$ select id from public.origenes where clave = p_clave $f$;

create or replace function pg_temp.tc_sql(p_id uuid, p_origen uuid, p_nombre text, p_columnas jsonb) returns text language sql as $f$
  select format('select public.tabla_referencia_crear(%L, %L, %L, %L)', p_id, p_origen, p_nombre, p_columnas)
$f$;

-- «sqlstate|mensaje|hint» de un SQL corrido como esa persona, o «sin error».
create or replace function pg_temp.tc_error(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_m text; v_h text;
begin
  perform pg_temp.tc_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
  return sqlstate || '|' || v_m || '|' || coalesce(v_h, '');
end $f$;

create or replace function pg_temp.tc_crear(p_quien uuid, p_id uuid, p_origen uuid, p_nombre text, p_columnas jsonb) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.tc_como(p_quien);
  set local role authenticated;
  r := public.tabla_referencia_crear(p_id, p_origen, p_nombre, p_columnas);
  reset role;
  return r;
end $f$;

create or replace function pg_temp.tc_igual(p_dio text, p_esperado text) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then raise exception 'esperaba «%», dio «%»', p_esperado, p_dio; end if;
end $f$;

create or replace function pg_temp.tc_dos() returns jsonb language sql as $f$
  select '[{"clave":"pais","etiqueta":"País","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]'::jsonb
$f$;

-- @test tablas crear: una propia nace en la versión 1, sin nota ni autor, con las columnas recortadas, la clave del nombre y una actividad sin columnas
begin;
select pg_temp.tc_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000c00a'; o uuid := pg_temp.tc_origen('prueba_tc'); r jsonb; t public.tablas_referencia; v_act jsonb;
begin
  r := pg_temp.tc_crear(a, '00000000-0000-4000-8000-0000000c0001', o, '  Fletes USA ',
    '[{"clave":"puerto","etiqueta":"  Puerto ","tipo":"texto","otra":1},{"clave":"monto","etiqueta":"Monto","tipo":"numero"},{"clave":"anio","etiqueta":"Año","tipo":"anio"}]');
  perform pg_temp.tc_igual(r::text, '{"id": "00000000-0000-4000-8000-0000000c0001", "clave": "fletes_usa", "version": 1, "repetido": false}');
  select * into t from public.tablas_referencia where id = '00000000-0000-4000-8000-0000000c0001';
  perform pg_temp.tc_igual(t.origen_id::text, o::text);
  perform pg_temp.tc_igual(t.nombre, 'Fletes USA');
  perform pg_temp.tc_igual(t.version::text, '1');
  perform pg_temp.tc_igual(coalesce(t.nota, '∅') || coalesce(t.publicado_por::text, '∅') || coalesce(t.publicado_en::text, '∅'), '∅∅∅');
  perform pg_temp.tc_igual(t.activa::text, 'true');
  perform pg_temp.tc_igual(t.columnas::text,
    '[{"tipo": "texto", "clave": "puerto", "etiqueta": "Puerto"}, {"tipo": "numero", "clave": "monto", "etiqueta": "Monto"}, {"tipo": "anio", "clave": "anio", "etiqueta": "Año"}]');
  perform pg_temp.tc_igual((select count(*)::text from public.tablas_referencia_filas where tabla_id = t.id), '0');
  select a2.despues into v_act from public.actividad a2 where a2.accion = 'tabla_referencia.creada' and a2.registro_id = t.id::text;
  perform pg_temp.tc_igual(v_act::text, jsonb_build_object('clave', 'fletes_usa', 'nombre', 'Fletes USA', 'origen_id', o, 'cuantas_columnas', 3)::text);
  -- Un nombre que empieza con un dígito, con acentos en las dos cajas y signos.
  r := pg_temp.tc_crear(a, '00000000-0000-4000-8000-0000000c0002', o, '2024 tarifas', pg_temp.tc_dos());
  perform pg_temp.tc_igual(r ->> 'clave', 't_2024_tarifas');
  r := pg_temp.tc_crear(a, '00000000-0000-4000-8000-0000000c0003', o, 'ÁRBOL ñandú / Año—fiscal', pg_temp.tc_dos());
  perform pg_temp.tc_igual(r ->> 'clave', 'arbol_nandu_ano_fiscal');
  -- El nombre que no deja dos letras o números.
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, '¡!', pg_temp.tc_dos())),
    '22023|El nombre de la tabla necesita al menos dos letras o números.|nombre');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, '   ', pg_temp.tc_dos())), '22023|La tabla necesita un nombre.|nombre');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, repeat('a', 81), pg_temp.tc_dos())), '22023|El nombre pasa de 80 letras.|nombre');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(null, o, 'Sin intento', pg_temp.tc_dos())), '22023|Falta el identificador del intento.|');
end $$;
rollback;

-- @test tablas crear: repetir el intento devuelve la misma tabla con «repetido» y deja una sola fila; en otro destino no delata la fila
begin;
select pg_temp.tc_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000c00a'; g uuid := '00000000-0000-4000-8000-00000000c00e'; o uuid := pg_temp.tc_origen('prueba_tc'); r jsonb;
begin
  r := pg_temp.tc_crear(a, '00000000-0000-4000-8000-0000000c0011', o, 'Fletes', pg_temp.tc_dos());
  r := pg_temp.tc_crear(a, '00000000-0000-4000-8000-0000000c0011', o, 'Fletes', pg_temp.tc_dos());
  perform pg_temp.tc_igual(r::text, '{"id": "00000000-0000-4000-8000-0000000c0011", "clave": "fletes", "version": 1, "repetido": true}');
  perform pg_temp.tc_igual((select count(*)::text from public.tablas_referencia where clave = 'fletes' and origen_id = o), '1');
  perform pg_temp.tc_igual((select count(*)::text from public.actividad where accion = 'tabla_referencia.creada' and registro_id = '00000000-0000-4000-8000-0000000c0011'), '1');
  perform pg_temp.tc_igual(pg_temp.tc_error(g, pg_temp.tc_sql('00000000-0000-4000-8000-0000000c0011', null, 'Fletes', pg_temp.tc_dos())),
    '42501|No tienes el permiso «cotizaciones.configurar».|');
end $$;
rollback;

-- @test tablas crear: los choques de clave (activa, desactivada, propia contra compartida activa, compartida contra compartida) y lo que sí se crea
begin;
select pg_temp.tc_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000c00a'; b uuid := '00000000-0000-4000-8000-00000000c00b'; g uuid := '00000000-0000-4000-8000-00000000c00e';
        o uuid := pg_temp.tc_origen('prueba_tc'); o2 uuid := pg_temp.tc_origen('prueba_tc2'); r jsonb;
begin
  r := pg_temp.tc_crear(a, gen_random_uuid(), o, 'Tc fletes', pg_temp.tc_dos());
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'TC Fletes', pg_temp.tc_dos())),
    '23505|Ya hay una tabla con la clave «tc_fletes»: elige otro nombre.|nombre');
  update public.tablas_referencia set activa = false where clave = 'tc_fletes';
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc fletes', pg_temp.tc_dos())),
    '23505|Ya hay una tabla con la clave «tc_fletes» (desactivada): elige otro nombre.|nombre');
  -- La misma clave en otro origen sí se crea.
  r := pg_temp.tc_crear(b, gen_random_uuid(), o2, 'Tc fletes', pg_temp.tc_dos());
  perform pg_temp.tc_igual(r ->> 'repetido', 'false');
  -- Una compartida con la clave de una propia de algún origen sí se crea (ese origen la ve tapada).
  r := pg_temp.tc_crear(a, gen_random_uuid(), null, 'Tc fletes', pg_temp.tc_dos());
  perform pg_temp.tc_igual((select origen_id is null from public.tablas_referencia where id = (r ->> 'id')::uuid)::text, 'true');
  -- Compartida contra compartida.
  perform pg_temp.tc_igual(pg_temp.tc_error(g, pg_temp.tc_sql(gen_random_uuid(), null, 'Tc fletes', pg_temp.tc_dos())),
    '23505|Ya hay una tabla con la clave «tc_fletes»: elige otro nombre.|nombre');
  -- Una propia con la clave de una compartida activa no; con la de una compartida desactivada, sí.
  r := pg_temp.tc_crear(g, gen_random_uuid(), null, 'Tc seguros', pg_temp.tc_dos());
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc seguros', pg_temp.tc_dos())),
    '23505|Ya hay una tabla compartida con la clave «tc_seguros»: elige otro nombre.|nombre');
  update public.tablas_referencia set activa = false where clave = 'tc_seguros' and origen_id is null;
  r := pg_temp.tc_crear(a, gen_random_uuid(), o, 'Tc seguros', pg_temp.tc_dos());
  perform pg_temp.tc_igual(r ->> 'clave', 'tc_seguros');
end $$;
rollback;

-- @test tablas crear: cada rechazo de las columnas con su camino exacto, y el tipo raro sin columnas de antes
begin;
select pg_temp.tc_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000c00a'; o uuid := pg_temp.tc_origen('prueba_tc'); v_veintiuna jsonb;
begin
  select jsonb_agg(jsonb_build_object('clave', 'c' || i, 'etiqueta', 'C' || i, 'tipo', 'numero')) into v_veintiuna from generate_series(1, 21) i;
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', '[]')), '22023|Una tabla tiene de 1 a 20 columnas.|columnas');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', '{}')), '22023|Una tabla tiene de 1 a 20 columnas.|columnas');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', v_veintiuna)), '22023|Una tabla tiene de 1 a 20 columnas.|columnas');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', '[{"clave":"a","etiqueta":"A","tipo":"texto"}, 3]')),
    '22023|La columna 2: no es una columna.|columnas.1');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', '[{"clave":"Año","etiqueta":"A","tipo":"texto"}]')),
    '22023|La columna 1: la clave va en minúsculas, sin espacios ni acentos, y empieza con una letra.|columnas.0.clave');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', '[{"clave":"1a","etiqueta":"A","tipo":"texto"}]')),
    '22023|La columna 1: la clave va en minúsculas, sin espacios ni acentos, y empieza con una letra.|columnas.0.clave');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', '[{"clave":"a","etiqueta":"A","tipo":"texto"},{"clave":"a","etiqueta":"B","tipo":"texto"}]')),
    '22023|La columna 2: ya hay otra con la clave «a».|columnas.1.clave');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', '[{"clave":"a","etiqueta":"   ","tipo":"texto"}]')),
    '22023|La columna 1: le falta el nombre.|columnas.0.etiqueta');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', jsonb_build_array(jsonb_build_object('clave', 'a', 'etiqueta', repeat('ñ', 61), 'tipo', 'texto')))),
    '22023|La columna 1: el nombre pasa de 60 letras.|columnas.0.etiqueta');
  -- 60 puntos de código entran aunque pasen de 60 bytes.
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc sesenta', jsonb_build_array(jsonb_build_object('clave', 'a', 'etiqueta', repeat('ñ', 60), 'tipo', 'texto')))),
    'sin error');
  -- Repetida sin distinguir mayúsculas ASCII; con acentos en otra caja son distintas.
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', '[{"clave":"a","etiqueta":"Monto","tipo":"texto"},{"clave":"b","etiqueta":" MONTO ","tipo":"texto"}]')),
    '22023|La columna 2: ya hay otra «MONTO».|columnas.1.etiqueta');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc año', '[{"clave":"a","etiqueta":"Año","tipo":"texto"},{"clave":"b","etiqueta":"AÑO","tipo":"texto"}]')),
    'sin error');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', '[{"clave":"a","etiqueta":"A","tipo":"moneda"}]')),
    '22023|La columna 1: el tipo es número, año o texto.|columnas.0.tipo');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', '[{"clave":"a","etiqueta":"A"}]')),
    '22023|La columna 1: el tipo es número, año o texto.|columnas.0.tipo');
end $$;
rollback;

-- @test tablas crear: el tope de 100 tablas que recibe un origen, para una propia y para una compartida, con el nombre del origen
begin;
select pg_temp.tc_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000c00a'; o uuid := pg_temp.tc_origen('prueba_tc'); v_hay int; r jsonb;
begin
  select count(*) into v_hay from public.tablas_referencia where activa and (origen_id = o or origen_id is null);
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
  select o, 'tc_tope_' || i, 'Tope ' || i, pg_temp.tc_dos() from generate_series(1, 99 - v_hay) i;
  -- 99: entra una más.
  r := pg_temp.tc_crear(a, gen_random_uuid(), o, 'Tc la cien', pg_temp.tc_dos());
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc otra', pg_temp.tc_dos())),
    '22023|Prueba tc ya recibe 100 tablas, que es el máximo: desactiva una que ninguna fórmula use.|nombre');
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), null, 'Tc otra', pg_temp.tc_dos())),
    '22023|Prueba tc ya recibe 100 tablas, que es el máximo: desactiva una que ninguna fórmula use.|nombre');
  -- Una desactivada no cuenta.
  update public.tablas_referencia set activa = false where clave = 'tc_la_cien';
  r := pg_temp.tc_crear(a, gen_random_uuid(), o, 'Tc otra', pg_temp.tc_dos());
  perform pg_temp.tc_igual(r ->> 'clave', 'tc_otra');
end $$;
rollback;

-- @test tablas crear: sin «cotizaciones.configurar» del origen, o de ningún origen para una compartida, 42501; un origen que no existe, 22023
begin;
select pg_temp.tc_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000c00a'; b uuid := '00000000-0000-4000-8000-00000000c00b'; v uuid := '00000000-0000-4000-8000-00000000c00d';
        g uuid := '00000000-0000-4000-8000-00000000c00e'; o uuid := pg_temp.tc_origen('prueba_tc'); c_no constant text := '42501|No tienes el permiso «cotizaciones.configurar».|';
begin
  perform pg_temp.tc_igual(pg_temp.tc_error(b, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', pg_temp.tc_dos())), c_no);
  perform pg_temp.tc_igual(pg_temp.tc_error(v, pg_temp.tc_sql(gen_random_uuid(), o, 'Tc x', pg_temp.tc_dos())), c_no);
  perform pg_temp.tc_igual(pg_temp.tc_error(v, pg_temp.tc_sql(gen_random_uuid(), null, 'Tc x', pg_temp.tc_dos())), c_no);
  -- El permiso va antes que el nombre y las columnas.
  perform pg_temp.tc_igual(pg_temp.tc_error(v, pg_temp.tc_sql(gen_random_uuid(), o, '', '[]')), c_no);
  -- Con una concesión de todos los orígenes, un origen que no existe no cae en la FK cruda.
  perform pg_temp.tc_igual(pg_temp.tc_error(g, pg_temp.tc_sql(gen_random_uuid(), gen_random_uuid(), 'Tc x', pg_temp.tc_dos())), '22023|Ese origen no existe.|origen');
  -- Sin concesión de todos, un origen que no existe es un origen sin permiso.
  perform pg_temp.tc_igual(pg_temp.tc_error(a, pg_temp.tc_sql(gen_random_uuid(), gen_random_uuid(), 'Tc x', pg_temp.tc_dos())), c_no);
  perform pg_temp.tc_igual((select count(*)::text from public.tablas_referencia where clave = 'tc_x'), '0');
end $$;
rollback;

-- @test tablas crear: authenticated ejecuta las tres RPC y anon y PUBLIC no; las RPC y sus ayudantes corren como su dueño (prosecdef) con search_path vacío, y
-- los ayudantes no los ejecuta authenticated
do $$
declare f text; v_def boolean; v_cfg text[];
begin
  foreach f in array array['public.tabla_referencia_crear(uuid,uuid,text,jsonb)', 'public.tabla_referencia_columnas(uuid,jsonb,integer)',
                           'public.tabla_referencia_desactivar(uuid,integer)'] loop
    if not has_function_privilege('authenticated', f, 'execute') then raise exception '% no la ejecuta authenticated', f; end if;
    if has_function_privilege('anon', f, 'execute') then raise exception '% la ejecuta anon', f; end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
                where p.oid = f::regprocedure and x.grantee = 0) then
      raise exception '% la ejecuta PUBLIC', f;
    end if;
  end loop;
  foreach f in array array['public.tabla_referencia_crear(uuid,uuid,text,jsonb)', 'public.tabla_referencia_columnas(uuid,jsonb,integer)',
                           'public.tabla_referencia_desactivar(uuid,integer)', 'public._tabla_referencia_clave(text)',
                           'public._tabla_referencia_columnas_validas(jsonb,jsonb)', 'public._tabla_referencia_usos(uuid)',
                           'public._tabla_referencia_frase_de_usos(uuid,text[])', 'public._tabla_referencia_permiso_de_quienes_la_usan(uuid)',
                           'public._tabla_referencia_tomar(uuid,integer)'] loop
    select p.prosecdef, p.proconfig into v_def, v_cfg from pg_proc p where p.oid = f::regprocedure;
    if not v_def or v_cfg is distinct from array['search_path=""'] then raise exception '% no corre como su dueño con search_path vacío (%)', f, v_cfg; end if;
    if f like 'public.\_%' and (has_function_privilege('authenticated', f, 'execute') or has_function_privilege('anon', f, 'execute')
                                or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
                                            where p.oid = f::regprocedure and x.grantee = 0)) then
      raise exception '% la ejecuta un cliente', f;
    end if;
  end loop;
end $$;

-- @test tablas crear: «cotizaciones.configurar» nombra las RPC nuevas en `aplicado_en`
do $$
begin
  if not exists (select 1 from public.permisos where clave = 'cotizaciones.configurar'
                  and aplicado_en like '%tabla_referencia_crear, tabla_referencia_columnas, tabla_referencia_desactivar, tabla_referencia_publicar%') then
    raise exception 'aplicado_en de cotizaciones.configurar no nombra las RPC de las tablas';
  end if;
end $$;
