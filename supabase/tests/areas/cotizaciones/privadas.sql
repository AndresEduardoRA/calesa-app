-- Cotizaciones privadas (glosario: «Cotización privada»; docs/COTIZADOR.md › «Cotizaciones privadas»): la marca `cotizaciones.privada`, el permiso
-- `cotizaciones.privadas.ver`, `cotizacion_privada_cambiar()` y lo que cambia en crear, cotizar encima, aprobar, marcar final, la aprobada y `cotizado_en`.
-- La regla en la policy, `puede_cotizacion()` y el listado contra la escrita a mano está en `cotizaciones-visibilidad.sql` (L2). No depende de otro archivo
-- (`SOLO=areas/cotizaciones/privadas.sql`); cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   P1. La forma: la columna nace falsa y la lee authenticated sin escribirla; una final nunca es privada; el permiso por origen y sin alcance, concedido al
--       dueño; la RPC nueva definer, de authenticated; crear y aprobar con su parámetro nuevo y una sola sobrecarga.
--   P2. Cambiar la marca: la autora la cambia (versión que sube, revisión {privada: {de, a}}, actividad), `sin_cambios` no escribe, vuelve a pública; versión
--       vieja PT409; sin la marca 22023 (hint privada).
--   P3. Quién: quien la ve y no la creó, 42501 «Sólo quien la creó…»; quien no la ve, una inexistente o una en la papelera, el mismo 42501 de acceso.
--   P4. Una final o la aprobada de su vehículo (también la de su hermana) no se hacen privadas (23514) y nada cambia.
--   P5. Las hermanas comparten la marca: la RPC cambia las dos y el trigger diferido rechaza dos marcas distintas.
--   P6. Lo que delata una privada ajena a quien no puede verla, en cada lectura: la tabla, puede_cotizacion, cotizacion_leer, el listado, la búsqueda (número y
--       título), la lista agrupada, «De este vehículo», el buscador global y los relacionados (que no la cuentan ni como oculta). La autora y quien tiene el
--       permiso del origen la ven; con el permiso de otro origen, no.
--   P7. Crear privada; una final privada da 22023; cotizar encima hereda la marca.
--   P8. Aprobar una privada: sin el aviso 22023 (hint privada) y nada cambia; con él queda pública con su hermana y aprobada, y devuelve la versión nueva.
--   P9. Marcar final una privada la hace pública con su hermana (que va a la papelera pública).
--   P10. La aprobada automática se elige entre las públicas; una privada no mueve `cotizado_en` y hacerla pública sí.
--   P11. La papelera no nombra una privada ajena a quien purga sin el permiso: ni en el lote ni en su cuenta, ni un lote de sólo privadas, ni la lista por
--        tipo, ni lo que devuelve restaurar el lote (que la restaura igual, con todo el lote). Con el permiso del origen la ve.

create temp sequence priv_telefono;

-- La primera cuenta nace dueña: la dueña existe antes de cualquier persona de la prueba.
create or replace function pg_temp.priv_duena() returns uuid language plpgsql as $f$
declare v uuid;
begin
  select ur.usuario_id into v from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' order by ur.usuario_id limit 1;
  if v is null then
    v := gen_random_uuid();
    insert into auth.users (id, email, raw_app_meta_data) values (v, v || '@ejemplo.com', '{"invitado": true}');
  end if;
  return v;
end $f$;

-- Una persona activa con un rol propio. Cada concesión es 'clave', 'clave:propios' o 'clave:todos:<origen>'.
create or replace function pg_temp.priv_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.priv_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('priv_' || substr(replace(v_id::text, '-', ''), 1, 12), 'PRIV ' || substr(v_id::text, 1, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance, origen_id)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso, nullif(split_part(c, ':', 3), '')::uuid);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.priv_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_h text; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, 'null'::jsonb);
end $f$;

create or replace function pg_temp.priv_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- Un origen con su fórmula publicada (con tipo de cambio, para crear por la RPC), un lead de `p_quien` (en su cartera, por el trigger del alta) y un vehículo.
create or replace function pg_temp.priv_terreno(p_quien uuid) returns jsonb language plpgsql as $f$
declare o uuid; f uuid; l uuid; v uuid;
begin
  insert into public.origenes (clave, nombre) values ('priv_' || substr(gen_random_uuid()::text, 1, 8), 'PRIV origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
            'buckets', jsonb_build_object('origen', 'tc')),
          '{}', '{}', jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                                         'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('PRIV lead', '72190' || lpad(nextval('pg_temp.priv_telefono')::text, 3, '0'), p_quien, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'PRIV vehículo', 'toyota') returning id into v;
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 days' where tipo_cambio_id in (select id from public.tipos_cambio);
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v);
end $f$;

