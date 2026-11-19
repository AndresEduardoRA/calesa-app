-- Las cotizaciones hermanas en la base, lo que se lee (glosario: «Cotizaciones hermanas» y «Variante en par»; docs/COTIZADOR.md › «Lo que se guarda en una
-- cotización» y «La lectura que abre la hoja»). Las hermanas de estas pruebas se escriben directo, como las dejan las RPC en par (sus pruebas:
-- `hermanas-crear-guardar.sql`). No depende de otro archivo (`SOLO=areas/cotizaciones/hermanas.sql`); cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   H1. La forma: `hermana_id` la lee authenticated y nadie la escribe directo (un `update` de authenticated da 42501); la FK es diferida y `on delete set null`, a
--       lo sumo una apunta a cada cotización y ninguna a sí misma.
--   H2. El invariante (`trg_cotizaciones_hermanas`, diferido): un par que se apunta y comparte lead, vehículo, origen y versión pasa; una que no la apunta de vuelta
--       o un `update` del vehículo de una sola dan 23514 al confirmar; el mismo cambio en las dos pasa.
--   H3. Purgar una deja `hermana_id` nulo en la otra sin mover su versión (`actualizado_en`) ni escribir una revisión.
--   H4. `cotizacion_hoja`: con la variante en par, `par` (nodo, etiqueta y las dos opciones) y `en_par` en la celda y el subtotal que cambian según la opción, sin
--       el ítem de la variante; también para quien no ve la variante (su nivel la esconde). Sin par, `par` nulo, ninguna `en_par` y la variante como siempre.
--   H5. `cotizacion_hoja_guardada`: `par.opcion` es la de cada hermana; `hermana` disponible con su versión y si se puede guardar; en la papelera, inválida o
--       que no se ve, sólo su id y `disponible` falso; `puede_cotizar_encima_en_par` con la hermana disponible y la publicada en par.
--   H6. `cotizacion_evaluar(…, p_opcion)`: la opción la pone la base (cada opción da su total), también para quien no ve la variante; `sin_par`, `opcion_invalida`,
--       `llamada_invalida` (con una cotización) y `variante_en_par` (mandar la variante en una hoja en par).

create temp sequence hm_telefono;

create or replace function pg_temp.hm_duena() returns uuid language plpgsql as $f$
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
create or replace function pg_temp.hm_persona(p_claves text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('hm_' || substr(replace(v_id::text, '-', ''), 1, 12), 'hm ' || substr(v_id::text, 1, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.hm_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Un origen con su fórmula publicada (la variante `contenedor` de dos opciones, «20 pies» y «40 pies», en par salvo `p_en_par` falso; `precio` común y
-- `flete` sólo en 40 pies; el total los suma), un lead y un vehículo, y quien cotiza (ver, crear y editar, leads y vehículos, sin vehículo). `p_variante_ver`
-- es el nivel que ve la variante (`costos` la esconde a quien no tiene ese nivel).
create or replace function pg_temp.hm_terreno(p_en_par boolean default true, p_variante_ver text default 'todos') returns jsonb language plpgsql as $f$
declare duena uuid := pg_temp.hm_duena(); o uuid; f uuid; l uuid; v uuid; a uuid;
  v_opcion jsonb := jsonb_build_object('id', 'contenedor', 'tipo', 'opcion', 'etiqueta', 'Contenedor',
    'opciones', jsonb_build_array(jsonb_build_object('clave', 'c20', 'etiqueta', '20 pies', 'titulo', '1 vehículo en un contenedor de 20 pies'),
                                  jsonb_build_object('clave', 'c40', 'etiqueta', '40 pies', 'titulo', '2 vehículos en un contenedor de 40 pies')));
  v_def jsonb;
  v_vis jsonb := jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'contenedor', jsonb_build_object('ver', p_variante_ver, 'editar', p_variante_ver),
                                    'precio', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'flete', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                                    'total', jsonb_build_object('ver', 'todos', 'editar', null));
  v_diseno jsonb := jsonb_build_object('secciones', jsonb_build_array(jsonb_build_object('id', 'datos', 'titulo', 'Datos', 'items', jsonb_build_array(
                      jsonb_build_object('tipo', 'variante', 'nodo', 'contenedor'), jsonb_build_object('tipo', 'celda', 'nodo', 'precio'),
                      jsonb_build_object('tipo', 'celda', 'nodo', 'flete'), jsonb_build_object('tipo', 'subtotal', 'nodo', 'total')))),
                    'tarjeta_total', jsonb_build_object('nodo', 'total'), 'cabecera', jsonb_build_object('modos', '[]'::jsonb));
begin
  if p_en_par then v_opcion := v_opcion || '{"en_par": true}'::jsonb; else v_opcion := v_opcion || '{"por_defecto": "c20"}'::jsonb; end if;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    v_opcion,
    jsonb_build_object('id', 'precio', 'tipo', 'input', 'etiqueta', 'Precio', 'bucket', 'origen'),
    jsonb_build_object('id', 'flete', 'tipo', 'input', 'etiqueta', 'Flete', 'bucket', 'origen', 'solo_en', jsonb_build_array('c40')),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('precio', 'flete'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  insert into public.origenes (clave, nombre) values ('hm_' || substr(gen_random_uuid()::text, 1, 8), 'hm origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', v_def, '{}', v_diseno, v_vis) returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('hm lead', '72171' || lpad(nextval('pg_temp.hm_telefono')::text, 3, '0'), duena, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'Toyota Hilux 2020', 'toyota') returning id into v;
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 days' where tipo_cambio_id in (select id from public.tipos_cambio);
  a := pg_temp.hm_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead',
                                 'leads.ver', 'vehiculos.ver']);
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v, 'a', a, 'duena', duena);
end $f$;

