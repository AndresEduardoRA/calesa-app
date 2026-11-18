-- Una oportunidad abierta por embudo: como mucho una abierta y viva por lead y embudo de una persona. Toda RPC que deja una abierta por un acto
-- de la persona pasa por `_oportunidad_abierta_unica`; la base del alta no falla nunca. No depende de otro archivo
-- (`SOLO=areas/leads/oportunidad-por-embudo.sql`). Cada bloque, su transacción revertida.
--
-- Qué asegura:
--   OE1. Crear una segunda abierta en el mismo embudo falla: 22023, hint embudo_id, detail = id de la abierta, el mensaje con el embudo.
--   OE2. En otro embudo de la misma persona, pasa; un reintento con el mismo id da «repetido», no el rechazo.
--   OE3. Reabrir con `oportunidad_mover` (de ganada a una abierta) con otra abierta, falla; de abierta a abierta o a ganada, pasa.
--   OE4. Restaurar de la papelera una abierta con otra abierta, falla; restaurar una cerrada, pasa.
--   OE5. La abierta en la papelera no cuenta: crear pasa. Nacer ganada tampoco cuenta.
--   OE6. Duplicadas de antes: se editan y se mueven entre abiertas; reabrir una cerrada con dos abiertas, falla.
--   OE7. `oportunidad_guardar` no cambia de embudo: `embudo_id` se rechaza (22023, hint embudo_id).
--   OE8. `_lead_oportunidad_base` con una abierta previa no falla ni suma otra; sin abierta (la base ganada), la crea.
--   OE9. `_oportunidad_abierta_unica` es privada.
--   OE10. `lead_oportunidades` trae `abiertas_por_embudo` sólo en la primera página, una por embudo con abierta.
--   OE11. `embudo_tablero_del_lead`: sólo las de ese lead, en todas las etapas (también ganada y perdida); un lead sin ninguna, columnas vacías;
--         un embudo ajeno, null. `embudo_etapa_pagina_del_lead` respeta el cursor y el lead.

create or replace function pg_temp.oe_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('oe_' || substr(v_id::text, 1, 8), 'OE ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array array['leads.ver', 'leads.crear', 'leads.editar'] loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'propios');
  end loop;
  return v_id;
end $f$;

-- Corre una sentencia (que devuelve jsonb) como la persona: {"ok": <valor>} o {"error", "mensaje", "detail", "hint"}.
create or replace function pg_temp.oe_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_m text; v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true);
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
  return jsonb_build_object('ok', v);
end $f$;

-- Un lead nuevo de la persona (nace con su base abierta en el embudo por defecto); devuelve su id.
create or replace function pg_temp.oe_lead(p_quien uuid, p_nombre text, p_telefono text) returns uuid language plpgsql as $f$
declare v_lead uuid := gen_random_uuid(); r jsonb;
begin
  r := pg_temp.oe_corre(p_quien, format('select public.crear_lead(%L, %L::jsonb)', v_lead, jsonb_build_object('nombre', p_nombre,
    'telefono_principal', p_telefono, 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))));
  if r ? 'error' then raise exception 'oe_lead: %', r; end if;
  return v_lead;
end $f$;

create or replace function pg_temp.oe_etapa(p_embudo uuid, p_cual text) returns uuid language sql as $f$
  select s.id from public.embudos_etapas s
   where s.embudo_id = p_embudo
     and case p_cual when 'inicial' then s.es_inicial when 'ganada' then s.es_ganada when 'perdida' then s.es_perdida
                     else not (s.es_inicial or s.es_ganada or s.es_perdida) end
   order by s.orden limit 1
$f$;