-- Una cotización viva de esa persona en ese terreno (con el lead y el vehículo, salvo que se pidan nulos), creada hace p_min minutos.
create or replace function pg_temp.priv_cot(p_quien uuid, e jsonb, p_privada boolean default false, p_min integer default 0, p_clase text default 'preventa',
                                           p_titulo text default 'PRIV cotización', p_con_vehiculo boolean default true) returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, clase, titulo, valores, fuentes, tipos_cambio, totales, total_base, privada, creado_en)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, (e ->> 'l')::uuid, case when p_con_vehiculo then (e ->> 'v')::uuid end, p_clase::public.clase_cotizacion, p_titulo,
          '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10, p_privada, now() - make_interval(mins => p_min))
  returning id into v_c;
  return v_c;
end $f$;

-- Dos hermanas de esa persona (se apuntan entre sí), con esa marca.
create or replace function pg_temp.priv_hermanas(p_quien uuid, e jsonb, p_privada boolean) returns uuid[] language plpgsql as $f$
declare c1 uuid := pg_temp.priv_cot(p_quien, e, p_privada, 10); c2 uuid := pg_temp.priv_cot(p_quien, e, p_privada, 9);
begin
  update public.cotizaciones set hermana_id = c2 where id = c1;
  update public.cotizaciones set hermana_id = c1 where id = c2;
  return array[c1, c2];
end $f$;

create or replace function pg_temp.priv_fila(p_c uuid) returns public.cotizaciones language sql as $f$ select * from public.cotizaciones where id = p_c $f$;

create or replace function pg_temp.priv_cambiar(p_quien uuid, p_c uuid, p_privada boolean, p_version timestamptz default null) returns jsonb language sql as $f$
  select pg_temp.priv_corre(p_quien, format('select public.cotizacion_privada_cambiar(%L, %L, %L)', p_c, p_privada, coalesce(p_version, (pg_temp.priv_fila(p_c)).actualizado_en)));
$f$;

-- Lo que cada lectura dice de la cotización p (del vehículo v, el lead l y el número num), como quien llama: corre como invocadora.
create or replace function pg_temp.priv_lecturas(p uuid, v uuid, num text, l uuid) returns jsonb language sql as $f$
  select jsonb_build_object(
    'tabla', exists (select 1 from public.cotizaciones c where c.id = p),
    'puede', public.puede_cotizacion(p, 'cotizaciones.ver'),
    'listado', exists (select 1 from public.cotizaciones_listado(100, p_vehiculo => v) x where x.id = p),
    'listado_privada', (select x.privada from public.cotizaciones_listado(100, p_vehiculo => v) x where x.id = p),
    'por_numero', exists (select 1 from public.cotizaciones_buscar(num, 50) b where b.id = p),
    'por_titulo', exists (select 1 from public.cotizaciones_buscar('zqxprivadaqz', 50) b where b.id = p),
    'agrupada', exists (select 1 from public.cotizaciones_listado_por_vehiculo(100) g where g.vehiculo_id = v),
    'de_este_vehiculo', exists (select 1 from public.cotizaciones_de_este_vehiculo(v, 50) d where d.id = p),
    'de_este_vehiculo_privada', (select d.privada from public.cotizaciones_de_este_vehiculo(v, 50) d where d.id = p and not d.fijada),
    'buscador_numero', exists (select 1 from public.buscador_cotizaciones(num, 10) b where b.id = p),
    'buscador_titulo', exists (select 1 from public.buscador_cotizaciones('zqxprivadaqz', 10) b where b.id = p),
    'rel_vehiculo', public.vehiculo_relacionados(v) -> 'cotizados',
    'rel_lead', public.lead_relacionados(l) -> 'cotizados');
$f$;

-- Fuerza los triggers diferidos (en un bloque revertido no correrían).
create or replace function pg_temp.priv_confirmar() returns void language plpgsql as $f$
begin
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar, public.trg_cotizaciones_hermanas immediate;
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar, public.trg_cotizaciones_hermanas deferred;
end $f$;

