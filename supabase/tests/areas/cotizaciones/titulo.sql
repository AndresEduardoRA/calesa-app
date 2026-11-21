-- El título de la cotización (T307): `cotizaciones.titulo` y `titulo_manual`, escritos por `cotizacion_crear()`, `cotizacion_guardar()` y `cotizacion_encima()`.
-- Automático (el del vehículo, cortado a 120 puntos de código) o manual (el que escribe la persona); sin vehículo, obligatorio. No depende de otro archivo
-- (`SOLO=areas/cotizaciones/titulo.sql`); cada bloque abre su transacción y la revierte. La primera cuenta nace dueña: el terreno empieza por `ti_duena()`.
--
-- Qué asegura:
--   T1. La forma: la columna `not null default false`, la lee authenticated y nadie la escribe directo; una sola sobrecarga de crear y de guardar con sus firmas
--       nuevas, con los derechos de su dueña, search_path vacío y sin anon ni PUBLIC.
--   T2. Crear con vehículo: sin título toma el del vehículo (automático); manual, el texto sin los espacios de los costados; manual en blanco cae a automático; el
--       del vehículo se corta en 120 puntos de código (y se vuelve a recortar).
--   T3. Crear sin vehículo: sin título, 22023 `hint titulo` sin detalle (después del lead y del vehículo); con título entra y queda manual aunque no lo pida; más
--       de 120, 22023 `detail titulo_largo`.
--   T4. Guardar: pasar a manual deja la revisión (`titulo` y `titulo_manual`) y la actividad; vaciar vuelve al del vehículo; `p_titulo_manual` nulo con texto
--       es manual; el mismo intento con otro `titulo_manual` es `intento_reusado`; sin cambios no escribe; el automático se rehace con el vehículo de hoy; más de 120,
--       `titulo_largo`; quien no ve el vehículo no guarda (el título nunca nombra lo que no ve).
--   T5. Guardar sin vehículo: vaciar rechaza con `hint titulo`; con texto queda manual aunque no lo pida.
--   T6. Cotizar encima lleva el título y si es manual.

create temp sequence ti_telefono;

create or replace function pg_temp.ti_duena() returns uuid language plpgsql as $f$
declare v uuid;
begin
  select ur.usuario_id into v from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' order by ur.usuario_id limit 1;
  if v is null then
    v := gen_random_uuid();
    insert into auth.users (id, email, raw_app_meta_data) values (v, v || '@ejemplo.com', '{"invitado": true}');
  end if;
  return v;
end $f$;

-- Una persona con un rol propio y esas claves en todos los orígenes.
create or replace function pg_temp.ti_persona(p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ti_' || substr(replace(v_id::text, '-', ''), 1, 12), 'TI ' || substr(v_id::text, 1, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.ti_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', nullif(v_d, ''), 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

-- Un origen con su fórmula publicada, un lead y un vehículo, y quien cotiza (ver, crear y editar, leads y vehículos, sin vehículo).
create or replace function pg_temp.ti_terreno() returns jsonb language plpgsql as $f$
declare duena uuid := pg_temp.ti_duena(); o uuid; f uuid; l uuid; v uuid; a uuid;
  v_def jsonb := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  v_vis jsonb := jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                                    'total', jsonb_build_object('ver', 'todos', 'editar', null));
begin
  insert into public.origenes (clave, nombre) values ('ti_' || substr(gen_random_uuid()::text, 1, 8), 'TI origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', v_def, '{}', '{}', v_vis) returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('TI lead', '72170' || lpad(nextval('pg_temp.ti_telefono')::text, 3, '0'), duena, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'TI vehículo', 'toyota') returning id into v;
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 days' where tipo_cambio_id in (select id from public.tipos_cambio);
  a := pg_temp.ti_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.crear.sin_vehiculo', 'leads.ver', 'vehiculos.ver']);
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v, 'a', a);
end $f$;

