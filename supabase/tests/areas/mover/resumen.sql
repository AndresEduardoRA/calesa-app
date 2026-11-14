-- El número de cada fase de la cadena: `logistica_cadena_resumen` (conteo con tope por vehiculos_cadena_idx, nunca un total). No depende de otro
-- archivo (`SOLO=areas/mover/resumen.sql`). Cada bloque abre su transacción y la revierte. El plan con volumen: `medir-logistica.sql`.
--
-- Qué asegura:
--   R1. Sin `logistica.ver` del origen (aunque la tenga de otro) o sin `vehiculos.ver`: 42501 hint `acceso`; otro origen nunca se cuenta.
--   R2. El tope: con `p_tope = 2` y 3 vehículos, `{n: 2, hay_mas: true}`.
--   R3. El orden: «Sin fase» primero y sólo con vehículos, activas por `orden` (vacías también), una jubilada al final y sólo con vehículos.
--   R4. Demorados sólo con la regla `alerta_demora`; trabados con un requisito bloqueante sin cumplir en la fase siguiente; `hay_mas` con más de 50.
--   R5. Una `no_ganada` no cuenta en ningún número; una `sin_resolver` sí.
--   R6. «Propios» cuenta lo que creó y lo de su cartera, nunca lo ajeno.
--   R7. `anon` no ejecuta la función ni `authenticated` los ayudantes.

create or replace function pg_temp.rs_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-rs@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

