-- `cotizaciones_buscar()`: la búsqueda del listado `/cotizaciones` (por número, cliente, vehículo, autor y título de la cotización). No depende de otro archivo (`SOLO=areas/cotizaciones/buscar.sql`). El costo con volumen, `medir-cotizaciones-buscar.sql`.
--
-- Qué asegura:
--   B1. La forma: invocadora, estable, search_path vacío; la ejecuta authenticated y no anon ni PUBLIC.
--   B2. Cada fuente encuentra lo suyo: número, cliente, título, VIN y lote del vehículo y autor; lo que no coincide con nada, nada; lo que no alcanza el mínimo, nada.
--   B3. Quién ve qué: quien no ve a un lead o a un vehículo no encuentra por él; «propios» no encuentra lo ajeno.
--   B4. Una cotización que coincide por dos fuentes sale una sola vez; el cursor hacia adelante y hacia atrás no repite ni saltea.
--   B5. Los filtros del listado (origen, clase, mías) y el tope de coincidencias (`acotada`).
--   B6. La fuente «título» (`_cotizaciones_ids_por_titulo`): encuentra, «propios» no encuentra lo ajeno, sin `cotizaciones.ver` nada (tampoco llamando al ayudante),
--       el mínimo y los comodines no buscan, la papelera no aparece, más de 50 da `acotada` y el origen estrecha.

create temp sequence cb_telefono;

create or replace function pg_temp.cb_busca(p_quien uuid, p_texto text, p_tamano int default 100, p_origen uuid default null, p_clase public.clase_cotizacion default null,
                                            p_mias boolean default false, p_en timestamptz default null, p_id uuid default null, p_atras boolean default false)
  returns table (id uuid, numero bigint, creado_en timestamptz, acotada boolean) language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  return query select b.id, b.numero, b.creado_en, b.acotada
                 from public.cotizaciones_buscar(p_texto, p_tamano, p_origen, p_clase, p_mias, null, null, p_en, p_id, p_atras) b;
  reset role;
exception when others then
  reset role;
  raise;
end $f$;

create or replace function pg_temp.cb_ids(p_quien uuid, p_texto text, p_origen uuid default null) returns uuid[] language sql as $f$
  select coalesce(array_agg(x.id order by x.creado_en desc, x.id desc), '{}') from pg_temp.cb_busca(p_quien, p_texto, 100, p_origen) x
$f$;

create or replace function pg_temp.cb_persona(p_nombre text, p_concesiones jsonb) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
  values (v_id, v_id || '@ejemplo.com', '{"invitado": true}', jsonb_build_object('nombre', p_nombre));
  update public.perfiles set nombre = p_nombre where id = v_id;
  insert into public.roles (clave, nombre) values ('cb_' || substr(v_id::text, 1, 8), 'BU ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Quien lo ve todo: cotizaciones, leads y vehículos de todos los orígenes (la dueña de un despliegue es la primera cuenta, y acá no hay orden).
create or replace function pg_temp.cb_duena() returns uuid language sql as $f$
  select pg_temp.cb_persona('Dueña Búsqueda', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'leads.ver'),
                                                               jsonb_build_object('clave', 'vehiculos.ver')))
$f$;

-- Un origen con su fórmula publicada vacía, un lead de nombre propio y un vehículo con título, VIN y lote propios (todos con la marca `p_marca` para encontrarlos).
create or replace function pg_temp.cb_terreno(p_marca text, p_duena uuid) returns jsonb language plpgsql as $f$
declare o uuid; f uuid; l uuid; v uuid; v_vin text := '1HGCM82633A' || lpad(nextval('pg_temp.cb_telefono')::text, 6, '0');
begin
  insert into public.origenes (clave, nombre) values ('cb_' || substr(gen_random_uuid()::text, 1, 8), 'BU origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', '{"nodos": []}', '{}', '{}', '{}') returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('Cliente ' || p_marca, '7218' || lpad(nextval('pg_temp.cb_telefono')::text, 4, '0'), p_duena, (select id from public.origenes_lead where clave = 'web'), '{}')
  returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca, vin, lote) values (o, 'Auto ' || p_marca, 'toyota', v_vin, 'LOT' || upper(p_marca) || '1') returning id into v;
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v, 'vin', v_vin);
end $f$;