-- `cotizacion_crear` como esa persona, con la hoja abierta firmada para ella, ese vehículo (nulo = sin vehículo), título y manual (nulo = el default de la RPC).
create or replace function pg_temp.ti_crear(p_quien uuid, t jsonb, p_vehiculo uuid, p_titulo text default null, p_manual boolean default null, p_lead boolean default true)
returns jsonb language plpgsql as $f$
declare v_abierta text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  v_abierta := public._cotizacion_abierta_firmar((t ->> 'o')::uuid, (t ->> 'f')::uuid, now());
  if p_manual is null then
    return pg_temp.ti_corre(p_quien, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {"visible": 10}}''::jsonb, %L, %L, p_titulo => %L)',
                                            t ->> 'o', case when p_lead then t ->> 'l' end, v_abierta, p_vehiculo, p_titulo));
  end if;
  return pg_temp.ti_corre(p_quien, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {"visible": 10}}''::jsonb, %L, %L, p_titulo => %L, p_titulo_manual => %L)',
                                          t ->> 'o', case when p_lead then t ->> 'l' end, v_abierta, p_vehiculo, p_titulo, p_manual));
end $f$;

-- `cotizacion_guardar` como esa persona, con la versión de hoy (o la dada), el vehículo de la cotización, ese título y manual (nulo = el default de la RPC: nulo).
create or replace function pg_temp.ti_guardar(p_quien uuid, p_c uuid, p_titulo text, p_manual boolean default null, p_intento uuid default gen_random_uuid(),
                                              p_version timestamptz default null)
returns jsonb language plpgsql as $f$
declare c public.cotizaciones;
begin
  select * into c from public.cotizaciones x where x.id = p_c;
  if p_manual is null then
    return pg_temp.ti_corre(p_quien, format('select public.cotizacion_guardar(%L, %L, %L, ''{"inputs": {"visible": 10}}''::jsonb, null, %L, null, %L, false)',
                                            p_c, p_intento, coalesce(p_version, c.actualizado_en), p_titulo, c.vehiculo_id));
  end if;
  return pg_temp.ti_corre(p_quien, format('select public.cotizacion_guardar(%L, %L, %L, ''{"inputs": {"visible": 10}}''::jsonb, null, %L, null, %L, false, %L)',
                                          p_c, p_intento, coalesce(p_version, c.actualizado_en), p_titulo, c.vehiculo_id, p_manual));
end $f$;

create or replace function pg_temp.ti_fila(p_c uuid) returns public.cotizaciones language sql as $f$ select * from public.cotizaciones where id = p_c $f$;
create or replace function pg_temp.ti_id(r jsonb) returns uuid language sql as $f$ select (r -> 'cotizacion' ->> 'id')::uuid $f$;

