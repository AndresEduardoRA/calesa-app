-- Cambiar el vehículo de una preventa guardada desde su detalle (T315): lo que la hoja de `/cotizaciones/[id]` le pide a la base. `cotizacion_evaluar(p_cotizacion, p_vehiculo)`
-- calcula lo que daría el vehículo nuevo sin escribir; `cotizacion_guardar(…, p_vehiculo)` lo guarda, rehace el título automático y deja la revisión; la aprobada se reacomoda
-- con la regla de siempre al confirmar. No depende de otro archivo (`SOLO=areas/cotizaciones/vehiculo-de-una-guardada.sql`); cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   G1. Evaluar con la cotización y otro vehículo calcula con los datos del vehículo nuevo (un `campo_vehiculo` y una tabla que casa por un campo del vehículo) y no
--       escribe la fila; sin `p_vehiculo`, con el suyo.
--   G2. Guardar con otro vehículo: el título automático pasa al del nuevo, uno manual se respeta, la revisión dice `{de, a}` y el `cotizado_en` del nuevo se mueve.
--   G3. La aprobada por `cotizacion_guardar`: la del viejo pasa a su otra activa más antigua y el nuevo conserva la suya; con un nuevo sin aprobada, llega aprobada.
--   G4. Una final no cambia de vehículo, ni al evaluar ni al guardar.

create or replace function pg_temp.vg_persona(p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('vg_' || substr(replace(v_id::text, '-', ''), 1, 12), 'VG ' || substr(v_id::text, 1, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.vg_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
  return coalesce(v, '{}'::jsonb);
end $f$;

-- El terreno: un origen cuya fórmula suma lo tipeado, el precio del vehículo (`campo_vehiculo`) y un flete de una tabla que casa por su marca; dos vehículos con precio y marca
-- distintos (A: toyota a 1.000, flete 100; B: mazda a 2.000, flete 300) y quien cotiza (ver, crear, editar y vehículos). Con «visible» en 10, A da 1.110 y B, 2.310.
create or replace function pg_temp.vg_terreno() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; va uuid; vb uuid; a uuid;
  v_def jsonb := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'precio', 'tipo', 'campo_vehiculo', 'campo', 'precio', 'etiqueta', 'Precio', 'formato', 'usd', 'bucket', 'origen'),
    jsonb_build_object('id', 'flete', 'tipo', 'tabla', 'tabla', 'vg_flete', 'match', jsonb_build_object('marca', 'marca'), 'columna', 'monto', 'etiqueta', 'Flete',
                       'formato', 'usd', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', 'precio', 'flete'), 'etiqueta', 'Total', 'salida', 'total',
                       'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  v_par jsonb := jsonb_build_object('tablas', jsonb_build_object('vg_flete', jsonb_build_array(jsonb_build_object('marca', 'toyota', 'monto', 100),
                                                                                                 jsonb_build_object('marca', 'mazda', 'monto', 300))));
  v_vis jsonb := jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                                    'precio', jsonb_build_object('ver', 'todos', 'editar', null), 'flete', jsonb_build_object('ver', 'todos', 'editar', null),
                                    'total', jsonb_build_object('ver', 'todos', 'editar', null));
begin
  insert into public.origenes (clave, nombre) values ('vg_' || substr(gen_random_uuid()::text, 1, 8), 'VG origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (o, 1, 'publicada', v_def, v_par, '{}', v_vis, now() - interval '10 days') returning id into f;
  insert into public.vehiculos (origen_id, titulo, marca, precio, cotizado_en) values (o, 'VG Corolla', 'toyota', 1000, now() - interval '30 days') returning id into va;
  insert into public.vehiculos (origen_id, titulo, marca, precio, cotizado_en) values (o, 'VG Mazda 3', 'mazda', 2000, now() - interval '30 days') returning id into vb;
  a := pg_temp.vg_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'vehiculos.ver']);
  return jsonb_build_object('o', o, 'f', f, 'def', v_def, 'par', v_par, 'va', va, 'vb', vb, 'a', a);
end $f$;

