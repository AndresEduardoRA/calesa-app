-- `vehiculo_relacionados()` y `vehiculo_relacionados_pagina()`: Vinculado, Interesado y Cotizado de un vehículo, con el predicado de las policies y lo
-- oculto contado sin datos. No depende de otro archivo (`SOLO=areas/vehiculos/relacionados.sql`). Cada bloque abre su transacción y la revierte.
-- La otra mitad (las del lead) está en `relacionados-lead.sql`.
--
-- Qué asegura:
--   R1. Las filas visibles de la página «Ver todos» son las que un `select` invocador, bajo la RLS, devuelve: para una asesora «propios» con cartera, la dueña
--       («todos»), una supervisora con leads «todos» y vehículos «propios», y alguien con cotizaciones «propios».
--   R2. Lo oculto llega contado y sin datos: claves exactas, ni un id ni un nombre de lo que no se ve.
--   R3. Un vehículo inexistente, en la papelera o que no se ve da 42501; sin `leads.ver` también; un tipo ajeno da 22023.
--   R4. Sin `cotizaciones.ver` en el origen, `cotizados` es nulo; una inválida o en la papelera no cuenta, una reportada sí, y un lead con revisiones sale una vez.
--   R5. Con 150 interesados, `leidos` es 101 y llegan 3 filas.
--   R6. «Ver todos» no repite ni salta con ocultas intercaladas; con más de 2.000 ocultas seguidas da `cortada` [lento].
--   R7. Lo que está en una papelera no se cuenta.
--   R8. `numero` sólo sale con `leads.numero_global.ver`; el propio, a quien creó el lead.

create temp sequence rv_telefono;
create temp sequence rv_n;

-- Una persona con un rol propio: {clave: alcance}.
create or replace function pg_temp.rv_persona(p_permisos jsonb) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c record;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rl_' || substr(v_id::text, 1, 8), 'RL ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  for c in select * from jsonb_each_text(p_permisos) loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c.key, c.value::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.rv_lead(p_nombre text, p_creador uuid) returns uuid language plpgsql as $f$
declare l uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values (p_nombre, '7391' || lpad(nextval('pg_temp.rv_telefono')::text, 5, '0'), p_creador, (select id from public.origenes_lead where clave = 'web'), '{}')
  returning id into l;
  return l;
end $f$;

create or replace function pg_temp.rv_vehiculo(p_origen uuid, p_lead uuid, p_creador uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, lead_id, creado_por) values (p_origen, 'RL vehículo ' || nextval('pg_temp.rv_n'), p_lead, p_creador) returning id into v;
  return v;
end $f$;

create or replace function pg_temp.rv_interes(p_vehiculo uuid, p_lead uuid, p_hace interval, p_usuario uuid default null) returns void language sql as $f$
  insert into public.vehiculos_interesados (vehiculo_id, lead_id, usuario_id, nota, creado_en) values (p_vehiculo, p_lead, p_usuario, 'nota ' || p_lead, now() - p_hace)
$f$;

create or replace function pg_temp.rv_cot(p_formula uuid, p_origen uuid, p_vehiculo uuid, p_lead uuid, p_creador uuid, p_hace interval,
                                          p_estado text default 'activa') returns uuid language plpgsql as $f$
declare c uuid;
begin
  insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, estado, creado_en)
  values (p_origen, p_lead, p_vehiculo, p_creador, p_formula, '{}', '{}', '{}', '{}', 0, p_estado::public.estado_cotizacion, now() - p_hace)
  returning id into c;
  return c;
end $f$;

-- El terreno. La dueña de prueba primero: con la base recién reseteada la primera cuenta nace dueña.
--   a (asesora «propios», cartera: la1, la2, lp), b (otra asesora: lb1, lb2), g (todo «todos», con número global), s (leads «todos», vehículos y
--   cotizaciones «propios»), cp (leads y vehículos «todos», cotizaciones «propios»; cartera: lc), sc (sin cotizaciones.ver).
--   v: de a, vinculado a la1; interesados la1, la2, lb1, lb2, lc y lp (en la papelera); cotizaciones: la1 (c1 activa, c2 reportada, c3 inválida, c2 la más
--   nueva de las que cuentan), lb1 (c4 de b), lb2 (c5, en la papelera), lc (c6 de a).
--   v_oculto: de a, vinculado a lb1 (a no lo ve). v_s: de s, vinculado a la1; interesados la1 y lb1; cotizaciones: lb1 (de s) y la1 (de a).
create or replace function pg_temp.rv_terreno() returns jsonb language plpgsql as $f$
declare t jsonb := '{}'; o uuid; f uuid; a uuid; b uuid; g uuid; s uuid; cp uuid; sc uuid;
  la1 uuid; la2 uuid; lb1 uuid; lb2 uuid; lp uuid; lc uuid; v uuid; v_oculto uuid; v_s uuid; c uuid; v_def jsonb;