create or replace function pg_temp.hm_fila(p_c uuid) returns public.cotizaciones language sql as $f$ select * from public.cotizaciones where id = p_c $f$;

-- Dos hermanas escritas directo (como las dejan las RPC en par): la de 20 pies de `p_a` y la de 40 pies de `p_b` (por omisión, quien cotiza).
create or replace function pg_temp.hm_par(t jsonb, p_a uuid default null, p_b uuid default null) returns uuid[] language plpgsql as $f$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
begin
  insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, hermana_id)
  values (a, (t ->> 'o')::uuid, (t ->> 'l')::uuid, (t ->> 'v')::uuid, coalesce(p_a, (t ->> 'a')::uuid), (t ->> 'f')::uuid,
          '{"contenedor": "c20", "precio": 100, "flete": 0, "total": 100}', '{"precio": "input"}', '{}', '{"usd": 100}', 100, 'Toyota Hilux 2020 · 20 pies', b),
         (b, (t ->> 'o')::uuid, (t ->> 'l')::uuid, (t ->> 'v')::uuid, coalesce(p_b, (t ->> 'a')::uuid), (t ->> 'f')::uuid,
          '{"contenedor": "c40", "precio": 100, "flete": 10, "total": 110}', '{"precio": "input", "flete": "input"}', '{}', '{"usd": 110}', 110, 'Toyota Hilux 2020 · 40 pies', a);
  return array[a, b];
end $f$;

create or replace function pg_temp.hm_item(r jsonb, p_nodo text) returns jsonb language sql as $f$
  select jsonb_path_query_first(r, '$.secciones[*].items[*] ? (@.nodo == $n)', jsonb_build_object('n', p_nodo))
$f$;

-- @test cotizaciones hermanas: H1 la forma de hermana_id
begin;
do $$
declare t jsonb := pg_temp.hm_terreno(); p uuid[]; r jsonb;
begin
  if not has_column_privilege('authenticated', 'public.cotizaciones', 'hermana_id', 'select') then raise exception 'authenticated no lee hermana_id'; end if;
  if has_column_privilege('authenticated', 'public.cotizaciones', 'hermana_id', 'update') or has_column_privilege('authenticated', 'public.cotizaciones', 'hermana_id', 'insert')
     or has_column_privilege('anon', 'public.cotizaciones', 'hermana_id', 'select') then
    raise exception 'hermana_id se escribe directo o la lee anon';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cotizaciones_hermana_id_fkey' and condeferrable and condeferred and confdeltype = 'n'
                   and confrelid = 'public.cotizaciones'::regclass) then
    raise exception 'la FK de hermana_id no es diferida con on delete set null';
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'cotizaciones_hermana_unica' and indexdef ilike 'create unique index%(hermana_id) where (hermana_id is not null)') then
    raise exception 'falta el índice único de hermana_id';
  end if;
  p := pg_temp.hm_par(t);
  r := pg_temp.hm_corre((t ->> 'a')::uuid, format('update public.cotizaciones set hermana_id = null where id = %L returning ''{}''::jsonb', p[1]));
  if r ->> 'error' is distinct from '42501' then raise exception 'authenticated escribió hermana_id: %', r; end if;
  begin
    update public.cotizaciones set hermana_id = id where id = p[1];
    raise exception 'una cotización se apuntó a sí misma';
  exception when check_violation then null;
  end;
