-- `cotizaciones_listado_por_vehiculo()`, su lote `_cotizaciones_lote_del_listado()` y `cotizaciones_modos_de()`: la lista /cotizaciones agrupada por vehículo
-- (docs/UX.md › «Cotizaciones»). No depende de otro archivo (`SOLO=areas/cotizaciones/listado-por-vehiculo.sql`). Las preferencias de la lista, en
-- `areas/equipo/preferencias-de-cotizaciones.sql`; el costo con volumen, en `medir-cotizaciones-listado-por-vehiculo.sql`.
--
-- Cada persona ve sólo los orígenes de su prueba (la suite deja cotizaciones de otros archivos en otros orígenes); la dueña de L7, todos (la ruta de «todos»).
--
-- Qué asegura:
--   L1. Visibilidad: lo que quien mira no ve no forma grupo ni cuenta; si no ve la aprobada, la cabeza es la más reciente que ve; un vehículo que no ve
--       (sin `vehiculos.ver`) igual forma su grupo.
--   L2. Filtros: origen, clase, mías y lead dejan en cada grupo sólo lo que coincide, y el conteo también; un grupo sin nada que coincida no aparece. La aprobada
--       que no coincide no representa al grupo.
--   L3. Cursor: las páginas hacia adelante dan la secuencia entera sin repetir grupos; hacia atrás desde la página 3 vuelve la 2. Un cursor incompleto da 22023.
--   L4. Sueltas: las sin vehículo van intercaladas por fecha con los grupos.
--   L5. Conteo: 150 cotizaciones de un vehículo dan `grupo_n = 101`, con la página llena (el conteo por su índice) y leída entera (el conteo de lo leído); la
--       página se acota a 50 + 1 (`MAXIMO_DE_PAGINA_DE_COTIZACIONES`).
--   L6. Cortada: un vehículo con 3.000 cotizaciones más nuevas que todo devuelve la fila `cortada` y seguir desde su cursor llega al resto.
--   L7. Espejo: el lote devuelve los mismos ids, en el mismo orden, que `cotizaciones_listado()` para la dueña, «propios» con cartera y «todos» en un origen,
--       con cada filtro y con cursor (adelante y atrás).
--   L8. Modos: `cotizaciones_modos_de()` da el nombre del modo de lo que se ve, sin las que no se ven ni las de más de 100.
--   L9. La forma: invocadoras, estables, `search_path` vacío; las ejecuta authenticated y no anon ni PUBLIC.

create temp sequence lpv_telefono;