begin
  perform pg_temp.rv_persona('{"vehiculos.ver": "todos"}');
  a := pg_temp.rv_persona('{"vehiculos.ver": "propios", "vehiculos.editar": "propios", "leads.ver": "propios", "leads.editar": "propios", "cotizaciones.ver": "propios"}');
  b := pg_temp.rv_persona('{"vehiculos.ver": "propios", "leads.ver": "propios", "leads.editar": "propios", "cotizaciones.ver": "propios"}');
  g := pg_temp.rv_persona('{"vehiculos.ver": "todos", "vehiculos.editar": "todos", "leads.ver": "todos", "leads.editar": "todos", "cotizaciones.ver": "todos", "leads.numero_global.ver": "todos"}');
  s := pg_temp.rv_persona('{"vehiculos.ver": "propios", "leads.ver": "todos", "leads.editar": "todos", "cotizaciones.ver": "propios"}');
  cp := pg_temp.rv_persona('{"vehiculos.ver": "todos", "leads.ver": "todos", "cotizaciones.ver": "propios"}');
  sc := pg_temp.rv_persona('{"vehiculos.ver": "todos", "leads.ver": "todos"}');
  insert into public.origenes (clave, nombre) values ('rl_' || substr(gen_random_uuid()::text, 1, 8), 'RL origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('tc'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (o, 1, 'publicada', v_def, '{}', '{"secciones": [{"id": "s1", "titulo": "Uno", "items": [{"tipo": "celda", "nodo": "tc"}]}]}',
          '{"tc": {"ver": "todos", "editar": "todos"}, "total": {"ver": "todos", "editar": null}}', now() - interval '10 days') returning id into f;
  la1 := pg_temp.rv_lead('RL lead la1', a);  la2 := pg_temp.rv_lead('RL lead la2', a);  lp := pg_temp.rv_lead('RL lead lp', a);
  lb1 := pg_temp.rv_lead('RL lead lb1', b);  lb2 := pg_temp.rv_lead('RL lead lb2', b);  lc := pg_temp.rv_lead('RL lead lc', cp);
  v := pg_temp.rv_vehiculo(o, la1, a);
  v_oculto := pg_temp.rv_vehiculo(o, lb1, a);
  v_s := pg_temp.rv_vehiculo(o, la1, s);
  perform pg_temp.rv_interes(v, la1, interval '5 days', a);
  perform pg_temp.rv_interes(v, la2, interval '4 days', a);
  perform pg_temp.rv_interes(v, lb1, interval '3 days', b);
  perform pg_temp.rv_interes(v, lb2, interval '2 days', b);
  perform pg_temp.rv_interes(v, lc, interval '1 day', cp);
  perform pg_temp.rv_interes(v, lp, interval '12 hours', a);
  update public.leads set eliminado_en = now() where id = lp;
  perform pg_temp.rv_cot(f, o, v, la1, a, interval '6 days');
  c := pg_temp.rv_cot(f, o, v, la1, a, interval '2 days', 'reportada');
  t := t || jsonb_build_object('c2', c);
  perform pg_temp.rv_cot(f, o, v, la1, a, interval '1 hour', 'invalida');
  perform pg_temp.rv_cot(f, o, v, lb1, b, interval '3 days');
  c := pg_temp.rv_cot(f, o, v, lb2, b, interval '3 days');
  update public.cotizaciones set eliminado_en = now() where id = c;
  perform pg_temp.rv_cot(f, o, v, lc, a, interval '1 day');
  perform pg_temp.rv_interes(v_s, la1, interval '2 days', s);
  perform pg_temp.rv_interes(v_s, lb1, interval '1 day', s);
  perform pg_temp.rv_cot(f, o, v_s, lb1, s, interval '2 days');
  perform pg_temp.rv_cot(f, o, v_s, la1, a, interval '1 day');
  return t || jsonb_build_object('o', o, 'f', f, 'a', a, 'b', b, 'g', g, 's', s, 'cp', cp, 'sc', sc, 'la1', la1, 'la2', la2, 'lb1', lb1, 'lb2', lb2, 'lp', lp,
                                 'lc', lc, 'v', v, 'v_oculto', v_oculto, 'v_s', v_s);
