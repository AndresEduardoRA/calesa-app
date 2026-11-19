-- La papelera con las cotizaciones hermanas (glosario: «Cotizaciones hermanas»): enviar una manda las dos al mismo lote; restaurar o purgar algunas suma su
-- hermana del mismo lote. No depende de otro archivo (`SOLO=areas/papelera/hermanas.sql`); cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   P1. Enviar una deja las dos en el mismo lote de quien envía (la hermana sin versión) y las dos van en `enviados`.
--   P2. Una hermana que quien envía no puede mandar a la papelera queda viva y va en `rechazados` con su motivo; la pedida entra.
--   P3. Restaurar el lote devuelve las dos; restaurar sólo una suma su hermana del mismo lote.
--   P4. Purgar sólo una purga las dos del lote; nunca una hermana de otro lote ni una viva.

create temp sequence hp_telefono;

create or replace function pg_temp.hp_duena() returns uuid language plpgsql as $f$
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
create or replace function pg_temp.hp_persona(p_claves text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('hp_' || substr(replace(v_id::text, '-', ''), 1, 12), 'hp ' || substr(v_id::text, 1, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.hp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
create or replace function pg_temp.hp_terreno(p_en_par boolean default true, p_variante_ver text default 'todos') returns jsonb language plpgsql as $f$
declare duena uuid := pg_temp.hp_duena(); o uuid; f uuid; l uuid; v uuid; a uuid;
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
  insert into public.origenes (clave, nombre) values ('hp_' || substr(gen_random_uuid()::text, 1, 8), 'hp origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', v_def, '{}', v_diseno, v_vis) returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('hp lead', '72171' || lpad(nextval('pg_temp.hp_telefono')::text, 3, '0'), duena, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'Toyota Hilux 2020', 'toyota') returning id into v;
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 days' where tipo_cambio_id in (select id from public.tipos_cambio);
  a := pg_temp.hp_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.crear.sin_vehiculo', 'cotizaciones.crear.sin_lead',
                                 'leads.ver', 'vehiculos.ver']);
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v, 'a', a, 'duena', duena);
end $f$;

create or replace function pg_temp.hp_fila(p_c uuid) returns public.cotizaciones language sql as $f$ select * from public.cotizaciones where id = p_c $f$;

-- Dos hermanas escritas directo: la de 20 pies de `p_a` y la de 40 pies de `p_b` (por omisión, quien cotiza).
create or replace function pg_temp.hp_par(t jsonb, p_a uuid default null, p_b uuid default null) returns uuid[] language plpgsql as $f$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
begin
  insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, hermana_id)
  values (a, (t ->> 'o')::uuid, (t ->> 'l')::uuid, (t ->> 'v')::uuid, coalesce(p_a, (t ->> 'a')::uuid), (t ->> 'f')::uuid,
          '{"contenedor": "c20", "precio": 100, "flete": 0, "total": 100}', '{}', '{}', '{"usd": 100}', 100, 'HP · 20 pies', b),
         (b, (t ->> 'o')::uuid, (t ->> 'l')::uuid, (t ->> 'v')::uuid, coalesce(p_b, (t ->> 'a')::uuid), (t ->> 'f')::uuid,
          '{"contenedor": "c40", "precio": 100, "flete": 10, "total": 110}', '{}', '{}', '{"usd": 110}', 110, 'HP · 40 pies', a);
  return array[a, b];
end $f$;

create or replace function pg_temp.hp_enviar(p_quien uuid, p_c uuid) returns jsonb language sql as $f$
  select pg_temp.hp_corre(p_quien, format('select public.cotizaciones_papelera_enviar(%L::jsonb)',
                                          jsonb_build_array(jsonb_build_object('id', p_c, 'actualizado_en', (pg_temp.hp_fila(p_c)).actualizado_en))))
$f$;

-- @test papelera con hermanas: P1 enviar una manda las dos al mismo lote
begin;
do $$
declare t jsonb := pg_temp.hp_terreno(); a uuid; p uuid[]; r jsonb;
begin
  a := (t ->> 'a')::uuid;
  p := pg_temp.hp_par(t);
  r := pg_temp.hp_enviar(a, p[1]);
  if r ? 'error' or jsonb_array_length(r -> 'enviados') <> 2 or jsonb_array_length(r -> 'rechazados') <> 0 then raise exception 'enviar una: %', r; end if;
  if (pg_temp.hp_fila(p[1])).lote_papelera_id is distinct from (r ->> 'lote')::uuid or (pg_temp.hp_fila(p[2])).lote_papelera_id is distinct from (r ->> 'lote')::uuid
     or (pg_temp.hp_fila(p[2])).eliminado_por is distinct from a then
    raise exception 'las dos no quedaron en el mismo lote de quien envía';
  end if;
  if (select l.resumen ->> 'cantidad' from public.lotes_papelera l where l.id = (r ->> 'lote')::uuid) is distinct from '2' then raise exception 'el lote no cuenta las dos'; end if;
end $$;
rollback;