create or replace function pg_temp.oe_crear(p_quien uuid, p_id uuid, p_lead uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.oe_corre(p_quien, format('select public.oportunidad_crear(%L, %L, %L)', p_id, p_lead, p_datos))
$f$;

create or replace function pg_temp.oe_mover(p_quien uuid, p_id uuid, p_etapa uuid) returns jsonb language sql as $f$
  select pg_temp.oe_corre(p_quien, format('select public.oportunidad_mover(%L, %L, %L)', p_id,
    (select o.etapa_id from public.oportunidades o where o.id = p_id), p_etapa))
$f$;

create or replace function pg_temp.oe_version(p_id uuid) returns timestamptz language sql as $f$
  select o.actualizado_en from public.oportunidades o where o.id = p_id
$f$;

-- El rechazo de la guarda: 22023, hint embudo_id, el id de la abierta en detail y el mensaje con el nombre del embudo.
create or replace function pg_temp.oe_rechazo(p_r jsonb, p_abierta uuid, p_embudo uuid, p_caso text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from '22023' or p_r ->> 'hint' is distinct from 'embudo_id' or p_r ->> 'detail' is distinct from p_abierta::text
     or p_r ->> 'mensaje' is distinct from format('Este lead ya tiene una oportunidad abierta en «%s».', (select e.nombre from public.embudos e where e.id = p_embudo)) then
    raise exception '%: debía rechazar con la abierta %: %', p_caso, p_abierta, p_r;
  end if;
end $f$;

create or replace function pg_temp.oe_bien(p_r jsonb, p_caso text) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: falló: %', p_caso, p_r; end if;
  return p_r -> 'ok';
end $f$;

-- @test una abierta por embudo: crear una segunda en el mismo embudo falla con la abierta; en otro, pasa; reintentar es «repetido» (OE1, OE2)
begin;
do $$
declare q uuid; v_lead uuid; v_emb uuid; v_base uuid; v_otro uuid; v_id uuid := gen_random_uuid(); r jsonb;
begin
  perform pg_temp.oe_persona();   -- con `SOLO=`, la primera cuenta nace dueña
  q := pg_temp.oe_persona();
  v_lead := pg_temp.oe_lead(q, 'OE Uno', '72841001');
  v_emb := public._embudo_defecto_de(q);
  select o.id into v_base from public.oportunidades o where o.lead_id = v_lead;
  perform pg_temp.oe_rechazo(pg_temp.oe_crear(q, gen_random_uuid(), v_lead, '{"titulo": "OE segunda"}'), v_base, v_emb, 'OE1');
  perform pg_temp.oe_rechazo(pg_temp.oe_crear(q, gen_random_uuid(), v_lead, jsonb_build_object('titulo', 'OE segunda', 'embudo_id', v_emb,
    'etapa_id', pg_temp.oe_etapa(v_emb, 'media'))), v_base, v_emb, 'OE1 (etapa abierta elegida)');
  if (select count(*) from public.oportunidades o where o.lead_id = v_lead) <> 1 then raise exception 'OE1: el rechazo dejó una fila'; end if;

  v_otro := (pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.embudo_crear(%L, %L)', gen_random_uuid(), 'OE Otro')), 'OE2 embudo') -> 'embudo' ->> 'id')::uuid;
  if v_otro is null then v_otro := (select e.id from public.embudos e where e.usuario_id = q and e.nombre = 'OE Otro'); end if;
  r := pg_temp.oe_bien(pg_temp.oe_crear(q, v_id, v_lead, jsonb_build_object('titulo', 'OE en otro', 'embudo_id', v_otro)), 'OE2');
  if r ->> 'resultado' <> 'creada' then raise exception 'OE2: %', r; end if;
  r := pg_temp.oe_bien(pg_temp.oe_crear(q, v_id, v_lead, jsonb_build_object('titulo', 'OE en otro', 'embudo_id', v_otro)), 'OE2 reintento');
  if r ->> 'resultado' <> 'repetido' then raise exception 'OE2: el reintento debía ser repetido: %', r; end if;
  perform pg_temp.oe_rechazo(pg_temp.oe_crear(q, gen_random_uuid(), v_lead, jsonb_build_object('titulo', 'OE tercera', 'embudo_id', v_otro)),
    v_id, v_otro, 'OE2 (en el otro, ya ocupado)');
end $$;
rollback;

-- @test una abierta por embudo: reabrir con mover falla con otra abierta; entre abiertas o a ganada, pasa (OE3)
begin;
do $$
declare q uuid; v_lead uuid; v_emb uuid; v_base uuid; v_nueva uuid := gen_random_uuid(); r jsonb;
begin
  perform pg_temp.oe_persona();
  q := pg_temp.oe_persona();
  v_lead := pg_temp.oe_lead(q, 'OE Tres', '72841003');
  v_emb := public._embudo_defecto_de(q);
  select o.id into v_base from public.oportunidades o where o.lead_id = v_lead;
  perform pg_temp.oe_bien(pg_temp.oe_mover(q, v_base, pg_temp.oe_etapa(v_emb, 'ganada')), 'OE3 ganar la base');
  perform pg_temp.oe_bien(pg_temp.oe_crear(q, v_nueva, v_lead, '{"titulo": "OE nueva"}'), 'OE3 crear con la base ganada');
  perform pg_temp.oe_rechazo(pg_temp.oe_mover(q, v_base, pg_temp.oe_etapa(v_emb, 'inicial')), v_nueva, v_emb, 'OE3 reabrir');
  perform pg_temp.oe_rechazo(pg_temp.oe_mover(q, v_base, pg_temp.oe_etapa(v_emb, 'media')), v_nueva, v_emb, 'OE3 reabrir en otra abierta');
  r := pg_temp.oe_bien(pg_temp.oe_mover(q, v_base, pg_temp.oe_etapa(v_emb, 'perdida')), 'OE3 de ganada a perdida');
  perform pg_temp.oe_bien(pg_temp.oe_mover(q, v_nueva, pg_temp.oe_etapa(v_emb, 'media')), 'OE3 entre abiertas');
  perform pg_temp.oe_bien(pg_temp.oe_mover(q, v_nueva, pg_temp.oe_etapa(v_emb, 'ganada')), 'OE3 a ganada');
  r := pg_temp.oe_bien(pg_temp.oe_mover(q, v_base, pg_temp.oe_etapa(v_emb, 'inicial')), 'OE3 reabrir sin otra abierta');
  if (select o.estado from public.oportunidades o where o.id = v_base) <> 'abierta' then raise exception 'OE3: la base no se reabrió'; end if;
end $$;
rollback;

-- @test una abierta por embudo: restaurar una abierta con otra abierta falla; una cerrada, pasa; la de la papelera no cuenta (OE4, OE5)
begin;
do $$
declare q uuid; v_lead uuid; v_emb uuid; v_base uuid; v_nueva uuid := gen_random_uuid(); v_ganada uuid := gen_random_uuid(); r jsonb;
begin
  perform pg_temp.oe_persona();
  q := pg_temp.oe_persona();
  v_lead := pg_temp.oe_lead(q, 'OE Cuatro', '72841004');
  v_emb := public._embudo_defecto_de(q);
  select o.id into v_base from public.oportunidades o where o.lead_id = v_lead;
  -- Nacer ganada no cuenta (OE5).
  perform pg_temp.oe_bien(pg_temp.oe_crear(q, v_ganada, v_lead, jsonb_build_object('titulo', 'OE ganada', 'etapa_id', pg_temp.oe_etapa(v_emb, 'ganada'))), 'OE5 nacer ganada');
  perform pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.oportunidad_eliminar(%L, %L)', v_base, pg_temp.oe_version(v_base))), 'OE4 eliminar la base');
  perform pg_temp.oe_bien(pg_temp.oe_crear(q, v_nueva, v_lead, '{"titulo": "OE nueva"}'), 'OE5 con la abierta en la papelera');
  perform pg_temp.oe_rechazo(pg_temp.oe_corre(q, format('select public.oportunidad_restaurar(%L, %L)', v_base, pg_temp.oe_version(v_base))), v_nueva, v_emb, 'OE4 restaurar');
  if (select o.eliminado_en from public.oportunidades o where o.id = v_base) is null then raise exception 'OE4: el rechazo la restauró'; end if;
  perform pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.oportunidad_eliminar(%L, %L)', v_ganada, pg_temp.oe_version(v_ganada))), 'OE4 eliminar la ganada');
  r := pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.oportunidad_restaurar(%L, %L)', v_ganada, pg_temp.oe_version(v_ganada))), 'OE4 restaurar la cerrada');
  if r ->> 'resultado' <> 'restaurada' then raise exception 'OE4: %', r; end if;
end $$;
rollback;

-- @test una abierta por embudo: las duplicadas de antes se editan y se mueven entre abiertas; reabrir una cerrada, no (OE6, OE7)
begin;
do $$
declare q uuid; v_lead uuid; v_emb uuid; v_base uuid; v_dup uuid := gen_random_uuid(); v_cerrada uuid := gen_random_uuid(); r jsonb;
begin
  perform pg_temp.oe_persona();
  q := pg_temp.oe_persona();
  v_lead := pg_temp.oe_lead(q, 'OE Seis', '72841006');
  v_emb := public._embudo_defecto_de(q);
  select o.id into v_base from public.oportunidades o where o.lead_id = v_lead;
  -- Directo, como las que la regla dejó.
  insert into public.oportunidades (id, lead_id, usuario_id, embudo_id, etapa_id, titulo, moneda) values
    (v_dup, v_lead, q, v_emb, pg_temp.oe_etapa(v_emb, 'inicial'), 'OE duplicada', (select moneda_base from public.ajustes_empresa where id = 1)),
    (v_cerrada, v_lead, q, v_emb, pg_temp.oe_etapa(v_emb, 'ganada'), 'OE cerrada', (select moneda_base from public.ajustes_empresa where id = 1));
  r := pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.oportunidad_guardar(%L, %L, %L)', v_dup, pg_temp.oe_version(v_dup), '{"titulo": "OE editada"}')), 'OE6 guardar');
  perform pg_temp.oe_bien(pg_temp.oe_mover(q, v_dup, pg_temp.oe_etapa(v_emb, 'media')), 'OE6 mover entre abiertas');
  perform pg_temp.oe_bien(pg_temp.oe_mover(q, v_base, pg_temp.oe_etapa(v_emb, 'media')), 'OE6 mover la otra entre abiertas');
  r := pg_temp.oe_mover(q, v_cerrada, pg_temp.oe_etapa(v_emb, 'inicial'));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'embudo_id' or r ->> 'detail' not in (v_base::text, v_dup::text) then
    raise exception 'OE6: reabrir con duplicadas debía rechazar: %', r; end if;
  -- OE7: guardar no cambia de embudo.
  r := pg_temp.oe_corre(q, format('select public.oportunidad_guardar(%L, %L, %L)', v_dup, pg_temp.oe_version(v_dup),
    jsonb_build_object('embudo_id', (select e.id from public.embudos e where e.usuario_id = q and e.es_default))));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'embudo_id' then raise exception 'OE7: guardar con embudo_id: %', r; end if;
end $$;
rollback;

-- @test una abierta por embudo: la base del alta no falla ni duplica; sin abierta, la crea; la guarda es privada (OE8, OE9)
begin;
do $$
declare q uuid; v_lead uuid; v_emb uuid; v_base uuid;
begin
  perform pg_temp.oe_persona();
  q := pg_temp.oe_persona();
  v_lead := pg_temp.oe_lead(q, 'OE Ocho', '72841008');
  v_emb := public._embudo_defecto_de(q);
  if (select count(*) from public.oportunidades o where o.lead_id = v_lead) <> 1 then raise exception 'OE8: el alta no dejó su base'; end if;
  select o.id into v_base from public.oportunidades o where o.lead_id = v_lead;
  perform public._lead_oportunidad_base(v_lead, q, 'OE Ocho otra vez');
  if (select count(*) from public.oportunidades o where o.lead_id = v_lead) <> 1 then raise exception 'OE8: la base sumó otra con una abierta'; end if;
  perform pg_temp.oe_bien(pg_temp.oe_mover(q, v_base, pg_temp.oe_etapa(v_emb, 'ganada')), 'OE8 ganar la base');
  perform public._lead_oportunidad_base(v_lead, q, 'OE Ocho otra vez');
  if (select count(*) from public.oportunidades o where o.lead_id = v_lead and o.estado = 'abierta' and o.eliminado_en is null) <> 1 then
    raise exception 'OE8: sin abierta, la base debía crearla'; end if;
  if has_function_privilege('authenticated', 'public._oportunidad_abierta_unica(uuid, uuid, uuid, uuid)', 'execute')
     or has_function_privilege('anon', 'public._oportunidad_abierta_unica(uuid, uuid, uuid, uuid)', 'execute') then
    raise exception 'OE9: _oportunidad_abierta_unica no es privada'; end if;
end $$;
rollback;

-- @test una abierta por embudo: lead_oportunidades trae abiertas_por_embudo sólo en la primera página (OE10)
begin;
do $$
declare q uuid; v_lead uuid; v_emb uuid; v_otro uuid; v_vacio uuid; v_base uuid; v_en_otro uuid := gen_random_uuid(); r jsonb; a jsonb; i int;
begin
  perform pg_temp.oe_persona();
  q := pg_temp.oe_persona();
  v_lead := pg_temp.oe_lead(q, 'OE Diez', '72841010');
  v_emb := public._embudo_defecto_de(q);
  select o.id into v_base from public.oportunidades o where o.lead_id = v_lead;
  perform pg_temp.oe_corre(q, format('select public.embudo_crear(%L, %L)', gen_random_uuid(), 'OE Otro'));
  perform pg_temp.oe_corre(q, format('select public.embudo_crear(%L, %L)', gen_random_uuid(), 'OE Vacío'));
  v_otro := (select e.id from public.embudos e where e.usuario_id = q and e.nombre = 'OE Otro');
  v_vacio := (select e.id from public.embudos e where e.usuario_id = q and e.nombre = 'OE Vacío');
  perform pg_temp.oe_bien(pg_temp.oe_crear(q, v_en_otro, v_lead, jsonb_build_object('titulo', 'OE en otro', 'embudo_id', v_otro)), 'OE10 crear en otro');
  -- Una ganada en el vacío: no cuenta.
  perform pg_temp.oe_bien(pg_temp.oe_crear(q, gen_random_uuid(), v_lead, jsonb_build_object('titulo', 'OE cerrada', 'embudo_id', v_vacio,
    'etapa_id', pg_temp.oe_etapa(v_vacio, 'ganada'))), 'OE10 ganada en el vacío');

  r := pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.lead_oportunidades(%L, null, null, null, 1)', v_lead)), 'OE10 página 1');
  a := r -> 'abiertas_por_embudo';
  if jsonb_typeof(a) is distinct from 'array' or jsonb_array_length(a) <> 2 then raise exception 'OE10: abiertas_por_embudo: %', a; end if;
  for i in 0 .. 1 loop
    if (select string_agg(k, ',' order by k) from jsonb_object_keys(a -> i) k) <> 'embudo_id,embudo_nombre,es_default,oportunidad_id' then
      raise exception 'OE10: claves de una abierta: %', a -> i; end if;
  end loop;
  -- El por defecto primero, con su abierta (la base); después el otro, con la suya.
  if not jsonb_path_exists(a, '$[0] ? (@.es_default == true && @.embudo_id == $e && @.oportunidad_id == $o)', jsonb_build_object('e', v_emb, 'o', v_base))
     or not jsonb_path_exists(a, '$[1] ? (@.es_default == false && @.embudo_id == $e && @.oportunidad_id == $o && @.embudo_nombre == "OE Otro")',
                              jsonb_build_object('e', v_otro, 'o', v_en_otro)) then
    raise exception 'OE10: abiertas_por_embudo no es la esperada: %', a; end if;
  if not (r ->> 'hay_mas')::boolean then raise exception 'OE10: con tamaño 1 debía haber más'; end if;

  r := pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.lead_oportunidades(%L, true, %L, %L, 1)', v_lead,
    (r -> 'oportunidades' -> 0 ->> 'ultima_actividad_en'), (r -> 'oportunidades' -> 0 ->> 'id'))), 'OE10 página 2');
  if r ? 'abiertas_por_embudo' then raise exception 'OE10: la página con cursor no debía traer abiertas_por_embudo'; end if;