end $f$;

-- Corre una sentencia que devuelve jsonb como esa persona, con el rol de la app.
create or replace function pg_temp.rv_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
create or replace function pg_temp.rv_estado(p_quien uuid, p_sql text) returns text language plpgsql as $f$
begin
  perform pg_temp.rv_json(p_quien, p_sql);
  return 'ok';
exception when others then
  return sqlstate;
end $f$;

-- Los ids (uuid[] ordenado) que devuelve una consulta de invocador bajo la RLS: `p_sql` devuelve un jsonb con un arreglo de uuid.
create or replace function pg_temp.rv_ids_rls(p_quien uuid, p_sql text) returns uuid[] language sql as $f$
  select coalesce(array_agg(x::uuid order by x::uuid), '{}') from jsonb_array_elements_text(pg_temp.rv_json(p_quien, p_sql)) x
$f$;

create or replace function pg_temp.rv_ids_de(p_filas jsonb, p_clave text) returns uuid[] language sql as $f$
  select coalesce(array_agg((f ->> p_clave)::uuid order by (f ->> p_clave)::uuid), '{}') from jsonb_array_elements(p_filas) f
$f$;

create or replace function pg_temp.rv_claves(p_obj jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(k order by k), '{}') from jsonb_object_keys(p_obj) k
$f$;

-- Las páginas «Ver todos» de ese vehículo para esa persona (a lo sumo 21 filas: sus visibles).
create or replace function pg_temp.rv_pagina(p_quien uuid, p_vehiculo uuid, p_tipo text, p_tamano int default 20) returns jsonb language sql as $f$
  select pg_temp.rv_json(p_quien, format('select public.vehiculo_relacionados_pagina(%L, %L, null, null, %s)', p_vehiculo, p_tipo, p_tamano))
$f$;

-- R1 para una persona y un vehículo: lo que dice la página es lo que ve un select invocador.
create or replace function pg_temp.rv_iguala(p_etiqueta text, p_quien uuid, p_vehiculo uuid) returns void language plpgsql as $f$
declare v_pag uuid[]; v_rls uuid[];
begin
  v_pag := pg_temp.rv_ids_de(pg_temp.rv_pagina(p_quien, p_vehiculo, 'interesado') -> 'filas', 'lead_id');
  v_rls := pg_temp.rv_ids_rls(p_quien, format($q$
    select coalesce(jsonb_agg(i.lead_id), '[]') from public.vehiculos_interesados i where i.vehiculo_id = %L $q$, p_vehiculo));
  if v_pag is distinct from v_rls then
    raise exception 'R1 (% interesados): la página dio % y la RLS %', p_etiqueta, v_pag, v_rls;
  end if;
  v_pag := pg_temp.rv_ids_de(pg_temp.rv_pagina(p_quien, p_vehiculo, 'cotizado') -> 'filas', 'lead_id');
  v_rls := pg_temp.rv_ids_rls(p_quien, format($q$
    select coalesce(jsonb_agg(distinct c.lead_id), '[]') from public.cotizaciones c join public.leads l on l.id = c.lead_id
     where c.vehiculo_id = %L and c.estado in ('activa', 'reportada') $q$, p_vehiculo));
  if v_pag is distinct from v_rls then
    raise exception 'R1 (% cotizados): la página dio % y la RLS %', p_etiqueta, v_pag, v_rls;
  end if;
end $f$;

