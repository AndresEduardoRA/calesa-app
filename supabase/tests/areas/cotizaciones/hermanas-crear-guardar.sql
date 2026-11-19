-- Crear, guardar y cotizar encima de las cotizaciones hermanas (glosario: «Cotizaciones hermanas»; docs/COTIZADOR.md › «Quién escribe una cotización y cómo» y
-- «Cómo se guarda»): `cotizacion_crear_en_par`, `cotizacion_guardar_en_par` y `cotizacion_encima_en_par`, y lo que cambia en las de siempre con una versión en par.
-- No depende de otro archivo (`SOLO=areas/cotizaciones/hermanas-crear-guardar.sql`); cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   C1. Crear en par: dos filas que se apuntan, con el mismo lead, vehículo, versión, tipos de cambio y modo; cada una con su opción y su título « · 20 pies»; la
--       segunda nace 1 µs después; el mismo intento devuelve las dos (`repetido`) y uno solo ya usado es `intento_reusado`.
--   C2. «Desactualizada» y «Guardar con la N», para las dos; `cotizar_en_par` (crear suelta una versión en par), `sin_par` y `entradas_invalidas`.
--   C3. Sin vehículo el título se escribe (con la etiqueta de cada opción; el manual tiene el tope menor) y no hay aprobada; sin lead también; quien no ve la
--       variante crea igual (la opción la pone la base).
--   C4. Guardar en par: las dos con una revisión cada una; si una cambió, PT409 con su id en el hint y ninguna escrita; el mismo intento, `repetido`;
--       `no_son_hermanas`; sin permiso en una, 42501 y nada escrito; el vehículo cambia en las dos.
--   C5. Guardar suelta una hermana: no cambia el vehículo (`vehiculo_de_la_hermana`), mandar la variante es `variante_en_par` y el título lleva su etiqueta.
--   C6. Cotizar encima en par: el par nuevo, cada una encima de su anterior, con su opción y su título; `sin_par` y `no_son_hermanas`.
--   C7. La aprobada: la de la primera opción nace aprobada. Marcar final una manda la otra a un lote de la papelera de quien marca.
--   C8. Las tres RPC: de authenticated (ni anon ni PUBLIC), definer con search_path vacío; el ayudante de lo tipeado, de nadie.

create temp sequence hc_telefono;

create or replace function pg_temp.hc_duena() returns uuid language plpgsql as $f$
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
create or replace function pg_temp.hc_persona(p_claves text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('hc_' || substr(replace(v_id::text, '-', ''), 1, 12), 'hc ' || substr(v_id::text, 1, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.hc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
create or replace function pg_temp.hc_terreno(p_en_par boolean default true, p_variante_ver text default 'todos') returns jsonb language plpgsql as $f$
declare duena uuid := pg_temp.hc_duena(); o uuid; f uuid; l uuid; v uuid; a uuid;
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
  insert into public.origenes (clave, nombre) values ('hc_' || substr(gen_random_uuid()::text, 1, 8), 'hc origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', v_def, '{}', v_diseno, v_vis) returning id into f;
  a := pg_temp.hc_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead',
                                 'leads.ver', 'vehiculos.ver', 'leads.editar', 'cotizaciones.final.gestionar']);
  -- El lead es de quien cotiza (en su cartera, por el trigger del alta): marcar final lo pide.
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('hc lead', '72172' || lpad(nextval('pg_temp.hc_telefono')::text, 3, '0'), a, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'Toyota Hilux 2020', 'toyota') returning id into v;
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 days' where tipo_cambio_id in (select id from public.tipos_cambio);

  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v, 'a', a, 'duena', duena);
end $f$;

create or replace function pg_temp.hc_fila(p_c uuid) returns public.cotizaciones language sql as $f$ select * from public.cotizaciones where id = p_c $f$;


-- `cotizacion_crear_en_par` como esa persona, con la hoja abierta firmada para ella (o la dada), ese vehículo (nulo = sin vehículo), título y manual.
create or replace function pg_temp.hc_crear(p_quien uuid, t jsonb, p_ids uuid[], p_vehiculo uuid, p_titulo text default null, p_manual boolean default false,
                                           p_lead boolean default true, p_entradas jsonb default '[{"inputs": {"precio": 100, "flete": 10}}, {"inputs": {"precio": 100, "flete": 10}}]',
                                           p_abierta text default null, p_con_la_abierta boolean default false)