create or replace function pg_temp.lpv_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('lv_' || substr(v_id::text, 1, 8), 'LV ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  -- Cada concesión es `clave[:alcance[:origen]]`.
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance, origen_id)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso, nullif(split_part(c, ':', 3), '')::uuid);
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` (que devuelve un jsonb) como esa persona; un error vuelve como `{error, mensaje}`.
create or replace function pg_temp.lpv_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return coalesce(v, '[]'::jsonb);
end $f$;

-- Un origen con su fórmula publicada (con dos modos de tipo de cambio).
create or replace function pg_temp.lpv_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('lv_' || substr(gen_random_uuid()::text, 1, 8), 'LV origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', '{"nodos": []}', '{}', jsonb_build_object('cabecera', jsonb_build_object('modos', jsonb_build_array(
            jsonb_build_object('clave', 'unificado', 'nombre', 'Unificado'), jsonb_build_object('clave', 'paralelo', 'nombre', 'Paralelo')))), '{}')
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

create or replace function pg_temp.lpv_vehiculo(e jsonb) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'LV vehículo', 'toyota') returning id;
$f$;

create or replace function pg_temp.lpv_lead(p_creador uuid) returns uuid language sql as $f$
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('LV lead', '7218' || lpad(nextval('pg_temp.lpv_telefono')::text, 4, '0'), p_creador, (select id from public.origenes_lead where clave = 'web'), '{}')
  returning id;
$f$;

-- Una cotización viva creada hace p_min minutos (como postgres: sin los triggers de la hoja).
create or replace function pg_temp.lpv_cot(p_quien uuid, e jsonb, p_vehiculo uuid, p_min numeric, p_clase text default 'preventa', p_lead uuid default null,
                                          p_modo text default null) returns uuid language sql as $f$
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, lead_id, valores, fuentes, tipos_cambio, totales, total_base, clase, modo_tc, creado_en)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, p_lead, '{}', '{}', '{}', '{}', 10, p_clase::public.clase_cotizacion, p_modo,
          now() - make_interval(secs => p_min * 60))
  returning id;
$f$;

-- La aprobada del vehículo, escrita a mano (el trigger diferido no corre en un bloque revertido).
create or replace function pg_temp.lpv_aprobar(p_cot uuid) returns void language sql as $f$
  insert into public.cotizaciones_aprobadas (vehiculo_id, cotizacion_id, origen_id, creado_por, lead_id, monto, moneda)
  select c.vehiculo_id, c.id, c.origen_id, c.creado_por, c.lead_id, 10, 'USD' from public.cotizaciones c where c.id = p_cot
  on conflict (vehiculo_id) do update set cotizacion_id = excluded.cotizacion_id, origen_id = excluded.origen_id, creado_por = excluded.creado_por, lead_id = excluded.lead_id;
$f$;

-- Una página agrupada como esa persona: las filas en el orden en que llegan.
create or replace function pg_temp.lpv_pagina(p_quien uuid, p_tamano integer, p_origen uuid default null, p_clase text default null, p_mias boolean default false,
                                             p_lead uuid default null, p_en timestamptz default null, p_id uuid default null, p_atras boolean default false)
  returns jsonb language sql as $f$
  select pg_temp.lpv_corre(p_quien, format(
    'select coalesce(jsonb_agg(to_jsonb(x) order by o), ''[]'') from public.cotizaciones_listado_por_vehiculo(%s, %L, %L, %L, %L, %L, %L, %L) with ordinality x (tipo, orden_en, orden_id, id, numero, origen_id, lead_id, vehiculo_id, creado_por, clase, estado, titulo, total_base, moneda_mostrar, creado_en, vence_el, vencida, grupo_n, o)',
    p_tamano, p_origen, p_clase, p_mias, p_lead, p_en, p_id, p_atras));
$f$;

-- Una entrada como texto: `g <orden> <cabeza> <n>` (el grupo), `s <id>` (la suelta) o `cortada`.
create or replace function pg_temp.lpv_claves(p jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(case r ->> 'tipo'
                              when 'grupo' then format('g %s %s %s', r ->> 'orden_id', r ->> 'id', r ->> 'grupo_n')
                              when 'suelta' then 's ' || (r ->> 'id')
                              else r ->> 'tipo' end order by o), '{}')
    from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) with ordinality x (r, o);
$f$;

create or replace function pg_temp.lpv_igual(p_que text, p_dio text[], p_esperado text[]) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then
    raise exception '%: dio % y se esperaba %', p_que, p_dio, p_esperado;
  end if;
end $f$;

-- Los ids de una lectura del listado o del lote como esa persona, en el orden en que llegan.
create or replace function pg_temp.lpv_ids(p_quien uuid, p_sql text) returns text[] language plpgsql as $f$
-- (Una sola función en el `from`: sus filas llegan en el orden en que las devuelve.)
declare v jsonb := pg_temp.lpv_corre(p_quien, format('select coalesce(jsonb_agg(x.id), ''[]'') from (%s) x', p_sql));
begin
  if v ? 'error' then raise exception 'la lectura falló: % (%)', v, p_sql; end if;
  return array(select jsonb_array_elements_text(v));
end $f$;

-- @test listado por vehículo: lo que no se ve no forma grupo ni cuenta; sin ver la aprobada, la cabeza es la más reciente que se ve; sin vehiculos.ver, el grupo existe (L1)
begin;
do $$
declare
  e jsonb := pg_temp.lpv_origen(); v uuid := pg_temp.lpv_vehiculo(e); w uuid := pg_temp.lpv_vehiculo(e);
  jefa uuid := pg_temp.lpv_persona(array['cotizaciones.ver:todos:' || (e ->> 'o')]); ana uuid := pg_temp.lpv_persona(array['cotizaciones.ver:propios']);
  a1 uuid; j1 uuid; j2 uuid; jw uuid;
begin
  a1 := pg_temp.lpv_cot(ana, e, v, 30); j1 := pg_temp.lpv_cot(jefa, e, v, 20); j2 := pg_temp.lpv_cot(jefa, e, v, 10); jw := pg_temp.lpv_cot(jefa, e, w, 5);
  perform pg_temp.lpv_aprobar(j1);
  -- La jefa ve todo: el grupo de w (sólo jw) y el de v ordenado por j2 y representado por su aprobada j1, con las 3.
  perform pg_temp.lpv_igual('la jefa', pg_temp.lpv_claves(pg_temp.lpv_pagina(jefa, 10)), array[format('g %s %s 1', jw, jw), format('g %s %s 3', j2, j1)]);
  -- Ana ve sólo la suya: w no existe para ella, la cabeza de v es a1 (la aprobada j1 no se nombra) y cuenta 1. No tiene `vehiculos.ver`.
  perform pg_temp.lpv_igual('Ana', pg_temp.lpv_claves(pg_temp.lpv_pagina(ana, 10)), array[format('g %s %s 1', a1, a1)]);
  -- La papelera tampoco: j2 a la papelera y el grupo de v pasa a ordenarse por j1.
  update public.cotizaciones set eliminado_en = now() where id = j2;
  perform pg_temp.lpv_igual('con la papelera', pg_temp.lpv_claves(pg_temp.lpv_pagina(jefa, 10)), array[format('g %s %s 1', jw, jw), format('g %s %s 2', j1, j1)]);
end $$;
rollback;

-- @test listado por vehículo: origen, clase, mías y lead dejan en cada grupo lo que coincide, con su conteo; un grupo sin nada que coincida no aparece (L2)
begin;
do $$
declare
  e jsonb := pg_temp.lpv_origen(); e2 jsonb := pg_temp.lpv_origen(); v uuid := pg_temp.lpv_vehiculo(e); w uuid := pg_temp.lpv_vehiculo(e2);
  jefa uuid := pg_temp.lpv_persona(array['cotizaciones.ver:todos:' || (e ->> 'o'), 'cotizaciones.ver:todos:' || (e2 ->> 'o')]);
  otra uuid := pg_temp.lpv_persona(array['cotizaciones.ver:todos:' || (e ->> 'o'), 'cotizaciones.ver:todos:' || (e2 ->> 'o')]);
  lead1 uuid := pg_temp.lpv_lead(jefa); lead2 uuid := pg_temp.lpv_lead(jefa); p1 uuid; f1 uuid; p2 uuid; o1 uuid; wp uuid;
begin
  p1 := pg_temp.lpv_cot(jefa, e, v, 50, 'preventa', lead1);
  f1 := pg_temp.lpv_cot(otra, e, v, 40, 'final', lead2);
  p2 := pg_temp.lpv_cot(otra, e, v, 30, 'preventa', lead1);
  o1 := pg_temp.lpv_cot(jefa, e, v, 20, 'preventa', lead2);
  wp := pg_temp.lpv_cot(jefa, e2, w, 10, 'preventa', lead1);
  perform pg_temp.lpv_aprobar(f1);
  perform pg_temp.lpv_igual('sin filtros', pg_temp.lpv_claves(pg_temp.lpv_pagina(jefa, 10)), array[format('g %s %s 1', wp, wp), format('g %s %s 4', o1, f1)]);
  -- Origen: sólo el de v (w es de otro origen y no aparece).
  perform pg_temp.lpv_igual('origen', pg_temp.lpv_claves(pg_temp.lpv_pagina(jefa, 10, p_origen => (e ->> 'o')::uuid)), array[format('g %s %s 4', o1, f1)]);
  -- Clase: la final sola; las preventas sin la aprobada (que no coincide), ordenadas por o1 y representadas por ella.
  perform pg_temp.lpv_igual('final', pg_temp.lpv_claves(pg_temp.lpv_pagina(jefa, 10, p_clase => 'final')), array[format('g %s %s 1', f1, f1)]);
  perform pg_temp.lpv_igual('preventa', pg_temp.lpv_claves(pg_temp.lpv_pagina(jefa, 10, p_clase => 'preventa')),
                           array[format('g %s %s 1', wp, wp), format('g %s %s 3', o1, o1)]);
  -- Mías: las de «otra» en v (f1 y p2), con la aprobada f1 que sí coincide.
  perform pg_temp.lpv_igual('mías', pg_temp.lpv_claves(pg_temp.lpv_pagina(otra, 10, p_mias => true)), array[format('g %s %s 2', p2, f1)]);
  -- Lead: las del lead 1 (p1 y p2 en v, wp en w); la aprobada f1 es del lead 2 y no representa al grupo.
  perform pg_temp.lpv_igual('lead', pg_temp.lpv_claves(pg_temp.lpv_pagina(jefa, 10, p_lead => lead1)),
                           array[format('g %s %s 1', wp, wp), format('g %s %s 2', p2, p2)]);
end $$;
rollback;

-- @test listado por vehículo: las páginas hacia adelante dan la secuencia entera sin repetir; hacia atrás desde la página 3 vuelve la 2; las sueltas intercaladas (L3, L4)
begin;
do $$
declare
  e jsonb := pg_temp.lpv_origen(); jefa uuid := pg_temp.lpv_persona(array['cotizaciones.ver:todos:' || (e ->> 'o')]);
  v uuid[] := array[]::uuid[]; i integer; c uuid; esperado text[] := '{}'; dio text[] := '{}'; p jsonb; ultima jsonb; pagina2 text[]; pagina3 jsonb;
  v_en timestamptz; v_id uuid; vueltas integer := 0; r record; err jsonb;
begin
  for i in 1 .. 7 loop v := v || pg_temp.lpv_vehiculo(e); end loop;
  -- Cada vehículo i con i % 3 + 1 cotizaciones repartidas en el tiempo, y una suelta cada tanto: lo más nuevo, primero.
  for i in 1 .. 7 loop
    for c in select pg_temp.lpv_cot(jefa, e, v[i], 100 - i * 10 - k * 3) from generate_series(1, i % 3 + 1) k loop null; end loop;
  end loop;
  perform pg_temp.lpv_cot(jefa, e, null, 55); perform pg_temp.lpv_cot(jefa, e, null, 12); perform pg_temp.lpv_cot(jefa, e, null, 1);
  -- La secuencia esperada: por cada vehículo su más nueva, y cada suelta, de la más nueva a la más vieja.
  for r in select x.id from (
             select distinct on (coalesce(c.vehiculo_id, c.id)) c.id, c.creado_en from public.cotizaciones c where c.origen_id = (e ->> 'o')::uuid
              order by coalesce(c.vehiculo_id, c.id), c.creado_en desc, c.id desc) x order by x.creado_en desc, x.id desc loop
    esperado := esperado || r.id::text;
  end loop;
  if cardinality(esperado) <> 10 then raise exception 'L3: esperaba 7 grupos y 3 sueltas, hay %', cardinality(esperado); end if;
  -- De a 3 hacia adelante (la fila de más dice que hay otra página).
  loop
    vueltas := vueltas + 1;
    p := pg_temp.lpv_pagina(jefa, 3, p_en => v_en, p_id => v_id);
    if vueltas = 2 then pagina2 := array(select r2 ->> 'orden_id' from jsonb_array_elements(p) with ordinality x (r2, o) where o <= 3 order by o); end if;
    if vueltas = 3 then pagina3 := p; end if;
    dio := dio || array(select r2 ->> 'orden_id' from jsonb_array_elements(p) with ordinality x (r2, o) where o <= 3 order by o);
    exit when jsonb_array_length(p) <= 3 or vueltas > 10;
    ultima := p -> 2;
    v_en := (ultima ->> 'orden_en')::timestamptz; v_id := (ultima ->> 'orden_id')::uuid;
  end loop;
  perform pg_temp.lpv_igual('adelante', dio, esperado);
  -- Las sueltas son `suelta` y sin conteo; los grupos traen su conteo.
  if exists (select 1 from jsonb_array_elements(pg_temp.lpv_pagina(jefa, 100)) r2 where (r2 ->> 'tipo' = 'suelta') <> (r2 ->> 'vehiculo_id' is null)
               or (r2 ->> 'tipo' = 'suelta') <> (r2 ->> 'grupo_n' is null)) then
    raise exception 'L4: una suelta no es la sin vehículo, o lleva conteo';
  end if;
  -- Hacia atrás desde la primera de la página 3: la página 2, en orden ascendente (y una de más: hay otra antes).
  p := pg_temp.lpv_pagina(jefa, 3, p_en => (pagina3 -> 0 ->> 'orden_en')::timestamptz, p_id => (pagina3 -> 0 ->> 'orden_id')::uuid, p_atras => true);
  perform pg_temp.lpv_igual('atrás', array(select r2 ->> 'orden_id' from jsonb_array_elements(p) with ordinality x (r2, o) where o <= 3 order by o desc), pagina2);
  if jsonb_array_length(p) <> 4 then raise exception 'L3: hacia atrás debía traer una de más: %', jsonb_array_length(p); end if;
  err := pg_temp.lpv_pagina(jefa, 3, p_en => now());
  if err ->> 'error' is distinct from '22023' then raise exception 'L3: el cursor incompleto dio %', err; end if;
end $$;
rollback;

-- @test listado por vehículo: 150 cotizaciones de un vehículo dan grupo_n = 101 y la página se acota a 50 + 1 (L5)
begin;
do $$
declare e jsonb := pg_temp.lpv_origen(); v uuid := pg_temp.lpv_vehiculo(e); jefa uuid := pg_temp.lpv_persona(array['cotizaciones.ver:todos:' || (e ->> 'o')]); p jsonb;
begin
  perform pg_temp.lpv_cot(jefa, e, v, g) from generate_series(1, 150) g;
  perform pg_temp.lpv_cot(jefa, e, null, 200 + g) from generate_series(1, 120) g;
  p := pg_temp.lpv_pagina(jefa, 1000);
  if (p -> 0 ->> 'grupo_n')::int <> 101 then raise exception 'L5: el conteo dio %', p -> 0 ->> 'grupo_n'; end if;
  if jsonb_array_length(p) <> 51 then raise exception 'L5: la página de 1000 dio % filas', jsonb_array_length(p); end if;
  -- Sin las sueltas la página no se llena y se lee todo: el conteo sale de lo leído, acotado igual.
  update public.cotizaciones set eliminado_en = now() where vehiculo_id is null and origen_id = (e ->> 'o')::uuid;
  p := pg_temp.lpv_pagina(jefa, 1000);
  if jsonb_array_length(p) <> 1 or (p -> 0 ->> 'grupo_n')::int <> 101 then raise exception 'L5: leído todo, dio %', pg_temp.lpv_claves(p); end if;
end $$;
rollback;

-- @test listado por vehículo: 3.000 cotizaciones de un vehículo más nuevas que todo dan la fila cortada, y seguir desde su cursor llega al resto (L6)
begin;
do $$
declare
  e jsonb := pg_temp.lpv_origen(); v uuid := pg_temp.lpv_vehiculo(e); w uuid := pg_temp.lpv_vehiculo(e);
  jefa uuid := pg_temp.lpv_persona(array['cotizaciones.ver:todos:' || (e ->> 'o')]); cabeza uuid; viejo uuid; suelta uuid; p jsonb; cortada jsonb;
begin
  perform pg_temp.lpv_cot(jefa, e, v, g::numeric / 100) from generate_series(2, 3000) g;
  cabeza := pg_temp.lpv_cot(jefa, e, v, 0.001);
  viejo := pg_temp.lpv_cot(jefa, e, w, 100); suelta := pg_temp.lpv_cot(jefa, e, null, 200);
  p := pg_temp.lpv_pagina(jefa, 10);
  perform pg_temp.lpv_igual('la primera', pg_temp.lpv_claves(p), array[format('g %s %s 101', cabeza, cabeza), 'cortada']);
  cortada := p -> 1;
  if cortada ->> 'orden_id' is null or cortada ->> 'id' is not null then raise exception 'L6: la cortada no dice dónde siguió: %', cortada; end if;
  p := pg_temp.lpv_pagina(jefa, 10, p_en => (cortada ->> 'orden_en')::timestamptz, p_id => (cortada ->> 'orden_id')::uuid);
  perform pg_temp.lpv_igual('seguir buscando', pg_temp.lpv_claves(p), array[format('g %s %s 1', viejo, viejo), 's ' || suelta]);
end $$;
rollback;

-- @test listado por vehículo: el lote es el espejo de cotizaciones_listado() para la dueña, «propios» con cartera y «todos» en un origen, con cada filtro y cursor (L7)
begin;
do $$
declare
  e jsonb := pg_temp.lpv_origen(); e2 jsonb := pg_temp.lpv_origen();
  duena uuid := pg_temp.lpv_persona(array['cotizaciones.ver']); ana uuid := pg_temp.lpv_persona(array['cotizaciones.ver:propios']);
  chica uuid; lead1 uuid := pg_temp.lpv_lead(duena); lead2 uuid := pg_temp.lpv_lead(duena); quien uuid; i integer; f record; c record; listado text[]; lote text[];
  sentido boolean; v1 uuid := pg_temp.lpv_vehiculo(e); v2 uuid := pg_temp.lpv_vehiculo(e2);
begin
  chica := pg_temp.lpv_persona(array['cotizaciones.ver:todos:' || (e ->> 'o')]);
  -- La cartera de Ana: el lead 1.
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por, lead_creado_en)
  select l.id, ana, 'compartido', duena, l.creado_en from public.leads l where l.id = lead1;
  -- 40 cotizaciones repartidas: dos orígenes, tres autoras, dos leads, con y sin vehículo, y una final cada tanto (cada una en su vehículo).
  for i in 1 .. 40 loop
    perform pg_temp.lpv_cot(case i % 3 when 0 then duena when 1 then ana else chica end, case when i % 4 = 0 then e2 else e end,
                           case when i % 7 = 0 then pg_temp.lpv_vehiculo(case when i % 4 = 0 then e2 else e end) when i % 5 = 0 then null
                                when i % 4 = 0 then v2 else v1 end, i,
                           case when i % 7 = 0 then 'final' else 'preventa' end, case i % 3 when 0 then lead1 when 1 then lead2 end);
  end loop;
  foreach quien in array array[duena, ana, chica] loop
    for f in select * from (values (null::uuid, null::text, false, null::uuid), ((e ->> 'o')::uuid, null, false, null), (null, 'final', false, null),
                                   (null, null, true, null), (null, null, false, lead1)) t (origen, clase, mias, lead) loop
      listado := pg_temp.lpv_ids(quien, format('select l.id from public.cotizaciones_listado(100, %L, %L, %L, null, null, null, false, %L) l', f.origen, f.clase, f.mias, f.lead));
      lote := pg_temp.lpv_ids(quien, format('select l.id from public._cotizaciones_lote_del_listado(101, %L, %L, %L, %L) l', f.origen, f.clase, f.mias, f.lead));
      perform pg_temp.lpv_igual(format('espejo de %s con %s', quien, f), lote, listado);
      continue when cardinality(listado) < 2;
      -- Con cursor desde la segunda, hacia adelante y hacia atrás.
      select x.creado_en, x.id into c from public.cotizaciones x where x.id = listado[2]::uuid;
      foreach sentido in array array[false, true] loop
        listado := pg_temp.lpv_ids(quien, format('select l.id from public.cotizaciones_listado(100, %L, %L, %L, null, %L, %L, %L, %L) l',
                                                f.origen, f.clase, f.mias, c.creado_en, c.id, sentido, f.lead));
        lote := pg_temp.lpv_ids(quien, format('select l.id from public._cotizaciones_lote_del_listado(101, %L, %L, %L, %L, %L, %L, %L) l',
                                             f.origen, f.clase, f.mias, f.lead, c.creado_en, c.id, sentido));
        perform pg_temp.lpv_igual(format('espejo de %s con %s y cursor (atrás: %s)', quien, f, sentido), lote, listado);
      end loop;
    end loop;
  end loop;
  -- Que mide: Ana ve lo suyo y lo de su cartera (más que lo suyo), la chica sólo su origen.
  if cardinality(pg_temp.lpv_ids(ana, 'select l.id from public._cotizaciones_lote_del_listado(101) l'))
     <= cardinality(pg_temp.lpv_ids(ana, 'select l.id from public._cotizaciones_lote_del_listado(101, p_mias => true) l')) then
    raise exception 'L7: la cartera de Ana no suma nada: la prueba no mide la ruta de la cartera';
  end if;
end $$;
rollback;

-- @test listado por vehículo: cotizaciones_modos_de da el nombre del modo de lo que se ve, sin lo que no se ve ni más de 100 (L8)
begin;
do $$
declare
  e jsonb := pg_temp.lpv_origen(); jefa uuid := pg_temp.lpv_persona(array['cotizaciones.ver:todos:' || (e ->> 'o')]);
  ana uuid := pg_temp.lpv_persona(array['cotizaciones.ver:propios']); par uuid; uni uuid; sin uuid; ids uuid[]; m jsonb;
begin
  par := pg_temp.lpv_cot(jefa, e, null, 3, p_modo => 'paralelo'); uni := pg_temp.lpv_cot(ana, e, null, 2, p_modo => 'unificado'); sin := pg_temp.lpv_cot(jefa, e, null, 1);
  m := pg_temp.lpv_corre(jefa, format('select jsonb_object_agg(x.id, x.modo) from public.cotizaciones_modos_de(%L) x', array[par, uni, sin]));
  if m is distinct from jsonb_build_object(par, 'Paralelo', uni, 'Unificado') then raise exception 'L8: la jefa dio %', m; end if;
  m := pg_temp.lpv_corre(ana, format('select coalesce(jsonb_object_agg(x.id, x.modo), ''{}'') from public.cotizaciones_modos_de(%L) x', array[par, uni, sin]));
  if m is distinct from jsonb_build_object(uni, 'Unificado') then raise exception 'L8: Ana dio %', m; end if;
  -- 100 ids de relleno antes: la de más de 100 no se lee.
  ids := array(select gen_random_uuid() from generate_series(1, 100)) || par;
  m := pg_temp.lpv_corre(jefa, format('select coalesce(jsonb_object_agg(x.id, x.modo), ''{}'') from public.cotizaciones_modos_de(%L) x', ids));
  if m <> '{}'::jsonb then raise exception 'L8: leyó más de 100: %', m; end if;
end $$;
rollback;

-- @test listado por vehículo: invocadoras, estables, search_path vacío; authenticated las ejecuta y anon ni PUBLIC no (L9)
begin;
do $$
declare p record;
begin
  for p in select x.oid, x.proname, x.prosecdef, x.provolatile, x.proconfig, x.proacl from pg_proc x
            where x.pronamespace = 'public'::regnamespace and x.proname in ('cotizaciones_listado_por_vehiculo', '_cotizaciones_lote_del_listado', 'cotizaciones_modos_de') loop
    if p.prosecdef then raise exception 'L9: % corre con los derechos de su dueña: la RLS de quien mira tiene que decidir', p.proname; end if;
    if p.provolatile <> 's' then raise exception 'L9: % no es stable', p.proname; end if;
    if not coalesce(p.proconfig @> array['search_path=""'], false) then raise exception 'L9: % sin search_path vacío: %', p.proname, p.proconfig; end if;
    if not has_function_privilege('authenticated', p.oid, 'execute') then raise exception 'L9: authenticated no ejecuta %', p.proname; end if;
    if has_function_privilege('anon', p.oid, 'execute') then raise exception 'L9: anon ejecuta %', p.proname; end if;
    if exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then raise exception 'L9: PUBLIC ejecuta %', p.proname; end if;
  end loop;
  if (select count(*) from pg_proc x where x.pronamespace = 'public'::regnamespace
        and x.proname in ('cotizaciones_listado_por_vehiculo', '_cotizaciones_lote_del_listado', 'cotizaciones_modos_de')) <> 3 then
    raise exception 'L9: falta una de las tres, o hay una sobrecarga';
  end if;
end $$;
rollback;
