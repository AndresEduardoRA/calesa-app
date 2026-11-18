-- Quién guarda una cotización sin vehículo y sin lead (T10): `cotizaciones.crear.sin_vehiculo` y `cotizaciones.crear.sin_lead`, dos claves por origen y sin alcance.
-- Sin la clave de ese origen el vínculo es obligatorio; una final pide siempre los dos. Lo hacen cumplir `cotizacion_crear()` y `cotizacion_encima()`, y
-- `cotizacion_hoja_guardada()` dice con ellas si se puede cotizar encima. No depende de otro archivo (`SOLO=areas/cotizaciones/vinculos-por-rol.sql`);
-- cada bloque abre su transacción y la revierte. La primera cuenta nace dueña: cada bloque empieza por `vr_duena()`.
--
-- Qué asegura:
--   V1. Catálogo: las dos claves por origen y sin alcance; el dueño las tiene sin origen; el «Asesor» de la semilla no.
--   V2. Combinaciones: cuatro personas (sin claves, sólo vehículo, sólo lead, las dos) × lead sí/no × vehículo sí/no; el lead se mira primero; una clave de otro origen no vale.
--   V3. Una final pide los dos aun con las claves; el vehículo se mira antes que el lead.
--   V4. Cotizar encima: una anterior sin lead pide `sin_lead`; una sin vehículo, `sin_vehiculo`; del origen de la anterior.
--   V5. `puede_cotizar_encima` de la hoja de una guardada sigue las claves de quien mira.
--   V6. Una cotización sin lead la ve quien la creó con «propios» y quien ve «todos»; en el listado también.
--   V7. `cotizacion_hoja()` ya no trae `vehiculo_obligatorio`.
--   V8. La columna del ajuste global y la firma vieja de su RPC ya no existen; la RPC nueva guarda la vigencia y da PT409 con una versión vieja.

create temp sequence vr_telefono;

create or replace function pg_temp.vr_duena() returns uuid language plpgsql as $f$
declare v uuid;
begin
  select ur.usuario_id into v from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' order by ur.usuario_id limit 1;
  if v is null then
    v := gen_random_uuid();
    insert into auth.users (id, email, raw_app_meta_data) values (v, v || '@ejemplo.com', '{"invitado": true}');
  end if;
  return v;
end $f$;

-- Una persona con un rol propio: cada concesión es {clave, origen (nulo = todos), alcance}.
create or replace function pg_temp.vr_persona(p_concesiones jsonb) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('vr_' || substr(replace(v_id::text, '-', ''), 1, 12), 'VR ' || substr(v_id::text, 1, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Las concesiones de las claves dadas (sin origen, «todos») más, opcionalmente, otras de un origen.
create or replace function pg_temp.vr_c(p_claves text[], p_origen uuid default null, p_en_origen text[] default '{}') returns jsonb language sql as $f$
  select coalesce(jsonb_agg(jsonb_build_object('clave', c)), '[]'::jsonb) || coalesce((select jsonb_agg(jsonb_build_object('clave', e, 'origen', p_origen)) from unnest(p_en_origen) e), '[]'::jsonb)
    from unnest(p_claves) c
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.vr_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Dos orígenes con su fórmula publicada, un lead y un vehículo del primero (los crea la dueña).
create or replace function pg_temp.vr_terreno() returns jsonb language plpgsql as $f$
declare duena uuid := pg_temp.vr_duena(); o uuid; o2 uuid; f uuid; f2 uuid; l uuid; v uuid;
  v_def jsonb := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  v_vis jsonb := jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                                    'total', jsonb_build_object('ver', 'todos', 'editar', null));
begin
  insert into public.origenes (clave, nombre) values ('vr_' || substr(gen_random_uuid()::text, 1, 8), 'VR origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.origenes (clave, nombre) values ('vr2_' || substr(gen_random_uuid()::text, 1, 8), 'VR otro ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o2;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', v_def, '{}', '{}', v_vis) returning id into f;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o2, 1, 'publicada', v_def, '{}', '{}', v_vis) returning id into f2;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('VR lead', '7218' || lpad(nextval('pg_temp.vr_telefono')::text, 4, '0'), duena, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'VR vehículo', 'toyota') returning id into v;
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 days' where tipo_cambio_id in (select id from public.tipos_cambio);
  return jsonb_build_object('o', o, 'o2', o2, 'f', f, 'f2', f2, 'l', l, 'v', v, 'duena', duena);
end $f$;

-- `cotizacion_crear` como esa persona, en el origen `o` u `o2` del terreno, con la hoja abierta que firmaría `cotizacion_hoja()` para ella (y un título: sin vehículo es obligatorio,
-- lo prueba `titulo.sql`). Devuelve la respuesta o el error.
create or replace function pg_temp.vr_crear(p_quien uuid, t jsonb, p_origen text, p_lead uuid, p_vehiculo uuid, p_clase text default 'preventa') returns jsonb language plpgsql as $f$
declare v_o uuid := (t ->> p_origen)::uuid; v_f uuid := (t ->> case when p_origen = 'o' then 'f' else 'f2' end)::uuid; v_abierta text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  v_abierta := public._cotizacion_abierta_firmar(v_o, v_f, now());
  return pg_temp.vr_corre(p_quien, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {"visible": 10}}''::jsonb, %L, %L, null, null, %L, p_titulo => %L)',
                                          v_o, p_lead, v_abierta, p_vehiculo, p_clase, 'VR cotización'));