create or replace function pg_temp.cb_cot(t jsonb, p_creador uuid, p_creado timestamptz default now(), p_clase text default 'preventa', p_con_vehiculo boolean default true,
                                          p_con_lead boolean default true) returns uuid language plpgsql as $f$
declare c uuid;
begin
  insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, clase, version, creado_en)
  values ((t ->> 'o')::uuid, case when p_con_lead then (t ->> 'l')::uuid end, case when p_con_vehiculo or p_clase = 'final' then (t ->> 'v')::uuid end, p_creador, (t ->> 'f')::uuid,
          '{}', '{}', '{}', '{}', 10, p_clase::public.clase_cotizacion, 1, p_creado)
  returning id into c;
  return c;
end $f$;

-- @test cotizaciones_buscar: B1 la forma: invocadora, estable, search_path vacío; la ejecuta authenticated y no anon ni PUBLIC
begin;
do $$
declare p record; v_cols text;
begin
  select x.oid, x.prosecdef, x.provolatile, x.proconfig into p from pg_proc x where x.proname = 'cotizaciones_buscar' and x.pronamespace = 'public'::regnamespace;
  if p.oid is null then raise exception 'B1: no existe public.cotizaciones_buscar'; end if;
  if (select count(*) from pg_proc x where x.proname = 'cotizaciones_buscar' and x.pronamespace = 'public'::regnamespace) <> 1 then raise exception 'B1: hay más de una'; end if;
  if p.prosecdef then raise exception 'B1: corre con los derechos de su dueña: tiene que correr como quien la llama (la RLS decide)'; end if;
  if p.provolatile <> 's' then raise exception 'B1: no es stable (%)', p.provolatile; end if;
  if not coalesce(p.proconfig @> array['search_path=""'], false) then raise exception 'B1: search_path: %', p.proconfig; end if;
  v_cols := pg_get_function_result(p.oid);
  if v_cols ~ '(valores|fuentes|totales|tipos_cambio)' then raise exception 'B1: devuelve el snapshot: %', v_cols; end if;
  if v_cols is distinct from 'TABLE(id uuid, numero bigint, origen_id uuid, lead_id uuid, vehiculo_id uuid, creado_por uuid, clase clase_cotizacion, estado estado_cotizacion, titulo text, total_base numeric, moneda_mostrar character, creado_en timestamp with time zone, vence_el date, vencida boolean, acotada boolean, privada boolean)' then
    raise exception 'B1: las columnas no son las del listado con acotada: %', v_cols;
  end if;
  if not has_function_privilege('authenticated', p.oid, 'execute') then raise exception 'B1: authenticated no la ejecuta'; end if;
  if has_function_privilege('anon', p.oid, 'execute') then raise exception 'B1: anon la ejecuta'; end if;
  if exists (select 1 from aclexplode((select proacl from pg_proc where oid = p.oid)) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then raise exception 'B1: PUBLIC la ejecuta'; end if;
end $$;
rollback;

-- @test cotizaciones_buscar: B2 cada fuente encuentra lo suyo, y nada más
begin;
do $$
declare duena uuid := pg_temp.cb_duena();
  ana uuid := pg_temp.cb_persona('Zulema Quispe', '[]'); t jsonb := pg_temp.cb_terreno('abcxyz', duena); u jsonb := pg_temp.cb_terreno('qwerty', duena);
  c1 uuid; c2 uuid; c3 uuid; v_n bigint;
begin
  c1 := pg_temp.cb_cot(t, duena, now() - interval '3 minutes');
  c2 := pg_temp.cb_cot(t, ana, now() - interval '2 minutes');
  c3 := pg_temp.cb_cot(u, duena, now() - interval '1 minute');
  select c.numero into v_n from public.cotizaciones c where c.id = c1;
  -- El número (con y sin #): exacto.
  if pg_temp.cb_ids(duena, v_n::text) is distinct from array[c1] then raise exception 'B2: el número % no da la suya: %', v_n, pg_temp.cb_ids(duena, v_n::text); end if;
  if pg_temp.cb_ids(duena, '#' || v_n::text) is distinct from array[c1] then raise exception 'B2: #número no da la suya'; end if;
  -- El cliente: por parte del nombre y sin distinguir mayúsculas.
  if pg_temp.cb_ids(duena, 'cliente abcxyz') is distinct from array[c2, c1] then raise exception 'B2: el cliente no da las dos de su lead: %', pg_temp.cb_ids(duena, 'cliente abcxyz'); end if;
  if pg_temp.cb_ids(duena, 'CLIENTE QWERTY') is distinct from array[c3] then raise exception 'B2: el cliente (mayúsculas)'; end if;
  -- El vehículo: por título, VIN y lote.
  if pg_temp.cb_ids(duena, 'auto abcxyz') is distinct from array[c2, c1] then raise exception 'B2: el título del vehículo: %', pg_temp.cb_ids(duena, 'auto abcxyz'); end if;
  if pg_temp.cb_ids(duena, u ->> 'vin') is distinct from array[c3] then raise exception 'B2: el VIN'; end if;
  if pg_temp.cb_ids(duena, 'lotabcxyz') is distinct from array[c2, c1] then raise exception 'B2: el lote'; end if;
  -- El autor: por nombre, sin tildes ni mayúsculas.
  if pg_temp.cb_ids(duena, 'zulema') is distinct from array[c2] then raise exception 'B2: el autor: %', pg_temp.cb_ids(duena, 'zulema'); end if;
  if pg_temp.cb_ids(duena, 'QUISPE') is distinct from array[c2] then raise exception 'B2: el autor (apellido)'; end if;
  -- Nada que coincida, nada; y lo que no alcanza el mínimo (2 letras) ni busca.
  if cardinality(pg_temp.cb_ids(duena, 'nadiequeseasi')) <> 0 then raise exception 'B2: algo sin coincidencia dio filas'; end if;
  if cardinality(pg_temp.cb_ids(duena, 'ab')) <> 0 then raise exception 'B2: dos letras buscaron'; end if;
  if cardinality(pg_temp.cb_ids(duena, '   ')) <> 0 or cardinality(pg_temp.cb_ids(duena, null)) <> 0 then raise exception 'B2: vacío o nulo buscó'; end if;
  -- Un comodín del patrón no es comodín: «%» no encuentra todo.
  if cardinality(pg_temp.cb_ids(duena, '%%%%')) <> 0 then raise exception 'B2: %% se tomó como comodín'; end if;
  -- Las papeleras no aparecen.
  update public.cotizaciones set eliminado_en = now() where id = c3;
  if cardinality(pg_temp.cb_ids(duena, 'cliente qwerty')) <> 0 then raise exception 'B2: apareció una de la papelera'; end if;
end $$;
rollback;

-- @test cotizaciones_buscar: B3 quién ve qué: sin ver al lead o al vehículo no se encuentra por él, y «propios» no encuentra lo ajeno
begin;
do $$
declare duena uuid := pg_temp.cb_duena();
  t jsonb := pg_temp.cb_terreno('lmnopq', duena); o uuid := (t ->> 'o')::uuid;
  -- Ve cotizaciones de todos, pero ni leads ni vehículos.
  ciega uuid := pg_temp.cb_persona('Ciega Uno', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o)));
  -- Ve cotizaciones y vehículos de todos; leads, no.
  conveh uuid := pg_temp.cb_persona('Conveh Dos', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o), jsonb_build_object('clave', 'vehiculos.ver', 'origen', o)));
  -- Cotizaciones y leads propios.
  propia uuid := pg_temp.cb_persona('Propia Tres', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o, 'alcance', 'propios'),
                                                                     jsonb_build_object('clave', 'cotizaciones.crear', 'origen', o)));
  nada uuid := pg_temp.cb_persona('Nada Cuatro', '[]');
  c1 uuid; c2 uuid;