returns jsonb language plpgsql as $f$
declare v_abierta text := p_abierta;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  if v_abierta is null then
    v_abierta := public._cotizacion_abierta_firmar((t ->> 'o')::uuid, (t ->> 'f')::uuid, now());
  end if;
  return pg_temp.hc_corre(p_quien, format('select public.cotizacion_crear_en_par(%L::uuid[], %L, %L, %L::jsonb, %L, %L, p_con_la_abierta => %L, p_titulo => %L, p_titulo_manual => %L)',
                                          p_ids, t ->> 'o', case when p_lead then t ->> 'l' end, p_entradas, v_abierta, p_vehiculo, p_con_la_abierta, p_titulo, p_manual));
end $f$;

-- `cotizacion_guardar_en_par` como esa persona, con las versiones de hoy (o las dadas), el vehículo dado (por omisión el de la primera) y lo tipeado dado.
create or replace function pg_temp.hc_guardar(p_quien uuid, p_ids uuid[], p_entradas jsonb, p_intentos uuid[] default array[gen_random_uuid(), gen_random_uuid()],
                                             p_versiones timestamptz[] default null, p_vehiculo uuid default null, p_titulo text default null)
returns jsonb language plpgsql as $f$
declare v timestamptz[] := p_versiones; v_veh uuid := p_vehiculo;
begin
  if v is null then v := array[(pg_temp.hc_fila(p_ids[1])).actualizado_en, (pg_temp.hc_fila(p_ids[2])).actualizado_en]; end if;
  if v_veh is null then v_veh := (pg_temp.hc_fila(p_ids[1])).vehiculo_id; end if;
  return pg_temp.hc_corre(p_quien, format('select public.cotizacion_guardar_en_par(%L::uuid[], %L::uuid[], %L::timestamptz[], %L::jsonb, null, %L, array[null, null]::text[], %L, false)',
                                          p_ids, p_intentos, v, p_entradas, p_titulo, v_veh));
end $f$;

create or replace function pg_temp.hc_id(r jsonb, i int) returns uuid language sql as $f$ select (r -> 'cotizaciones' -> i -> 'cotizacion' ->> 'id')::uuid $f$;

-- @test cotizaciones hermanas: C1 crear en par
begin;
do $$
declare t jsonb := pg_temp.hc_terreno(); a uuid; x uuid := gen_random_uuid(); y uuid := gen_random_uuid(); r jsonb; ca public.cotizaciones; cb public.cotizaciones;
begin
  a := (t ->> 'a')::uuid;
  r := pg_temp.hc_crear(a, t, array[x, y], (t ->> 'v')::uuid);
  if r ? 'error' or r -> 'repetido' is distinct from 'false'::jsonb or jsonb_array_length(r -> 'cotizaciones') <> 2 then raise exception 'crear en par: %', r; end if;
  if pg_temp.hc_id(r, 0) is distinct from x or pg_temp.hc_id(r, 1) is distinct from y then raise exception 'el orden de la respuesta: %', r; end if;
  ca := pg_temp.hc_fila(x); cb := pg_temp.hc_fila(y);
  if ca.hermana_id is distinct from y or cb.hermana_id is distinct from x then raise exception 'no se apuntan'; end if;
  if ca.lead_id is distinct from cb.lead_id or ca.vehiculo_id is distinct from cb.vehiculo_id or ca.formula_id is distinct from cb.formula_id
     or ca.tipos_cambio is distinct from cb.tipos_cambio or ca.modo_tc is distinct from cb.modo_tc or ca.lead_id is distinct from (t ->> 'l')::uuid then
    raise exception 'no comparten lo común';
  end if;
  if ca.valores ->> 'contenedor' is distinct from 'c20' or cb.valores ->> 'contenedor' is distinct from 'c40' then raise exception 'las opciones: % y %', ca.valores, cb.valores; end if;
  if (ca.valores ->> 'total')::numeric is distinct from 100 or (cb.valores ->> 'total')::numeric is distinct from 110 then raise exception 'los totales de cada opción'; end if;
  if ca.titulo is distinct from 'Toyota Hilux 2020 · 20 pies' or cb.titulo is distinct from 'Toyota Hilux 2020 · 40 pies' or ca.titulo_manual or cb.titulo_manual then
    raise exception 'los títulos: «%» y «%»', ca.titulo, cb.titulo;
  end if;
  if cb.creado_en is distinct from ca.creado_en + interval '1 microsecond' then raise exception 'la segunda no nace 1 µs después'; end if;
  if current_setting('importadora.en_par', true) is distinct from '' then raise exception 'el ajuste en par quedó fijado'; end if;
  -- El mismo intento devuelve las dos; uno solo ya usado es otro intento.
  r := pg_temp.hc_crear(a, t, array[x, y], (t ->> 'v')::uuid);
  if r -> 'repetido' is distinct from 'true'::jsonb or pg_temp.hc_id(r, 0) is distinct from x or pg_temp.hc_id(r, 1) is distinct from y then raise exception 'el repetido: %', r; end if;
  r := pg_temp.hc_crear(a, t, array[x, gen_random_uuid()], (t ->> 'v')::uuid);
  if r ->> 'detail' is distinct from 'intento_reusado' then raise exception 'un intento a medias: %', r; end if;
