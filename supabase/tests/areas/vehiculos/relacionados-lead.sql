-- `lead_relacionados()` y `lead_relacionados_pagina()`: vinculados, interesados y cotizados de un lead, con el predicado de las policies de `vehiculos` y de
-- `cotizaciones` y lo oculto contado sin datos. No depende de otro archivo (`SOLO=areas/vehiculos/relacionados-lead.sql`). La otra mitad (la del vehículo y
-- las reglas comunes R1 a R8) está en `relacionados.sql`.
--
-- Qué asegura:
--   RL1. Las filas visibles (por la página «Ver todos») son las de un `select` invocador bajo la RLS: asesora «propios», dueña, supervisora con vehículos
--        «propios» y alguien con cotizaciones «propios».
--   RL2. Lo oculto llega contado: claves exactas, ni un id ni un título de un vehículo que no se ve.
--   RL3. Un lead que no existe, que no se ve o sin `vehiculos.ver` da 42501; un tipo ajeno da 22023; anon no ejecuta.
--   RL4. Sin `cotizaciones.ver` no hay grupo Cotizado; una inválida no cuenta; las revisiones salen una vez; un vehículo en la papelera no se cuenta.
--   RL5. «Ver todos» no repite ni salta con ocultos intercalados.

create temp sequence rm_telefono;
create temp sequence rm_n;

-- Una persona con un rol propio: {clave: alcance}.
create or replace function pg_temp.rm_persona(p_permisos jsonb) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c record;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rm_' || substr(v_id::text, 1, 8), 'RM ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  for c in select * from jsonb_each_text(p_permisos) loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c.key, c.value::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.rm_lead(p_nombre text, p_creador uuid) returns uuid language plpgsql as $f$
declare l uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values (p_nombre, '7391' || lpad(nextval('pg_temp.rm_telefono')::text, 5, '0'), p_creador, (select id from public.origenes_lead where clave = 'web'), '{}')
  returning id into l;
  return l;
end $f$;

create or replace function pg_temp.rm_vehiculo(p_origen uuid, p_lead uuid, p_creador uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, lead_id, creado_por) values (p_origen, 'RM vehículo ' || nextval('pg_temp.rm_n'), p_lead, p_creador) returning id into v;
  return v;
end $f$;

create or replace function pg_temp.rm_interes(p_vehiculo uuid, p_lead uuid, p_hace interval, p_usuario uuid default null) returns void language sql as $f$
  insert into public.vehiculos_interesados (vehiculo_id, lead_id, usuario_id, nota, creado_en) values (p_vehiculo, p_lead, p_usuario, 'nota ' || p_lead, now() - p_hace)
$f$;

create or replace function pg_temp.rm_cot(p_formula uuid, p_origen uuid, p_vehiculo uuid, p_lead uuid, p_creador uuid, p_hace interval,
                                          p_estado text default 'activa') returns uuid language plpgsql as $f$
declare c uuid;
begin
  insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, estado, creado_en)
  values (p_origen, p_lead, p_vehiculo, p_creador, p_formula, '{}', '{}', '{}', '{}', 0, p_estado::public.estado_cotizacion, now() - p_hace)
  returning id into c;
  return c;
end $f$;

-- Corre una sentencia que devuelve jsonb como esa persona, con el rol de la app.
create or replace function pg_temp.rm_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
end $f$;

-- Lo mismo, y el sqlstate si falla (o «ok»).
create or replace function pg_temp.rm_estado(p_quien uuid, p_sql text) returns text language plpgsql as $f$
begin
  perform pg_temp.rm_json(p_quien, p_sql);
  return 'ok';
exception when others then
  return sqlstate;
end $f$;

-- Los ids (uuid[] ordenado) que devuelve una consulta de invocador bajo la RLS: `p_sql` devuelve un jsonb con un arreglo de uuid.
create or replace function pg_temp.rm_ids_rls(p_quien uuid, p_sql text) returns uuid[] language sql as $f$
  select coalesce(array_agg(x::uuid order by x::uuid), '{}') from jsonb_array_elements_text(pg_temp.rm_json(p_quien, p_sql)) x
$f$;

create or replace function pg_temp.rm_ids_de(p_filas jsonb, p_clave text) returns uuid[] language sql as $f$
  select coalesce(array_agg((f ->> p_clave)::uuid order by (f ->> p_clave)::uuid), '{}') from jsonb_array_elements(p_filas) f