-- Una preventa de ese vehículo, escrita directo y consistente con la fórmula (lo que guardaría crear), creada hace p_min minutos (el orden de «la más antigua»). El título,
-- el automático de su vehículo.
create or replace function pg_temp.vg_cot(t jsonb, p_vehiculo uuid, p_min integer default 60) returns uuid language plpgsql as $f$
declare c uuid; v_ent jsonb; v_res jsonb; v_veh record;
begin
  select v.precio, v.marca, v.titulo into v_veh from public.vehiculos v where v.id = p_vehiculo;
  v_ent := jsonb_build_object('inputs', jsonb_build_object('visible', 10), 'banderas', '{}'::jsonb, 'overrides', '{}'::jsonb, 'tablas', '{}'::jsonb,
                              'vehiculo', jsonb_build_object('precio', v_veh.precio, 'marca', v_veh.marca),
                              'tipos_cambio', jsonb_build_object('oficial', (select valor from public.tipos_cambio where clave = 'oficial')));
  v_res := public.evaluar_formula(t -> 'def', t -> 'par', v_ent, null);
  insert into public.cotizaciones (origen_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, titulo_manual, creado_en)
  values ((t ->> 'o')::uuid, p_vehiculo, (t ->> 'a')::uuid, (t ->> 'f')::uuid, v_res -> 'valores', v_res -> 'fuentes', v_ent -> 'tipos_cambio', v_res -> 'totales',
          (v_res #>> '{totales,usd}')::numeric, v_veh.titulo, false, now() - make_interval(mins => p_min))
  returning id into c;
  return c;
end $f$;

-- Una llamada a `cotizacion_evaluar` sobre la cotización con «visible» en 10 y, opcional, otro vehículo.
create or replace function pg_temp.vg_evalua(p_c uuid, p_v uuid default null) returns text language sql as $f$
  select format('select public.cotizacion_evaluar(%L::jsonb, %L, null, %L)', '{"inputs": {"visible": 10}}', p_c, p_v)
$f$;

-- Una llamada a `cotizacion_guardar` con la versión de hoy, «visible» en 10, ese título (nulo = automático) y ese vehículo.
create or replace function pg_temp.vg_guarda(p_c uuid, p_v uuid, p_titulo text default null, p_manual boolean default false) returns text language sql as $f$
  select format('select public.cotizacion_guardar(%L, %L, %L::timestamptz, %L::jsonb, null, %L, null, %L, false, %L)',
                p_c, gen_random_uuid(), (select to_char(c.actualizado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') from public.cotizaciones c where c.id = p_c),
                '{"inputs": {"visible": 10}}', p_titulo, p_v, p_manual)
$f$;

-- Fuerza el trigger diferido de la aprobada (en un bloque revertido no correría).
create or replace function pg_temp.vg_confirmar() returns void language plpgsql as $f$
begin
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar immediate;
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar deferred;
end $f$;

create or replace function pg_temp.vg_aprobada(p_v uuid) returns uuid language sql as $f$
  select a.cotizacion_id from public.cotizaciones_aprobadas a where a.vehiculo_id = p_v;
$f$;

-- Falla si la aprobada de ese vehículo no es esa (o ninguna, con null).
create or replace function pg_temp.vg_es(p_que text, p_v uuid, p_esperada uuid) returns void language plpgsql as $f$
begin
  if pg_temp.vg_aprobada(p_v) is distinct from p_esperada then
    raise exception '%: la aprobada debía ser % y es %', p_que, p_esperada, pg_temp.vg_aprobada(p_v);
  end if;
end $f$;

-- @test vehículo de una guardada: G1 evaluar con p_cotizacion y otro p_vehiculo calcula con los datos del vehículo nuevo y no escribe
begin;
do $$
declare t jsonb := pg_temp.vg_terreno(); a uuid := (t ->> 'a')::uuid; va uuid := (t ->> 'va')::uuid; vb uuid := (t ->> 'vb')::uuid; c uuid; r jsonb; antes jsonb; despues jsonb;
begin
  c := pg_temp.vg_cot(t, va);
  if (select totales ->> 'usd' from public.cotizaciones where id = c)::numeric is distinct from 1110 then
    raise exception 'G1: el terreno debía dar 1.110 con A: %', (select totales from public.cotizaciones where id = c);
  end if;
  select jsonb_build_object('valores', valores, 'totales', totales, 'actualizado_en', actualizado_en, 'vehiculo_id', vehiculo_id) into antes from public.cotizaciones where id = c;
  -- Con B: su precio y su flete; el total, el de B.
  r := pg_temp.vg_corre(a, pg_temp.vg_evalua(c, vb));
  if r ? 'error' then raise exception 'G1: evaluar con B falló: %', r; end if;
  if jsonb_path_query_first(r, '$.valores.precio') is distinct from '2000'::jsonb
     or jsonb_path_query_first(r, '$.valores.flete') is distinct from '300'::jsonb
     or (jsonb_path_query_first(r, '$.totales.usd') #>> '{}')::numeric is distinct from 2310 then
    raise exception 'G1: con B debía calcular precio 2.000, flete 300 y total 2.310: %', r;
  end if;
  -- Sin p_vehiculo, con el suyo.
  r := pg_temp.vg_corre(a, pg_temp.vg_evalua(c));
  if r ? 'error' or (jsonb_path_query_first(r, '$.totales.usd') #>> '{}')::numeric is distinct from 1110
     or jsonb_path_query_first(r, '$.valores.precio') is distinct from '1000'::jsonb then
    raise exception 'G1: sin p_vehiculo debía calcular con A (1.110): %', r;
  end if;
  -- Evaluar no escribe: la fila queda igual.
  select jsonb_build_object('valores', valores, 'totales', totales, 'actualizado_en', actualizado_en, 'vehiculo_id', vehiculo_id) into despues from public.cotizaciones where id = c;
  if despues is distinct from antes then raise exception 'G1: evaluar escribió la fila: % → %', antes, despues; end if;
  if exists (select 1 from public.cotizaciones_revisiones where cotizacion_id = c) then raise exception 'G1: evaluar dejó una revisión'; end if;
end $$;
rollback;

-- @test vehículo de una guardada: G2 guardar con otro vehículo rehace el título automático, respeta el manual, deja la revisión {de, a} y mueve el cotizado_en del nuevo
begin;
do $$
declare t jsonb := pg_temp.vg_terreno(); a uuid := (t ->> 'a')::uuid; va uuid := (t ->> 'va')::uuid; vb uuid := (t ->> 'vb')::uuid; c uuid; r jsonb; rev public.cotizaciones_revisiones;
  v_cot_b timestamptz;
begin
  c := pg_temp.vg_cot(t, va);
  select cotizado_en into v_cot_b from public.vehiculos where id = vb;
  -- Automático: pasa al título de B; lo guardado es el cálculo con B.
  r := pg_temp.vg_corre(a, pg_temp.vg_guarda(c, vb));
  if r ? 'error' then raise exception 'G2: guardar con B falló: %', r; end if;
  if exists (select 1 from public.cotizaciones where id = c and (vehiculo_id is distinct from vb or titulo is distinct from 'VG Mazda 3' or titulo_manual or total_base is distinct from 2310)) then
    raise exception 'G2: debía quedar con B, su título automático y el total de B: %', (select row_to_json(x) from (select vehiculo_id, titulo, titulo_manual, total_base from public.cotizaciones where id = c) x);
  end if;
  select * into rev from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if rev.diff -> 'vehiculo_id' is distinct from jsonb_build_object('de', va, 'a', vb) then raise exception 'G2: la revisión no dice el cambio de vehículo: %', rev.diff; end if;
  if rev.diff -> 'titulo' is distinct from jsonb_build_object('de', 'VG Corolla', 'a', 'VG Mazda 3') then raise exception 'G2: la revisión no dice el cambio de título: %', rev.diff; end if;
  if (select cotizado_en from public.vehiculos where id = vb) <= v_cot_b then raise exception 'G2: el cotizado_en de B no se movió'; end if;
  -- Manual: se respeta al volver a A.
  r := pg_temp.vg_corre(a, pg_temp.vg_guarda(c, vb, 'Mi cotización', true));
  if r ? 'error' then raise exception 'G2: poner un título manual falló: %', r; end if;
  r := pg_temp.vg_corre(a, pg_temp.vg_guarda(c, va, 'Mi cotización', true));
  if r ? 'error' or exists (select 1 from public.cotizaciones where id = c and (vehiculo_id is distinct from va or titulo is distinct from 'Mi cotización' or not titulo_manual)) then
    raise exception 'G2: el manual debía quedar al cambiar de vehículo: %', r;
  end if;
  select * into rev from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if rev.diff -> 'vehiculo_id' is distinct from jsonb_build_object('de', vb, 'a', va) or rev.diff ? 'titulo' then
    raise exception 'G2: con el manual, la revisión dice el vehículo y no el título: %', rev.diff;
  end if;
end $$;
rollback;

-- @test vehículo de una guardada: G3 la aprobada se reacomoda por cotizacion_guardar en los dos vehículos
begin;
do $$
declare t jsonb := pg_temp.vg_terreno(); a uuid := (t ->> 'a')::uuid; va uuid := (t ->> 'va')::uuid; vb uuid := (t ->> 'vb')::uuid; vc uuid; c1 uuid; c0 uuid; b1 uuid; r jsonb;
begin
  -- A tiene c1 (la primera: aprobada) y c0 (activa, después); B tiene b1 (su aprobada).
  c1 := pg_temp.vg_cot(t, va, 50); c0 := pg_temp.vg_cot(t, va, 40); b1 := pg_temp.vg_cot(t, vb, 30);
  perform pg_temp.vg_confirmar();
  perform pg_temp.vg_es('G3 A al empezar', va, c1); perform pg_temp.vg_es('G3 B al empezar', vb, b1);
  -- Guardar c1 con B: A queda con c0, B sigue con b1 y c1 llega sin marca.
  r := pg_temp.vg_corre(a, pg_temp.vg_guarda(c1, vb));
  if r ? 'error' then raise exception 'G3: guardar c1 con B falló: %', r; end if;
  perform pg_temp.vg_confirmar();
  perform pg_temp.vg_es('G3 A releva con c0', va, c0); perform pg_temp.vg_es('G3 B conserva b1', vb, b1);
  -- Un vehículo sin aprobada (sin cotizaciones) recibe c0 aprobada; A, sin cotizaciones, queda sin fila.
  insert into public.vehiculos (origen_id, titulo, marca, precio) values ((t ->> 'o')::uuid, 'VG Hilux', 'toyota', 3000) returning id into vc;
  r := pg_temp.vg_corre(a, pg_temp.vg_guarda(c0, vc));
  if r ? 'error' then raise exception 'G3: guardar c0 con C falló: %', r; end if;
  perform pg_temp.vg_confirmar();
  perform pg_temp.vg_es('G3 C la recibe aprobada', vc, c0); perform pg_temp.vg_es('G3 A sin cotizaciones', va, null);
end $$;
rollback;

-- @test vehículo de una guardada: G4 una final no cambia de vehículo, ni al evaluar ni al guardar
begin;
do $$
declare t jsonb := pg_temp.vg_terreno(); va uuid := (t ->> 'va')::uuid; vb uuid := (t ->> 'vb')::uuid; c uuid; r jsonb;
  fg uuid := pg_temp.vg_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.final.gestionar', 'vehiculos.ver']);
begin
  c := pg_temp.vg_cot(t, va);
  update public.cotizaciones set clase = 'final' where id = c;
  r := pg_temp.vg_corre(fg, pg_temp.vg_evalua(c, vb));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'llamada_invalida' or r ->> 'hint' is distinct from 'p_vehiculo' then
    raise exception 'G4: evaluar una final con otro vehículo: %', r;
  end if;
  -- Con su propio vehículo, sí.
  r := pg_temp.vg_corre(fg, pg_temp.vg_evalua(c, va));
  if r ? 'error' then raise exception 'G4: evaluar una final con su vehículo falló: %', r; end if;
  r := pg_temp.vg_corre(fg, pg_temp.vg_guarda(c, vb));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'vehiculo' or r ->> 'detail' is not null then
    raise exception 'G4: guardar una final con otro vehículo: %', r;
  end if;
  if (select vehiculo_id from public.cotizaciones where id = c) is distinct from va then raise exception 'G4: la final cambió de vehículo'; end if;
end $$;
rollback;