end $$;
rollback;

-- @test cotizaciones hermanas: C2 desactualizada, Guardar con la N y los rechazos de una versión en par
begin;
do $$
declare t jsonb := pg_temp.hc_terreno(); suelta jsonb := pg_temp.hc_terreno(false); a uuid; v_abierta text; f2 uuid; r jsonb; x uuid := gen_random_uuid(); y uuid := gen_random_uuid();
begin
  a := (t ->> 'a')::uuid;
  perform set_config('request.jwt.claim.sub', a::text, true);
  v_abierta := public._cotizacion_abierta_firmar((t ->> 'o')::uuid, (t ->> 'f')::uuid, now());
  update public.formulas set estado = 'archivada' where id = (t ->> 'f')::uuid;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  select origen_id, 2, 'publicada', definicion, params, diseno, visibilidad from public.formulas where id = (t ->> 'f')::uuid returning id into f2;
  update public.formulas set publicado_en = now() where id = f2;
  r := pg_temp.hc_crear(a, t, array[x, y], (t ->> 'v')::uuid, p_abierta => v_abierta);
  if r ->> 'error' is distinct from 'PT409' or r ->> 'detail' is distinct from 'desactualizada' then raise exception 'desactualizada: %', r; end if;
  if exists (select 1 from public.cotizaciones c where c.id in (x, y)) then raise exception 'desactualizada escribió'; end if;
  r := pg_temp.hc_crear(a, t, array[x, y], (t ->> 'v')::uuid, p_abierta => v_abierta, p_con_la_abierta => true);
  if r ? 'error' or (pg_temp.hc_fila(x)).formula_id is distinct from (t ->> 'f')::uuid or (pg_temp.hc_fila(y)).formula_id is distinct from (t ->> 'f')::uuid then
    raise exception 'Guardar con la N: %', r;
  end if;
  -- Crear suelta una versión en par, el par en una sin par y lo tipeado que no es de dos.
  r := pg_temp.hc_corre(a, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, %L::jsonb, %L, %L)', t ->> 'o', t ->> 'l', '{"inputs": {"precio": 1}}',
                                  public._cotizacion_abierta_firmar((t ->> 'o')::uuid, f2, now()), t ->> 'v'));
  if r ->> 'detail' is distinct from 'cotizar_en_par' or r ->> 'hint' is distinct from 'variante' then raise exception 'crear suelta en par: %', r; end if;
  r := pg_temp.hc_crear(a, suelta, array[gen_random_uuid(), gen_random_uuid()], (suelta ->> 'v')::uuid);
  if r ->> 'detail' is distinct from 'sin_par' then raise exception 'en par sin par: %', r; end if;
  r := pg_temp.hc_crear(a, t, array[gen_random_uuid(), gen_random_uuid()], (t ->> 'v')::uuid, p_entradas => '[{"inputs": {}, "variante": "c20"}, {"inputs": {}}]');
  if r ->> 'detail' is distinct from 'entradas_invalidas' then raise exception 'la variante en lo tipeado: %', r; end if;
  r := pg_temp.hc_crear(a, t, array[gen_random_uuid(), gen_random_uuid()], (t ->> 'v')::uuid, p_entradas => '[{"inputs": {}}]');
  if r ->> 'detail' is distinct from 'entradas_invalidas' then raise exception 'lo tipeado de una sola: %', r; end if;
  r := pg_temp.hc_crear(a, t, array[x, x], (t ->> 'v')::uuid);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'ids' then raise exception 'dos ids iguales: %', r; end if;