begin
  c1 := pg_temp.cb_cot(t, duena, now() - interval '2 minutes');
  c2 := pg_temp.cb_cot(t, propia, now() - interval '1 minute');
  -- Quien ve las cotizaciones y no al lead ni al vehículo: encuentra por número y por autor, no por cliente ni por vehículo.
  if cardinality(pg_temp.cb_ids(ciega, 'cliente lmnopq')) <> 0 then raise exception 'B3: encontró por un cliente que no ve: %', pg_temp.cb_ids(ciega, 'cliente lmnopq'); end if;
  if cardinality(pg_temp.cb_ids(ciega, 'auto lmnopq')) <> 0 then raise exception 'B3: encontró por un vehículo que no ve'; end if;
  if pg_temp.cb_ids(ciega, 'propia tres') is distinct from array[c2] then raise exception 'B3: el autor se nombra aunque no se vean leads ni vehículos'; end if;
  -- Con vehiculos.ver, sí por vehículo; el cliente sigue sin verse.
  if pg_temp.cb_ids(conveh, 'auto lmnopq') is distinct from array[c2, c1] then raise exception 'B3: con vehiculos.ver no encontró por el vehículo: %', pg_temp.cb_ids(conveh, 'auto lmnopq'); end if;
  if cardinality(pg_temp.cb_ids(conveh, 'cliente lmnopq')) <> 0 then raise exception 'B3: encontró por el cliente sin leads.ver'; end if;
  -- «Propios»: sólo las suyas (el lead es de la dueña y no está en su cartera), aun cuando el texto coincide con las de otra persona.
  if pg_temp.cb_ids(propia, 'cliente lmnopq') is distinct from '{}'::uuid[] then raise exception 'B3: «propios» encontró por un lead que no es suyo: %', pg_temp.cb_ids(propia, 'cliente lmnopq'); end if;
  if pg_temp.cb_ids(propia, 'duena') is distinct from '{}'::uuid[] then raise exception 'B3: «propios» encontró lo de otra persona'; end if;
  -- Sin ninguna clave, nada.
  if cardinality(pg_temp.cb_ids(nada, 'lmnopq')) <> 0 or cardinality(pg_temp.cb_ids(nada, 'cliente lmnopq')) <> 0 then raise exception 'B3: sin cotizaciones.ver encontró algo'; end if;
  -- La dueña, todas.
  if pg_temp.cb_ids(duena, 'auto lmnopq') is distinct from array[c2, c1] then raise exception 'B3: la dueña no encuentra las dos'; end if;