-- @test título de la cotización: T1 la forma de la columna y de las RPC
begin;
do $$
declare p record; k text;
begin
  if not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'cotizaciones' and c.column_name = 'titulo_manual'
                   and c.data_type = 'boolean' and c.is_nullable = 'NO' and c.column_default = 'false') then
    raise exception 'T1: cotizaciones.titulo_manual no es boolean not null default false';
  end if;
  if not has_column_privilege('authenticated', 'public.cotizaciones', 'titulo_manual', 'select') then raise exception 'T1: authenticated no lee titulo_manual'; end if;
  foreach k in array array['insert', 'update'] loop
    if has_column_privilege('authenticated', 'public.cotizaciones', 'titulo_manual', k) then raise exception 'T1: authenticated puede % titulo_manual', k; end if;
    if has_column_privilege('anon', 'public.cotizaciones', 'titulo_manual', k) or has_column_privilege('anon', 'public.cotizaciones', 'titulo_manual', 'select') then
      raise exception 'T1: anon toca titulo_manual';
    end if;
  end loop;
  for p in select x.oid, x.proname, x.prosecdef, x.proconfig, pg_get_function_arguments(x.oid) as args
             from pg_proc x where x.pronamespace = 'public'::regnamespace and x.proname in ('cotizacion_crear', 'cotizacion_guardar', '_cotizaciones_ids_por_titulo') loop
    if (select count(*) from pg_proc y where y.pronamespace = 'public'::regnamespace and y.proname = p.proname) <> 1 then raise exception 'T1: % tiene más de una sobrecarga', p.proname; end if;
    if not p.prosecdef then raise exception 'T1: % no corre con los derechos de su dueña (prosecdef)', p.proname; end if;
    if not coalesce(p.proconfig @> array['search_path=""'], false) then raise exception 'T1: search_path de %: %', p.proname, p.proconfig; end if;
    if not has_function_privilege('authenticated', p.oid, 'execute') then raise exception 'T1: authenticated no ejecuta %', p.proname; end if;
    if has_function_privilege('anon', p.oid, 'execute') then raise exception 'T1: anon ejecuta %', p.proname; end if;
    if exists (select 1 from aclexplode((select proacl from pg_proc where oid = p.oid)) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then raise exception 'T1: PUBLIC ejecuta %', p.proname; end if;
    if p.proname = 'cotizacion_crear' and p.args not like '%p_ver_total_bs boolean DEFAULT false, p_titulo text DEFAULT NULL::text, p_titulo_manual boolean DEFAULT false, p_privada boolean DEFAULT false' then
      raise exception 'T1: la firma de crear: %', p.args;
    end if;
    if p.proname = 'cotizacion_guardar' and p.args not like '%p_vehiculo uuid, p_ver_total_bs boolean, p_titulo_manual boolean DEFAULT NULL::boolean' then
      raise exception 'T1: la firma de guardar: %', p.args;
    end if;
    if p.proname = '_cotizaciones_ids_por_titulo' and (p.args <> 'p_texto text, p_origen uuid DEFAULT NULL::uuid' or not p.proconfig @> array['plan_cache_mode=force_generic_plan']) then
      raise exception 'T1: la firma o el plan del ayudante: % / %', p.args, p.proconfig;
    end if;
  end loop;
end $$;
rollback;

-- @test título de la cotización: T2 crear con vehículo: automático, manual, manual en blanco y el corte en 120
begin;
do $$
declare t jsonb := pg_temp.ti_terreno(); a uuid := (t ->> 'a')::uuid; v uuid := (t ->> 'v')::uuid; r jsonb; c public.cotizaciones; v_largo uuid; v_borde uuid;
begin
  -- Sin título: el del vehículo, automático.
  r := pg_temp.ti_crear(a, t, v);
  c := pg_temp.ti_fila(pg_temp.ti_id(r));
  if r ? 'error' or c.titulo is distinct from 'TI vehículo' or c.titulo_manual then raise exception 'T2: sin título debía tomar el del vehículo: % / %', r, to_jsonb(c); end if;
  if r -> 'cotizacion' ->> 'titulo_manual' is distinct from 'false' then raise exception 'T2: la respuesta no trae titulo_manual: %', r -> 'cotizacion'; end if;
  -- Con un texto pero sin pedirlo manual (el default de crear): el del vehículo.
  r := pg_temp.ti_crear(a, t, v, 'Ignorado');
  c := pg_temp.ti_fila(pg_temp.ti_id(r));
  if r ? 'error' or c.titulo is distinct from 'TI vehículo' or c.titulo_manual then raise exception 'T2: un texto sin manual debía quedar automático: %', to_jsonb(c); end if;
  -- Manual: el texto sin los espacios de los costados.
  r := pg_temp.ti_crear(a, t, v, '  Mi cotización  ', true);
  c := pg_temp.ti_fila(pg_temp.ti_id(r));
  if r ? 'error' or c.titulo is distinct from 'Mi cotización' or not c.titulo_manual then raise exception 'T2: manual: %', to_jsonb(c); end if;
  -- Manual en blanco: automático.
  r := pg_temp.ti_crear(a, t, v, '   ', true);
  c := pg_temp.ti_fila(pg_temp.ti_id(r));
  if r ? 'error' or c.titulo is distinct from 'TI vehículo' or c.titulo_manual then raise exception 'T2: manual en blanco debía caer a automático: %', to_jsonb(c); end if;
  -- Un vehículo de 150 caracteres: 120 puntos de código (un emoji en el borde cuenta uno).
  insert into public.vehiculos (origen_id, titulo, marca) values ((t ->> 'o')::uuid, repeat('a', 119) || '😀' || repeat('b', 30), 'toyota') returning id into v_largo;
  c := pg_temp.ti_fila(pg_temp.ti_id(pg_temp.ti_crear(a, t, v_largo)));
  if c.titulo is distinct from repeat('a', 119) || '😀' or char_length(c.titulo) <> 120 or c.titulo_manual then raise exception 'T2: el corte en 120: % (%)', c.titulo, char_length(c.titulo); end if;
  -- El corte que deja un espacio al final se vuelve a recortar.
  insert into public.vehiculos (origen_id, titulo, marca) values ((t ->> 'o')::uuid, '  ' || repeat('c', 119) || ' zzz', 'toyota') returning id into v_borde;
  c := pg_temp.ti_fila(pg_temp.ti_id(pg_temp.ti_crear(a, t, v_borde)));
  if c.titulo is distinct from repeat('c', 119) then raise exception 'T2: el corte con espacios: «%»', c.titulo; end if;
end $$;
rollback;

-- @test título de la cotización: T3 crear sin vehículo: el título es obligatorio, después del lead y del vehículo, y tiene tope
begin;
do $$
declare t jsonb := pg_temp.ti_terreno(); a uuid := (t ->> 'a')::uuid; r jsonb; c public.cotizaciones;
  sin_clave uuid := pg_temp.ti_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver']);
begin
  -- Sin título: 22023 con hint titulo, sin detalle, y no escribe nada.
  r := pg_temp.ti_crear(a, t, null);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'titulo' or r ->> 'detail' is not null or r ->> 'mensaje' is distinct from 'Escribe el título de la cotización.' then
    raise exception 'T3: sin vehículo y sin título: %', r;
  end if;
  r := pg_temp.ti_crear(a, t, null, '    ', true);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'titulo' then raise exception 'T3: sólo espacios es vacío: %', r; end if;
  if exists (select 1 from public.cotizaciones where origen_id = (t ->> 'o')::uuid) then raise exception 'T3: un rechazo dejó una cotización'; end if;
  -- El lead y el vehículo van antes: sin lead (y sin su clave), hint lead; sin la clave del vehículo, hint vehiculo.
  r := pg_temp.ti_crear(a, t, null, null, null, false);
  if r ->> 'hint' is distinct from 'lead' then raise exception 'T3: el lead va antes que el título: %', r; end if;
  r := pg_temp.ti_crear(sin_clave, t, null);
  if r ->> 'hint' is distinct from 'vehiculo' then raise exception 'T3: el vehículo va antes que el título: %', r; end if;
  -- Con título entra, manual aunque no lo pida (sin vehículo no hay automático).
  r := pg_temp.ti_crear(a, t, null, ' Sin vehículo ', false);
  c := pg_temp.ti_fila(pg_temp.ti_id(r));
  if r ? 'error' or c.titulo is distinct from 'Sin vehículo' or not c.titulo_manual or c.vehiculo_id is not null then raise exception 'T3: con título debía entrar manual: % / %', r, to_jsonb(c); end if;
  -- El tope: 120 puntos de código entran (un emoji cuenta uno), 121 no.
  r := pg_temp.ti_crear(a, t, null, repeat('x', 119) || '😀', true);
  if r ? 'error' then raise exception 'T3: 120 puntos de código debían entrar: %', r; end if;
  r := pg_temp.ti_crear(a, t, null, repeat('x', 121), true);
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'titulo_largo' or r ->> 'hint' is distinct from 'titulo' then raise exception 'T3: 121: %', r; end if;
  r := pg_temp.ti_crear(a, t, (t ->> 'v')::uuid, repeat('x', 121), true);
  if r ->> 'detail' is distinct from 'titulo_largo' then raise exception 'T3: 121 manual con vehículo: %', r; end if;
end $$;
rollback;

-- @test título de la cotización: T4 guardar: manual, automático, el intento, sin cambios, el vehículo de hoy, el tope y quien no ve el vehículo
begin;
do $$
declare t jsonb := pg_temp.ti_terreno(); a uuid := (t ->> 'a')::uuid; v uuid := (t ->> 'v')::uuid; r jsonb; c public.cotizaciones; antes public.cotizaciones;
  cid uuid; v_int uuid := gen_random_uuid(); rev public.cotizaciones_revisiones; n bigint;
  ciega uuid := pg_temp.ti_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver']);
begin
  cid := pg_temp.ti_id(pg_temp.ti_crear(a, t, v));
  -- A manual: la revisión dice el título y si es manual, y la actividad lo registra.
  r := pg_temp.ti_guardar(a, cid, ' Para la feria ', true, v_int);
  c := pg_temp.ti_fila(cid);
  if r ? 'error' or c.titulo is distinct from 'Para la feria' or not c.titulo_manual then raise exception 'T4: a manual: % / %', r, to_jsonb(c); end if;
  select * into rev from public.cotizaciones_revisiones where cotizacion_id = cid order by id desc limit 1;
  if rev.diff -> 'titulo' is distinct from '{"de": "TI vehículo", "a": "Para la feria"}'::jsonb or rev.diff -> 'titulo_manual' is distinct from '{"de": false, "a": true}'::jsonb then
    raise exception 'T4: la revisión: %', rev.diff;
  end if;
  if not exists (select 1 from public.actividad where tabla = 'cotizaciones' and registro_id = cid::text and accion = 'cotizaciones.update' and despues ->> 'titulo' = 'Para la feria') then
    raise exception 'T4: el cambio de título no quedó en la actividad';
  end if;
  -- El mismo intento con otro titulo_manual: intento_reusado (aunque el texto sea el mismo).
  r := pg_temp.ti_corre(a, format('select public.cotizacion_guardar(%L, %L, %L, ''{"inputs": {"visible": 10}}''::jsonb, null, %L, null, %L, false, false)',
                                  cid, v_int, (pg_temp.ti_fila(cid)).actualizado_en, ' Para la feria ', v));
  if r ->> 'detail' is distinct from 'intento_reusado' then raise exception 'T4: el mismo intento con otro titulo_manual: %', r; end if;
  -- Sin cambios no escribe (ni versión ni revisión).
  antes := pg_temp.ti_fila(cid); select count(*) into n from public.cotizaciones_revisiones where cotizacion_id = cid;
  r := pg_temp.ti_guardar(a, cid, 'Para la feria', true);
  if r ? 'error' or (pg_temp.ti_fila(cid)).actualizado_en is distinct from antes.actualizado_en or (select count(*) from public.cotizaciones_revisiones where cotizacion_id = cid) <> n then
    raise exception 'T4: guardar lo mismo escribió: %', r;
  end if;
  -- `p_titulo_manual` nulo (las llamadas de antes) con texto: manual.
  r := pg_temp.ti_guardar(a, cid, 'Sin decir', null);
  c := pg_temp.ti_fila(cid);
  if r ? 'error' or c.titulo is distinct from 'Sin decir' or not c.titulo_manual then raise exception 'T4: nulo con texto debía quedar manual: %', to_jsonb(c); end if;
  -- Vaciar: vuelve al del vehículo.
  r := pg_temp.ti_guardar(a, cid, '', false);
  c := pg_temp.ti_fila(cid);
  if r ? 'error' or c.titulo is distinct from 'TI vehículo' or c.titulo_manual then raise exception 'T4: vaciar debía volver al del vehículo: %', to_jsonb(c); end if;
  -- Un texto con manual falso: automático.
  r := pg_temp.ti_guardar(a, cid, 'Ignorado', false);
  if r ? 'error' or (pg_temp.ti_fila(cid)).titulo is distinct from 'TI vehículo' then raise exception 'T4: un texto con manual falso: %', r; end if;
  -- El automático no sigue solo al vehículo: se rehace al guardar.
  update public.vehiculos set titulo = 'TI vehículo renombrado' where id = v;
  if (pg_temp.ti_fila(cid)).titulo is distinct from 'TI vehículo' then raise exception 'T4: el título siguió solo al vehículo'; end if;
  r := pg_temp.ti_guardar(a, cid, null, false);
  if r ? 'error' or (pg_temp.ti_fila(cid)).titulo is distinct from 'TI vehículo renombrado' then raise exception 'T4: el automático no se rehizo: %', r; end if;
  -- El tope.
  r := pg_temp.ti_guardar(a, cid, repeat('t', 121), true);
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'titulo_largo' or r ->> 'hint' is distinct from 'titulo' then raise exception 'T4: 121: %', r; end if;
  -- Quien no ve el vehículo no guarda (`_cotizacion_armar`, el error de siempre), así que el título nunca nombra un vehículo que quien guarda no ve.
  update public.vehiculos set titulo = 'TI nombre que no ve' where id = v;
  antes := pg_temp.ti_fila(cid);
  r := pg_temp.ti_guardar(ciega, cid, null, false);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a este vehículo.' then raise exception 'T4: quien no ve el vehículo: %', r; end if;
  r := pg_temp.ti_guardar(ciega, cid, 'De quien no ve', true);
  if r ->> 'error' is distinct from '42501' then raise exception 'T4: quien no ve el vehículo, con un manual: %', r; end if;
  c := pg_temp.ti_fila(cid);
  if c.titulo is distinct from antes.titulo or c.actualizado_en is distinct from antes.actualizado_en then raise exception 'T4: un rechazo cambió la cotización: %', to_jsonb(c); end if;
end $$;
rollback;

-- @test título de la cotización: T5 guardar sin vehículo: vaciar rechaza y el texto es manual
begin;
do $$
declare t jsonb := pg_temp.ti_terreno(); a uuid := (t ->> 'a')::uuid; r jsonb; c public.cotizaciones; cid uuid; antes public.cotizaciones;
begin
  cid := pg_temp.ti_id(pg_temp.ti_crear(a, t, null, 'Sin vehículo'));
  antes := pg_temp.ti_fila(cid);
  r := pg_temp.ti_guardar(a, cid, '  ', false);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'titulo' or r ->> 'detail' is not null then raise exception 'T5: vaciar sin vehículo: %', r; end if;
  r := pg_temp.ti_guardar(a, cid, null);
  if r ->> 'hint' is distinct from 'titulo' then raise exception 'T5: sin título y sin vehículo: %', r; end if;
  if (pg_temp.ti_fila(cid)).actualizado_en is distinct from antes.actualizado_en then raise exception 'T5: un rechazo escribió'; end if;
  r := pg_temp.ti_guardar(a, cid, 'Otro nombre', false);
  c := pg_temp.ti_fila(cid);
  if r ? 'error' or c.titulo is distinct from 'Otro nombre' or not c.titulo_manual then raise exception 'T5: sin vehículo, el texto debía quedar manual: % / %', r, to_jsonb(c); end if;
end $$;
rollback;

-- @test título de la cotización: T6 cotizar encima lleva el título y si es manual
begin;
do $$
declare t jsonb := pg_temp.ti_terreno(); a uuid := (t ->> 'a')::uuid; v uuid := (t ->> 'v')::uuid; r jsonb; c public.cotizaciones; manual uuid; auto uuid;
begin
  manual := pg_temp.ti_id(pg_temp.ti_crear(a, t, v, 'Encima manual', true));
  auto := pg_temp.ti_id(pg_temp.ti_crear(a, t, v));
  r := pg_temp.ti_corre(a, format('select public.cotizacion_encima(gen_random_uuid(), %L)', manual));
  c := pg_temp.ti_fila(pg_temp.ti_id(r));
  if r ? 'error' or c.titulo is distinct from 'Encima manual' or not c.titulo_manual then raise exception 'T6: encima de una manual: % / %', r, to_jsonb(c); end if;
  r := pg_temp.ti_corre(a, format('select public.cotizacion_encima(gen_random_uuid(), %L)', auto));
  c := pg_temp.ti_fila(pg_temp.ti_id(r));
  if r ? 'error' or c.titulo is distinct from 'TI vehículo' or c.titulo_manual then raise exception 'T6: encima de una automática: % / %', r, to_jsonb(c); end if;
end $$;
rollback;
