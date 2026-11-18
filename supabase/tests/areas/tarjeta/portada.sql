-- La portada de la cotización (`docs/COTIZADOR.md` › «La portada de la cotización»): la tabla `cotizaciones_portadas`, `cotizacion_portada()`,
-- `cotizacion_portada_poner()`, la clave, el refcount, el rescate, la purga y el barrido del bucket `cotizaciones`.
-- No depende de otro archivo (`SOLO=areas/tarjeta/portada.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   P1. La policy de leer es la de la cotización: «todos» ve la fila; «propios», la suya; sin permiso o en la papelera, nada.
--   P2. `cotizacion_portada()`: 42501 igual para lo que no existe, está en la papelera o no se ve; sin portada, ruta y clave nulas y la vigente no;
--       quien sólo ve no puede guardarla; sin ver el lead, `ve_todo` falso y sin contexto; con todo, el contexto de la compartida.
--   P3. `cotizacion_portada_poner()`: 42501 sin poder guardar y sin `ve_todo`; 22023 con `hint` para la ruta (de otra cotización, fuera de `portada/`, hash
--       malo, otra extensión, objeto que no está), el tipo y el tamaño; PT409 con la clave vieja; inserta, reemplaza y encola la vieja (la misma ruta, no).
--   P4. La clave cambia con cada cosa que el dibujo lee y no con lo que no se ve (el valor de un tipo de cambio, la fase o la hora del vehículo).
--   P5. El refcount cuenta la portada; anotarla la saca de la cola; una ruta que ya se está limpiando no se anota.
--   P6. Purgar una cotización (o su vehículo) borra la fila por la cascada y encola su ruta.
--   P7. El barrido encola un objeto huérfano de `cotizaciones` más viejo que la gracia y no toca uno en uso como adjunto o como portada.
--   P8. Las dos RPC son definer con search_path vacío, `poner` toma el candado `for no key update`; anon y PUBLIC no tienen nada; los ayudantes son de nadie.
--   P9. El bucket: el objeto de `portada/` lo lee quien ve la cotización y todo lo que dibuja; con sólo `cotizaciones.ver` (sin ver el lead), no. Un adjunto, igual que siempre.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.po_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('po_' || substr(v_id::text, 1, 8), 'PO ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.po_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.po_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('po_' || substr(gen_random_uuid()::text, 1, 8), 'PO origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Un lead de quien lo crea (su cartera) y un vehículo del origen.
create or replace function pg_temp.po_lead(p_quien uuid) returns uuid language sql as $f$
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('PO cliente', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), p_quien)
  returning id;
$f$;
create or replace function pg_temp.po_vehiculo(p_quien uuid, e jsonb) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, marca, lote, vin, creado_por) values ((e ->> 'o')::uuid, 'PO vehículo', 'toyota', 'L-1', 'JTD00000001', p_quien) returning id;
$f$;

-- Una cotización viva de esa persona, con el lead y el vehículo que se le den.
create or replace function pg_temp.po_cot(p_quien uuid, e jsonb, p_lead uuid default null, p_vehiculo uuid default null) returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_lead, p_vehiculo, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- La ruta de la n-ésima portada de una cotización (por hash) y su objeto en storage con su metadata.
create or replace function pg_temp.po_ruta(p_c uuid, p_n int) returns text language sql as $f$
  select p_c || '/portada/' || lpad(to_hex(p_n), 64, '0') || '.webp';
$f$;
create or replace function pg_temp.po_objeto(p_ruta text, p_meta jsonb default '{"mimetype": "image/webp", "size": 10}', p_hace interval default interval '0') returns text language sql as $f$
  insert into storage.objects (bucket_id, name, metadata, created_at) values ('cotizaciones', p_ruta, p_meta, now() - p_hace) returning name;
$f$;

-- La clave vigente, como la base.
create or replace function pg_temp.po_clave(p_c uuid) returns text language sql as $f$ select public._cotizacion_portada_clave(p_c) $f$;

-- `poner` como esa persona, con la clave vigente salvo que se dé otra.
create or replace function pg_temp.po_poner(p_quien uuid, p_c uuid, p_ruta text, p_clave text default null) returns jsonb language sql as $f$
  select pg_temp.po_corre(p_quien, format('select to_jsonb(public.cotizacion_portada_poner(%L, %L, %L)::text)', p_c, p_ruta, coalesce(p_clave, pg_temp.po_clave(p_c))));
$f$;

-- @test portada: la policy de leer es la de la cotización (P1)
begin;
do $$
declare
  duena uuid := pg_temp.po_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.po_origen(); todos uuid; propios uuid; nadie uuid; c_mia uuid; c_ajena uuid; r jsonb;
  leer constant text := 'select coalesce(jsonb_agg(cotizacion_id order by cotizacion_id), ''[]'') from public.cotizaciones_portadas where cotizacion_id in (%L, %L)';
begin
  todos := pg_temp.po_persona(array['cotizaciones.ver']);
  propios := pg_temp.po_persona(array['cotizaciones.ver:propios']);
  nadie := pg_temp.po_persona(array['leads.ver']);
  c_mia := pg_temp.po_cot(propios, e);
  c_ajena := pg_temp.po_cot(duena, e);
  insert into public.cotizaciones_portadas (cotizacion_id, ruta, clave) values (c_mia, pg_temp.po_ruta(c_mia, 1), 'p1-a'), (c_ajena, pg_temp.po_ruta(c_ajena, 1), 'p1-b');

  r := pg_temp.po_corre(todos, format(leer, c_mia, c_ajena));
  if jsonb_array_length(r) <> 2 then raise exception 'quien ve «todos» no lee las dos: %', r; end if;
  r := pg_temp.po_corre(propios, format(leer, c_mia, c_ajena));
  if r is distinct from jsonb_build_array(c_mia) then raise exception 'quien ve «propios» no lee sólo la suya: %', r; end if;
  r := pg_temp.po_corre(nadie, format(leer, c_mia, c_ajena));
  if r is distinct from '[]'::jsonb then raise exception 'quien no ve cotizaciones leyó una portada: %', r; end if;
  update public.cotizaciones set eliminado_en = now() where id = c_ajena;
  r := pg_temp.po_corre(todos, format(leer, c_mia, c_ajena));
  if r is distinct from jsonb_build_array(c_mia) then raise exception 'la portada de una en la papelera se leyó: %', r; end if;
end $$;
rollback;

-- @test portada: cotizacion_portada da el estado, el permiso de guardarla, ve_todo y el contexto (P2)
begin;
do $$
declare
  duena uuid := pg_temp.po_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'leads.ver', 'vehiculos.ver']);
  e jsonb := pg_temp.po_origen(); ve uuid; sin_lead uuid; nadie uuid; c uuid; c_lead uuid; v_lead uuid; v_veh uuid; r jsonb;
  leer constant text := 'select public.cotizacion_portada(%L)';
begin
  ve := pg_temp.po_persona(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver']);
  sin_lead := pg_temp.po_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'vehiculos.ver']);
  nadie := pg_temp.po_persona(array['leads.ver']);
  c := pg_temp.po_cot(duena, e);
  v_lead := pg_temp.po_lead(duena);
  v_veh := pg_temp.po_vehiculo(duena, e);
  c_lead := pg_temp.po_cot(duena, e, v_lead, v_veh);
  update public.perfiles set nombre = 'Ana Asesora' where id = duena;

  -- Lo que no existe, no se ve o está en la papelera: el mismo 42501.
  r := pg_temp.po_corre(duena, format(leer, gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'una que no existe no dio 42501: %', r; end if;
  r := pg_temp.po_corre(nadie, format(leer, c));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien no ve no dio 42501: %', r; end if;

  -- Sin portada: ruta y clave nulas, la vigente no; quien edita y ve todo puede guardarla.
  r := pg_temp.po_corre(duena, format(leer, c));
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['clave', 'clave_vigente', 'contexto', 'puede_guardarla', 'ruta', 've_todo'] then
    raise exception 'las claves no son las esperadas: %', r; end if;
  if r -> 'ruta' <> 'null'::jsonb or r -> 'clave' <> 'null'::jsonb or r ->> 'clave_vigente' is distinct from pg_temp.po_clave(c)
     or (r ->> 'puede_guardarla')::boolean is not true or (r ->> 've_todo')::boolean is not true then
    raise exception 'el estado sin portada no es el esperado: %', r; end if;
  if r -> 'contexto' is distinct from jsonb_build_object('cliente', null, 'vehiculo', null, 'asesor', jsonb_build_object('nombre', 'Ana Asesora', 'email', duena || '@ejemplo.com')) then
    raise exception 'el contexto sin lead ni vehículo no es el esperado: %', r -> 'contexto'; end if;

  -- Con la portada anotada, su ruta y su clave.
  insert into public.cotizaciones_portadas (cotizacion_id, ruta, clave) values (c, pg_temp.po_ruta(c, 1), 'p1-vieja');
  r := pg_temp.po_corre(duena, format(leer, c));
  if r ->> 'ruta' is distinct from pg_temp.po_ruta(c, 1) or r ->> 'clave' is distinct from 'p1-vieja' then raise exception 'no devolvió la portada anotada: %', r; end if;

  -- Quien sólo ve: no puede guardarla.
  r := pg_temp.po_corre(ve, format(leer, c));
  if (r ->> 'puede_guardarla')::boolean is not false or (r ->> 've_todo')::boolean is not true then raise exception 'quien sólo ve podía guardarla: %', r; end if;

  -- Con el lead y el vehículo, el contexto de la compartida.
  r := pg_temp.po_corre(duena, format(leer, c_lead));
  if r -> 'contexto' is distinct from jsonb_build_object('cliente', 'PO cliente', 'vehiculo', jsonb_build_object('titulo', 'PO vehículo', 'lote', 'L-1', 'vin', 'JTD00000001'),
                                                         'asesor', jsonb_build_object('nombre', 'Ana Asesora', 'email', duena || '@ejemplo.com')) then
    raise exception 'el contexto con lead y vehículo no es el esperado: %', r -> 'contexto'; end if;

  -- Sin ver el lead: ve_todo falso, sin contexto y sin poder guardarla, aunque edite.
  r := pg_temp.po_corre(sin_lead, format(leer, c_lead));
  if (r ->> 've_todo')::boolean is not false or r -> 'contexto' <> 'null'::jsonb or (r ->> 'puede_guardarla')::boolean is not false
     or r ->> 'clave_vigente' is null then
    raise exception 'quien no ve el lead recibió la compartida: %', r; end if;
  -- Con el lead en la papelera, nadie lo dibuja: vuelve a ver todo.
  update public.leads set eliminado_en = now() where id = v_lead;
  r := pg_temp.po_corre(sin_lead, format(leer, c_lead));
  if (r ->> 've_todo')::boolean is not true or r #> '{contexto,cliente}' <> 'null'::jsonb then raise exception 'un lead en la papelera siguió contando: %', r; end if;

  -- En la papelera, el mismo 42501.
  update public.cotizaciones set eliminado_en = now() where id = c;
  r := pg_temp.po_corre(duena, format(leer, c));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'una en la papelera no dio 42501: %', r; end if;
end $$;
rollback;

-- @test portada: poner pide poder guardarla y ver todo, valida la ruta, el objeto, el tipo y el tamaño, compara la clave y reemplaza (P3)
begin;
do $$
declare
  duena uuid := pg_temp.po_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'leads.ver']);
  e jsonb := pg_temp.po_origen(); ve uuid; sin_lead uuid; c uuid; c2 uuid; c_lead uuid; r jsonb; v_clave text;
begin
  ve := pg_temp.po_persona(array['cotizaciones.ver']);
  sin_lead := pg_temp.po_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  c := pg_temp.po_cot(duena, e);
  c2 := pg_temp.po_cot(duena, e);
  c_lead := pg_temp.po_cot(duena, e, pg_temp.po_lead(duena));
  perform pg_temp.po_objeto(pg_temp.po_ruta(c, 1));
  perform pg_temp.po_objeto(pg_temp.po_ruta(c2, 1));
  perform pg_temp.po_objeto(pg_temp.po_ruta(c_lead, 1));

  -- Antes de mirar la ruta: ver, poder guardar y ver todo.
  r := pg_temp.po_poner(pg_temp.po_persona(array['cotizaciones.editar']), c, pg_temp.po_ruta(c, 1));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien edita sin ver puso: %', r; end if;
  r := pg_temp.po_poner(ve, c, 'cualquier/cosa');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No puedes guardar la vista previa de esta cotización.' then raise exception 'quien sólo ve puso: %', r; end if;
  r := pg_temp.po_poner(sin_lead, c_lead, pg_temp.po_ruta(c_lead, 1));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No puedes guardar la vista previa de esta cotización.' then raise exception 'quien no ve el lead puso: %', r; end if;

  -- La ruta: de otra cotización, fuera de `portada/`, con un hash malo, con otra extensión, o un objeto que no está.
  r := pg_temp.po_poner(duena, c, pg_temp.po_ruta(c2, 1));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'ruta' or r ->> 'mensaje' is distinct from 'La imagen no está en la carpeta de esta cotización.' then
    raise exception 'una ruta de otra cotización no dio 22023: %', r; end if;
  r := pg_temp.po_poner(duena, c, c || '/' || lpad('1', 64, '0') || '.webp');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'ruta' then raise exception 'una ruta fuera de portada/ no dio 22023: %', r; end if;
  r := pg_temp.po_poner(duena, c, c || '/portada/' || lpad('g', 64, '0') || '.webp');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'ruta' then raise exception 'un hash malo no dio 22023: %', r; end if;
  r := pg_temp.po_poner(duena, c, c || '/portada/' || lpad('1', 64, '0') || '.png');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'ruta' then raise exception 'otra extensión no dio 22023: %', r; end if;
  r := pg_temp.po_poner(duena, c, pg_temp.po_ruta(c, 2));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'ruta' or r ->> 'mensaje' is distinct from 'La imagen no terminó de subir.' then
    raise exception 'un objeto que no está no dio 22023: %', r; end if;
  -- El tipo y el tamaño, según storage.
  perform pg_temp.po_objeto(pg_temp.po_ruta(c, 3), '{"mimetype": "image/png", "size": 10}');
  r := pg_temp.po_poner(duena, c, pg_temp.po_ruta(c, 3));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'mime' then raise exception 'un PNG no dio 22023 de tipo: %', r; end if;
  perform pg_temp.po_objeto(pg_temp.po_ruta(c, 4), '{"mimetype": "image/webp", "size": 5242881}');
  r := pg_temp.po_poner(duena, c, pg_temp.po_ruta(c, 4));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'bytes' then raise exception 'una de más de 5 MB no dio 22023 de tamaño: %', r; end if;

  -- La clave vieja: PT409, sin anotar nada.
  r := pg_temp.po_poner(duena, c, pg_temp.po_ruta(c, 1), 'p1-vieja');
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'La tarjeta cambió mientras se armaba la imagen.' then raise exception 'la clave vieja no dio PT409: %', r; end if;
  if exists (select 1 from public.cotizaciones_portadas where cotizacion_id = c) then raise exception 'el PT409 anotó la portada'; end if;

  -- Anota; otra ruta la reemplaza y encola la vieja; la misma ruta no encola nada.
  v_clave := pg_temp.po_clave(c);
  r := pg_temp.po_poner(duena, c, pg_temp.po_ruta(c, 1));
  if r ? 'error' then raise exception 'no anotó la portada: %', r; end if;
  if (select ruta from public.cotizaciones_portadas where cotizacion_id = c) is distinct from pg_temp.po_ruta(c, 1)
     or (select clave from public.cotizaciones_portadas where cotizacion_id = c) is distinct from v_clave then raise exception 'la fila no quedó con la ruta y la clave'; end if;
  perform pg_temp.po_objeto(pg_temp.po_ruta(c, 5));
  r := pg_temp.po_poner(duena, c, pg_temp.po_ruta(c, 5));
  if r ? 'error' or (select ruta from public.cotizaciones_portadas where cotizacion_id = c) is distinct from pg_temp.po_ruta(c, 5) then raise exception 'no la reemplazó: %', r; end if;
  if not exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones' and ruta = pg_temp.po_ruta(c, 1) and reclamado_en is null) then raise exception 'la ruta vieja no fue a la cola'; end if;
  delete from public.cola_gc_storage where bucket = 'cotizaciones';
  r := pg_temp.po_poner(duena, c, pg_temp.po_ruta(c, 5));
  if r ? 'error' then raise exception 'la misma ruta otra vez no se anotó: %', r; end if;
  if exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones') then raise exception 'la misma ruta encoló algo'; end if;
  -- Las escrituras directas no entran.
  r := pg_temp.po_corre(duena, format('update public.cotizaciones_portadas set clave = ''x'' where cotizacion_id = %L returning to_jsonb(clave)', c));
  if r ->> 'error' is distinct from '42501' then raise exception 'un update directo entró: %', r; end if;
  r := pg_temp.po_corre(duena, format('delete from public.cotizaciones_portadas where cotizacion_id = %L returning to_jsonb(clave)', c));
  if r ->> 'error' is distinct from '42501' then raise exception 'un delete directo entró: %', r; end if;
end $$;
rollback;

-- @test portada: la clave cambia con cada cosa que el dibujo lee y no con lo que no se ve (P4)
begin;
do $$
declare
  duena uuid := pg_temp.po_persona(array['cotizaciones.ver']);
  e jsonb := pg_temp.po_origen(); c uuid; v_lead uuid; v_veh uuid; v_antes text; v_tono uuid; v_tc uuid; v_pla uuid; v_fase uuid;
begin
  v_lead := pg_temp.po_lead(duena);
  v_veh := pg_temp.po_vehiculo(duena, e);
  c := pg_temp.po_cot(duena, e, v_lead, v_veh);
  perform set_config('session_replication_role', 'replica', true);
  insert into public.tonos (clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
  values ('po_tono', 'PO', '#112233', '#112233', '#112233', '#112233', '#112233', '#112233', '#112233') returning id into v_tono;
  select id into v_tc from public.tipos_cambio order by clave collate "C" limit 1;
  if v_tc is null then
    insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('po_tc', 'PO', 'USD', 'BOB', 7) returning id into v_tc;
  end if;
  if pg_temp.po_clave(c) !~ '^p1-[0-9a-f]{32}$' then raise exception 'la clave no tiene la forma p<versión>-md5: %', pg_temp.po_clave(c); end if;

  -- Cambia: cada entrada, por separado.
  v_antes := pg_temp.po_clave(c);
  update public.cotizaciones set actualizado_en = actualizado_en + interval '1 second' where id = c;
  if pg_temp.po_clave(c) = v_antes then raise exception 'cotizaciones.actualizado_en no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion) values ((e ->> 'o')::uuid, 1, 'publicada', '{}') returning id into v_pla;
  if pg_temp.po_clave(c) = v_antes then raise exception 'publicar una plantilla no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.plantillas_tarjeta set actualizado_en = actualizado_en + interval '1 second' where id = v_pla;
  if pg_temp.po_clave(c) = v_antes then raise exception 'la plantilla publicada cambiada no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.formulas set actualizado_en = actualizado_en + interval '1 second' where id = (e ->> 'f')::uuid;
  if pg_temp.po_clave(c) = v_antes then raise exception 'la versión de la fórmula no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.tonos set hex = '#445566' where id = v_tono;
  if pg_temp.po_clave(c) = v_antes then raise exception 'el hex de un color no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.tipos_cambio set nombre = nombre || ' PO' where id = v_tc;
  if pg_temp.po_clave(c) = v_antes then raise exception 'el nombre de un tipo de cambio no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.tipos_cambio set activo = not activo where id = v_tc;
  if pg_temp.po_clave(c) = v_antes then raise exception 'activar o desactivar un tipo de cambio no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.tipos_cambio set moneda_a = 'EUR' where id = v_tc;
  if pg_temp.po_clave(c) = v_antes then raise exception 'la moneda de un tipo de cambio no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.vehiculos set titulo = 'PO otro' where id = v_veh;
  if pg_temp.po_clave(c) = v_antes then raise exception 'el título del vehículo no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.vehiculos set lote = 'L-2' where id = v_veh;
  if pg_temp.po_clave(c) = v_antes then raise exception 'el lote del vehículo no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.vehiculos set vin = 'JTD00000002' where id = v_veh;
  if pg_temp.po_clave(c) = v_antes then raise exception 'el VIN del vehículo no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.leads set nombre = 'PO otro cliente' where id = v_lead;
  if pg_temp.po_clave(c) = v_antes then raise exception 'el nombre del cliente no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.perfiles set nombre = 'PO otra asesora' where id = duena;
  if pg_temp.po_clave(c) = v_antes then raise exception 'el nombre de quien la creó no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.ajustes_empresa set actualizado_en = actualizado_en + interval '1 second' where id = 1;
  if pg_temp.po_clave(c) = v_antes then raise exception 'los ajustes de la empresa no cambiaron la clave'; end if;

  -- No cambia: el valor del día de un tipo de cambio, la fase y la hora del vehículo.
  v_antes := pg_temp.po_clave(c);
  update public.tipos_cambio set valor = valor + 1, actualizado_en = actualizado_en + interval '1 second' where id = v_tc;
  if pg_temp.po_clave(c) <> v_antes then raise exception 'el valor de un tipo de cambio cambió la clave'; end if;
  select id into v_fase from public.fases where id is distinct from (select fase_id from public.vehiculos where id = v_veh) limit 1;
  update public.vehiculos set fase_id = coalesce(v_fase, fase_id), fase_desde = case when coalesce(v_fase, fase_id) is not null then now() end,
                              actualizado_en = actualizado_en + interval '1 day' where id = v_veh;
  if pg_temp.po_clave(c) <> v_antes then raise exception 'la fase o la hora del vehículo cambiaron la clave'; end if;
  update public.tonos set nombre = 'PO otro nombre' where id = v_tono;
  if pg_temp.po_clave(c) <> v_antes then raise exception 'el nombre de un color (que la tarjeta no lee) cambió la clave'; end if;

  -- Mandar el lead o el vehículo a la papelera la cambia (dejan de dibujarse).
  update public.leads set eliminado_en = now() where id = v_lead;
  if pg_temp.po_clave(c) = v_antes then raise exception 'el lead en la papelera no cambió la clave'; end if;
  v_antes := pg_temp.po_clave(c);
  update public.vehiculos set eliminado_en = now() where id = v_veh;
  if pg_temp.po_clave(c) = v_antes then raise exception 'el vehículo en la papelera no cambió la clave'; end if;
  if public._cotizacion_portada_clave(gen_random_uuid()) is not null then raise exception 'la clave de una que no existe no es nula'; end if;
end $$;
rollback;

-- @test portada: el refcount la cuenta, anotarla la saca de la cola y una ruta que ya se limpia no se anota (P5)
begin;
do $$
declare
  duena uuid := pg_temp.po_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.po_origen(); c uuid; r jsonb;
begin
  c := pg_temp.po_cot(duena, e);
  perform pg_temp.po_objeto(pg_temp.po_ruta(c, 1));
  perform pg_temp.po_objeto(pg_temp.po_ruta(c, 2));
  insert into public.cola_gc_storage (bucket, ruta, encolado_en) values ('cotizaciones', pg_temp.po_ruta(c, 1), now() - interval '2 days');
  if public.storage_refcount('cotizaciones', pg_temp.po_ruta(c, 1)) <> 0 then raise exception 'el refcount contaba una ruta sin uso'; end if;
  r := pg_temp.po_poner(duena, c, pg_temp.po_ruta(c, 1));
  if r ? 'error' then raise exception 'no anotó la portada: %', r; end if;
  if public.storage_refcount('cotizaciones', pg_temp.po_ruta(c, 1)) <> 1 then raise exception 'el refcount no cuenta la portada'; end if;
  if public.storage_refcount('vehiculos', pg_temp.po_ruta(c, 1)) <> 0 then raise exception 'el refcount de otro bucket cuenta la portada'; end if;
  if exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones' and ruta = pg_temp.po_ruta(c, 1)) then raise exception 'anotarla no la sacó de la cola'; end if;
  -- Una ruta ya reclamada por la limpieza: el rescate avisa y no se anota.
  insert into public.cola_gc_storage (bucket, ruta, encolado_en, reclamado_en) values ('cotizaciones', pg_temp.po_ruta(c, 2), now() - interval '2 days', now());
  r := pg_temp.po_poner(duena, c, pg_temp.po_ruta(c, 2));
  if r ->> 'mensaje' is distinct from 'Ese archivo se está limpiando. Vuelve a subirlo en un momento.' then raise exception 'una ruta que se limpia se anotó: %', r; end if;
  if (select ruta from public.cotizaciones_portadas where cotizacion_id = c) is distinct from pg_temp.po_ruta(c, 1) then raise exception 'el rescate fallido cambió la portada'; end if;
end $$;
rollback;

-- @test portada: purgar una cotización o su vehículo borra la fila por la cascada y encola su ruta (P6)
begin;
do $$
declare
  duena uuid := pg_temp.po_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.po_origen(); c uuid; c_veh uuid; v_veh uuid; v_lote uuid; v_lote_veh uuid; r jsonb;
begin
  c := pg_temp.po_cot(duena, e);
  v_veh := pg_temp.po_vehiculo(duena, e);
  c_veh := pg_temp.po_cot(duena, e, null, v_veh);
  insert into public.cotizaciones_portadas (cotizacion_id, ruta, clave) values (c, pg_temp.po_ruta(c, 1), 'p1-a'), (c_veh, pg_temp.po_ruta(c_veh, 1), 'p1-b');
  insert into public.lotes_papelera (tipo, creado_por, resumen) values ('cotizaciones', duena, '{"cantidad": 1}') returning id into v_lote;
  insert into public.lotes_papelera (tipo, creado_por, resumen) values ('vehiculos', duena, '{"cantidad": 1}') returning id into v_lote_veh;
  perform set_config('session_replication_role', 'replica', true);
  update public.cotizaciones set eliminado_en = now(), eliminado_por = duena, lote_papelera_id = v_lote where id = c;
  update public.cotizaciones set eliminado_en = now(), eliminado_por = duena, lote_papelera_id = v_lote_veh where id = c_veh;
  update public.vehiculos set eliminado_en = now(), eliminado_por = duena, lote_papelera_id = v_lote_veh where id = v_veh;
  perform set_config('session_replication_role', 'origin', true);

  r := public._papelera_purgar_cotizaciones(v_lote, null);
  if jsonb_array_length(r -> 'purgados') <> 1 then raise exception 'no purgó la cotización: %', r; end if;
  if exists (select 1 from public.cotizaciones_portadas where cotizacion_id = c) then raise exception 'la cascada no borró la portada'; end if;
  if not exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones' and ruta = pg_temp.po_ruta(c, 1)) then raise exception 'purgar no encoló la portada'; end if;

  r := public._papelera_purgar_vehiculos(v_lote_veh, null);
  if jsonb_array_length(r -> 'purgados') <> 1 then raise exception 'no purgó el vehículo: %', r; end if;
  if exists (select 1 from public.cotizaciones_portadas where cotizacion_id = c_veh) then raise exception 'la cascada del vehículo no borró la portada'; end if;
  if not exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones' and ruta = pg_temp.po_ruta(c_veh, 1)) then raise exception 'purgar el vehículo no encoló la portada'; end if;
end $$;
rollback;

-- @test portada: el barrido encola lo huérfano de cotizaciones y no lo que usa un adjunto o una portada (P7)
begin;
do $$
declare
  duena uuid := pg_temp.po_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.po_origen(); c uuid; v_huerfano text; v_nuevo text; v_adjunto text;
begin
  c := pg_temp.po_cot(duena, e);
  v_huerfano := pg_temp.po_objeto(pg_temp.po_ruta(c, 1), p_hace => interval '3 days');
  v_nuevo := pg_temp.po_objeto(pg_temp.po_ruta(c, 2), p_hace => interval '1 hour');
  perform pg_temp.po_objeto(pg_temp.po_ruta(c, 3), p_hace => interval '3 days');
  v_adjunto := pg_temp.po_objeto(c || '/' || lpad('a', 64, '0') || '.pdf', '{"mimetype": "application/pdf", "size": 10}', interval '3 days');
  insert into public.cotizaciones_portadas (cotizacion_id, ruta, clave) values (c, pg_temp.po_ruta(c, 3), 'p1-a');
  insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes, subido_por) values (c, v_adjunto, 'a.pdf', 'application/pdf', 10, duena);
  delete from public.cola_gc_barrido where bucket = 'cotizaciones';
  delete from public.cola_gc_storage where bucket = 'cotizaciones';

  perform public.storage_gc_reclamar(0);
  if not exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones' and ruta = v_huerfano) then raise exception 'el barrido no encoló el huérfano viejo'; end if;
  if exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones' and ruta in (v_nuevo, pg_temp.po_ruta(c, 3), v_adjunto)) then
    raise exception 'el barrido encoló uno nuevo o en uso: %', (select array_agg(ruta) from public.cola_gc_storage where bucket = 'cotizaciones'); end if;
end $$;
rollback;

-- @test portada: las RPC son definer con search_path vacío, poner toma el candado sin clave, y los privilegios son los suyos (P8)
begin;
do $$
declare f record; v_def text;
begin
  for f in select p.oid, p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('cotizacion_portada', 'cotizacion_portada_poner', 'cotizacion_portada_visible') loop
    if not f.prosecdef or f.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío', f.proname; end if;
    if not has_function_privilege('authenticated', f.oid, 'execute') or has_function_privilege('anon', f.oid, 'execute') then
      raise exception '%: execute debía ser de authenticated y no de anon', f.proname; end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = f.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', f.proname; end if;
  end loop;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('cotizacion_portada', 'cotizacion_portada_poner', 'cotizacion_portada_visible')) <> 3 then
    raise exception 'faltan las RPC de la portada'; end if;
  v_def := pg_get_functiondef('public.cotizacion_portada_poner(uuid, text, text)'::regprocedure);
  if v_def !~ 'for no key update' or v_def ~* 'for update' then raise exception 'cotizacion_portada_poner no toma la cotización for no key update'; end if;
  for f in select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('_cotizacion_portada_clave', '_cotizacion_portada_ve_todo', '_portada_version_del_dibujo', 'cotizaciones_portada_rescatar') loop
    if has_function_privilege('authenticated', f.oid, 'execute') or has_function_privilege('anon', f.oid, 'execute') then
      raise exception '% no debía ser de authenticated ni de anon', f.proname; end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = f.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', f.proname; end if;
  end loop;
  if has_table_privilege('authenticated', 'public.cotizaciones_portadas', 'insert') or has_table_privilege('authenticated', 'public.cotizaciones_portadas', 'update')
     or has_table_privilege('authenticated', 'public.cotizaciones_portadas', 'delete') or has_table_privilege('anon', 'public.cotizaciones_portadas', 'select') then
    raise exception 'cotizaciones_portadas da escritura a authenticated o algo a anon'; end if;
end $$;
rollback;

-- @test portada: el objeto de portada/ lo lee quien ve todo lo que dibuja; con sólo ver la cotización, no; un adjunto, como siempre (P9)
begin;
do $$
declare
  duena uuid := pg_temp.po_persona(array['cotizaciones.ver', 'leads.ver']);
  e jsonb := pg_temp.po_origen(); sin_lead uuid; nadie uuid; c uuid; c_sola uuid; r jsonb;
  leer constant text := 'select coalesce(jsonb_agg(name order by name), ''[]'') from storage.objects where bucket_id = ''cotizaciones'' and name like %L';
begin
  sin_lead := pg_temp.po_persona(array['cotizaciones.ver']);
  nadie := pg_temp.po_persona(array['leads.ver']);
  c := pg_temp.po_cot(duena, e, pg_temp.po_lead(duena));
  c_sola := pg_temp.po_cot(duena, e);
  perform pg_temp.po_objeto(pg_temp.po_ruta(c, 1));
  perform pg_temp.po_objeto(c || '/' || lpad('a', 64, '0') || '.pdf', '{"mimetype": "application/pdf", "size": 10}');
  perform pg_temp.po_objeto(pg_temp.po_ruta(c_sola, 1));

  r := pg_temp.po_corre(duena, format(leer, c || '/%'));
  if jsonb_array_length(r) <> 2 then raise exception 'quien ve todo no leyó la portada y el adjunto: %', r; end if;
  r := pg_temp.po_corre(sin_lead, format(leer, c || '/%'));
  if r is distinct from jsonb_build_array(c || '/' || lpad('a', 64, '0') || '.pdf') then raise exception 'quien no ve el lead leyó la portada (o perdió el adjunto): %', r; end if;
  -- Sin lead ni vehículo no hay nada que no vea: la lee.
  r := pg_temp.po_corre(sin_lead, format(leer, c_sola || '/%'));
  if jsonb_array_length(r) <> 1 then raise exception 'la portada de una sin lead no la leyó quien ve la cotización: %', r; end if;
  r := pg_temp.po_corre(nadie, format(leer, c || '/%'));
  if r is distinct from '[]'::jsonb then raise exception 'quien no ve la cotización leyó algo del bucket: %', r; end if;
  if public.cotizacion_portada_visible(gen_random_uuid()) is distinct from false then raise exception 'cotizacion_portada_visible de una que no existe no es falso'; end if;
end $$;
rollback;