end $$;
rollback;

-- @test cotizaciones hermanas: H2 el invariante diferido
begin;
do $$
declare t jsonb := pg_temp.hm_terreno(); p uuid[]; x uuid := gen_random_uuid(); y uuid := gen_random_uuid(); v2 uuid; v_cayo boolean;
begin
  p := pg_temp.hm_par(t);
  set constraints public.trg_cotizaciones_hermanas, public.cotizaciones_hermana_id_fkey immediate;
  set constraints public.trg_cotizaciones_hermanas, public.cotizaciones_hermana_id_fkey deferred;
  -- Una que apunta a otra que no la apunta de vuelta.
  v_cayo := false;
  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
    values (x, (t ->> 'o')::uuid, (t ->> 'l')::uuid, (t ->> 'v')::uuid, (t ->> 'a')::uuid, (t ->> 'f')::uuid, '{"contenedor": "c20"}', '{}', '{}', '{}', 0);
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, hermana_id)
    values (y, (t ->> 'o')::uuid, (t ->> 'l')::uuid, (t ->> 'v')::uuid, (t ->> 'a')::uuid, (t ->> 'f')::uuid, '{"contenedor": "c40"}', '{}', '{}', '{}', 0, x);
    set constraints public.trg_cotizaciones_hermanas, public.cotizaciones_hermana_id_fkey immediate;
  exception when check_violation then v_cayo := true;
  end;
  if not v_cayo then raise exception 'una hermana que no la apunta de vuelta pasó'; end if;
  -- El vehículo de una sola.
  insert into public.vehiculos (origen_id, titulo, marca) values ((t ->> 'o')::uuid, 'Otro', 'toyota') returning id into v2;
  v_cayo := false;
  begin
    update public.cotizaciones set vehiculo_id = v2 where id = p[1];
    set constraints public.trg_cotizaciones_hermanas, public.cotizaciones_hermana_id_fkey immediate;
  exception when check_violation then v_cayo := true;
  end;
  if not v_cayo then raise exception 'cambiar el vehículo de una sola hermana pasó'; end if;
  -- El mismo cambio en las dos.
  set constraints public.trg_cotizaciones_hermanas, public.cotizaciones_hermana_id_fkey deferred;
  update public.cotizaciones set vehiculo_id = v2 where id = any (p);
  set constraints public.trg_cotizaciones_hermanas, public.cotizaciones_hermana_id_fkey immediate;
end $$;
rollback;

-- @test cotizaciones hermanas: H3 purgar una suelta a la otra sin mover su versión ni escribir una revisión
begin;
do $$
declare t jsonb := pg_temp.hm_terreno(); p uuid[]; v_antes timestamptz; c public.cotizaciones;
begin
  p := pg_temp.hm_par(t);
  v_antes := (pg_temp.hm_fila(p[1])).actualizado_en;
  delete from public.cotizaciones where id = p[2];
  c := pg_temp.hm_fila(p[1]);
  if c.hermana_id is not null then raise exception 'la que queda sigue apuntando a la purgada'; end if;
  if c.actualizado_en is distinct from v_antes then raise exception 'soltar la hermana movió la versión'; end if;
  if exists (select 1 from public.cotizaciones_revisiones r where r.cotizacion_id = p[1]) then raise exception 'soltar la hermana dejó una revisión'; end if;
end $$;
rollback;

-- @test cotizaciones hermanas: H4 la hoja dice el par y qué celdas van en par, también a quien no ve la variante
begin;
do $$
declare t jsonb := pg_temp.hm_terreno(); oculta jsonb := pg_temp.hm_terreno(true, 'costos'); suelta jsonb := pg_temp.hm_terreno(false); r jsonb;
  v_par constant jsonb := '{"nodo": "contenedor", "etiqueta": "Contenedor", "opciones": [{"clave": "c20", "etiqueta": "20 pies"}, {"clave": "c40", "etiqueta": "40 pies"}]}';