end $$;
rollback;

-- @test cotizaciones_buscar: B4 sin repetir lo que coincide por dos fuentes, y el cursor hacia adelante y hacia atrás sin repetir ni saltear
begin;
do $$
declare duena uuid := pg_temp.cb_duena();
  t jsonb := pg_temp.cb_terreno('rstuvw', duena); i int; v_esperado uuid[]; v_ids uuid[] := '{}'; v_atras uuid[] := '{}'; v_pagina uuid[]; v_en timestamptz; v_id uuid; r record; v_n int; v_ult record;
begin
  for i in 1 .. 25 loop
    perform pg_temp.cb_cot(t, duena, case when i between 7 and 18 then timestamptz '2026-03-01 12:00:00+00' else timestamptz '2026-03-01 12:00:00+00' + (i - 12) * interval '1 minute' end);
  end loop;
  select array_agg(c.id order by c.creado_en desc, c.id desc) into v_esperado from public.cotizaciones c where c.origen_id = (t ->> 'o')::uuid;
  -- El texto «rstuvw» está en el cliente, el vehículo y su VIN y lote: por tres fuentes, una sola vez cada una.
  if pg_temp.cb_ids(duena, 'rstuvw') is distinct from v_esperado then raise exception 'B4: sin cursor no da las 25 en orden, una vez cada una: %', cardinality(pg_temp.cb_ids(duena, 'rstuvw')); end if;
  -- Hacia adelante de a 10.
  loop
    v_n := 0; v_pagina := '{}';
    for r in select * from pg_temp.cb_busca(duena, 'rstuvw', 10, null, null, false, v_en, v_id, false) loop
      v_n := v_n + 1;
      exit when v_n > 10;
      v_pagina := v_pagina || r.id; v_ult := r;
    end loop;
    v_ids := v_ids || v_pagina;
    exit when v_n <= 10;
    v_en := v_ult.creado_en; v_id := v_ult.id;
  end loop;
  if v_ids is distinct from v_esperado then raise exception 'B4: de a 10 hacia adelante no da lo esperado: % de 25', cardinality(v_ids); end if;
  -- Una de más mientras hay otra página.
  select count(*) into v_n from pg_temp.cb_busca(duena, 'rstuvw', 10);
  if v_n <> 11 then raise exception 'B4: la primera página de 10 trae % filas', v_n; end if;
  -- Hacia atrás desde la última (cada página llega en orden ascendente): lo mismo, de la más nueva a la más vieja.
  select c.creado_en, c.id into v_ult from public.cotizaciones c where c.id = v_esperado[25];
  v_en := v_ult.creado_en; v_id := v_ult.id;
  loop
    v_n := 0; v_pagina := '{}';
    for r in select * from pg_temp.cb_busca(duena, 'rstuvw', 10, null, null, false, v_en, v_id, true) loop
      v_n := v_n + 1;
      exit when v_n > 10;
      v_pagina := v_pagina || r.id; v_ult := r;
    end loop;
    v_atras := (select array_agg(x order by o desc) from unnest(v_pagina) with ordinality u (x, o)) || v_atras;
    exit when v_n <= 10;
    v_en := v_ult.creado_en; v_id := v_ult.id;
  end loop;
  if v_atras is distinct from v_esperado[1:24] then raise exception 'B4: hacia atrás no da lo mismo: % de 24', cardinality(v_atras); end if;