create or replace function pg_temp.rs_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.rs_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rs_' || substr(v_id::text, 1, 8), 'rs ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.rs_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('rs_' || s, 'rs origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.rs_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.rs_fase(p_flujo uuid, p_nombre text, p_orden int, p_demora int default null) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_logistica, demora_dias) values (p_flujo, p_nombre, p_orden, true, p_demora) returning id;
$f$;

create or replace function pg_temp.rs_vehiculo(p_origen uuid, p_fase uuid, p_creado_por uuid default null, p_desde timestamptz default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, creado_por) values (p_origen, 'rs vehículo', p_fase, p_desde, p_creado_por) returning id;
$f$;

create or replace function pg_temp.rs_regla(p_flujo uuid, p_activa boolean) returns void language sql as $f$
  insert into public.flujos_reglas (flujo_id, regla, activa) values (p_flujo, 'alerta_demora', p_activa)
  on conflict (flujo_id, regla) do update set activa = excluded.activa;
$f$;

create or replace function pg_temp.rs_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.rs_resumen(p_quien uuid, p_origen uuid, p_tope int default 1000) returns jsonb language sql as $f$
  select pg_temp.rs_corre(p_quien, format('select public.logistica_cadena_resumen(%L, %s)', p_origen, p_tope));
$f$;

-- La fila de una fase (por nombre; «Sin fase» = el nombre nulo) del resumen.
create or replace function pg_temp.rs_fila(p jsonb, p_nombre text) returns jsonb language sql as $f$
  select e from jsonb_array_elements(p -> 'fases') e where e ->> 'nombre' is not distinct from p_nombre;
$f$;

create or replace function pg_temp.rs_igual(p_que text, p_dio anyelement, p_debia anyelement) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_debia then raise exception '%: debía ser % y fue %', p_que, p_debia, p_dio; end if;
end $f$;

-- @test resumen: sin logistica.ver o sin vehiculos.ver del origen, 42501 hint acceso; anon y los ayudantes sin ejecutar (R1, R7)
begin;
do $$
declare
  a uuid := pg_temp.rs_flujo(); o uuid := pg_temp.rs_origen_de(a); f uuid := pg_temp.rs_fase(a, 'rs uno', 10);
  b uuid := pg_temp.rs_flujo(); ob uuid := pg_temp.rs_origen_de(b);
  duena uuid := pg_temp.rs_persona(array['logistica.ver', 'vehiculos.ver']);
  sin_log uuid := pg_temp.rs_persona(array['vehiculos.ver', 'logistica.ver@' || ob]);
  sin_veh uuid := pg_temp.rs_persona(array['logistica.ver']);
  fn text; q text;
begin
  perform pg_temp.rs_vehiculo(o, f);
  perform pg_temp.rs_vehiculo(ob, null);
  -- Sin vehiculos.ver: la concesión de logística sola no alcanza.
  delete from public.roles_permisos rp using public.usuarios_roles ur
   where ur.rol_id = rp.rol_id and ur.usuario_id = sin_veh and rp.permiso_clave = 'vehiculos.ver';
  if pg_temp.rs_resumen(sin_log, o) ->> 'error' is distinct from '42501' or pg_temp.rs_resumen(sin_log, o) ->> 'hint' is distinct from 'acceso' then
    raise exception 'R1: sin logistica.ver del origen debía dar 42501 acceso y dio %', pg_temp.rs_resumen(sin_log, o);
  end if;
  if pg_temp.rs_resumen(sin_veh, o) ->> 'hint' is distinct from 'acceso' then
    raise exception 'R1: sin vehiculos.ver debía dar 42501 acceso y dio %', pg_temp.rs_resumen(sin_veh, o);
  end if;
  -- El origen ajeno nunca entra: la cadena de `o` no cuenta lo de `ob`.
  perform pg_temp.rs_igual('R1 sólo cuenta su origen', (select count(*)::int from jsonb_array_elements(pg_temp.rs_resumen(duena, o) -> 'fases') e where e ->> 'nombre' is null), 0);
  perform pg_temp.rs_igual('R1 la fase del origen', pg_temp.rs_fila(pg_temp.rs_resumen(duena, o), 'rs uno') #>> '{vehiculos,n}', '1');

  -- R7. Privilegios.
  if has_function_privilege('anon', 'public.logistica_cadena_resumen(uuid,integer)', 'execute') then raise exception 'R7: anon ejecuta el resumen'; end if;
  if not has_function_privilege('authenticated', 'public.logistica_cadena_resumen(uuid,integer)', 'execute') then raise exception 'R7: authenticated no ejecuta el resumen'; end if;
  foreach fn in array array['public._logistica_lo_propio(uuid)'] loop
    if has_function_privilege('authenticated', fn, 'execute') or has_function_privilege('anon', fn, 'execute') then
      raise exception 'R7: ejecutan el ayudante %', fn;
    end if;
  end loop;
  q := format('select public._logistica_lo_propio(%L)', o)::text;
  if pg_temp.rs_corre(duena, q) ->> 'error' is distinct from '42501' then raise exception 'R7: authenticated ejecutó _logistica_lo_propio'; end if;
end $$;
rollback;

-- @test resumen: el tope se acota con hay_mas (R2)
begin;
do $$
declare
  a uuid := pg_temp.rs_flujo(); o uuid := pg_temp.rs_origen_de(a); f uuid := pg_temp.rs_fase(a, 'rs uno', 10);
  duena uuid := pg_temp.rs_persona(array['logistica.ver', 'vehiculos.ver']);
  r jsonb;
begin
  perform pg_temp.rs_vehiculo(o, f); perform pg_temp.rs_vehiculo(o, f); perform pg_temp.rs_vehiculo(o, f);
  r := pg_temp.rs_resumen(duena, o, 2);
  perform pg_temp.rs_igual('R2 con p_tope = 2 y 3 vehículos', pg_temp.rs_fila(r, 'rs uno') -> 'vehiculos', '{"n": 2, "hay_mas": true}'::jsonb);
  r := pg_temp.rs_resumen(duena, o, 3);
  perform pg_temp.rs_igual('R2 con p_tope = 3 y 3 vehículos', pg_temp.rs_fila(r, 'rs uno') -> 'vehiculos', '{"n": 3, "hay_mas": false}'::jsonb);
end $$;
rollback;

-- @test resumen: «Sin fase» primero y sólo con vehículos, activas por orden, la jubilada al final y sólo con vehículos (R3)
begin;
do $$
declare
  a uuid := pg_temp.rs_flujo(); o uuid := pg_temp.rs_origen_de(a);
  dos uuid := pg_temp.rs_fase(a, 'rs dos', 20); uno uuid := pg_temp.rs_fase(a, 'rs uno', 10);
  jub uuid := pg_temp.rs_fase(a, 'rs jubilada', 5); vacia_jub uuid := pg_temp.rs_fase(a, 'rs jubilada vacía', 6);
  fuera uuid;
  duena uuid := pg_temp.rs_persona(array['logistica.ver', 'vehiculos.ver']);
  r jsonb;
begin
  -- Una fase que no es de la cadena (es_logistica falso) no sale.
  insert into public.fases (flujo_id, nombre, orden, es_logistica) values (a, 'rs fuera', 30, false) returning id into fuera;
  perform pg_temp.rs_vehiculo(o, jub);
  update public.fases set activa = false where id in (jub, vacia_jub);
  r := pg_temp.rs_resumen(duena, o);
  perform pg_temp.rs_igual('R3 sin vehículos sin fase', (select array_agg(e ->> 'nombre' order by i) from jsonb_array_elements(r -> 'fases') with ordinality x(e, i)),
                           array['rs uno', 'rs dos', 'rs jubilada']);
  perform pg_temp.rs_vehiculo(o, null);
  r := pg_temp.rs_resumen(duena, o);
  perform pg_temp.rs_igual('R3 con vehículos sin fase', (select array_agg(coalesce(e ->> 'nombre', '·') order by i) from jsonb_array_elements(r -> 'fases') with ordinality x(e, i)),
                           array['·', 'rs uno', 'rs dos', 'rs jubilada']);
  perform pg_temp.rs_igual('R3 «Sin fase» trae fase_id nulo', r #>> '{fases,0,fase_id}', null);
end $$;
rollback;

-- @test resumen: demorados sólo con la regla, trabados con un bloqueante sin cumplir, hay_mas con más de 50 (R4)
begin;
do $$
declare
  a uuid := pg_temp.rs_flujo(); o uuid := pg_temp.rs_origen_de(a);
  uno uuid := pg_temp.rs_fase(a, 'rs uno', 10, 3); dos uuid := pg_temp.rs_fase(a, 'rs dos', 20);
  duena uuid := pg_temp.rs_persona(array['logistica.ver', 'vehiculos.ver']);
  t uuid; v_a uuid; v_b uuid; r jsonb;
begin
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (a, uno, dos);
  v_a := pg_temp.rs_vehiculo(o, uno, null, now() - interval '10 days');
  v_b := pg_temp.rs_vehiculo(o, uno, null, now() - interval '10 days');
  perform pg_temp.rs_vehiculo(o, uno, null, now() - interval '1 day');
  -- Sin la regla alerta_demora: nada de demorados ni de trabados.
  perform pg_temp.rs_regla(a, false);
  r := pg_temp.rs_fila(pg_temp.rs_resumen(duena, o), 'rs uno');
  perform pg_temp.rs_igual('R4 sin la regla, demorados', r -> 'demorados', 'null'::jsonb);
  perform pg_temp.rs_igual('R4 sin la regla, trabados', r -> 'trabados', 'null'::jsonb);
  perform pg_temp.rs_regla(a, true);
  r := pg_temp.rs_fila(pg_temp.rs_resumen(duena, o), 'rs uno');
  perform pg_temp.rs_igual('R4 con la regla, demorados', r -> 'demorados', '{"n": 2, "hay_mas": false}'::jsonb);
  perform pg_temp.rs_igual('R4 sin requisitos, ninguno trabado', r -> 'trabados', '{"n": 0, "hay_mas": false}'::jsonb);
  perform pg_temp.rs_igual('R4 los días con que alerta', r ->> 'demora_dias', '3');
  -- Con un documento bloqueante en la fase siguiente, las dos demoradas quedan trabadas.
  insert into public.tipos_documento (nombre) values ('RS tipo ' || substr(gen_random_uuid()::text, 1, 8)) returning id into t;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id) values (dos, 'documento', true, t);
  r := pg_temp.rs_fila(pg_temp.rs_resumen(duena, o), 'rs uno');
  perform pg_temp.rs_igual('R4 con el bloqueante, trabados', r -> 'trabados', '{"n": 2, "hay_mas": false}'::jsonb);
  update public.fases set es_final = true where id = dos;
  perform pg_temp.rs_igual('R4 la fase final no alerta', pg_temp.rs_fila(pg_temp.rs_resumen(duena, o), 'rs dos') -> 'demorados', 'null'::jsonb);
  -- Con más de 50 demoradas se miran las primeras 50 y se avisa.
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde)
  select o, 'rs masivo ' || g, uno, now() - interval '20 days' from generate_series(1, 60) g;
  r := pg_temp.rs_fila(pg_temp.rs_resumen(duena, o), 'rs uno');
  perform pg_temp.rs_igual('R4 demorados con 62', r -> 'demorados', '{"n": 62, "hay_mas": false}'::jsonb);
  perform pg_temp.rs_igual('R4 trabados mira sólo 50', r -> 'trabados', '{"n": 50, "hay_mas": true}'::jsonb);
end $$;
rollback;

-- @test resumen: una no ganada no cuenta en ningún número; una sin resolver sí (R5)
begin;
do $$
declare
  s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  o uuid; a uuid; uno uuid;
  duena uuid := pg_temp.rs_persona(array['logistica.ver', 'vehiculos.ver']);
  r jsonb;
begin
  -- La situación sólo la calcula un origen de subasta, con su fase de subasta.
  insert into public.origenes (clave, nombre, tipo) values ('rs_' || s, 'rs origen ' || s, 'subasta') returning id into o;
  a := (select id from public.flujos where origen_id = o);
  insert into public.fases (flujo_id, nombre, orden, es_inicial, es_logistica, es_subasta, demora_dias) values (a, 'rs uno', 10, true, true, true, 3)
  returning id into uno;
  perform pg_temp.rs_regla(a, true);
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, estado_subasta, subasta_fin_en, subasta_resultado, subasta_resuelta_en)
  values (o, 'rs no ganada', uno, now() - interval '10 days', 'terminada', now() - interval '10 days', 'no_ganada', now());
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, estado_subasta, subasta_fin_en)
  values (o, 'rs sin resolver', uno, now() - interval '10 days', 'terminada', now() - interval '10 days');
  insert into public.vehiculos (origen_id, titulo, estado_subasta, subasta_resultado, subasta_resuelta_en)
  values (o, 'rs no ganada sin fase', 'vendida', 'no_ganada', now());
  r := pg_temp.rs_resumen(duena, o);
  perform pg_temp.rs_igual('R5 vehículos de la fase', pg_temp.rs_fila(r, 'rs uno') -> 'vehiculos', '{"n": 1, "hay_mas": false}'::jsonb);
  perform pg_temp.rs_igual('R5 demorados', pg_temp.rs_fila(r, 'rs uno') -> 'demorados', '{"n": 1, "hay_mas": false}'::jsonb);
  perform pg_temp.rs_igual('R5 «Sin fase» no sale con sólo una no ganada', (select count(*)::int from jsonb_array_elements(r -> 'fases') e where e ->> 'fase_id' is null), 0);
