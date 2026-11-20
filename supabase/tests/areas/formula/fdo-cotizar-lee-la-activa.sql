-- Cotizar lee la fórmula activa del origen (docs/COTIZADOR.md › «Fórmulas del origen»): la hoja, el cálculo por origen, `formula_para_cotizar`, crear, cotizar
-- encima y la publicada de una hoja guardada usan la publicada de la activa. Cambiar de activa con una hoja abierta es «desactualizada», y «Guardar con la N»
-- vale hasta 24 h después de que su fórmula dejó de ser la activa. La tarjeta de una versión se dibuja con la plantilla de SU fórmula del origen, y la huella
-- de la imagen se mueve con esa plantilla y no con la de otra. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno
-- dentro de su transacción y la revierte.

create or replace function pg_temp.fcla_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, detail, hint} si falla. Antes firma, para esa persona, la hoja abierta que
-- el SQL pide con el marcador `@@abierta|origen|versión|µs@@` (ya como `authenticated` la firma no se puede llamar).
create or replace function pg_temp.fcla_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text; v_sql text := p_sql; m text[];
begin
  perform pg_temp.fcla_como(p_quien);
  m := regexp_match(v_sql, '@@abierta\|([0-9a-f-]{36})\|([0-9a-f-]{36})\|([0-9]+)@@');
  if m is not null then
    v_sql := replace(v_sql, '@@abierta|' || m[1] || '|' || m[2] || '|' || m[3] || '@@',
                     public._cotizacion_abierta_firmar(m[1]::uuid, m[2]::uuid, 'epoch'::timestamptz + m[3]::bigint * interval '1 microsecond'));
  end if;
  set local role authenticated;
  begin
    execute v_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', v_d, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- La llamada a cotizacion_crear con la hoja abierta sobre esa versión a esa hora.
create or replace function pg_temp.fcla_crear(p_id uuid, p_o uuid, p_l uuid, p_v uuid, p_abierta uuid, p_abierta_en timestamptz, p_con_la_abierta boolean) returns text language sql as $f$
  select format('select public.cotizacion_crear(p_id => %L, p_origen => %L, p_lead => %L, p_entradas => %L::jsonb, p_abierta => %L, p_vehiculo => %L, p_con_la_abierta => %L)',
                p_id, p_o, p_l, '{"inputs": {"total": 100}}', '@@abierta|' || p_o || '|' || p_abierta || '|' || round(extract(epoch from p_abierta_en) * 1000000)::bigint || '@@',
                p_v, p_con_la_abierta)
$f$;

-- El terreno: un origen con dos fórmulas publicadas por la RPC (la en blanco; la de «B» con el tipo de cambio «paralelo» en vez del por omisión), «Fórmula»
-- activa y «B» no; la plantilla publicada de cada una (la de «B» en su versión 7, para reconocerla); un lead, un vehículo y quien configura y cotiza ahí.
create or replace function pg_temp.fcla_preparar(p_clave text) returns jsonb language plpgsql as $f$
declare
  q uuid := gen_random_uuid(); o uuid; a uuid; b uuid; fa uuid; fb uuid; l uuid; v uuid; v_rol uuid; c text; r jsonb; e jsonb := public._fdo_formula_en_blanco(); def_b jsonb;
begin
  insert into public.origenes (clave, nombre) values (p_clave, 'Cotizar ' || p_clave) returning id into o;
  insert into auth.users (id, email, raw_app_meta_data) values (q, q || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Cotizar ' || p_clave, invitacion_aceptada_en = now() where id = q;
  delete from public.usuarios_roles where usuario_id = q;
  insert into public.roles (clave, nombre) values ('fcla_' || p_clave, 'Cotizar ' || p_clave) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (q, v_rol, true);
  foreach c in array array['cotizaciones.configurar', 'cotizaciones.ver', 'cotizaciones.crear'] loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c, o, 'todos');
  end loop;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'leads.ver', null, 'todos'), (v_rol, 'vehiculos.ver', null, 'todos');
  -- «Fórmula»: la de trabajo, que la primera publicada activa.
  r := pg_temp.fcla_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L)', o, e -> 'definicion', e -> 'params', e -> 'diseno'));
  if r ? 'error' then raise exception 'guardar «Fórmula»: %', r; end if;
  r := pg_temp.fcla_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L))', o, 'v1'));
  if r ? 'error' then raise exception 'publicar «Fórmula»: %', r; end if;
  select d.id into a from public.formulas_del_origen d where d.origen_id = o;
  fa := r #>> '{}';
  -- «B», con otro tipo de cambio: el cálculo dice cuál se usó.
  insert into public.formulas_del_origen (origen_id, nombre, creado_por) values (o, 'B', q) returning id into b;
  def_b := jsonb_set(e -> 'definicion', '{nodos,0,clave}', '"paralelo"');
  r := pg_temp.fcla_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_formula_del_origen => %L)',
                                    o, def_b, e -> 'params', e -> 'diseno', b));
  if r ? 'error' then raise exception 'guardar «B»: %', r; end if;
  r := pg_temp.fcla_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L, p_formula_del_origen => %L))', o, 'v1 de B', b));
  if r ? 'error' then raise exception 'publicar «B»: %', r; end if;
  fb := r #>> '{}';
  insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, version, estado, definicion, publicado_en)
  values (o, a, 1, 'publicada', public._fdo_tarjeta_en_blanco(), now()), (o, b, 7, 'publicada', public._fdo_tarjeta_en_blanco(), now());
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('Cotizar lead', '7219' || lpad((abs(hashtext(p_clave)) % 10000)::text, 4, '0'), q, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'Cotizar vehículo', 'toyota') returning id into v;
  return jsonb_build_object('q', q, 'o', o, 'a', a, 'b', b, 'fa', fa, 'fb', fb, 'l', l, 'v', v);