end $$;
rollback;

-- @test cotizaciones_buscar: B5 los filtros del listado (origen, clase, mías) y el tope de coincidencias
begin;
do $$
declare duena uuid := pg_temp.cb_duena();
  ana uuid := pg_temp.cb_persona('Ana Tope', '[]'); t jsonb := pg_temp.cb_terreno('hijklm', duena); u jsonb := pg_temp.cb_terreno('hijklm', duena);
  c1 uuid; c2 uuid; c3 uuid; i int; v_acotada boolean;
begin
  c1 := pg_temp.cb_cot(t, duena, now() - interval '3 minutes');
  c2 := pg_temp.cb_cot(t, duena, now() - interval '2 minutes', 'final');
  c3 := pg_temp.cb_cot(u, duena, now() - interval '1 minute');
  if pg_temp.cb_ids(duena, 'hijklm', (t ->> 'o')::uuid) is distinct from array[c2, c1] then raise exception 'B5: el origen filtra mal: %', pg_temp.cb_ids(duena, 'hijklm', (t ->> 'o')::uuid); end if;
  if (select array_agg(x.id) from pg_temp.cb_busca(duena, 'hijklm', 100, null, 'final') x) is distinct from array[c2] then raise exception 'B5: la clase filtra mal'; end if;
  if (select array_agg(x.id order by x.creado_en desc) from pg_temp.cb_busca(duena, 'hijklm', 100, null, null, true) x) is distinct from array[c3, c2, c1] then raise exception 'B5: mías de la dueña'; end if;
  if exists (select 1 from pg_temp.cb_busca(ana, 'hijklm', 100, null, null, true)) then raise exception 'B5: mías de quien no creó nada'; end if;
  -- Hasta 50 clientes por búsqueda: con 60 leads que coinciden, la búsqueda lo dice y nombra los 50 más nuevos.
  for i in 1 .. 60 loop
    insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
    values ('Tope masivo ' || lpad(i::text, 2, '0'), '7219' || lpad(nextval('pg_temp.cb_telefono')::text, 4, '0'), duena, (select id from public.origenes_lead where clave = 'web'), '{}');
  end loop;
  insert into public.cotizaciones (origen_id, lead_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, clase, version, creado_en)
  select (t ->> 'o')::uuid, l.id, duena, (t ->> 'f')::uuid, '{}', '{}', '{}', '{}', 10, 'preventa', 1, now() - interval '1 hour'
    from public.leads l where l.nombre like 'Tope masivo%';
  select bool_or(x.acotada) into v_acotada from pg_temp.cb_busca(duena, 'tope masivo', 100) x;
  if v_acotada is not true then raise exception 'B5: 60 clientes que coinciden y no dijo acotada'; end if;
  if (select count(*) from pg_temp.cb_busca(duena, 'tope masivo', 100)) <> 50 then raise exception 'B5: nombró % clientes (debían ser 50)', (select count(*) from pg_temp.cb_busca(duena, 'tope masivo', 100)); end if;
  -- Sin pasarse, no dice acotada.
  if exists (select 1 from pg_temp.cb_busca(duena, 'hijklm', 100) x where x.acotada) then raise exception 'B5: dijo acotada sin pasarse'; end if;