end $$;
rollback;

-- @test cotizaciones hermanas: C3 sin vehículo, sin lead y sin ver la variante
begin;
do $$
declare t jsonb := pg_temp.hc_terreno(); oculta jsonb := pg_temp.hc_terreno(true, 'costos'); a uuid; r jsonb; x uuid := gen_random_uuid(); y uuid := gen_random_uuid();
begin
  a := (t ->> 'a')::uuid;
  r := pg_temp.hc_crear(a, t, array[gen_random_uuid(), gen_random_uuid()], null);
  if r ->> 'hint' is distinct from 'titulo' then raise exception 'sin vehículo ni título: %', r; end if;
  r := pg_temp.hc_crear(a, t, array[gen_random_uuid(), gen_random_uuid()], null, repeat('x', 111));
  if r ->> 'detail' is distinct from 'titulo_largo' then raise exception 'el título que no cabe con la opción: %', r; end if;
  r := pg_temp.hc_crear(a, t, array[x, y], null, '  Mi cotización ', p_lead => false);
  if r ? 'error' then raise exception 'sin vehículo ni lead: %', r; end if;
  if (pg_temp.hc_fila(x)).titulo is distinct from 'Mi cotización · 20 pies' or (pg_temp.hc_fila(y)).titulo is distinct from 'Mi cotización · 40 pies'
     or not (pg_temp.hc_fila(x)).titulo_manual or (pg_temp.hc_fila(x)).lead_id is not null then
    raise exception 'los títulos sin vehículo: «%»', (pg_temp.hc_fila(x)).titulo;
  end if;
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar, public.trg_cotizaciones_hermanas immediate;
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar, public.trg_cotizaciones_hermanas deferred;
  -- Quien no ve la variante crea igual, cada una con su opción.
  x := gen_random_uuid(); y := gen_random_uuid();
  r := pg_temp.hc_crear((oculta ->> 'a')::uuid, oculta, array[x, y], (oculta ->> 'v')::uuid);
  if r ? 'error' or (pg_temp.hc_fila(y)).valores ->> 'contenedor' is distinct from 'c40' then raise exception 'sin ver la variante: %', r; end if;
  if r -> 'cotizaciones' -> 0 -> 'valores' ? 'contenedor' then raise exception 'la respuesta trae la variante que no ve'; end if;
end $$;
rollback;

-- @test cotizaciones hermanas: C4 guardar en par
begin;
do $$
declare t jsonb := pg_temp.hc_terreno(); a uuid; otra uuid; r jsonb; p uuid[] := array[gen_random_uuid(), gen_random_uuid()]; v1 timestamptz; v2 timestamptz;
  v_int uuid[] := array[gen_random_uuid(), gen_random_uuid()]; q uuid[];
  v_ent constant jsonb := '[{"inputs": {"precio": 200, "flete": 10}}, {"inputs": {"precio": 200, "flete": 20}}]';