$f$;

create or replace function pg_temp.rm_claves(p_obj jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(k order by k), '{}') from jsonb_object_keys(p_obj) k
$f$;

-- El terreno. La dueña de prueba primero (la primera cuenta nace dueña).
--   a (asesora «propios»: cartera de L), b (otra asesora), g (todo «todos»), s (leads «todos», vehículos y cotizaciones «propios»), cp (leads y vehículos «todos»,
--   cotizaciones «propios»), sc (sin cotizaciones.ver).
--   L: el lead de a. Vinculados: v1 (de a), vb (de b: a lo ve por la cartera de L), vs (de s) y vp (en la papelera). Interesados: v1, vb2 (de b, sin
--   lead de a: a no lo ve) y vs. Cotizados: v1 (c1 activa, c2 reportada, c3 inválida) y vb2 (de b, a no ve el vehículo).
create or replace function pg_temp.rm_terreno() returns jsonb language plpgsql as $f$
declare t jsonb; o uuid; f uuid; a uuid; b uuid; g uuid; s uuid; cp uuid; sc uuid; l uuid; lb uuid; v1 uuid; vb uuid; vs uuid; vp uuid; vb2 uuid; v_def jsonb;
begin
  perform pg_temp.rm_persona('{"vehiculos.ver": "todos"}');
  a := pg_temp.rm_persona('{"vehiculos.ver": "propios", "vehiculos.editar": "propios", "leads.ver": "propios", "leads.editar": "propios", "cotizaciones.ver": "propios"}');
  b := pg_temp.rm_persona('{"vehiculos.ver": "propios", "leads.ver": "propios", "leads.editar": "propios", "cotizaciones.ver": "propios"}');
  g := pg_temp.rm_persona('{"vehiculos.ver": "todos", "vehiculos.editar": "todos", "leads.ver": "todos", "leads.editar": "todos", "cotizaciones.ver": "todos"}');
  s := pg_temp.rm_persona('{"vehiculos.ver": "propios", "leads.ver": "todos", "leads.editar": "todos", "cotizaciones.ver": "propios"}');
  cp := pg_temp.rm_persona('{"vehiculos.ver": "todos", "leads.ver": "todos", "cotizaciones.ver": "propios"}');
  sc := pg_temp.rm_persona('{"vehiculos.ver": "todos", "leads.ver": "todos"}');
  insert into public.origenes (clave, nombre) values ('rm_' || substr(gen_random_uuid()::text, 1, 8), 'RM origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('tc'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (o, 1, 'publicada', v_def, '{}', '{"secciones": [{"id": "s1", "titulo": "Uno", "items": [{"tipo": "celda", "nodo": "tc"}]}]}',
          '{"tc": {"ver": "todos", "editar": "todos"}, "total": {"ver": "todos", "editar": null}}', now() - interval '10 days') returning id into f;
  l := pg_temp.rm_lead('RM lead L', a);
  lb := pg_temp.rm_lead('RM lead lb', b);
  v1 := pg_temp.rm_vehiculo(o, l, a);
  vb := pg_temp.rm_vehiculo(o, l, b);
  vs := pg_temp.rm_vehiculo(o, l, s);
  vp := pg_temp.rm_vehiculo(o, l, a);
  update public.vehiculos set eliminado_en = now() where id = vp;
  vb2 := pg_temp.rm_vehiculo(o, lb, b);
  perform pg_temp.rm_interes(v1, l, interval '3 days', a);
  perform pg_temp.rm_interes(vb2, l, interval '2 days', b);
  perform pg_temp.rm_interes(vs, l, interval '1 day', s);
  perform pg_temp.rm_cot(f, o, v1, l, a, interval '6 days');
  perform pg_temp.rm_cot(f, o, v1, l, a, interval '2 days', 'reportada');
  perform pg_temp.rm_cot(f, o, v1, l, a, interval '1 hour', 'invalida');
  perform pg_temp.rm_cot(f, o, vb2, l, b, interval '3 days');
  perform pg_temp.rm_cot(f, o, vp, l, a, interval '4 days');
  return jsonb_build_object('o', o, 'f', f, 'a', a, 'b', b, 'g', g, 's', s, 'cp', cp, 'sc', sc, 'l', l, 'lb', lb, 'v1', v1, 'vb', vb, 'vs', vs, 'vp', vp, 'vb2', vb2);