end $$;
rollback;

-- El ayudante de la fuente «título», llamado directo como esa persona.
create or replace function pg_temp.cb_titulos(p_quien uuid, p_texto text, p_origen uuid default null) returns uuid[] language plpgsql as $f$
declare v uuid[];
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v := public._cotizaciones_ids_por_titulo(p_texto, p_origen);
  reset role;
  return v;
exception when others then
  reset role;
  raise;
end $f$;

-- @test cotizaciones_buscar: B6 la fuente «título»: encuentra, respeta la visibilidad y la papelera, tiene tope y el origen estrecha; el ayudante no nombra lo que no se ve
begin;
do $$
declare duena uuid := pg_temp.cb_duena();
  t jsonb := pg_temp.cb_terreno('ghtyrd', duena); u jsonb := pg_temp.cb_terreno('mnbvcd', duena); o uuid := (t ->> 'o')::uuid;
  propia uuid := pg_temp.cb_persona('Propia Seis', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o, 'alcance', 'propios')));
  sin_cot uuid := pg_temp.cb_persona('Sin Cotizaciones', jsonb_build_array(jsonb_build_object('clave', 'leads.ver'), jsonb_build_object('clave', 'vehiculos.ver')));
  c1 uuid; c2 uuid; c3 uuid; i int; v_acotada boolean;