-- @test cotizaciones privadas: P1 la forma de la columna, del permiso y de las RPC
begin;
do $$
declare f text; p record;
begin
  if not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'cotizaciones' and c.column_name = 'privada'
                   and c.data_type = 'boolean' and c.is_nullable = 'NO' and c.column_default = 'false') then
    raise exception 'P1: cotizaciones.privada no es boolean not null default false';
  end if;
  if not has_column_privilege('authenticated', 'public.cotizaciones', 'privada', 'select') then raise exception 'P1: authenticated no lee la marca'; end if;
  if has_column_privilege('authenticated', 'public.cotizaciones', 'privada', 'update') or has_column_privilege('authenticated', 'public.cotizaciones', 'privada', 'insert') then
    raise exception 'P1: authenticated escribe la marca directo';
  end if;
  if has_column_privilege('anon', 'public.cotizaciones', 'privada', 'select') then raise exception 'P1: anon lee la marca'; end if;
  if not exists (select 1 from pg_constraint where conname = 'cotizaciones_final_no_privada' and conrelid = 'public.cotizaciones'::regclass) then
    raise exception 'P1: falta el check de que una final nunca es privada';
  end if;
  select * into p from public.permisos where clave = 'cotizaciones.privadas.ver';
  if not found or not p.por_origen or p.con_alcance or p.modulo <> 'cotizaciones' or p.aplicado_en !~ 'puede_cotizacion' or p.aplicado_en !~ 'cotizaciones: leer' then
    raise exception 'P1: el permiso no es por origen, sin alcance, del módulo y con su punto de enforcement: %', to_jsonb(p);
  end if;
  if not exists (select 1 from public.roles_permisos rp join public.roles r on r.id = rp.rol_id
                  where r.clave = 'dueno' and rp.permiso_clave = 'cotizaciones.privadas.ver' and rp.origen_id is null) then
    raise exception 'P1: el dueño no tiene el permiso';
  end if;
  foreach f in array array['public.cotizacion_privada_cambiar(uuid, boolean, timestamptz)',
                           'public.cotizacion_aprobar(uuid, timestamptz, boolean)',
                           'public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean, text, boolean, boolean)',
                           'public.cotizacion_crear_en_par(uuid[], uuid, uuid, jsonb, text, uuid, text, boolean, boolean, text, boolean, boolean)'] loop
    if has_function_privilege('anon', f, 'execute') or not has_function_privilege('authenticated', f, 'execute') then raise exception 'P1: % no es de authenticated', f; end if;
    if exists (select 1 from aclexplode((select proacl from pg_proc where oid = f::regprocedure)) x where x.grantee = 0) then raise exception 'P1: % la ejecuta PUBLIC', f; end if;
    if not (select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = f::regprocedure) then raise exception 'P1: % no es definer con search_path vacío', f; end if;
  end loop;
  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cotizacion_aprobar', 'cotizacion_crear', 'cotizacion_crear_en_par', 'cotizacion_privada_cambiar')) <> 4 then
    raise exception 'P1: quedó una sobrecarga vieja';
  end if;
end $$;
rollback;

-- @test cotizaciones privadas: P2 la autora cambia la marca con su versión; la revisión, la actividad, sin cambios, la vuelta, PT409 y sin la marca
begin;
do $$
declare
  a uuid := pg_temp.priv_persona(array['cotizaciones.ver']); e jsonb := pg_temp.priv_terreno(a); c uuid := pg_temp.priv_cot(a, e);
  v0 timestamptz := (pg_temp.priv_fila(c)).actualizado_en; r jsonb; v_n int;
begin
  r := pg_temp.priv_cambiar(a, c, true);
  if r ->> 'resultado' is distinct from 'cambiada' or (r ->> 'privada')::boolean is distinct from true then raise exception 'P2: hacerla privada dio %', r; end if;
  if not (pg_temp.priv_fila(c)).privada then raise exception 'P2: no quedó privada'; end if;
  if (pg_temp.priv_fila(c)).actualizado_en <= v0 or (r ->> 'actualizado_en')::timestamptz is distinct from (pg_temp.priv_fila(c)).actualizado_en then
    raise exception 'P2: la versión no subió o no es la que devolvió: %', r;
  end if;
  if not exists (select 1 from public.cotizaciones_revisiones x where x.cotizacion_id = c and x.usuario_id = a
                  and x.diff = '{"privada": {"de": false, "a": true}}'::jsonb) then
    raise exception 'P2: no dejó la revisión de la marca: %', (select jsonb_agg(x.diff) from public.cotizaciones_revisiones x where x.cotizacion_id = c);
  end if;
  if not exists (select 1 from public.actividad x where x.accion = 'cotizaciones.update' and x.registro_id = c::text and x.actor_id = a
                  and (x.antes ->> 'privada')::boolean = false and (x.despues ->> 'privada')::boolean = true) then
    raise exception 'P2: no dejó la actividad';
  end if;
  -- Otra vez privada: sin cambios, sin revisión nueva.
  select count(*) into v_n from public.cotizaciones_revisiones x where x.cotizacion_id = c;
  r := pg_temp.priv_cambiar(a, c, true);
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'P2: repetir dio %', r; end if;
  if (select count(*) from public.cotizaciones_revisiones x where x.cotizacion_id = c) <> v_n then raise exception 'P2: sin cambios dejó una revisión'; end if;
  -- Con la versión de antes: PT409, y nada cambia.
  perform pg_temp.priv_error('versión vieja', pg_temp.priv_cambiar(a, c, false, v0), 'PT409',
                             'Alguien cambió esta cotización mientras la mirabas. Recarga e intenta de nuevo.');
  if not (pg_temp.priv_fila(c)).privada then raise exception 'P2: la versión vieja cambió la marca'; end if;
  r := pg_temp.priv_corre(a, format('select public.cotizacion_privada_cambiar(%L, null, %L)', c, (pg_temp.priv_fila(c)).actualizado_en));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'privada' then raise exception 'P2: sin la marca dio %', r; end if;
  -- Vuelve a pública.
  r := pg_temp.priv_cambiar(a, c, false);
  if r ->> 'resultado' is distinct from 'cambiada' or (pg_temp.priv_fila(c)).privada then raise exception 'P2: hacerla pública dio %', r; end if;
  if not exists (select 1 from public.cotizaciones_revisiones x where x.cotizacion_id = c and x.diff = '{"privada": {"de": true, "a": false}}'::jsonb) then
    raise exception 'P2: hacerla pública no dejó su revisión';
  end if;