-- @test vehiculo_relacionados: las filas visibles son las de un select invocador para la asesora, la dueña, la supervisora y quien cotiza «propios» (R1)
begin;
do $$
declare t jsonb := pg_temp.rv_terreno();
begin
  perform pg_temp.rv_iguala('asesora', (t ->> 'a')::uuid, (t ->> 'v')::uuid);
  perform pg_temp.rv_iguala('dueña con todos', (t ->> 'g')::uuid, (t ->> 'v')::uuid);
  perform pg_temp.rv_iguala('supervisora', (t ->> 's')::uuid, (t ->> 'v_s')::uuid);
  perform pg_temp.rv_iguala('cotizaciones propios', (t ->> 'cp')::uuid, (t ->> 'v')::uuid);
  -- Y el resumen trae, de esas filas, las primeras: la asesora ve a la2 y a la1, en ese orden.
  if pg_temp.rv_ids_de(pg_temp.rv_json((t ->> 'a')::uuid, format('select public.vehiculo_relacionados(%L)', t ->> 'v')) #> '{interesados,filas}', 'lead_id')
     is distinct from (select array_agg(x order by x) from unnest(array[(t ->> 'la1')::uuid, (t ->> 'la2')::uuid]) x) then
    raise exception 'R1: el resumen de la asesora debía traer a la1 y a la2';
  end if;
end $$;
reset role;
rollback;

-- @test vehiculo_relacionados: lo oculto llega contado, con claves exactas y sin ids ni nombres (R2)
begin;
do $$
declare t jsonb := pg_temp.rv_terreno(); r jsonb; fila jsonb; texto text; oculto text;
begin
  r := pg_temp.rv_json((t ->> 'a')::uuid, format('select public.vehiculo_relacionados(%L)', t ->> 'v'));
  if pg_temp.rv_claves(r) is distinct from array['actualizado_en', 'cotizados', 'editable', 'interesados', 'numero', 'origen_id', 'titulo', 'vinculado'] then
    raise exception 'R2: claves de la raíz: %', pg_temp.rv_claves(r);
  end if;
  if pg_temp.rv_claves(r -> 'interesados') is distinct from array['filas', 'leidos', 'ocultos']
     or pg_temp.rv_claves(r -> 'cotizados') is distinct from array['filas', 'leidos', 'ocultos', 'ventana_llena']
     or pg_temp.rv_claves(r -> 'vinculado') is distinct from array['con_anteriores', 'fila', 'oculto'] then
    raise exception 'R2: claves de los grupos: % / % / %', pg_temp.rv_claves(r -> 'interesados'), pg_temp.rv_claves(r -> 'cotizados'), pg_temp.rv_claves(r -> 'vinculado');
  end if;
  for fila in select * from jsonb_array_elements(r #> '{interesados,filas}') loop
    if pg_temp.rv_claves(fila) is distinct from array['creado_en', 'en_cartera', 'lead_id', 'nombre', 'nota', 'numero', 'numero_propio', 'numero_propio_creador', 'por_nombre', 'puedo_actuar'] then
      raise exception 'R2: claves de una fila de interesado: %', pg_temp.rv_claves(fila);
    end if;
  end loop;
  -- Tres interesados que no ve (lb1, lb2, lc), contados; ni sus ids ni sus nombres viajan.
  if (r #>> '{interesados,ocultos}')::int <> 3 or (r #>> '{interesados,leidos}')::int <> 5 then
    raise exception 'R2: debía haber 5 leídos y 3 ocultos y dio % y %', r #>> '{interesados,leidos}', r #>> '{interesados,ocultos}';
  end if;
  texto := r::text;
  foreach oculto in array array[t ->> 'lb1', t ->> 'lb2', t ->> 'lc', 'RL lead lb1', 'RL lead lb2', 'RL lead lc'] loop
    if position(oculto in texto) > 0 then
      raise exception 'R2: el resumen de la asesora nombra lo que no ve: %', oculto;
    end if;
  end loop;
  -- Un vehículo vinculado a un lead que no ve: «oculto», sin el uuid ni el nombre.
  r := pg_temp.rv_json((t ->> 'a')::uuid, format('select public.vehiculo_relacionados(%L)', t ->> 'v_oculto'));
  if r -> 'vinculado' is distinct from '{"fila": null, "oculto": true, "con_anteriores": false}'::jsonb then
    raise exception 'R2: el vínculo oculto debía ser {fila: null, oculto: true}, y dio %', r -> 'vinculado';
  end if;
  if position((t ->> 'lb1') in r::text) > 0 or position('RL lead lb1' in r::text) > 0 then
    raise exception 'R2: el vínculo oculto nombra a su lead';
  end if;
end $$;
reset role;
rollback;

-- @test vehiculo_relacionados: lo que no existe, está en la papelera o no se ve da 42501; sin leads.ver también; un tipo ajeno, 22023 (R3)
begin;
do $$
declare t jsonb := pg_temp.rv_terreno(); a uuid := (t ->> 'a')::uuid; v_papelera uuid; sin_leads uuid; v_b uuid; sql text;
begin
  v_papelera := pg_temp.rv_vehiculo((t ->> 'o')::uuid, null, a);
  update public.vehiculos set eliminado_en = now() where id = v_papelera;
  v_b := pg_temp.rv_vehiculo((t ->> 'o')::uuid, null, (t ->> 'b')::uuid);
  sin_leads := pg_temp.rv_persona('{"vehiculos.ver": "todos"}');
  foreach sql in array array[
    format('select public.vehiculo_relacionados(%L)', gen_random_uuid()),
    format('select public.vehiculo_relacionados(%L)', v_papelera),
    format('select public.vehiculo_relacionados(%L)', v_b),
    format('select public.vehiculo_relacionados_pagina(%L, ''interesado'')', v_papelera),
    format('select public.vehiculo_relacionados_pagina(%L, ''interesado'')', v_b)] loop
    if pg_temp.rv_estado(a, sql) <> '42501' then raise exception 'R3: % debía dar 42501 y dio %', sql, pg_temp.rv_estado(a, sql); end if;
  end loop;
  if pg_temp.rv_estado(sin_leads, format('select public.vehiculo_relacionados(%L)', t ->> 'v')) <> '42501' then
    raise exception 'R3: sin leads.ver debía dar 42501';
  end if;
  if pg_temp.rv_estado(a, format('select public.vehiculo_relacionados_pagina(%L, ''vinculado'')', t ->> 'v')) <> '22023' then
    raise exception 'R3: un tipo que no existe debía dar 22023';
  end if;
  -- anon no ejecuta; authenticated sí.
  if has_function_privilege('anon', 'public.vehiculo_relacionados(uuid, int)', 'execute')
     or has_function_privilege('anon', 'public.vehiculo_relacionados_pagina(uuid, text, timestamptz, uuid, int)', 'execute')
     or not has_function_privilege('authenticated', 'public.vehiculo_relacionados(uuid, int)', 'execute') then
    raise exception 'R3: anon no debía poder ejecutarlas y authenticated sí';
  end if;
end $$;
reset role;
rollback;

-- @test vehiculo_relacionados: sin cotizaciones.ver no hay grupo; una inválida o en la papelera no cuenta; una reportada sí; las revisiones salen una vez (R4)
begin;
do $$
declare t jsonb := pg_temp.rv_terreno(); r jsonb;
begin
  r := pg_temp.rv_json((t ->> 'sc')::uuid, format('select public.vehiculo_relacionados(%L)', t ->> 'v'));
  if jsonb_typeof(r -> 'cotizados') is distinct from 'null' then
    raise exception 'R4: sin cotizaciones.ver, cotizados debía ser nulo y dio %', r -> 'cotizados';
  end if;
  r := pg_temp.rv_json((t ->> 'g')::uuid, format('select public.vehiculo_relacionados(%L, 5)', t ->> 'v'));
  -- Cuentan la1 (tres cotizaciones: la activa, la reportada y la inválida), lb1 y lc; lb2 sólo tiene una en la papelera.
  if (r #>> '{cotizados,leidos}')::int <> 3 or (r #>> '{cotizados,ocultos}')::int <> 0 or jsonb_array_length(r #> '{cotizados,filas}') <> 3 then
    raise exception 'R4: debían ser 3 leads con cotización y dio %', r -> 'cotizados';
  end if;
  -- La1 sale una vez, con la reportada más nueva que cuenta (no con la inválida, que es más nueva todavía).
  if (select count(*) from jsonb_array_elements(r #> '{cotizados,filas}') f where f ->> 'lead_id' = t ->> 'la1') <> 1
     or (select f #>> '{cotizacion,id}' from jsonb_array_elements(r #> '{cotizados,filas}') f where f ->> 'lead_id' = t ->> 'la1') is distinct from t ->> 'c2' then
    raise exception 'R4: la1 debía salir una vez, con su reportada';
  end if;
  -- La asesora ve la1; lb1 y lc son de otros: dos leads ocultos.
  r := pg_temp.rv_json((t ->> 'a')::uuid, format('select public.vehiculo_relacionados(%L)', t ->> 'v'));
  if (r #>> '{cotizados,leidos}')::int <> 3 or (r #>> '{cotizados,ocultos}')::int <> 2 or jsonb_array_length(r #> '{cotizados,filas}') <> 1 then
    raise exception 'R4: la asesora debía ver 1 y tener 2 ocultos y dio %', r -> 'cotizados';
  end if;
  -- La supervisora de «propios» ve los leads de todos pero sólo la cotización que hizo ella: la1 queda oculto aunque su lead se vea.
  r := pg_temp.rv_json((t ->> 's')::uuid, format('select public.vehiculo_relacionados(%L)', t ->> 'v_s'));
  if (r #>> '{cotizados,ocultos}')::int <> 1 or pg_temp.rv_ids_de(r #> '{cotizados,filas}', 'lead_id') is distinct from array[(t ->> 'lb1')::uuid] then
    raise exception 'R4: la supervisora debía ver sólo lb1 y dio %', r -> 'cotizados';
  end if;
end $$;
reset role;
rollback;

-- @test vehiculo_relacionados: Cotizado se mira por el origen de cada cotización, no por el del vehículo (R4b)
begin;
do $$
declare t jsonb := pg_temp.rv_terreno(); ob uuid; fb uuid; x uuid; r jsonb; v uuid := (t ->> 'v')::uuid;
begin
  insert into public.origenes (clave, nombre) values ('rv_' || substr(gen_random_uuid()::text, 1, 8), 'RV origen B ' || substr(gen_random_uuid()::text, 1, 8)) returning id into ob;
  -- Una cotización activa de otro origen (con su fórmula publicada) sobre el vehículo, de un lead.
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  select ob, 1, estado, definicion, params, diseno, visibilidad, publicado_en from public.formulas where id = (t ->> 'f')::uuid returning id into fb;
  perform pg_temp.rv_cot(fb, ob, v, (t ->> 'la2')::uuid, (t ->> 'a')::uuid, interval '1 hour');
  -- Quien ve vehículos y leads de todos, pero cotizaciones sólo en ese otro origen.
  x := pg_temp.rv_persona('{"vehiculos.ver": "todos", "leads.ver": "todos", "cotizaciones.ver": "todos"}');
  update public.roles_permisos set origen_id = ob
   where permiso_clave = 'cotizaciones.ver' and rol_id in (select rol_id from public.usuarios_roles where usuario_id = x);
  r := pg_temp.rv_json(x, format('select public.vehiculo_relacionados(%L, 5)', v));
  -- La RLS le muestra esa cotización y ninguna del origen del vehículo: la RPC dice lo mismo, y no cuenta las del origen que no ve.
  if jsonb_typeof(r -> 'cotizados') = 'null' or pg_temp.rv_ids_de(r #> '{cotizados,filas}', 'lead_id') is distinct from array[(t ->> 'la2')::uuid]
     or (r #>> '{cotizados,leidos}')::int <> 1 then
    raise exception 'R4b: debía ver sólo la cotización de su origen y dio %', r -> 'cotizados';
  end if;
  perform pg_temp.rv_iguala('cotizaciones de otro origen', x, v);
end $$;
reset role;
rollback;

-- @test vehiculo_relacionados: con 150 interesados, leídos es 101 y llegan 3 filas (R5)
begin;
do $$
declare t jsonb := pg_temp.rv_terreno(); a uuid := (t ->> 'a')::uuid; v uuid; r jsonb;
begin
  v := pg_temp.rv_vehiculo((t ->> 'o')::uuid, null, a);
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  select 'RL masivo ' || n, '7392' || lpad(n::text, 5, '0'), a, (select id from public.origenes_lead where clave = 'web'), '{}' from generate_series(1, 150) n;
  insert into public.vehiculos_interesados (vehiculo_id, lead_id, creado_en)
  select v, l.id, now() - (row_number() over (order by l.id)) * interval '1 minute' from public.leads l where l.nombre like 'RL masivo %';
  r := pg_temp.rv_json(a, format('select public.vehiculo_relacionados(%L)', v));
  if (r #>> '{interesados,leidos}')::int <> 101 or jsonb_array_length(r #> '{interesados,filas}') <> 3 or (r #>> '{interesados,ocultos}')::int <> 0 then
    raise exception 'R5: debía leer 101, traer 3 y no tener ocultos, y dio %', r -> 'interesados' - 'filas';
  end if;
end $$;
reset role;
rollback;

-- @test vehiculo_relacionados_pagina: «Ver todos» no repite ni salta con ocultas intercaladas (R6)
begin;
do $$
declare t jsonb := pg_temp.rv_terreno(); a uuid := (t ->> 'a')::uuid; b uuid := (t ->> 'b')::uuid; v uuid; p jsonb; todos uuid[] := '{}'; esperados uuid[];
  c_en timestamptz; c_id uuid; filas jsonb; pasos int := 0;
begin
  v := pg_temp.rv_vehiculo((t ->> 'o')::uuid, null, a);
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  select 'RL pag ' || n, '7393' || lpad(n::text, 5, '0'), case when n % 2 = 0 then a else b end, (select id from public.origenes_lead where clave = 'web'), '{}'
    from generate_series(1, 31) n;
  insert into public.vehiculos_interesados (vehiculo_id, lead_id, creado_en)
  select v, l.id, now() - substr(l.nombre, 8)::int * interval '1 minute' from public.leads l where l.nombre like 'RL pag %';
  select array_agg(i.lead_id order by i.creado_en desc, i.lead_id desc) into esperados
    from public.vehiculos_interesados i join public.leads l on l.id = i.lead_id where i.vehiculo_id = v and l.creado_por = a;
  loop
    pasos := pasos + 1;
    p := pg_temp.rv_json(a, format('select public.vehiculo_relacionados_pagina(%L, ''interesado'', %L, %L, 4)', v, c_en, c_id));
    filas := p -> 'filas';
    -- Trae `tamaño + 1`: la de más sólo dice que hay otra página.
    todos := todos || (select coalesce(array_agg((f ->> 'lead_id')::uuid order by ord), '{}') from jsonb_array_elements(filas) with ordinality x (f, ord) where ord <= 4);
    exit when jsonb_array_length(filas) <= 4 or pasos > 20;
    c_en := (filas -> 3 ->> 'creado_en')::timestamptz;
    c_id := (filas -> 3 ->> 'lead_id')::uuid;
  end loop;
  if todos is distinct from esperados then
    raise exception 'R6: las páginas dieron % y debía ser %', todos, esperados;
  end if;
end $$;
reset role;
rollback;

-- @test [lento] vehiculo_relacionados_pagina: con más de 2.000 ocultas seguidas el recorrido se corta, lo dice y se sigue desde donde llegó (R6)
begin;
do $$
declare t jsonb := pg_temp.rv_terreno(); a uuid := (t ->> 'a')::uuid; b uuid := (t ->> 'b')::uuid; v uuid; p jsonb;
begin
  v := pg_temp.rv_vehiculo((t ->> 'o')::uuid, null, a);
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  select 'RL oculta ' || n, '7394' || lpad(n::text, 5, '0'), b, (select id from public.origenes_lead where clave = 'web'), '{}' from generate_series(1, 2100) n;
  insert into public.vehiculos_interesados (vehiculo_id, lead_id, creado_en)
  select v, l.id, now() - interval '1 day' - (row_number() over (order by l.id)) * interval '1 second' from public.leads l where l.nombre like 'RL oculta %';
  -- Una visible, más vieja que todas las ocultas.
  perform pg_temp.rv_interes(v, (t ->> 'la1')::uuid, interval '30 days');
  p := pg_temp.rv_pagina(a, v, 'interesado');
  if jsonb_array_length(p -> 'filas') <> 0 or (p ->> 'cortada')::boolean is distinct from true then
    raise exception 'R6: tras 2.000 ocultas debía venir vacía y cortada, y dio %', p;
  end if;
  -- `siguiente` dice hasta dónde se recorrió: seguir desde ahí junta la visible, que el cursor de la última fila visible (ninguna) no alcanzaría.
  if p #>> '{siguiente,id}' is null then raise exception 'R6: una página cortada debía decir hasta dónde llegó'; end if;
  p := pg_temp.rv_json(a, format('select public.vehiculo_relacionados_pagina(%L, ''interesado'', %L, %L, 20)', v, p #>> '{siguiente,en}', p #>> '{siguiente,id}'));
  if pg_temp.rv_ids_de(p -> 'filas', 'lead_id') is distinct from array[(t ->> 'la1')::uuid] or (p ->> 'cortada')::boolean is distinct from false then
    raise exception 'R6: seguir buscando debía traer la visible y no cortarse, y dio %', p;
  end if;
  -- Con pocas ocultas no se corta.
  p := pg_temp.rv_pagina(a, (t ->> 'v')::uuid, 'interesado');
  if (p ->> 'cortada')::boolean is distinct from false or p -> 'siguiente' is distinct from 'null'::jsonb then raise exception 'R6: no debía cortarse'; end if;
end $$;
reset role;
rollback;

-- @test vehiculo_relacionados: lo que está en una papelera no se cuenta (R7)
begin;
do $$
declare t jsonb := pg_temp.rv_terreno(); r jsonb;
begin
  -- v tiene 6 interesados; uno (lp) es un lead en la papelera. La dueña de «todos» lee 5.
  r := pg_temp.rv_json((t ->> 'g')::uuid, format('select public.vehiculo_relacionados(%L, 5)', t ->> 'v'));
  if (r #>> '{interesados,leidos}')::int <> 5 or (r #>> '{interesados,ocultos}')::int <> 0
     or (t ->> 'lp')::uuid = any (pg_temp.rv_ids_de(r #> '{interesados,filas}', 'lead_id')) then
    raise exception 'R7: el lead en la papelera no debía contarse, y dio %', r -> 'interesados' - 'filas';
  end if;
  -- Un vínculo a un lead en la papelera no se dice.
  update public.vehiculos set lead_id = null where id = (t ->> 'v')::uuid;
  update public.vehiculos set lead_id = (t ->> 'lp')::uuid where id = (t ->> 'v')::uuid;
  r := pg_temp.rv_json((t ->> 'g')::uuid, format('select public.vehiculo_relacionados(%L)', t ->> 'v'));
  if r #>> '{vinculado,oculto}' <> 'false' or jsonb_typeof(r #> '{vinculado,fila}') <> 'null' then
    raise exception 'R7: el vínculo a un lead en la papelera no debía decirse, y dio %', r -> 'vinculado';
  end if;
end $$;
reset role;
rollback;

-- @test vehiculo_relacionados: el número global sólo sale con leads.numero_global.ver y el propio, a quien creó el lead (R8)
begin;
do $$
declare t jsonb := pg_temp.rv_terreno(); r jsonb; fila jsonb;
begin
  r := pg_temp.rv_json((t ->> 'g')::uuid, format('select public.vehiculo_relacionados(%L)', t ->> 'v'));
  if (r #>> '{vinculado,fila,numero}') is null then raise exception 'R8: con el permiso debía salir el número global'; end if;
  r := pg_temp.rv_json((t ->> 'a')::uuid, format('select public.vehiculo_relacionados(%L)', t ->> 'v'));
  if (r #>> '{vinculado,fila,numero}') is not null then raise exception 'R8: sin el permiso no debía salir el número global'; end if;
  if (r #>> '{vinculado,fila,numero_propio}') is null then raise exception 'R8: a quien creó el lead le toca su número propio'; end if;
  -- La supervisora «todos» ve el lead de otra (la1) pero no su número propio sin el permiso.
  r := pg_temp.rv_json((t ->> 's')::uuid, format('select public.vehiculo_relacionados(%L)', t ->> 'v_s'));
  if (r #>> '{vinculado,fila,numero}') is not null or (r #>> '{vinculado,fila,numero_propio}') is not null then
    raise exception 'R8: la supervisora no debía ver números que no son suyos, y dio %', r -> 'vinculado';
  end if;
  if (r #>> '{vinculado,fila,en_cartera}') <> 'false' then raise exception 'R8: la1 no está en la cartera de la supervisora'; end if;
end $$;
reset role;
rollback;