-- @test papelera con hermanas: P2 la hermana que no se puede enviar queda viva, en rechazados
begin;
do $$
declare t jsonb := pg_temp.hp_terreno(); propia uuid; p uuid[]; r jsonb;
begin
  propia := pg_temp.hp_persona(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver']);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance)
  select ur.rol_id, 'cotizaciones.editar', 'propios' from public.usuarios_roles ur where ur.usuario_id = propia;
  p := pg_temp.hp_par(t, propia, (t ->> 'duena')::uuid);
  r := pg_temp.hp_enviar(propia, p[1]);
  if r ? 'error' or jsonb_array_length(r -> 'enviados') <> 1 or r -> 'enviados' -> 0 ->> 'id' is distinct from p[1]::text then raise exception 'la pedida: %', r; end if;
  if jsonb_array_length(r -> 'rechazados') <> 1 or r -> 'rechazados' -> 0 ->> 'id' is distinct from p[2]::text
     or r -> 'rechazados' -> 0 ->> 'motivo' is distinct from 'No tienes permiso para enviarla a la papelera.' then
    raise exception 'la hermana que no se puede enviar: %', r -> 'rechazados';
  end if;
  if (pg_temp.hp_fila(p[2])).eliminado_en is not null then raise exception 'la hermana que no se podía enviar se fue'; end if;
end $$;
rollback;

-- @test papelera con hermanas: P3 restaurar el lote o una sola devuelve las dos
begin;
do $$
declare t jsonb := pg_temp.hp_terreno(); a uuid; p uuid[]; r jsonb; v_lote uuid;
begin
  a := (t ->> 'a')::uuid;
  p := pg_temp.hp_par(t);
  r := pg_temp.hp_enviar(a, p[2]);
  v_lote := (r ->> 'lote')::uuid;
  r := pg_temp.hp_corre(a, format('select public.cotizaciones_papelera_restaurar(%L, %L::timestamptz, %L::uuid[])', v_lote, r ->> 'actualizado_en', array[p[1]]));
  if r ? 'error' or (pg_temp.hp_fila(p[1])).eliminado_en is not null or (pg_temp.hp_fila(p[2])).eliminado_en is not null then raise exception 'restaurar una: %', r; end if;
  r := pg_temp.hp_enviar(a, p[1]);
  r := pg_temp.hp_corre(a, format('select public.cotizaciones_papelera_restaurar(%L, %L::timestamptz)', r ->> 'lote', r ->> 'actualizado_en'));
  if r ? 'error' or (pg_temp.hp_fila(p[1])).eliminado_en is not null or (pg_temp.hp_fila(p[2])).eliminado_en is not null then raise exception 'restaurar el lote: %', r; end if;
end $$;
rollback;

-- @test papelera con hermanas: P4 purgar una purga las dos del lote, nunca la de otro lote
begin;
do $$
declare t jsonb := pg_temp.hp_terreno(); a uuid; propia uuid; p uuid[]; r jsonb; r2 jsonb; v_rol uuid;
begin
  a := (t ->> 'a')::uuid;
  insert into public.roles_permisos (rol_id, permiso_clave, alcance)
  select ur.rol_id, 'cotizaciones.papelera.purgar', 'todos' from public.usuarios_roles ur where ur.usuario_id = a;
  p := pg_temp.hp_par(t);
  r := pg_temp.hp_enviar(a, p[1]);
  r := pg_temp.hp_corre(a, format('select public.cotizaciones_papelera_purgar(%L, %L::timestamptz, %L::uuid[])', r ->> 'lote', r ->> 'actualizado_en', array[p[1]]));
  if r ? 'error' or exists (select 1 from public.cotizaciones c where c.id = any (p)) then raise exception 'purgar una: %', r; end if;
  -- Hermanas en lotes distintos: la de 40 pies no se pudo enviar con la primera; purgar la primera no la toca.
  propia := pg_temp.hp_persona(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver', 'cotizaciones.papelera.purgar']);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance)
  select ur.rol_id, 'cotizaciones.editar', 'propios' from public.usuarios_roles ur where ur.usuario_id = propia;
  p := pg_temp.hp_par(t, propia, a);
  r := pg_temp.hp_enviar(propia, p[1]);
  r2 := pg_temp.hp_enviar(a, p[2]);
  if r -> 'lote' = r2 -> 'lote' or (pg_temp.hp_fila(p[2])).eliminado_en is null then raise exception 'no quedaron en lotes distintos: % %', r, r2; end if;
  r := pg_temp.hp_corre(propia, format('select public.cotizaciones_papelera_purgar(%L, %L::timestamptz, %L::uuid[])', r ->> 'lote', r ->> 'actualizado_en', array[p[1]]));
  if r ? 'error' or exists (select 1 from public.cotizaciones c where c.id = p[1]) or not exists (select 1 from public.cotizaciones c where c.id = p[2]) then
    raise exception 'purgar cruzó de lote: %', r;
  end if;
  if (pg_temp.hp_fila(p[2])).hermana_id is not null then raise exception 'la que queda sigue apuntando a la purgada'; end if;
end $$;
rollback;