end $$;
rollback;

-- @test cotizaciones privadas: P3 sólo la autora; quien no la ve, una inexistente y una en la papelera dan el mismo 42501 de acceso
begin;
do $$
declare
  a uuid := pg_temp.priv_persona(array['cotizaciones.ver']); jefa uuid := pg_temp.priv_persona(array['cotizaciones.ver', 'cotizaciones.privadas.ver', 'cotizaciones.editar']);
  todos uuid := pg_temp.priv_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.priv_terreno(a); c uuid := pg_temp.priv_cot(a, e); p uuid := pg_temp.priv_cot(a, e, true);
  autora constant text := 'Sólo quien la creó la hace privada o pública.'; acceso constant text := 'No tienes acceso a esta cotización.';
begin
  perform pg_temp.priv_error('quien la ve y no la creó', pg_temp.priv_cambiar(todos, c, true), '42501', autora);
  perform pg_temp.priv_error('quien ve las privadas y no la creó', pg_temp.priv_cambiar(jefa, p, false), '42501', autora);
  perform pg_temp.priv_error('quien no la ve', pg_temp.priv_cambiar(todos, p, false), '42501', acceso);
  perform pg_temp.priv_error('inexistente', pg_temp.priv_corre(a, format('select public.cotizacion_privada_cambiar(%L, true, now())', gen_random_uuid())), '42501', acceso);
  update public.cotizaciones set eliminado_en = now() where id = c;
  perform pg_temp.priv_error('papelera', pg_temp.priv_cambiar(a, c, true), '42501', acceso);
  if (pg_temp.priv_fila(c)).privada or not (pg_temp.priv_fila(p)).privada then raise exception 'P3: cambió una marca'; end if;
end $$;
rollback;

-- @test cotizaciones privadas: P4 una final y la aprobada (suya o de su hermana) no se hacen privadas
begin;
do $$
declare
  a uuid := pg_temp.priv_persona(array['cotizaciones.ver']); e jsonb := pg_temp.priv_terreno(a); e2 jsonb := pg_temp.priv_terreno(a); e3 jsonb := pg_temp.priv_terreno(a);
  fin uuid; apr uuid; otra uuid; h uuid[];
begin
  fin := pg_temp.priv_cot(a, e, false, 5, 'final');
  perform pg_temp.priv_error('final', pg_temp.priv_cambiar(a, fin, true), '23514', 'Una final no se hace privada.');
  -- La más antigua del vehículo nace aprobada.
  apr := pg_temp.priv_cot(a, e2, false, 30); otra := pg_temp.priv_cot(a, e2, false, 20);
  perform pg_temp.priv_confirmar();
  if (select x.cotizacion_id from public.cotizaciones_aprobadas x where x.vehiculo_id = (e2 ->> 'v')::uuid) is distinct from apr then raise exception 'P4: no nació aprobada'; end if;
  perform pg_temp.priv_error('aprobada', pg_temp.priv_cambiar(a, apr, true), '23514', 'Es la aprobada de su vehículo: no se hace privada.');
  -- La otra del vehículo sí se hace privada.
  if pg_temp.priv_cambiar(a, otra, true) ->> 'resultado' is distinct from 'cambiada' then raise exception 'P4: la no aprobada no se hizo privada'; end if;
  -- La hermana de la aprobada.
  h := pg_temp.priv_hermanas(a, e3, false);
  perform pg_temp.priv_confirmar();
  if (select x.cotizacion_id from public.cotizaciones_aprobadas x where x.vehiculo_id = (e3 ->> 'v')::uuid) is distinct from h[1] then raise exception 'P4: la hermana mayor no nació aprobada'; end if;
  perform pg_temp.priv_error('hermana de la aprobada', pg_temp.priv_cambiar(a, h[2], true), '23514', 'Es la aprobada de su vehículo: no se hace privada.');
  if (pg_temp.priv_fila(fin)).privada or (pg_temp.priv_fila(apr)).privada or (pg_temp.priv_fila(h[1])).privada or (pg_temp.priv_fila(h[2])).privada then
    raise exception 'P4: cambió una marca';
  end if;