end $f$;

-- «ok» o «<sqlstate>:<hint>».
create or replace function pg_temp.vr_dice(r jsonb) returns text language sql as $f$
  select case when r ? 'error' then (r ->> 'error') || ':' || coalesce(r ->> 'hint', '') else 'ok' end
$f$;

-- Una anterior escrita como postgres sobre la publicada del origen `o`, con o sin lead y con o sin vehículo.
create or replace function pg_temp.vr_ant(t jsonb, p_creador uuid, p_con_lead boolean, p_con_vehiculo boolean) returns uuid language plpgsql as $f$
declare f public.formulas; v_ent jsonb; v_res jsonb; c uuid;
begin
  select * into f from public.formulas where origen_id = (t ->> 'o')::uuid and estado = 'publicada';
  v_ent := '{"inputs": {"visible": 100}, "banderas": {}, "overrides": {}, "vehiculo": {}, "tablas": {}, "tipos_cambio": {"oficial": 1.11}}';
  v_res := public.evaluar_formula(f.definicion, f.params, v_ent, '{"buckets": {"origen": "tc"}, "total_en": "tc"}');
  insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
  values ((t ->> 'o')::uuid, case when p_con_lead then (t ->> 'l')::uuid end, case when p_con_vehiculo then (t ->> 'v')::uuid end, p_creador, 'preventa', f.id,
          v_res -> 'valores', v_res -> 'fuentes', v_ent -> 'tipos_cambio', v_res -> 'totales', (v_res #>> '{totales,usd}')::numeric, 'VR título')
  returning id into c;
  return c;
end $f$;

create or replace function pg_temp.vr_encima(p_quien uuid, p_ant uuid) returns jsonb language sql as $f$
  select pg_temp.vr_corre(p_quien, format('select public.cotizacion_encima(gen_random_uuid(), %L)', p_ant))
$f$;

-- @test vinculos por rol: V1 el catálogo trae las dos claves por origen y sin alcance; el dueño las tiene sin origen y el «Asesor» de la semilla no
begin;
do $$
declare v_p record; v_n int;
begin
  perform pg_temp.vr_duena();
  select count(*) into v_n from public.permisos where clave in ('cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead');
  if v_n <> 2 then raise exception 'V1: faltan claves en el catálogo: %', v_n; end if;
  for v_p in select * from public.permisos where clave in ('cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead') loop
    if v_p.modulo is distinct from 'cotizaciones' or v_p.por_origen is not true or v_p.con_alcance is not false
       or v_p.aplicado_en not like '%cotizacion_crear%' or v_p.aplicado_en not like '%cotizacion_encima%' or v_p.aplicado_en not like '%_cotizacion_cadena%' then
      raise exception 'V1: la fila del catálogo no es la esperada: %', to_jsonb(v_p);
    end if;
  end loop;
  if (select orden from public.permisos where clave = 'cotizaciones.crear.sin_vehiculo') is distinct from 231
     or (select orden from public.permisos where clave = 'cotizaciones.crear.sin_lead') is distinct from 232 then raise exception 'V1: el orden no sigue a «Cotizar»'; end if;
  if (select nombre from public.permisos where clave = 'cotizaciones.crear.sin_vehiculo') is distinct from 'Guardar sin vehículo'
     or (select nombre from public.permisos where clave = 'cotizaciones.crear.sin_lead') is distinct from 'Guardar sin lead' then raise exception 'V1: los nombres'; end if;
  select count(*) into v_n from public.roles_permisos rp join public.roles r on r.id = rp.rol_id
   where r.clave = 'dueno' and rp.permiso_clave in ('cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead') and rp.origen_id is null and rp.alcance = 'todos';
  if v_n <> 2 then raise exception 'V1: el dueño no tiene las dos claves sin origen: %', v_n; end if;
  if exists (select 1 from public.roles_permisos rp join public.roles r on r.id = rp.rol_id
              where r.clave = 'asesor' and rp.permiso_clave in ('cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead')) then
    raise exception 'V1: el Asesor de la semilla tiene una clave que no le toca';
  end if;
end $$;
rollback;

-- @test vinculos por rol: V2 cada combinación de claves × lead × vehículo da ok o 22023 con su hint; el lead se mira primero y una clave de otro origen no vale
begin;
do $$
declare
  t jsonb := pg_temp.vr_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid;
  base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver'];
  p_ninguna uuid; p_veh uuid; p_lead uuid; p_las_dos uuid; p_otro uuid; r jsonb; v_espera text; v_dice text; v_quien text; v_hay_lead boolean; v_hay_veh boolean;
  v_con_lead boolean; v_con_veh boolean; v_persona uuid;
begin
  -- Las claves de las personas van en el origen O: sin claves, sólo vehículo, sólo lead, las dos; la quinta las tiene en O2 y cotiza en O.
  p_ninguna := pg_temp.vr_persona(pg_temp.vr_c(base));
  p_veh := pg_temp.vr_persona(pg_temp.vr_c(base, o, array['cotizaciones.crear.sin_vehiculo']));
  p_lead := pg_temp.vr_persona(pg_temp.vr_c(base, o, array['cotizaciones.crear.sin_lead']));
  p_las_dos := pg_temp.vr_persona(pg_temp.vr_c(base, o, array['cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead']));
  p_otro := pg_temp.vr_persona(pg_temp.vr_c(base, o2, array['cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead']));
  foreach v_quien in array array['ninguna', 'veh', 'lead', 'las_dos', 'otro'] loop
    v_persona := case v_quien when 'ninguna' then p_ninguna when 'veh' then p_veh when 'lead' then p_lead when 'las_dos' then p_las_dos else p_otro end;
    v_con_lead := v_quien in ('lead', 'las_dos');
    v_con_veh := v_quien in ('veh', 'las_dos');
    foreach v_hay_lead in array array[true, false] loop
      foreach v_hay_veh in array array[true, false] loop
        v_espera := case when not v_hay_lead and not v_con_lead then '22023:lead'
                         when not v_hay_veh and not v_con_veh then '22023:vehiculo'
                         else 'ok' end;
        r := pg_temp.vr_crear(v_persona, t, 'o', case when v_hay_lead then l end, case when v_hay_veh then v end);
        v_dice := pg_temp.vr_dice(r);
        if v_dice is distinct from v_espera then
          raise exception 'V2: % con lead % y vehículo %: esperaba % y dio %', v_quien, v_hay_lead, v_hay_veh, v_espera, r;
        end if;
        if v_dice = 'ok' and ((select c.lead_id from public.cotizaciones c where c.id = (r -> 'cotizacion' ->> 'id')::uuid) is distinct from case when v_hay_lead then l end
           or (select c.vehiculo_id from public.cotizaciones c where c.id = (r -> 'cotizacion' ->> 'id')::uuid) is distinct from case when v_hay_veh then v end) then
          raise exception 'V2: % guardó otro lead u otro vehículo que el que mandó: %', v_quien, r;
        end if;
      end loop;
    end loop;
  end loop;
  -- La clave de O2 en O no vale, y en O2 sí: la quinta guarda sin nada en O2.
  r := pg_temp.vr_crear(p_otro, t, 'o2', null, null);
  if pg_temp.vr_dice(r) is distinct from 'ok' then raise exception 'V2: la clave de su origen debía valer: %', r; end if;
  -- Un rechazo no deja una cotización.
  if (select count(*) from public.cotizaciones where origen_id = o and creado_por = p_ninguna) <> 1 then
    raise exception 'V2: sin claves sólo guarda con lead y vehículo, y dejó %', (select count(*) from public.cotizaciones where origen_id = o and creado_por = p_ninguna);
  end if;
end $$;
rollback;

-- @test vinculos por rol: V3 una final pide los dos aun con las dos claves; el vehículo se mira antes que el lead
begin;
do $$
declare
  t jsonb := pg_temp.vr_terreno(); o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; f uuid; r jsonb;
begin
  f := pg_temp.vr_persona(pg_temp.vr_c(array['cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'leads.editar', 'vehiculos.ver', 'cotizaciones.final.gestionar'], o,
                                       array['cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead']));
  r := pg_temp.vr_crear(f, t, 'o', l, null, 'final');
  if pg_temp.vr_dice(r) is distinct from '22023:vehiculo' then raise exception 'V3: una final sin vehículo: %', r; end if;
  r := pg_temp.vr_crear(f, t, 'o', null, v, 'final');
  if pg_temp.vr_dice(r) is distinct from '22023:lead' then raise exception 'V3: una final sin lead: %', r; end if;
  r := pg_temp.vr_crear(f, t, 'o', null, null, 'final');
  if pg_temp.vr_dice(r) is distinct from '22023:vehiculo' then raise exception 'V3: una final sin nada pide primero el vehículo: %', r; end if;
  -- La misma persona guarda una preventa sin nada.
  r := pg_temp.vr_crear(f, t, 'o', null, null);
  if pg_temp.vr_dice(r) is distinct from 'ok' then raise exception 'V3: la preventa sin nada debía guardarse: %', r; end if;
  if exists (select 1 from public.cotizaciones where origen_id = o and clase = 'final') then raise exception 'V3: un rechazo dejó una final'; end if;
end $$;
rollback;

-- @test vinculos por rol: V4 cotizar encima pide sin_lead para una anterior sin lead y sin_vehiculo para una sin vehículo, del origen de la anterior
begin;
do $$
declare
  t jsonb := pg_temp.vr_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; duena uuid := (t ->> 'duena')::uuid;
  base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver'];
  p_ninguna uuid; p_veh uuid; p_lead uuid; p_otro uuid; a uuid; r jsonb;
begin
  p_ninguna := pg_temp.vr_persona(pg_temp.vr_c(base));
  p_veh := pg_temp.vr_persona(pg_temp.vr_c(base, o, array['cotizaciones.crear.sin_vehiculo']));
  p_lead := pg_temp.vr_persona(pg_temp.vr_c(base, o, array['cotizaciones.crear.sin_lead']));
  p_otro := pg_temp.vr_persona(pg_temp.vr_c(base, o2, array['cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead']));
  -- Una anterior sin lead (con vehículo): sin la clave del lead, 22023 lead; con la del vehículo sola, también; con la del lead, crea la versión 2.
  a := pg_temp.vr_ant(t, duena, false, true);
  foreach r in array array[pg_temp.vr_encima(p_ninguna, a), pg_temp.vr_encima(p_veh, a), pg_temp.vr_encima(p_otro, a)] loop
    if pg_temp.vr_dice(r) is distinct from '22023:lead' then raise exception 'V4: sin sin_lead en el origen de la anterior: %', r; end if;
  end loop;
  if exists (select 1 from public.cotizaciones where cotizacion_padre_id = a) then raise exception 'V4: un rechazo dejó una versión nueva'; end if;
  r := pg_temp.vr_encima(p_lead, a);
  if pg_temp.vr_dice(r) is distinct from 'ok' or (r -> 'cotizacion' ->> 'version')::int <> 2 then raise exception 'V4: con sin_lead debía crear la versión 2: %', r; end if;
  if (select c.lead_id from public.cotizaciones c where c.id = (r -> 'cotizacion' ->> 'id')::uuid) is not null then raise exception 'V4: la versión nueva inventó un lead'; end if;
  -- Una anterior sin vehículo (con lead): sin la clave del vehículo, 22023 vehiculo; con ella, la versión 2.
  a := pg_temp.vr_ant(t, duena, true, false);
  foreach r in array array[pg_temp.vr_encima(p_ninguna, a), pg_temp.vr_encima(p_lead, a), pg_temp.vr_encima(p_otro, a)] loop
    if pg_temp.vr_dice(r) is distinct from '22023:vehiculo' then raise exception 'V4: sin sin_vehiculo en el origen de la anterior: %', r; end if;
  end loop;
  r := pg_temp.vr_encima(p_veh, a);
  if pg_temp.vr_dice(r) is distinct from 'ok' or (r -> 'cotizacion' ->> 'version')::int <> 2 then raise exception 'V4: con sin_vehiculo debía crear la versión 2: %', r; end if;
  -- Sin lead y sin vehículo: el lead primero; con las dos claves, crea.
  a := pg_temp.vr_ant(t, duena, false, false);
  r := pg_temp.vr_encima(p_ninguna, a);
  if pg_temp.vr_dice(r) is distinct from '22023:lead' then raise exception 'V4: sin nada y sin claves: %', r; end if;
  r := pg_temp.vr_encima(p_veh, a);
  if pg_temp.vr_dice(r) is distinct from '22023:lead' then raise exception 'V4: sin nada, con sólo el vehículo: %', r; end if;
  r := pg_temp.vr_encima(p_lead, a);
  if pg_temp.vr_dice(r) is distinct from '22023:vehiculo' then raise exception 'V4: sin nada, con sólo el lead: %', r; end if;
  r := pg_temp.vr_encima(duena, a);
  if pg_temp.vr_dice(r) is distinct from 'ok' then raise exception 'V4: la dueña (las dos claves) debía crear: %', r; end if;
end $$;
rollback;

-- @test vinculos por rol: V5 puede_cotizar_encima de la hoja de una guardada sigue las claves de quien mira
begin;
do $$
declare
  t jsonb := pg_temp.vr_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; duena uuid := (t ->> 'duena')::uuid;
  base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver'];
  p_ninguna uuid; p_veh uuid; p_lead uuid; p_otro uuid; con_todo uuid; sin_lead uuid; sin_veh uuid; sin_nada uuid;
begin
  p_ninguna := pg_temp.vr_persona(pg_temp.vr_c(base));
  p_veh := pg_temp.vr_persona(pg_temp.vr_c(base, o, array['cotizaciones.crear.sin_vehiculo']));
  p_lead := pg_temp.vr_persona(pg_temp.vr_c(base, o, array['cotizaciones.crear.sin_lead']));
  p_otro := pg_temp.vr_persona(pg_temp.vr_c(base, o2, array['cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead']));
  con_todo := pg_temp.vr_ant(t, duena, true, true);
  sin_lead := pg_temp.vr_ant(t, duena, false, true);
  sin_veh := pg_temp.vr_ant(t, duena, true, false);
  sin_nada := pg_temp.vr_ant(t, duena, false, false);
  -- Con lead y vehículo, todas las personas con crear pueden; sin lead, sólo con sin_lead; sin vehículo, sólo con sin_vehiculo; sin los dos, con las dos.
  if not (select bool_and(coalesce((pg_temp.vr_corre(q, format('select public.cotizacion_hoja_guardada(%L)', con_todo)) -> 'puede_cotizar_encima')::boolean, false))
            from unnest(array[p_ninguna, p_veh, p_lead, p_otro, duena]) q) then raise exception 'V5: con lead y vehículo debía poder cualquiera con crear'; end if;
  if (pg_temp.vr_corre(p_ninguna, format('select public.cotizacion_hoja_guardada(%L)', sin_lead)) -> 'puede_cotizar_encima')::boolean is distinct from false
     or (pg_temp.vr_corre(p_veh, format('select public.cotizacion_hoja_guardada(%L)', sin_lead)) -> 'puede_cotizar_encima')::boolean is distinct from false
     or (pg_temp.vr_corre(p_otro, format('select public.cotizacion_hoja_guardada(%L)', sin_lead)) -> 'puede_cotizar_encima')::boolean is distinct from false
     or (pg_temp.vr_corre(p_lead, format('select public.cotizacion_hoja_guardada(%L)', sin_lead)) -> 'puede_cotizar_encima')::boolean is distinct from true
     or (pg_temp.vr_corre(duena, format('select public.cotizacion_hoja_guardada(%L)', sin_lead)) -> 'puede_cotizar_encima')::boolean is distinct from true then
    raise exception 'V5: sin lead sigue sin_lead del origen';
  end if;
  if (pg_temp.vr_corre(p_ninguna, format('select public.cotizacion_hoja_guardada(%L)', sin_veh)) -> 'puede_cotizar_encima')::boolean is distinct from false
     or (pg_temp.vr_corre(p_lead, format('select public.cotizacion_hoja_guardada(%L)', sin_veh)) -> 'puede_cotizar_encima')::boolean is distinct from false
     or (pg_temp.vr_corre(p_otro, format('select public.cotizacion_hoja_guardada(%L)', sin_veh)) -> 'puede_cotizar_encima')::boolean is distinct from false
     or (pg_temp.vr_corre(p_veh, format('select public.cotizacion_hoja_guardada(%L)', sin_veh)) -> 'puede_cotizar_encima')::boolean is distinct from true then
    raise exception 'V5: sin vehículo sigue sin_vehiculo del origen';
  end if;
  if (pg_temp.vr_corre(p_lead, format('select public.cotizacion_hoja_guardada(%L)', sin_nada)) -> 'puede_cotizar_encima')::boolean is distinct from false
     or (pg_temp.vr_corre(p_veh, format('select public.cotizacion_hoja_guardada(%L)', sin_nada)) -> 'puede_cotizar_encima')::boolean is distinct from false
     or (pg_temp.vr_corre(duena, format('select public.cotizacion_hoja_guardada(%L)', sin_nada)) -> 'puede_cotizar_encima')::boolean is distinct from true then
    raise exception 'V5: sin lead y sin vehículo pide las dos';
  end if;
end $$;
rollback;

-- @test vinculos por rol: V6 una cotización sin lead la ve quien la creó con «propios» y quien ve «todos», no otra persona con «propios»; el listado igual
begin;
do $$
declare
  t jsonb := pg_temp.vr_terreno(); o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; r jsonb; c uuid;
  p_creadora uuid; p_todos uuid; p_otra uuid; v_veo text;
begin
  p_creadora := pg_temp.vr_persona(jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'alcance', 'propios'), jsonb_build_object('clave', 'cotizaciones.crear'),
                                                     jsonb_build_object('clave', 'leads.ver'), jsonb_build_object('clave', 'vehiculos.ver'),
                                                     jsonb_build_object('clave', 'cotizaciones.crear.sin_lead', 'origen', o)));
  p_todos := pg_temp.vr_persona(pg_temp.vr_c(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver']));
  p_otra := pg_temp.vr_persona(jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'alcance', 'propios'), jsonb_build_object('clave', 'cotizaciones.crear'),
                                                 jsonb_build_object('clave', 'leads.ver'), jsonb_build_object('clave', 'vehiculos.ver')));
  r := pg_temp.vr_crear(p_creadora, t, 'o', null, v);
  if pg_temp.vr_dice(r) is distinct from 'ok' then raise exception 'V6: no se creó: %', r; end if;
  c := (r -> 'cotizacion' ->> 'id')::uuid;
  if (select lead_id from public.cotizaciones where id = c) is not null then raise exception 'V6: la cotización trae un lead'; end if;
  foreach v_veo in array array['creadora', 'todos', 'otra'] loop
    if (pg_temp.vr_corre(case v_veo when 'creadora' then p_creadora when 'todos' then p_todos else p_otra end,
                         format('select to_jsonb(public.puede_cotizacion(%L, ''cotizaciones.ver''))', c)))::boolean is distinct from (v_veo <> 'otra') then
      raise exception 'V6: puede_cotizacion de %', v_veo;
    end if;
    if (pg_temp.vr_corre(case v_veo when 'creadora' then p_creadora when 'todos' then p_todos else p_otra end,
                         format('select to_jsonb(exists (select 1 from public.cotizaciones_listado(50, %L) l where l.id = %L))', o, c)))::boolean is distinct from (v_veo <> 'otra') then
      raise exception 'V6: el listado de %', v_veo;
    end if;
    if (pg_temp.vr_corre(case v_veo when 'creadora' then p_creadora when 'todos' then p_todos else p_otra end,
                         format('select to_jsonb(exists (select 1 from public.cotizaciones x where x.id = %L))', c)))::boolean is distinct from (v_veo <> 'otra') then
      raise exception 'V6: la policy de lectura de %', v_veo;
    end if;
  end loop;
end $$;
rollback;

-- @test vinculos por rol: V7 cotizacion_hoja ya no trae vehiculo_obligatorio: sus claves son las de la lectura de la hoja más estado, origen y la hoja abierta
begin;
do $$
declare
  t jsonb := pg_temp.vr_terreno(); o uuid := (t ->> 'o')::uuid; duena uuid := (t ->> 'duena')::uuid; r jsonb; v_esperadas text[]; v_dadas text[];
begin
  r := pg_temp.vr_corre(duena, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' or r ->> 'estado' is distinct from 'lista' then raise exception 'V7: la dueña no recibe la hoja: %', left(r::text, 300); end if;
  if r ? 'vehiculo_obligatorio' then raise exception 'V7: la hoja sigue trayendo vehiculo_obligatorio'; end if;
  v_dadas := array(select k from jsonb_object_keys(r) k order by k);
  v_esperadas := array(select k from (select jsonb_object_keys(public._cotizacion_hoja((t ->> 'f')::uuid, o)) union select unnest(array['estado', 'origen', 'abierta_en', 'abierta'])) x (k) order by k);
  if v_dadas is distinct from v_esperadas then raise exception 'V7: las claves de la hoja son % y esperaba %', v_dadas, v_esperadas; end if;
end $$;
rollback;

-- @test vinculos por rol: V8 la columna del ajuste global y la firma vieja de su RPC ya no existen; la RPC nueva guarda la vigencia y da PT409 con una versión vieja
begin;
do $$
declare
  duena uuid := pg_temp.vr_duena(); v_ver timestamptz := (select actualizado_en from public.ajustes_empresa where id = 1); r jsonb;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ajustes_empresa' and column_name = 'vehiculo_obligatorio_al_cotizar') then
    raise exception 'V8: la columna del ajuste global sigue en la tabla';
  end if;
  if to_regprocedure('public.empresa_guardar_ajustes_de_cotizacion(integer, boolean, timestamptz)') is not null then raise exception 'V8: la firma vieja de la RPC sigue'; end if;
  if to_regprocedure('public.empresa_guardar_ajustes_de_cotizacion(integer, timestamptz)') is null then raise exception 'V8: falta la RPC nueva'; end if;
  r := pg_temp.vr_corre(duena, format('select to_jsonb(public.empresa_guardar_ajustes_de_cotizacion(45, %L::timestamptz))', v_ver));
  if r ? 'error' or (select vigencia_dias from public.ajustes_empresa where id = 1) is distinct from 45 then raise exception 'V8: no guardó la vigencia: %', r; end if;
  r := pg_temp.vr_corre(duena, format('select to_jsonb(public.empresa_guardar_ajustes_de_cotizacion(46, %L::timestamptz))', v_ver));
  if r ->> 'error' is distinct from 'PT409' then raise exception 'V8: con la versión vieja debía dar PT409: %', r; end if;
end $$;
rollback;