begin
  r := pg_temp.hm_corre((t ->> 'a')::uuid, format('select public.cotizacion_hoja(%L)', t ->> 'o'));
  if r -> 'par' is distinct from v_par then raise exception 'el par de la hoja: %', r -> 'par'; end if;
  if pg_temp.hm_item(r, 'flete') -> 'en_par' is distinct from 'true'::jsonb or pg_temp.hm_item(r, 'total') -> 'en_par' is distinct from 'true'::jsonb then
    raise exception 'la celda o el subtotal que cambian no van en par: %', r -> 'secciones';
  end if;
  if pg_temp.hm_item(r, 'precio') ? 'en_par' then raise exception 'una celda común va en par'; end if;
  if pg_temp.hm_item(r, 'contenedor') is not null then raise exception 'la variante en par se dibuja'; end if;
  -- Quien no ve la variante (su nivel la esconde) recibe igual el par.
  r := pg_temp.hm_corre((oculta ->> 'a')::uuid, format('select public.cotizacion_hoja(%L)', oculta ->> 'o'));
  if r -> 'par' is distinct from v_par or pg_temp.hm_item(r, 'flete') -> 'en_par' is distinct from 'true'::jsonb then
    raise exception 'quien no ve la variante no recibe el par: %', r;
  end if;
  -- Sin par: nulo, ninguna celda en par y la variante como siempre.
  r := pg_temp.hm_corre((suelta ->> 'a')::uuid, format('select public.cotizacion_hoja(%L)', suelta ->> 'o'));
  if r -> 'par' is distinct from 'null'::jsonb or pg_temp.hm_item(r, 'flete') ? 'en_par' or pg_temp.hm_item(r, 'contenedor') ->> 'tipo' is distinct from 'variante' then
    raise exception 'una hoja sin par: %', r;
  end if;
end $$;
rollback;

-- @test cotizaciones hermanas: H5 la hoja de una guardada dice su opción y su hermana
begin;
do $$
declare t jsonb := pg_temp.hm_terreno(); suelta jsonb := pg_temp.hm_terreno(false); p uuid[]; q uuid[]; r jsonb; a uuid; propia uuid;
begin
  a := (t ->> 'a')::uuid;
  p := pg_temp.hm_par(t);
  r := pg_temp.hm_corre(a, format('select public.cotizacion_hoja_guardada(%L)', p[1]));
  if r -> 'par' ->> 'opcion' is distinct from 'c20' then raise exception 'la opción de la de 20 pies: %', r -> 'par'; end if;
  if r -> 'hermana' ->> 'id' is distinct from p[2]::text or r -> 'hermana' -> 'disponible' is distinct from 'true'::jsonb
     or r -> 'hermana' -> 'puede_guardar' is distinct from 'true'::jsonb or (r -> 'hermana' ->> 'actualizado_en')::timestamptz is distinct from (pg_temp.hm_fila(p[2])).actualizado_en then
    raise exception 'la hermana disponible: %', r -> 'hermana';
  end if;
  if r -> 'cotizacion' ->> 'hermana_id' is distinct from p[2]::text then raise exception 'la fila no trae hermana_id'; end if;
  if r -> 'puede_cotizar_encima_en_par' is distinct from 'true'::jsonb then raise exception 'no se puede cotizar encima del par: %', r; end if;
  r := pg_temp.hm_corre(a, format('select public.cotizacion_hoja_guardada(%L)', p[2]));
  if r -> 'par' ->> 'opcion' is distinct from 'c40' or r -> 'hermana' ->> 'id' is distinct from p[1]::text then raise exception 'la de 40 pies: %', r; end if;
  -- En la papelera, sólo su id y que no está disponible.
  update public.cotizaciones set eliminado_en = now(), eliminado_por = a where id = p[2];
  r := pg_temp.hm_corre(a, format('select public.cotizacion_hoja_guardada(%L)', p[1]));
  if r -> 'hermana' is distinct from jsonb_build_object('id', p[2], 'disponible', false) or r -> 'puede_cotizar_encima_en_par' is distinct from 'false'::jsonb then
    raise exception 'la hermana en la papelera: %', r -> 'hermana';
  end if;
  update public.cotizaciones set eliminado_en = null, eliminado_por = null, estado = 'invalida' where id = p[2];
  r := pg_temp.hm_corre(a, format('select public.cotizacion_hoja_guardada(%L)', p[1]));
  if r -> 'hermana' is distinct from jsonb_build_object('id', p[2], 'disponible', false) then raise exception 'la hermana inválida: %', r -> 'hermana'; end if;
  -- Una que no se ve: quien ve sólo las propias y creó sólo la de 20 pies.
  propia := pg_temp.hm_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'leads.ver', 'vehiculos.ver'], 'propios');
  q := pg_temp.hm_par(t, propia, (t ->> 'duena')::uuid);
  r := pg_temp.hm_corre(propia, format('select public.cotizacion_hoja_guardada(%L)', q[1]));
  if r -> 'hermana' is distinct from jsonb_build_object('id', q[2], 'disponible', false) then raise exception 'la hermana que no se ve: %', r; end if;
  -- Sin par en la publicada de hoy no se cotiza encima del par.
  update public.formulas set definicion = (select x.definicion from public.formulas x where x.id = (suelta ->> 'f')::uuid) where id = (t ->> 'f')::uuid;
  update public.cotizaciones set estado = 'activa' where id = p[2];
  r := pg_temp.hm_corre(a, format('select public.cotizacion_hoja_guardada(%L)', p[1]));
  if r -> 'puede_cotizar_encima_en_par' is distinct from 'false'::jsonb then raise exception 'cotizar encima del par sin par en la publicada'; end if;