end $$;
rollback;

-- @test cotizaciones privadas: P5 las hermanas comparten la marca: la RPC cambia las dos, también la que está en la papelera, y el trigger rechaza dos marcas
begin;
do $$
declare a uuid := pg_temp.priv_persona(array['cotizaciones.ver']); e jsonb := pg_temp.priv_terreno(a); h uuid[]; r jsonb;
begin
  -- Sin vehículo no hay aprobada que lo impida.
  h := array[pg_temp.priv_cot(a, e, false, 10, p_con_vehiculo => false), pg_temp.priv_cot(a, e, false, 9, p_con_vehiculo => false)];
  update public.cotizaciones set hermana_id = h[2] where id = h[1];
  update public.cotizaciones set hermana_id = h[1] where id = h[2];
  update public.cotizaciones set eliminado_en = now() where id = h[2];
  r := pg_temp.priv_cambiar(a, h[1], true);
  if r ->> 'resultado' is distinct from 'cambiada' or not (pg_temp.priv_fila(h[1])).privada or not (pg_temp.priv_fila(h[2])).privada then
    raise exception 'P5: no cambió las dos: %', r;
  end if;
  perform pg_temp.priv_confirmar();
  begin
    update public.cotizaciones set privada = false where id = h[1];
    set constraints public.trg_cotizaciones_hermanas immediate;
    raise exception 'P5: el trigger dejó dos marcas distintas';
  exception when check_violation then null;
  end;
end $$;
rollback;