end $f$;

-- Cambia la activa del origen a esa fórmula, como lo haría activar (apaga la vieja antes de prender la nueva).
create or replace function pg_temp.fcla_activar(p_o uuid, p_fdo uuid) returns void language plpgsql as $f$
begin
  update public.formulas_del_origen set activa = false, desactivada_en = now() where origen_id = p_o and activa and id <> p_fdo;
  update public.formulas_del_origen set activa = true, activada_en = now(), desactivada_en = null where id = p_fdo;
end $f$;

-- @test fórmulas del origen: la hoja, el cálculo, formula_para_cotizar, crear, encima y la hoja guardada usan la activa; «Guardar con la N» vale 24 h tras desactivarse
begin;
do $$
declare
  t jsonb := pg_temp.fcla_preparar('fcla_uno'); r jsonb; c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); c3 uuid := gen_random_uuid();
  q uuid := (t ->> 'q')::uuid; o uuid := (t ->> 'o')::uuid; fa uuid := (t ->> 'fa')::uuid; fb uuid := (t ->> 'fb')::uuid;
  l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid;
  tc_a numeric := (select valor from public.tipos_cambio where clave = (public._fdo_formula_en_blanco() #>> '{definicion,nodos,0,clave}'));
  tc_b numeric := (select valor from public.tipos_cambio where clave = 'paralelo');
begin
  if tc_a = tc_b then raise exception 'el terreno necesita dos tipos de cambio distintos'; end if;
  -- Con «Fórmula» activa, todo lee su publicada.
  r := pg_temp.fcla_corre(q, format('select public.cotizacion_hoja(%L)', o));
  if r #>> '{formula,id}' is distinct from fa::text then raise exception 'la hoja no es la de la activa: %', r -> 'formula'; end if;
  r := pg_temp.fcla_corre(q, format('select public.formula_para_cotizar(%L)', o));
  if r ->> 'id' is distinct from fa::text then raise exception 'formula_para_cotizar no es la de la activa: %', r; end if;
  r := pg_temp.fcla_corre(q, format('select public.cotizacion_evaluar(p_entradas => %L, p_origen => %L)', '{"inputs": {"total": 100}}', o));
  if (r #>> '{valores,tc}')::numeric is distinct from tc_a then raise exception 'el cálculo por origen no usó la activa: %', r; end if;
  r := pg_temp.fcla_corre(q, pg_temp.fcla_crear(c1, o, l, v, fa, now(), false));
  if r ? 'error' then raise exception 'crear con la activa: %', r; end if;
  if (select formula_id from public.cotizaciones where id = c1) is distinct from fa then raise exception 'crear no guardó la publicada de la activa'; end if;

  -- «B» pasa a ser la activa: todo lee la suya.
  perform pg_temp.fcla_activar(o, (t ->> 'b')::uuid);
  r := pg_temp.fcla_corre(q, format('select public.cotizacion_hoja(%L)', o));
  if r #>> '{formula,id}' is distinct from fb::text then raise exception 'tras cambiar la activa, la hoja no es la de «B»: %', r -> 'formula'; end if;
  r := pg_temp.fcla_corre(q, format('select public.formula_para_cotizar(%L)', o));
  if r ->> 'id' is distinct from fb::text then raise exception 'tras cambiar la activa, formula_para_cotizar no es la de «B»: %', r; end if;
  r := pg_temp.fcla_corre(q, format('select public.cotizacion_evaluar(p_entradas => %L, p_origen => %L)', '{"inputs": {"total": 100}}', o));
  if (r #>> '{valores,tc}')::numeric is distinct from tc_b then raise exception 'tras cambiar la activa, el cálculo no usó «B»: %', r; end if;
  r := pg_temp.fcla_corre(q, format('select public.cotizacion_hoja_guardada(%L)', c1));
  if r #>> '{publicada,id}' is distinct from fb::text then raise exception 'la hoja guardada no ofrece la publicada de la activa: %', r -> 'publicada'; end if;
  -- Con la hoja abierta sobre la de «Fórmula»: sin «Guardar con la N», desactualizada; con ella, se guarda con esa versión.
  r := pg_temp.fcla_corre(q, pg_temp.fcla_crear(c2, o, l, v, fa, now() - interval '1 minute', false));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'detail' is distinct from 'desactualizada' or coalesce(r ->> 'mensaje', '') not like 'Se activó la fórmula «B» mientras cotizabas: ahora se cotiza con su versión %.' then
    raise exception 'cambiar la activa con la hoja abierta no dio desactualizada con la fórmula activada: %', r;
  end if;
  r := pg_temp.fcla_corre(q, pg_temp.fcla_crear(c2, o, l, v, fa, now() - interval '1 minute', true));
  if r ? 'error' then raise exception '«Guardar con la N» recién desactivada: %', r; end if;
  if (select formula_id from public.cotizaciones where id = c2) is distinct from fa then raise exception '«Guardar con la N» no guardó la versión abierta'; end if;
  -- Encima de una de «Fórmula» se cotiza con la de la activa.
  r := pg_temp.fcla_corre(q, format('select public.cotizacion_encima(%L, %L)', c3, c1));
  if r ? 'error' then raise exception 'encima: %', r; end if;
  if (select formula_id from public.cotizaciones where id = c3) is distinct from fb then raise exception 'encima no cotizó con la publicada de la activa'; end if;
  -- Desactivada hace más de un día, «Guardar con la N» ya no vale (aunque la hoja se abrió hace menos).
  update public.formulas_del_origen set desactivada_en = now() - interval '25 hours' where id = (t ->> 'a')::uuid;
  r := pg_temp.fcla_corre(q, pg_temp.fcla_crear(gen_random_uuid(), o, l, v, fa, now() - interval '1 hour', true));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_vencida' then raise exception 'desactivada hace 25 h, «Guardar con la N» dio %', r; end if;
end $$;
rollback;

-- @test fórmulas del origen: la tarjeta de una versión usa la plantilla de su fórmula, y la huella de la imagen se mueve con esa plantilla y no con la de otra
begin;
do $$
declare
  t jsonb := pg_temp.fcla_preparar('fcla_dos'); r jsonb; c uuid := gen_random_uuid(); h0 text; h1 text;
  q uuid := (t ->> 'q')::uuid; o uuid := (t ->> 'o')::uuid; a uuid := (t ->> 'a')::uuid; b uuid := (t ->> 'b')::uuid;
  fa uuid := (t ->> 'fa')::uuid; fb uuid := (t ->> 'fb')::uuid;
begin
  -- Con «Fórmula» activa, la versión de «B» se dibuja con la plantilla de «B» (su versión 7) y la de «Fórmula» con la suya.
  r := pg_temp.fcla_corre(q, format('select public.cotizacion_tarjeta(%L)', fb));
  if r ->> 'estado' is distinct from 'lista' or r #>> '{plantilla,version}' is distinct from '7' then raise exception 'la versión de «B» no usó la plantilla de «B»: %', r -> 'plantilla'; end if;
  r := pg_temp.fcla_corre(q, format('select public.cotizacion_tarjeta(%L)', fa));
  if r #>> '{plantilla,version}' is distinct from '1' then raise exception 'la versión de «Fórmula» no usó su plantilla: %', r -> 'plantilla'; end if;
  -- Una cotización con la de «B».
  perform pg_temp.fcla_activar(o, b);
  r := pg_temp.fcla_corre(q, pg_temp.fcla_crear(c, o, (t ->> 'l')::uuid, (t ->> 'v')::uuid, fb, now(), false));
  if r ? 'error' then raise exception 'crear con «B»: %', r; end if;
  perform pg_temp.fcla_activar(o, a);
  h0 := pg_temp.fcla_corre(q, format('select to_jsonb(public.cotizacion_imagen_huella(%L))', c)) #>> '{}';
  if h0 is null or h0 not like 'i-%' then raise exception 'la huella no se calculó: %', h0; end if;
  -- Publicar la plantilla de «Fórmula» (la activa) no la mueve.
  update public.plantillas_tarjeta set estado = 'archivada' where formula_del_origen_id = a and estado = 'publicada';
  insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, version, estado, definicion, publicado_en) values (o, a, 2, 'publicada', public._fdo_tarjeta_en_blanco(), now());
  h1 := pg_temp.fcla_corre(q, format('select to_jsonb(public.cotizacion_imagen_huella(%L))', c)) #>> '{}';
  if h1 is distinct from h0 then raise exception 'publicar la plantilla de otra fórmula movió la huella'; end if;
  -- Publicar la de «B» sí.
  update public.plantillas_tarjeta set estado = 'archivada' where formula_del_origen_id = b and estado = 'publicada';
  insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, version, estado, definicion, publicado_en) values (o, b, 8, 'publicada', public._fdo_tarjeta_en_blanco(), now());
  h1 := pg_temp.fcla_corre(q, format('select to_jsonb(public.cotizacion_imagen_huella(%L))', c)) #>> '{}';
  if h1 is not distinct from h0 then raise exception 'publicar la plantilla de su fórmula no movió la huella'; end if;
end $$;
rollback;