begin
  a := (t ->> 'a')::uuid;
  perform pg_temp.hc_crear(a, t, p, (t ->> 'v')::uuid);
  -- Entre transacciones la versión se mueve: se deja la de hoy en el pasado.
  update public.cotizaciones set actualizado_en = actualizado_en - interval '1 hour' where id = any (p);
  v1 := (pg_temp.hc_fila(p[1])).actualizado_en; v2 := (pg_temp.hc_fila(p[2])).actualizado_en;
  -- Si la de 40 pies cambió (otra versión), PT409 con su id y no se guarda ninguna.
  r := pg_temp.hc_guardar(a, p, v_ent, v_int, array[v1, v2 - interval '1 microsecond']);
  if r ->> 'error' is distinct from 'PT409' or r ->> 'hint' is distinct from p[2]::text then raise exception 'una cambió: %', r; end if;
  if (pg_temp.hc_fila(p[1])).actualizado_en is distinct from v1 or (pg_temp.hc_fila(p[2])).actualizado_en is distinct from v2 then raise exception 'el PT409 escribió'; end if;
  -- Las dos, con una revisión cada una.
  r := pg_temp.hc_guardar(a, p, v_ent, v_int);
  if r ? 'error' or r -> 'repetido' is distinct from 'false'::jsonb then raise exception 'guardar en par: %', r; end if;
  if (pg_temp.hc_fila(p[1])).valores ->> 'total' is distinct from '200' or (pg_temp.hc_fila(p[2])).valores ->> 'total' is distinct from '220' then
    raise exception 'los totales guardados: % y %', (pg_temp.hc_fila(p[1])).valores, (pg_temp.hc_fila(p[2])).valores;
  end if;
  if (select array_agg(rv.cotizacion_id order by rv.cotizacion_id) from public.cotizaciones_revisiones rv where rv.cotizacion_id = any (p)) is distinct from
     (select array_agg(x order by x) from unnest(p) x) then
    raise exception 'no queda una revisión en cada una';
  end if;
  if (pg_temp.hc_fila(p[1])).titulo is distinct from 'Toyota Hilux 2020 · 20 pies' then raise exception 'el título al guardar: %', (pg_temp.hc_fila(p[1])).titulo; end if;
  -- El mismo intento devuelve lo guardado.
  r := pg_temp.hc_guardar(a, p, v_ent, v_int, array[v1, v2]);
  if r -> 'repetido' is distinct from 'true'::jsonb then raise exception 'el repetido: %', r; end if;
  -- Que no son hermanas.
  q := array[gen_random_uuid(), gen_random_uuid()];
  perform pg_temp.hc_crear(a, t, q, (t ->> 'v')::uuid);
  r := pg_temp.hc_guardar(a, array[p[1], q[1]], v_ent);
  if r ->> 'detail' is distinct from 'no_son_hermanas' then raise exception 'no son hermanas: %', r; end if;
  -- Sin permiso en una (quien ve y edita sólo las propias, y creó sólo la de 20 pies): 42501 y nada escrito.
  otra := pg_temp.hc_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'leads.ver', 'vehiculos.ver'], 'propios');
  update public.cotizaciones set creado_por = otra where id = p[1];
  v1 := (pg_temp.hc_fila(p[1])).actualizado_en; v2 := (pg_temp.hc_fila(p[2])).actualizado_en;
  r := pg_temp.hc_guardar(otra, p, '[{"inputs": {"precio": 300}}, {"inputs": {"precio": 300}}]');
  if r ->> 'error' is distinct from '42501' then raise exception 'sin permiso en una: %', r; end if;
  if (pg_temp.hc_fila(p[1])).actualizado_en is distinct from v1 or (pg_temp.hc_fila(p[2])).actualizado_en is distinct from v2 then raise exception 'sin permiso escribió'; end if;
end $$;
rollback;