begin
  c1 := pg_temp.cb_cot(t, duena, now() - interval '3 minutes');
  c2 := pg_temp.cb_cot(t, propia, now() - interval '2 minutes');
  c3 := pg_temp.cb_cot(u, duena, now() - interval '1 minute');
  update public.cotizaciones set titulo = case id when c1 then 'Pedido zafiro norte' when c2 then 'Pedido zafiro sur' else 'Pedido ZAFIRO este' end where id in (c1, c2, c3);
  -- Encuentra por parte del título, sin distinguir mayúsculas, de la más nueva a la más vieja.
  if pg_temp.cb_ids(duena, 'zafiro') is distinct from array[c3, c2, c1] then raise exception 'B6: el título no da las tres: %', pg_temp.cb_ids(duena, 'zafiro'); end if;
  if pg_temp.cb_ids(duena, 'zafiro sur') is distinct from array[c2] then raise exception 'B6: el título más largo: %', pg_temp.cb_ids(duena, 'zafiro sur'); end if;
  -- El origen estrecha.
  if pg_temp.cb_ids(duena, 'zafiro', o) is distinct from array[c2, c1] then raise exception 'B6: el origen: %', pg_temp.cb_ids(duena, 'zafiro', o); end if;
  if pg_temp.cb_titulos(duena, 'zafiro', o) is distinct from array[c2, c1] then raise exception 'B6: el origen en el ayudante: %', pg_temp.cb_titulos(duena, 'zafiro', o); end if;
  -- «Propios»: la propia sí, la ajena no (tampoco por el ayudante).
  if pg_temp.cb_ids(propia, 'zafiro') is distinct from array[c2] then raise exception 'B6: «propios» por título: %', pg_temp.cb_ids(propia, 'zafiro'); end if;
  if pg_temp.cb_titulos(propia, 'zafiro') is distinct from array[c2] then raise exception 'B6: el ayudante nombra lo que «propios» no ve: %', pg_temp.cb_titulos(propia, 'zafiro'); end if;
  -- Un origen que «propios» no ve no se puede pedir: el origen sólo estrecha.
  if cardinality(pg_temp.cb_titulos(propia, 'zafiro', (u ->> 'o')::uuid)) <> 0 then raise exception 'B6: el ayudante nombró de un origen que no se ve'; end if;
  -- «Propios» con el lead de la ajena en su cartera: ésa sí (la policy, `en_cartera()`).
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, lead_creado_en, lead_reciente_en) values ((t ->> 'l')::uuid, propia, 'compartido', now(), now());
  if pg_temp.cb_ids(propia, 'zafiro') is distinct from array[c2, c1] then raise exception 'B6: «propios» no encontró la de su cartera: %', pg_temp.cb_ids(propia, 'zafiro'); end if;
  if pg_temp.cb_titulos(propia, 'zafiro') is distinct from array[c2, c1] then raise exception 'B6: el ayudante no nombró la de su cartera: %', pg_temp.cb_titulos(propia, 'zafiro'); end if;
  -- Sin cotizaciones.ver, nada (por la búsqueda y por el ayudante directo).
  if cardinality(pg_temp.cb_ids(sin_cot, 'zafiro')) <> 0 or cardinality(pg_temp.cb_titulos(sin_cot, 'zafiro')) <> 0 then raise exception 'B6: sin cotizaciones.ver encontró por título'; end if;
  -- El mínimo del texto y los comodines: dos letras y «%%%» no buscan (el ayudante recibe el texto, no un patrón).
  if cardinality(pg_temp.cb_titulos(duena, 'za')) <> 0 or cardinality(pg_temp.cb_titulos(duena, '%%%')) <> 0 or cardinality(pg_temp.cb_titulos(duena, null)) <> 0 then
    raise exception 'B6: el ayudante buscó con menos del mínimo o con un comodín';
  end if;
  if cardinality(pg_temp.cb_titulos(duena, '%')) <> 0 then raise exception 'B6: «%%» fue comodín'; end if;
  -- La papelera no aparece.
  update public.cotizaciones set eliminado_en = now() where id = c1;
  if pg_temp.cb_ids(duena, 'zafiro') is distinct from array[c3, c2] then raise exception 'B6: apareció una de la papelera: %', pg_temp.cb_ids(duena, 'zafiro'); end if;
  if c1 = any (pg_temp.cb_titulos(duena, 'zafiro')) then raise exception 'B6: el ayudante nombra una de la papelera'; end if;
  -- El tope: con 60 títulos que coinciden, nombra 50 y dice acotada; el ayudante, 51.
  for i in 1 .. 60 loop
    perform pg_temp.cb_cot(t, duena, now() - interval '1 hour' - i * interval '1 second');
  end loop;
  update public.cotizaciones set titulo = 'Masivo rubí ' || id where origen_id = o and titulo is null and creado_en < now() - interval '30 minutes';
  select bool_or(x.acotada) into v_acotada from pg_temp.cb_busca(duena, 'masivo rubí', 100) x;
  if v_acotada is not true then raise exception 'B6: 60 títulos que coinciden y no dijo acotada'; end if;
  if (select count(*) from pg_temp.cb_busca(duena, 'masivo rubí', 100)) <> 50 then raise exception 'B6: nombró % por título (debían ser 50)', (select count(*) from pg_temp.cb_busca(duena, 'masivo rubí', 100)); end if;
  if cardinality(pg_temp.cb_titulos(duena, 'masivo rubí')) <> 51 then raise exception 'B6: el ayudante devolvió % (debían ser 51)', cardinality(pg_temp.cb_titulos(duena, 'masivo rubí')); end if;
  if exists (select 1 from pg_temp.cb_busca(duena, 'zafiro', 100) x where x.acotada) then raise exception 'B6: dijo acotada sin pasarse'; end if;
end $$;
rollback;