end $f$;

create or replace function pg_temp.rm_pagina(p_quien uuid, p_lead uuid, p_tipo text, p_tamano int default 20) returns jsonb language sql as $f$
  select pg_temp.rm_json(p_quien, format('select public.lead_relacionados_pagina(%L, %L, null, null, %s)', p_lead, p_tipo, p_tamano))
$f$;

-- RL1 para una persona: lo que dicen las tres páginas es lo que ve un select invocador.
create or replace function pg_temp.rm_iguala(p_etiqueta text, p_quien uuid, p_lead uuid) returns void language plpgsql as $f$
declare v_pag uuid[]; v_rls uuid[];
begin
  v_pag := pg_temp.rm_ids_de(pg_temp.rm_pagina(p_quien, p_lead, 'vinculado') -> 'filas', 'id');
  v_rls := pg_temp.rm_ids_rls(p_quien, format($q$select coalesce(jsonb_agg(v.id), '[]') from public.vehiculos v where v.lead_id = %L$q$, p_lead));
  if v_pag is distinct from v_rls then raise exception 'RL1 (% vinculados): la página dio % y la RLS %', p_etiqueta, v_pag, v_rls; end if;
  v_pag := pg_temp.rm_ids_de(pg_temp.rm_pagina(p_quien, p_lead, 'interesado') -> 'filas', 'id');
  v_rls := pg_temp.rm_ids_rls(p_quien, format($q$select coalesce(jsonb_agg(i.vehiculo_id), '[]') from public.vehiculos_interesados i where i.lead_id = %L$q$, p_lead));
  if v_pag is distinct from v_rls then raise exception 'RL1 (% interesados): la página dio % y la RLS %', p_etiqueta, v_pag, v_rls; end if;
  v_pag := pg_temp.rm_ids_de(pg_temp.rm_pagina(p_quien, p_lead, 'cotizado') -> 'filas', 'id');
  v_rls := pg_temp.rm_ids_rls(p_quien, format($q$
    select coalesce(jsonb_agg(distinct c.vehiculo_id), '[]') from public.cotizaciones c join public.vehiculos v on v.id = c.vehiculo_id
     where c.lead_id = %L and c.estado in ('activa', 'reportada') $q$, p_lead));
  if v_pag is distinct from v_rls then raise exception 'RL1 (% cotizados): la página dio % y la RLS %', p_etiqueta, v_pag, v_rls; end if;
end $f$;