-- @test cotizaciones hermanas: C5 el vehículo cambia en las dos con guardar en par, nunca suelto; guardar suelta no manda la variante
begin;
do $$
declare t jsonb := pg_temp.hc_terreno(); a uuid; r jsonb; p uuid[] := array[gen_random_uuid(), gen_random_uuid()]; v2 uuid; c public.cotizaciones;
begin
  a := (t ->> 'a')::uuid;
  perform pg_temp.hc_crear(a, t, p, (t ->> 'v')::uuid);
  insert into public.vehiculos (origen_id, titulo, marca) values ((t ->> 'o')::uuid, 'Nissan Frontier 2019', 'nissan') returning id into v2;
  c := pg_temp.hc_fila(p[1]);
  -- Suelta: el vehículo de una hermana no cambia solo, y la variante no se manda.
  r := pg_temp.hc_corre(a, format('select public.cotizacion_guardar(%L, gen_random_uuid(), %L, %L::jsonb, null, null, null, %L, false)', p[1], c.actualizado_en,
                                  '{"inputs": {"precio": 100}}', v2));
  if r ->> 'detail' is distinct from 'vehiculo_de_la_hermana' or r ->> 'hint' is distinct from 'vehiculo' then raise exception 'el vehículo de una sola: %', r; end if;
  r := pg_temp.hc_corre(a, format('select public.cotizacion_guardar(%L, gen_random_uuid(), %L, %L::jsonb, null, null, null, %L, false)', p[1], c.actualizado_en,
                                  '{"inputs": {"precio": 100}, "variante": "c40"}', c.vehiculo_id));
  if r ->> 'detail' is distinct from 'variante_en_par' then raise exception 'la variante al guardar suelta: %', r; end if;
  -- Suelta, sin cambiar el vehículo: guarda con su opción y su título.
  r := pg_temp.hc_corre(a, format('select public.cotizacion_guardar(%L, gen_random_uuid(), %L, %L::jsonb, null, %L, null, %L, false, true)', p[1], c.actualizado_en,
                                  '{"inputs": {"precio": 150, "flete": 10}}', 'Para Juan', c.vehiculo_id));
  if r ? 'error' or (pg_temp.hc_fila(p[1])).titulo is distinct from 'Para Juan · 20 pies' or (pg_temp.hc_fila(p[1])).valores ->> 'contenedor' is distinct from 'c20' then
    raise exception 'guardar suelta una hermana: % «%»', r, (pg_temp.hc_fila(p[1])).titulo;
  end if;
  -- En par: el vehículo cambia en las dos y el invariante lo da por bueno al confirmar.
  r := pg_temp.hc_guardar(a, p, '[{"inputs": {"precio": 100}}, {"inputs": {"precio": 100}}]', p_vehiculo => v2);
  if r ? 'error' or (pg_temp.hc_fila(p[1])).vehiculo_id is distinct from v2 or (pg_temp.hc_fila(p[2])).vehiculo_id is distinct from v2 then raise exception 'el vehículo en par: %', r; end if;
  if (pg_temp.hc_fila(p[2])).titulo is distinct from 'Nissan Frontier 2019 · 40 pies' then raise exception 'el título automático con el vehículo nuevo: %', (pg_temp.hc_fila(p[2])).titulo; end if;
  set constraints public.trg_cotizaciones_hermanas immediate;
end $$;
rollback;

-- @test cotizaciones hermanas: C6 cotizar encima en par
begin;
do $$
declare t jsonb := pg_temp.hc_terreno(); suelta jsonb := pg_temp.hc_terreno(false); a uuid; r jsonb; p uuid[] := array[gen_random_uuid(), gen_random_uuid()];
  n uuid[] := array[gen_random_uuid(), gen_random_uuid()]; ca public.cotizaciones; cb public.cotizaciones; q uuid[] := array[gen_random_uuid(), gen_random_uuid()];