-- @test cotizaciones privadas: P6 una privada ajena no aparece en ninguna lectura de quien no puede verla, y sí en las de la autora y de quien tiene el permiso del origen
begin;
create temp table priv_quien (nombre text primary key, id uuid not null, la_ve boolean not null);
grant select on priv_quien to authenticated;
do $$
declare
  a uuid := pg_temp.priv_persona(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver']); e jsonb := pg_temp.priv_terreno(a); otro jsonb := pg_temp.priv_terreno(a);
  todos uuid := pg_temp.priv_persona(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver']);
  jefa uuid; ajena uuid; p uuid; q record; r jsonb; v_num bigint; v_filas int;
begin
  jefa := pg_temp.priv_persona(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver', 'cotizaciones.privadas.ver:todos:' || (e ->> 'o')]);
  ajena := pg_temp.priv_persona(array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver', 'cotizaciones.privadas.ver:todos:' || (otro ->> 'o')]);
  insert into priv_quien values ('la autora', a, true), ('«todos» sin el permiso', todos, false), ('el permiso del origen', jefa, true), ('el permiso de otro origen', ajena, false);
  -- La única cotización del vehículo y del lead, privada y con un título raro.
  p := pg_temp.priv_cot(a, e, true, 5, p_titulo => 'PRIV zqxprivadaqz');
  perform pg_temp.priv_confirmar();
  select x.numero into v_num from public.cotizaciones x where x.id = p;
  if exists (select 1 from public.cotizaciones_aprobadas x where x.vehiculo_id = (e ->> 'v')::uuid) then raise exception 'P6: una privada quedó aprobada'; end if;
  for q in select * from priv_quien loop
    r := pg_temp.priv_corre(q.id, format('select pg_temp.priv_lecturas(%L, %L, %L, %L)', p, e ->> 'v', v_num::text, e ->> 'l'));
    if r ? 'error' then raise exception 'P6: % no pudo leer: %', q.nombre, r; end if;
    if (r ->> 'tabla')::boolean is distinct from q.la_ve or (r ->> 'puede')::boolean is distinct from q.la_ve or (r ->> 'listado')::boolean is distinct from q.la_ve
       or (r ->> 'por_numero')::boolean is distinct from q.la_ve or (r ->> 'por_titulo')::boolean is distinct from q.la_ve
       or (r ->> 'agrupada')::boolean is distinct from q.la_ve or (r ->> 'de_este_vehiculo')::boolean is distinct from q.la_ve
       or (r ->> 'buscador_numero')::boolean is distinct from q.la_ve or (r ->> 'buscador_titulo')::boolean is distinct from q.la_ve then
      raise exception 'P6: % debía % verla y dio %', q.nombre, case when q.la_ve then '' else 'no' end, r;
    end if;
    if q.la_ve and (r ->> 'listado_privada')::boolean is distinct from true then raise exception 'P6: el listado no trae la marca a %', q.nombre; end if;
    if q.la_ve and (r ->> 'de_este_vehiculo_privada')::boolean is distinct from true then raise exception 'P6: «De este vehículo» no trae la marca a %', q.nombre; end if;
    -- Los relacionados: quien la ve, una fila; quien no, nada (ni leída ni oculta). El `case` va antes: un `if` termina en el primer `then`.
    v_filas := case when q.la_ve then 1 else 0 end;
    if (r -> 'rel_vehiculo' ->> 'leidos')::int is distinct from v_filas
       or (r -> 'rel_vehiculo' ->> 'ocultos')::int is distinct from 0
       or jsonb_array_length(r -> 'rel_vehiculo' -> 'filas') is distinct from v_filas then
      raise exception 'P6: los relacionados del vehículo de % dan %', q.nombre, r -> 'rel_vehiculo';
    end if;
    if (r -> 'rel_lead' ->> 'leidos')::int is distinct from v_filas or (r -> 'rel_lead' ->> 'ocultos')::int is distinct from 0 then
      raise exception 'P6: los relacionados del lead de % dan %', q.nombre, r -> 'rel_lead';
    end if;
    -- Leerla: lo que no se ve da el mismo error que lo que no existe.
    r := pg_temp.priv_corre(q.id, format('select public.cotizacion_leer(%L)', p));
    if q.la_ve and r ? 'error' then raise exception 'P6: % no la lee: %', q.nombre, r; end if;
    if not q.la_ve then
      perform pg_temp.priv_error(q.nombre || ' la lee', r, '42501', (pg_temp.priv_corre(q.id, format('select public.cotizacion_leer(%L)', gen_random_uuid()))) ->> 'mensaje');
    end if;
  end loop;
end $$;
rollback;

-- @test cotizaciones privadas: P7 crear privada, una final privada da 22023 y cotizar encima hereda la marca
begin;
do $$
declare
  a uuid := pg_temp.priv_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.final.gestionar', 'leads.ver', 'leads.editar', 'vehiculos.ver']);
  e jsonb; v_abierta text; r jsonb; c uuid; n uuid;
begin
  e := pg_temp.priv_terreno(a);
  perform set_config('request.jwt.claim.sub', a::text, true);
  v_abierta := public._cotizacion_abierta_firmar((e ->> 'o')::uuid, (e ->> 'f')::uuid, now());
  r := pg_temp.priv_corre(a, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {"visible": 10}}''::jsonb, %L, %L, p_privada => true)',
                                    e ->> 'o', e ->> 'l', v_abierta, e ->> 'v'));
  c := (r -> 'cotizacion' ->> 'id')::uuid;
  if c is null or not (pg_temp.priv_fila(c)).privada then raise exception 'P7: no la creó privada: %', r; end if;
  r := pg_temp.priv_corre(a, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {"visible": 10}}''::jsonb, %L, %L, p_clase => ''final'', p_privada => true)',
                                    e ->> 'o', e ->> 'l', v_abierta, e ->> 'v'));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'privada' or r ->> 'mensaje' is distinct from 'Una final no se hace privada.' then
    raise exception 'P7: una final privada dio %', r;
  end if;
  r := pg_temp.priv_corre(a, format('select public.cotizacion_encima(gen_random_uuid(), %L)', c));
  n := (r -> 'cotizacion' ->> 'id')::uuid;
  if n is null or not (pg_temp.priv_fila(n)).privada then raise exception 'P7: cotizar encima no heredó la marca: %', r; end if;
end $$;
rollback;

-- @test cotizaciones privadas: P8 aprobar una privada pide el aviso; con él queda pública con su hermana, aprobada y con su versión nueva
begin;
do $$
declare
  a uuid := pg_temp.priv_persona(array['cotizaciones.ver', 'cotizaciones.aprobar']); e jsonb := pg_temp.priv_terreno(a);
  vieja uuid; h uuid[]; r jsonb; v0 timestamptz;