end $$;
rollback;

-- @test el embudo filtrado por lead: sólo las de ese lead en todas sus etapas; vacío, ajeno y «Ver más» (OE11)
begin;
do $$
declare q uuid; otra uuid; v_lead uuid; v_otro_lead uuid; v_vacio uuid; v_emb uuid; v_base uuid; v_ganada uuid := gen_random_uuid();
  v_perdida uuid := gen_random_uuid(); r jsonb; v_ids text[]; v_ini uuid; v_pag jsonb; i int;
begin
  perform pg_temp.oe_persona();
  q := pg_temp.oe_persona();
  otra := pg_temp.oe_persona();
  v_lead := pg_temp.oe_lead(q, 'OE Once', '72841011');
  v_otro_lead := pg_temp.oe_lead(q, 'OE Once Otro', '72841012');
  v_vacio := pg_temp.oe_lead(q, 'OE Once Vacío', '72841013');
  v_emb := public._embudo_defecto_de(q);
  select o.id into v_base from public.oportunidades o where o.lead_id = v_lead;
  delete from public.oportunidades o where o.lead_id = v_vacio;
  perform pg_temp.oe_bien(pg_temp.oe_crear(q, v_ganada, v_lead, jsonb_build_object('titulo', 'OE ganada', 'etapa_id', pg_temp.oe_etapa(v_emb, 'ganada'))), 'OE11 ganada');
  perform pg_temp.oe_bien(pg_temp.oe_crear(q, v_perdida, v_lead, jsonb_build_object('titulo', 'OE perdida', 'etapa_id', pg_temp.oe_etapa(v_emb, 'perdida'))), 'OE11 perdida');

  r := pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.embudo_tablero_del_lead(%L, %L)', v_emb, v_lead)), 'OE11 tablero');
  if (select string_agg(k, ',' order by k) from jsonb_object_keys(r) k) <> 'columnas,embudo' then raise exception 'OE11: claves: %', r; end if;
  if (select string_agg(k, ',' order by k) from jsonb_object_keys(r -> 'columnas' -> 0) k) <> 'etapa,hay_mas,tarjetas,total,total_hay_mas' then
    raise exception 'OE11: claves de una columna: %', r -> 'columnas' -> 0; end if;
  select array_agg(t ->> 'id' order by t ->> 'id') into v_ids from jsonb_array_elements(r -> 'columnas') c, jsonb_array_elements(c -> 'tarjetas') t;
  if v_ids is distinct from (select array_agg(x::text order by x::text) from unnest(array[v_base, v_ganada, v_perdida]) x) then
    raise exception 'OE11: debían estar sólo las tres del lead (abierta, ganada y perdida): %', v_ids; end if;
  if jsonb_array_length(r -> 'columnas') <> (select count(*) from public.embudos_etapas s where s.embudo_id = v_emb)
     or (select sum((c ->> 'total')::int) from jsonb_array_elements(r -> 'columnas') c) <> 3 then
    raise exception 'OE11: columnas o totales: %', r; end if;

  r := pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.embudo_tablero_del_lead(%L, %L)', v_emb, v_vacio)), 'OE11 vacío');
  if exists (select 1 from jsonb_array_elements(r -> 'columnas') c where jsonb_array_length(c -> 'tarjetas') > 0 or (c ->> 'total')::int <> 0) then
    raise exception 'OE11: el lead sin oportunidades debía dar columnas vacías: %', r; end if;
  r := pg_temp.oe_bien(pg_temp.oe_corre(otra, format('select public.embudo_tablero_del_lead(%L, %L)', v_emb, v_lead)), 'OE11 ajeno');
  if r is not null and r <> 'null'::jsonb then raise exception 'OE11: un embudo ajeno debía dar null: %', r; end if;

  -- «Ver más»: tres más en la inicial (duplicadas de antes, directo y sin triggers: la hora es la del pasado) y páginas de a uno.
  v_ini := pg_temp.oe_etapa(v_emb, 'inicial');
  set local session_replication_role = replica;
  for i in 1 .. 3 loop
    insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, estado, titulo, moneda, ultima_actividad_en)
    values (v_lead, q, v_emb, v_ini, 'abierta', 'OE vieja ' || i, (select moneda_base from public.ajustes_empresa where id = 1), now() - make_interval(days => i));
  end loop;
  set local session_replication_role = origin;
  v_pag := pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.embudo_etapa_pagina_del_lead(%L, %L, null, null, 1)', v_ini, v_lead)), 'OE11 página 1');
  if jsonb_array_length(v_pag -> 'tarjetas') <> 1 or not (v_pag ->> 'hay_mas')::boolean or v_pag -> 'tarjetas' -> 0 ->> 'id' <> v_base::text then
    raise exception 'OE11: la primera página: %', v_pag; end if;
  for i in 1 .. 3 loop
    v_pag := pg_temp.oe_bien(pg_temp.oe_corre(q, format('select public.embudo_etapa_pagina_del_lead(%L, %L, %L, %L, 1)', v_ini, v_lead,
      (select o.ultima_actividad_en from public.oportunidades o where o.id = (v_pag -> 'tarjetas' -> 0 ->> 'id')::uuid),
      v_pag -> 'tarjetas' -> 0 ->> 'id')), 'OE11 página siguiente');
    if jsonb_array_length(v_pag -> 'tarjetas') <> 1 or v_pag -> 'tarjetas' -> 0 -> 'lead' ->> 'id' <> v_lead::text
       or v_pag -> 'tarjetas' -> 0 ->> 'titulo' <> 'OE vieja ' || i or (v_pag ->> 'hay_mas')::boolean <> (i < 3) then
      raise exception 'OE11: la página % con cursor: %', i, v_pag; end if;
  end loop;
end $$;
rollback;