end $$;
rollback;

-- @test cotizaciones hermanas: H6 evaluar con la opción del par
begin;
do $$
declare t jsonb := pg_temp.hm_terreno(); oculta jsonb := pg_temp.hm_terreno(true, 'costos'); suelta jsonb := pg_temp.hm_terreno(false); p uuid[]; r jsonb; a uuid;
  v_sql constant text := 'select public.cotizacion_evaluar(%L::jsonb, p_origen => %L, p_opcion => %L)';
  v_ent constant text := '{"inputs": {"precio": 100, "flete": 10}}';
begin
  a := (t ->> 'a')::uuid;
  r := pg_temp.hm_corre(a, format(v_sql, v_ent, t ->> 'o', 'c20'));
  if (r #>> '{valores,total}')::numeric is distinct from 100 then raise exception 'la de 20 pies: %', r; end if;
  r := pg_temp.hm_corre(a, format(v_sql, v_ent, t ->> 'o', 'c40'));
  if (r #>> '{valores,total}')::numeric is distinct from 110 then raise exception 'la de 40 pies: %', r; end if;
  -- Quien no ve la variante cotiza igual cada opción; sin la opción, la hoja le pide una variante que no ve.
  r := pg_temp.hm_corre((oculta ->> 'a')::uuid, format(v_sql, v_ent, oculta ->> 'o', 'c40'));
  if (r #>> '{valores,total}')::numeric is distinct from 110 then raise exception 'quien no ve la variante: %', r; end if;
  r := pg_temp.hm_corre((oculta ->> 'a')::uuid, format('select public.cotizacion_evaluar(%L::jsonb, p_origen => %L)', v_ent, oculta ->> 'o'));
  if r ->> 'detail' is distinct from 'variante_sin_eleccion' then raise exception 'sin la opción, quien no ve la variante: %', r; end if;
  -- Los rechazos.
  r := pg_temp.hm_corre(a, format(v_sql, v_ent, t ->> 'o', 'c99'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'opcion_invalida' then raise exception 'una opción que no es del par: %', r; end if;
  r := pg_temp.hm_corre(a, format(v_sql, '{"inputs": {"precio": 100}, "variante": "c20"}', t ->> 'o', 'c20'));
  if r ->> 'detail' is distinct from 'variante_en_par' then raise exception 'mandar la variante en una hoja en par: %', r; end if;
  r := pg_temp.hm_corre(a, format(v_sql, v_ent, suelta ->> 'o', 'c20'));
  if r ->> 'detail' is distinct from 'sin_par' then raise exception 'la opción en una hoja sin par: %', r; end if;
  p := pg_temp.hm_par(t);
  r := pg_temp.hm_corre(a, format('select public.cotizacion_evaluar(%L::jsonb, %L, p_opcion => %L)', v_ent, p[1], 'c40'));
  if r ->> 'detail' is distinct from 'llamada_invalida' then raise exception 'la opción con una cotización: %', r; end if;
  -- Una guardada calcula con su opción.
  r := pg_temp.hm_corre(a, format('select public.cotizacion_evaluar(%L::jsonb, %L)', v_ent, p[2]));
  if (r #>> '{valores,total}')::numeric is distinct from 110 then raise exception 'la guardada de 40 pies: %', r; end if;
  r := pg_temp.hm_corre(a, format('select public.cotizacion_evaluar(%L::jsonb, %L)', '{"inputs": {"precio": 100}, "variante": "c40"}', p[1]));
  if r ->> 'detail' is distinct from 'variante_en_par' then raise exception 'mandar la variante a una guardada en par: %', r; end if;
end $$;
rollback;