begin
  vieja := pg_temp.priv_cot(a, e, false, 60);
  h := pg_temp.priv_hermanas(a, e, true);
  perform pg_temp.priv_confirmar();
  if (select x.cotizacion_id from public.cotizaciones_aprobadas x where x.vehiculo_id = (e ->> 'v')::uuid) is distinct from vieja then raise exception 'P8: la aprobada no es la pública'; end if;
  v0 := (pg_temp.priv_fila(h[1])).actualizado_en;
  r := pg_temp.priv_corre(a, format('select public.cotizacion_aprobar(%L, %L)', h[1], v0));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'privada' or r ->> 'mensaje' is distinct from 'Al aprobarla deja de ser privada.' then
    raise exception 'P8: aprobar sin el aviso dio %', r;
  end if;
  if not (pg_temp.priv_fila(h[1])).privada then raise exception 'P8: sin el aviso cambió la marca'; end if;
  r := pg_temp.priv_corre(a, format('select public.cotizacion_aprobar(%L, %L, p_hacerla_publica => true)', h[1], v0));
  if r ? 'error' then raise exception 'P8: aprobar con el aviso dio %', r; end if;
  if (pg_temp.priv_fila(h[1])).privada or (pg_temp.priv_fila(h[2])).privada then raise exception 'P8: no quedaron públicas las dos'; end if;
  if (r -> 'cotizacion' ->> 'actualizado_en')::timestamptz is distinct from (pg_temp.priv_fila(h[1])).actualizado_en or (pg_temp.priv_fila(h[1])).actualizado_en <= v0 then
    raise exception 'P8: no devolvió la versión nueva: %', r;
  end if;
  perform pg_temp.priv_confirmar();
  if (select x.cotizacion_id from public.cotizaciones_aprobadas x where x.vehiculo_id = (e ->> 'v')::uuid) is distinct from h[1] then raise exception 'P8: no quedó aprobada'; end if;
  if not exists (select 1 from public.cotizaciones_revisiones x where x.cotizacion_id = h[1] and x.diff = '{"privada": {"de": true, "a": false}}'::jsonb) then
    raise exception 'P8: no dejó la revisión de la marca';
  end if;
end $$;
rollback;

-- @test cotizaciones privadas: P9 marcar final una privada la hace pública con su hermana
begin;
do $$
declare
  a uuid := pg_temp.priv_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.final.gestionar', 'leads.ver', 'leads.editar']);
  e jsonb := pg_temp.priv_terreno(a); h uuid[]; r jsonb;
begin
  h := pg_temp.priv_hermanas(a, e, true);
  perform pg_temp.priv_confirmar();
  r := pg_temp.priv_corre(a, format('select jsonb_build_object(''ok'', true) from (select public.cotizacion_marcar_final(%L)) x', h[1]));
  if r ? 'error' then raise exception 'P9: marcar final dio %', r; end if;
  if (pg_temp.priv_fila(h[1])).clase <> 'final' or (pg_temp.priv_fila(h[1])).privada then raise exception 'P9: no quedó final y pública'; end if;
  if (pg_temp.priv_fila(h[2])).privada or (pg_temp.priv_fila(h[2])).eliminado_en is null then raise exception 'P9: la hermana no quedó pública en la papelera'; end if;
  perform pg_temp.priv_confirmar();
end $$;
rollback;

-- @test cotizaciones privadas: P10 la aprobada automática sale de las públicas, y una privada no mueve cotizado_en
begin;
do $$
declare a uuid := pg_temp.priv_persona(array['cotizaciones.ver']); e jsonb := pg_temp.priv_terreno(a); p uuid; v0 timestamptz;
begin
  update public.vehiculos set cotizado_en = null where id = (e ->> 'v')::uuid;
  p := pg_temp.priv_cot(a, e, true, 30);
  perform pg_temp.priv_confirmar();
  if exists (select 1 from public.cotizaciones_aprobadas x where x.vehiculo_id = (e ->> 'v')::uuid) then raise exception 'P10: un vehículo con sólo privadas tiene aprobada'; end if;
  if (select v.cotizado_en from public.vehiculos v where v.id = (e ->> 'v')::uuid) is not null then raise exception 'P10: la privada movió cotizado_en'; end if;
  -- Hacerla pública la vuelve candidata (y la más antigua) y marca el vehículo cotizado.
  if pg_temp.priv_cambiar(a, p, false) ->> 'resultado' is distinct from 'cambiada' then raise exception 'P10: no se hizo pública'; end if;
  perform pg_temp.priv_confirmar();
  if (select x.cotizacion_id from public.cotizaciones_aprobadas x where x.vehiculo_id = (e ->> 'v')::uuid) is distinct from p then raise exception 'P10: la pública no quedó aprobada'; end if;
  if (select v.cotizado_en from public.vehiculos v where v.id = (e ->> 'v')::uuid) is null then raise exception 'P10: hacerla pública no movió cotizado_en'; end if;
  -- Una privada nueva no la desplaza aunque sea más antigua.
  perform pg_temp.priv_cot(a, e, true, 90);
  perform pg_temp.priv_confirmar();
  if (select x.cotizacion_id from public.cotizaciones_aprobadas x where x.vehiculo_id = (e ->> 'v')::uuid) is distinct from p then raise exception 'P10: una privada desplazó a la aprobada'; end if;