begin
  a := (t ->> 'a')::uuid;
  perform pg_temp.hc_crear(a, t, p, (t ->> 'v')::uuid);
  -- Encima de las dos, pasadas al revés: cada nueva encima de su anterior y con su opción; la de 20 pies primero.
  r := pg_temp.hc_corre(a, format('select public.cotizacion_encima_en_par(%L::uuid[], %L::uuid[])', n, array[p[2], p[1]]));
  if r ? 'error' or r -> 'repetido' is distinct from 'false'::jsonb then raise exception 'encima en par: %', r; end if;
  ca := pg_temp.hc_fila(n[1]); cb := pg_temp.hc_fila(n[2]);
  if ca.cotizacion_padre_id is distinct from p[2] or cb.cotizacion_padre_id is distinct from p[1] or ca.hermana_id is distinct from n[2] or cb.hermana_id is distinct from n[1] then
    raise exception 'el par nuevo no queda encima de su anterior';
  end if;
  if ca.valores ->> 'contenedor' is distinct from 'c40' or cb.valores ->> 'contenedor' is distinct from 'c20' or ca.version <> 2 then raise exception 'las opciones del par nuevo'; end if;
  if ca.titulo is distinct from 'Toyota Hilux 2020 · 40 pies' or cb.titulo is distinct from 'Toyota Hilux 2020 · 20 pies' then raise exception 'los títulos encima: «%» «%»', ca.titulo, cb.titulo; end if;
  if ca.creado_en is distinct from cb.creado_en + interval '1 microsecond' then raise exception 'la de 20 pies no nace primero'; end if;
  r := pg_temp.hc_corre(a, format('select public.cotizacion_encima_en_par(%L::uuid[], %L::uuid[])', n, array[p[2], p[1]]));
  if r -> 'repetido' is distinct from 'true'::jsonb then raise exception 'el repetido encima: %', r; end if;
  set constraints public.trg_cotizaciones_hermanas immediate;
  set constraints public.trg_cotizaciones_hermanas deferred;
  -- Que no son hermanas, y la publicada de hoy sin par.
  r := pg_temp.hc_corre(a, format('select public.cotizacion_encima_en_par(%L::uuid[], %L::uuid[])', q, array[n[1], p[1]]));
  if r ->> 'detail' is distinct from 'no_son_hermanas' then raise exception 'encima de dos que no son hermanas: %', r; end if;
  update public.formulas set definicion = (select x.definicion from public.formulas x where x.id = (suelta ->> 'f')::uuid) where id = (t ->> 'f')::uuid;
  r := pg_temp.hc_corre(a, format('select public.cotizacion_encima_en_par(%L::uuid[], %L::uuid[])', q, n));
  if r ->> 'detail' is distinct from 'sin_par' then raise exception 'encima en par sin par hoy: %', r; end if;
end $$;
rollback;

-- @test cotizaciones hermanas: C7 la aprobada nace en la primera opción; marcar final una manda la otra a la papelera
begin;
do $$
declare t jsonb := pg_temp.hc_terreno(); a uuid; r jsonb; p uuid[] := array[gen_random_uuid(), gen_random_uuid()]; c public.cotizaciones;
begin
  a := (t ->> 'a')::uuid;
  r := pg_temp.hc_crear(a, t, p, (t ->> 'v')::uuid);
  if r ? 'error' then raise exception 'crear: %', r; end if;
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar immediate;
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar deferred;
  if (select x.cotizacion_id from public.cotizaciones_aprobadas x where x.vehiculo_id = (t ->> 'v')::uuid) is distinct from p[1] then
    raise exception 'la aprobada no es la de la primera opción';
  end if;
  r := pg_temp.hc_corre(a, format('select jsonb_build_object(''ok'', true) from (select public.cotizacion_marcar_final(%L)) x', p[2]));
  if r ? 'error' then raise exception 'marcar final: %', r; end if;
  c := pg_temp.hc_fila(p[1]);
  if c.eliminado_en is null or c.lote_papelera_id is null or c.eliminado_por is distinct from a then raise exception 'la hermana no fue a la papelera de quien marca'; end if;
  if (pg_temp.hc_fila(p[2])).clase <> 'final' then raise exception 'no quedó final'; end if;
end $$;
rollback;

-- @test cotizaciones hermanas: C8 los privilegios de las RPC en par y del ayudante
begin;
do $$
declare f text;
begin
  foreach f in array array['public.cotizacion_crear_en_par(uuid[], uuid, uuid, jsonb, text, uuid, text, boolean, boolean, text, boolean)',
                           'public.cotizacion_guardar_en_par(uuid[], uuid[], timestamptz[], jsonb, text, text, text[], uuid, boolean, boolean)',
                           'public.cotizacion_encima_en_par(uuid[], uuid[])'] loop
    if has_function_privilege('anon', f, 'execute') or not has_function_privilege('authenticated', f, 'execute') then raise exception '% no es de authenticated', f; end if;
    if exists (select 1 from aclexplode(coalesce((select proacl from pg_proc where oid = f::regprocedure),
                                                  acldefault('f', (select proowner from pg_proc where oid = f::regprocedure)))) x where x.grantee = 0) then
      raise exception '% la ejecuta PUBLIC', f;
    end if;
    if not (select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = f::regprocedure) then raise exception '% no es definer con search_path vacío', f; end if;
  end loop;
  if has_function_privilege('authenticated', 'public._entradas_en_par(jsonb)', 'execute') then raise exception 'el ayudante lo ejecuta authenticated'; end if;
end $$;
rollback;