end $$;
rollback;

-- @test resumen: «propios» cuenta lo creado y lo de la cartera, nunca lo ajeno (R6)
begin;
do $$
declare
  a uuid := pg_temp.rs_flujo(); o uuid := pg_temp.rs_origen_de(a); uno uuid := pg_temp.rs_fase(a, 'rs uno', 10, 3);
  duena uuid := pg_temp.rs_persona(array['logistica.ver', 'vehiculos.ver']);
  prop uuid := pg_temp.rs_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o], 'propios');
  otra uuid := pg_temp.rs_persona(array['vehiculos.ver']);
  v_lead uuid; v_cartera uuid; v_sf uuid; r jsonb;
begin
  perform pg_temp.rs_regla(a, true);
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('RS lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), prop) returning id into v_lead;
  perform pg_temp.rs_vehiculo(o, uno, prop, now() - interval '10 days');          -- creada por Ana, demorada
  perform pg_temp.rs_vehiculo(o, uno, otra, now() - interval '10 days');          -- ajena
  v_cartera := pg_temp.rs_vehiculo(o, uno, otra, now() - interval '1 day');       -- de la cartera de Ana
  update public.vehiculos set lead_id = v_lead where id = v_cartera;
  v_sf := pg_temp.rs_vehiculo(o, null, otra);                                     -- ajena y sin fase
  r := pg_temp.rs_resumen(prop, o);
  perform pg_temp.rs_igual('R6 propios, la fase', pg_temp.rs_fila(r, 'rs uno') -> 'vehiculos', '{"n": 2, "hay_mas": false}'::jsonb);
  perform pg_temp.rs_igual('R6 propios, demorados', pg_temp.rs_fila(r, 'rs uno') -> 'demorados', '{"n": 1, "hay_mas": false}'::jsonb);
  perform pg_temp.rs_igual('R6 propios, «Sin fase» sin lo ajeno', (select count(*)::int from jsonb_array_elements(r -> 'fases') e where e ->> 'fase_id' is null), 0);
  r := pg_temp.rs_resumen(duena, o);
  perform pg_temp.rs_igual('R6 la dueña ve todo', pg_temp.rs_fila(r, 'rs uno') -> 'vehiculos', '{"n": 3, "hay_mas": false}'::jsonb);
  perform pg_temp.rs_igual('R6 la dueña ve «Sin fase»', pg_temp.rs_fila(r, null) -> 'vehiculos', '{"n": 1, "hay_mas": false}'::jsonb);
end $$;
rollback;