-- @test lead_relacionados: las filas visibles son las de un select invocador para la asesora, la dueña, la supervisora y quien cotiza «propios» (RL1)
begin;
do $$
declare t jsonb := pg_temp.rm_terreno(); l uuid := (t ->> 'l')::uuid; r jsonb;
begin
  perform pg_temp.rm_iguala('asesora', (t ->> 'a')::uuid, l);
  perform pg_temp.rm_iguala('dueña con todos', (t ->> 'g')::uuid, l);
  perform pg_temp.rm_iguala('supervisora', (t ->> 's')::uuid, l);
  perform pg_temp.rm_iguala('cotizaciones propios', (t ->> 'cp')::uuid, l);
  -- Los vehículos devueltos traen lo que la ficha necesita; el de la papelera no.
  r := pg_temp.rm_json((t ->> 'g')::uuid, format('select public.lead_relacionados(%L, 5)', l));
  if (r #>> '{vinculados,leidos}')::int <> 3 or (t ->> 'vp')::uuid = any (pg_temp.rm_ids_de(r #> '{vinculados,filas}', 'id')) then
    raise exception 'RL1: debía haber 3 vinculados sin el de la papelera y dio %', r -> 'vinculados' - 'filas';
  end if;
  if (r ->> 'puedo_actuar')::boolean is not false then raise exception 'RL1: la dueña de «todos» ve L pero no está en su cartera: no actúa'; end if;
  if (pg_temp.rm_json((t ->> 'a')::uuid, format('select public.lead_relacionados(%L)', l)) ->> 'puedo_actuar')::boolean is not true
     or (pg_temp.rm_json((t ->> 's')::uuid, format('select public.lead_relacionados(%L)', l)) ->> 'puedo_actuar')::boolean is not false then
    raise exception 'RL1: puedo_actuar es la cartera: la asesora sí, la supervisora no';
  end if;
end $$;
reset role;
rollback;

-- @test lead_relacionados: lo oculto llega contado, con claves exactas y sin ids ni títulos (RL2)
begin;
do $$
declare t jsonb := pg_temp.rm_terreno(); l uuid := (t ->> 'l')::uuid; r jsonb; fila jsonb; texto text; oculto text;
begin
  -- La supervisora ve L (todos) pero de los vehículos sólo el suyo: 2 vinculados y 1 interesado ocultos, y 2 cotizados (uno por vehículo oculto o sin cotización suya).
  r := pg_temp.rm_json((t ->> 's')::uuid, format('select public.lead_relacionados(%L)', l));
  if pg_temp.rm_claves(r) is distinct from array['cotizados', 'interesados', 'puedo_actuar', 'vinculados'] then raise exception 'RL2: claves de la raíz: %', pg_temp.rm_claves(r); end if;
  if pg_temp.rm_claves(r -> 'vinculados') is distinct from array['filas', 'leidos', 'ocultos'] then raise exception 'RL2: claves de un grupo: %', pg_temp.rm_claves(r -> 'vinculados'); end if;
  if (r #>> '{vinculados,leidos}')::int <> 3 or (r #>> '{vinculados,ocultos}')::int <> 2 or jsonb_array_length(r #> '{vinculados,filas}') <> 1 then
    raise exception 'RL2: la supervisora debía ver 1 de 3 vinculados y dio %', r -> 'vinculados' - 'filas';
  end if;
  for fila in select * from jsonb_array_elements(r #> '{vinculados,filas}') loop
    if pg_temp.rm_claves(fila) is distinct from array['actualizado_en', 'desde', 'editable', 'id', 'numero', 'origen_id', 'origen_nombre', 'portada', 'titulo'] then
      raise exception 'RL2: claves de una fila de vehículo: %', pg_temp.rm_claves(fila);
    end if;
  end loop;
  texto := r::text;
  foreach oculto in array array[t ->> 'v1', t ->> 'vb', t ->> 'vb2', t ->> 'vp'] loop
    if position(oculto in texto) > 0 then raise exception 'RL2: el resumen de la supervisora nombra un vehículo que no ve: %', oculto; end if;
  end loop;
  -- Los títulos tampoco: cada vehículo de prueba se llama «RM vehículo n» y la supervisora sólo ve el suyo.
  if (select count(*) from regexp_matches(texto, 'RM vehículo \d+', 'g')) > 3 then raise exception 'RL2: demasiados títulos en %', texto; end if;
end $$;
reset role;
rollback;

-- @test lead_relacionados: lo que no existe, no se ve o no se tiene permiso da 42501; un tipo ajeno, 22023; anon no ejecuta (RL3)
begin;
do $$
declare t jsonb := pg_temp.rm_terreno(); a uuid := (t ->> 'a')::uuid; sin_vehiculos uuid; sql text;
begin
  sin_vehiculos := pg_temp.rm_persona('{"leads.ver": "todos"}');
  foreach sql in array array[
    format('select public.lead_relacionados(%L)', gen_random_uuid()),
    format('select public.lead_relacionados(%L)', t ->> 'lb'),
    format('select public.lead_relacionados_pagina(%L, ''interesado'')', t ->> 'lb')] loop
    if pg_temp.rm_estado(a, sql) <> '42501' then raise exception 'RL3: % debía dar 42501 y dio %', sql, pg_temp.rm_estado(a, sql); end if;
  end loop;
  if pg_temp.rm_estado(sin_vehiculos, format('select public.lead_relacionados(%L)', t ->> 'l')) <> '42501' then raise exception 'RL3: sin vehiculos.ver debía dar 42501'; end if;
  if pg_temp.rm_estado(a, format('select public.lead_relacionados_pagina(%L, ''otro'')', t ->> 'l')) <> '22023' then raise exception 'RL3: un tipo ajeno debía dar 22023'; end if;
  if has_function_privilege('anon', 'public.lead_relacionados(uuid, int)', 'execute')
     or has_function_privilege('anon', 'public.lead_relacionados_pagina(uuid, text, timestamptz, uuid, int)', 'execute')
     or not has_function_privilege('authenticated', 'public.lead_relacionados_pagina(uuid, text, timestamptz, uuid, int)', 'execute') then
    raise exception 'RL3: anon no debía poder ejecutarlas y authenticated sí';
  end if;
end $$;
reset role;
rollback;

-- @test lead_relacionados: sin cotizaciones.ver no hay grupo; una inválida no cuenta; las revisiones salen una vez; un vehículo en la papelera no se cuenta (RL4)
begin;
do $$
declare t jsonb := pg_temp.rm_terreno(); l uuid := (t ->> 'l')::uuid; r jsonb;
begin
  r := pg_temp.rm_json((t ->> 'sc')::uuid, format('select public.lead_relacionados(%L)', l));
  if jsonb_typeof(r -> 'cotizados') is distinct from 'null' then raise exception 'RL4: sin cotizaciones.ver, cotizados debía ser nulo'; end if;
  -- La dueña: v1 (tres cotizaciones, una inválida) y vb2; vp está en la papelera.
  r := pg_temp.rm_json((t ->> 'g')::uuid, format('select public.lead_relacionados(%L, 5)', l));
  if (r #>> '{cotizados,leidos}')::int <> 2 or (r #>> '{cotizados,ocultos}')::int <> 0 or jsonb_array_length(r #> '{cotizados,filas}') <> 2 then
    raise exception 'RL4: debían ser 2 vehículos con cotización y dio %', r -> 'cotizados';
  end if;
  -- La asesora ve v1; vb2 es de otra persona: un oculto.
  r := pg_temp.rm_json((t ->> 'a')::uuid, format('select public.lead_relacionados(%L)', l));
  if (r #>> '{cotizados,leidos}')::int <> 2 or (r #>> '{cotizados,ocultos}')::int <> 1
     or pg_temp.rm_ids_de(r #> '{cotizados,filas}', 'id') is distinct from array[(t ->> 'v1')::uuid] then
    raise exception 'RL4: la asesora debía ver sólo v1 y dio %', r -> 'cotizados';
  end if;
  -- La supervisora «propios» en cotizaciones y vehículos no ve el vehículo de las cotizaciones: nada visible y dos ocultos.
  r := pg_temp.rm_json((t ->> 's')::uuid, format('select public.lead_relacionados(%L)', l));
  if jsonb_array_length(r #> '{cotizados,filas}') <> 0 or (r #>> '{cotizados,ocultos}')::int <> 2 then
    raise exception 'RL4: la supervisora debía tener 2 ocultos y dio %', r -> 'cotizados';
  end if;
end $$;
reset role;
rollback;

-- @test lead_relacionados_pagina: «Ver todos» no repite ni salta con ocultos intercalados (RL5)
begin;
do $$
declare t jsonb := pg_temp.rm_terreno(); a uuid := (t ->> 'a')::uuid; b uuid := (t ->> 'b')::uuid; l uuid; p jsonb; todos uuid[] := '{}'; esperados uuid[];
  c_en timestamptz; c_id uuid; filas jsonb; pasos int := 0; v uuid; n int;
begin
  l := pg_temp.rm_lead('RM lead pag', a);
  for n in 1..31 loop
    -- Los pares los crea a (visibles); los impares b, con un lead de b: a no los ve.
    v := pg_temp.rm_vehiculo((t ->> 'o')::uuid, case when n % 2 = 0 then null else (t ->> 'lb')::uuid end, case when n % 2 = 0 then a else b end);
    perform pg_temp.rm_interes(v, l, n * interval '1 minute');
  end loop;
  select array_agg(i.vehiculo_id order by i.creado_en desc, i.vehiculo_id desc) into esperados
    from public.vehiculos_interesados i join public.vehiculos v on v.id = i.vehiculo_id where i.lead_id = l and v.creado_por = a;
  loop
    pasos := pasos + 1;
    p := pg_temp.rm_json(a, format('select public.lead_relacionados_pagina(%L, ''interesado'', %L, %L, 4)', l, c_en, c_id));
    filas := p -> 'filas';
    todos := todos || (select coalesce(array_agg((f ->> 'id')::uuid order by ord), '{}') from jsonb_array_elements(filas) with ordinality x (f, ord) where ord <= 4);
    exit when jsonb_array_length(filas) <= 4 or pasos > 20;
    c_en := (filas -> 3 ->> 'creado_en')::timestamptz;
    c_id := (filas -> 3 ->> 'id')::uuid;
  end loop;
  if todos is distinct from esperados then raise exception 'RL5: las páginas dieron % y debía ser %', todos, esperados; end if;
end $$;
reset role;
rollback;