end $$;
rollback;

-- @test cotizaciones privadas: P11 la papelera no nombra una privada ajena: ni el lote, ni su cuenta, ni la lista por tipo, ni lo que devuelve restaurar
begin;
do $$
declare
  a uuid := pg_temp.priv_persona(array['cotizaciones.ver']); e jsonb := pg_temp.priv_terreno(a);
  sin uuid := pg_temp.priv_persona(array['cotizaciones.ver', 'cotizaciones.papelera.purgar']);
  con uuid; p uuid; q uuid; s uuid; l1 uuid; l2 uuid; r jsonb; v_sql text;
begin
  con := pg_temp.priv_persona(array['cotizaciones.ver', 'cotizaciones.papelera.purgar', 'cotizaciones.privadas.ver:todos:' || (e ->> 'o')]);
  p := pg_temp.priv_cot(a, e, true, 30, p_titulo => 'PRIV zqxpapeleraqz', p_con_vehiculo => false);
  q := pg_temp.priv_cot(a, e, false, 20, p_con_vehiculo => false);
  s := pg_temp.priv_cot(a, e, true, 10, p_titulo => 'PRIV zqxpapeleraqz', p_con_vehiculo => false);
  insert into public.lotes_papelera (tipo, creado_por, resumen) values ('cotizaciones', a, '{"cantidad": 2}') returning id into l1;
  insert into public.lotes_papelera (tipo, creado_por, resumen) values ('cotizaciones', a, '{"cantidad": 1}') returning id into l2;
  update public.cotizaciones set eliminado_en = now(), eliminado_por = a, lote_papelera_id = l1 where id in (p, q);
  update public.cotizaciones set eliminado_en = now(), eliminado_por = a, lote_papelera_id = l2 where id = s;
  -- Lo que cada quien ve de los dos lotes: {lote: [ids de sus cotizaciones], cuenta}, el lote suelto y la lista por tipo.
  v_sql := format($q$select jsonb_build_object(
      'lotes', (select coalesce(jsonb_object_agg(x ->> 'id', jsonb_build_object(
                  'ids', (select coalesce(jsonb_agg(c ->> 'id' order by c ->> 'id'), '[]') from jsonb_array_elements(x -> 'cotizaciones') c),
                  'cuenta', (x ->> 'en_papelera')::int)), '{}')
                from jsonb_array_elements(public.cotizaciones_papelera_listar(p_tope => 51)) x where x ->> 'id' in (%L, %L)),
      'l2', public.cotizaciones_papelera_lote(%L) is not null,
      'por_tipo', (select coalesce(jsonb_agg(t.registro_id order by t.registro_id), '[]') from public.papelera_listar('cotizaciones') t
                    where t.registro_id in (%L, %L, %L)))$q$, l1, l2, l2, p, q, s);
  r := pg_temp.priv_corre(sin, v_sql);
  if r ? 'error' then raise exception 'P11: quien purga sin el permiso no pudo leer: %', r; end if;
  if r -> 'lotes' is distinct from jsonb_build_object(l1, jsonb_build_object('ids', jsonb_build_array(q), 'cuenta', 1))
     or (r ->> 'l2')::boolean or r -> 'por_tipo' is distinct from jsonb_build_array(q) then
    raise exception 'P11: quien purga sin el permiso ve %', r;
  end if;
  r := pg_temp.priv_corre(con, v_sql);
  if r ? 'error' then raise exception 'P11: quien tiene el permiso no pudo leer: %', r; end if;
  if (r -> 'lotes' -> (l1::text) ->> 'cuenta')::int is distinct from 2 or not (r -> 'lotes' ? (l2::text)) or not (r ->> 'l2')::boolean
     or jsonb_array_length(r -> 'por_tipo') is distinct from 3 then
    raise exception 'P11: quien tiene el permiso ve %', r;
  end if;
  -- Restaurar el lote mixto sin el permiso: vuelven las dos, pero la respuesta sólo nombra la pública.
  r := pg_temp.priv_corre(sin, format('select public.cotizaciones_papelera_restaurar(%L, %L)', l1, (select l.actualizado_en from public.lotes_papelera l where l.id = l1)));
  if r ? 'error' then raise exception 'P11: restaurar dio %', r; end if;
  if (select jsonb_agg(x ->> 'id') from jsonb_array_elements(r -> 'restaurados') x) is distinct from jsonb_build_array(q) or r ->> 'quedan' is distinct from '0' then
    raise exception 'P11: restaurar devolvió %', r;
  end if;
  if (pg_temp.priv_fila(p)).eliminado_en is not null then raise exception 'P11: la privada no volvió con su lote'; end if;
end $$;
rollback;
