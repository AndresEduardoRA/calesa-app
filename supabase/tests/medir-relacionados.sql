-- Medición de «Relacionados» (T17): `vehiculo_relacionados()`, `lead_relacionados()` y sus páginas «Ver todos». `MEDIR_SOLO=medir-relacionados pnpm db:medir:volumen`,
-- contra el Supabase LOCAL con la siembra de volumen (la dueña y Ana de `sembrar.sql`). Todo en una transacción que se revierte: nada queda.
--
-- Terreno (como postgres, sin triggers): un vehículo «V» de Ana con 5.000 interesados (de la dueña, salvo 3 de Ana entre los 101 más nuevos) y 2.000 cotizaciones activas sobre
-- 300 leads, con revisiones (cada lead, unas siete) y una que otra de Ana; uno «V2» con 300 de cada una (el contraste con N); y un lead «LV» de Ana con 1.000 vehículos vinculados,
-- 1.000 interesados y 2.000 cotizaciones (dos por vehículo).
--
-- Asserta:
--   - Assert 1, el plan de cada consulta de ventana y de página (el mismo texto que la función, como sentencia preparada con el plan genérico): `Index Scan` por el índice nombrado en la
--     consulta, sin `Seq Scan` de la tabla que crece y sin `Sort` del conjunto (el `order by … limit` lo da el índice), y con `Rows Removed by Filter` ≤ 1 en la tabla que ordena;
--   - Assert 2, sobre la llamada real y por relación (`pg_stat_get_xact_blocks_fetched`): lo leído con 5.000 y con 300 es el mismo (a lo sumo 1,2 × + 30 bloques): no crece con N;
--   - Assert 3, el resumen ≤ 20 ms y la página ≤ 20 ms por llamada (la mediana de las 5 últimas de 7, como Ana y como la dueña).
-- La guarda: sin `vehiculos_interesados_vehiculo_reciente_idx` y sin `cotizaciones_relacion_vehiculo_idx`, el Assert 1 cae («guarda: cae»).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.vehiculos_interesados;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.n', :ver_mas::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if transaction_timestamp() = statement_timestamp() then raise exception 'la medición tiene que correr dentro de su begin'; end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir los relacionados: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1');
create temp table _o as select o.id as origen, f.id as formula from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.clave = 'subasta_usa';
do $$ begin if (select count(*) from _o) <> 1 then raise exception 'esperaba el origen sembrado subasta_usa con su fórmula publicada'; end if; end $$;

create temp table _t (clave text primary key, id uuid not null);
set local session_replication_role = replica;
-- Los leads: 5.000 de la dueña (cartera: ella) y 3 de Ana (cartera: ella); LV, de Ana.
insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, tipo_lead_id, atributos, cartera)
select 'Medir rel ' || g, '6944' || lpad(g::text, 6, '0'), case when g > 5000 then '00000000-0000-0000-0000-0000000000a1' else '00000000-0000-0000-0000-0000000000d1' end::uuid,
       (select id from public.origenes_lead where clave = 'web'), (select id from public.tipos_lead order by id limit 1), '{}',
       array[case when g > 5000 then '00000000-0000-0000-0000-0000000000a1' else '00000000-0000-0000-0000-0000000000d1' end::uuid]
  from generate_series(1, 5004) g;
create temp table _l as select replace(nombre, 'Medir rel ', '')::int as i, id from public.leads where nombre like 'Medir rel %';
create unique index on _l (i);
insert into public.vehiculos (origen_id, titulo, creado_por)
select (select origen from _o), 'Medir rel V' || g, '00000000-0000-0000-0000-0000000000a1' from generate_series(1, 2) g;
insert into _t select 'v' || replace(titulo, 'Medir rel V', ''), id from public.vehiculos where titulo like 'Medir rel V_';
-- LV es el lead 5004; sus 1.000 vehículos (de la dueña: Ana los ve por la cartera de LV).
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id)
select (select origen from _o), 'Medir rel W' || g, '00000000-0000-0000-0000-0000000000d1', (select id from _l where i = 5004) from generate_series(1, 1000) g;
create temp table _w as select replace(titulo, 'Medir rel W', '')::int as i, id from public.vehiculos where titulo like 'Medir rel W%';
create unique index on _w (i);
insert into public.vehiculos_vinculos (vehiculo_id, lead_id, desde)
select w.id, (select id from _l where i = 5004), timestamptz '2026-01-01 00:00:00+00' + w.i * interval '1 minute 3 microseconds' from _w w;

-- Todos los leads están en la cartera de su dueña (`en_cartera()` mira `leads_asesores`).
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, desde, lead_creado_en, lead_reciente_en)
select l.id, l.creado_por, 'dueno', now(), l.creado_en, l.creado_en from public.leads l where l.nombre like 'Medir rel %';
-- El fondo realista (el plan genérico estima por el promedio de la tabla): cada uno de los 1.000 vehículos de LV es también un vehículo con 110 interesados y 110 cotizaciones de
-- otros leads, como un vehículo muy movido; así el promedio por vehículo pasa de las 101 filas de la ventana y la medición es la de un vehículo caliente.
insert into public.vehiculos_interesados (vehiculo_id, lead_id, creado_en)
select w.id, l.id, timestamptz '2026-01-01 00:00:00+00' + (g * 3 + w.i) * interval '1 minute 13 microseconds'
  from _w w cross join generate_series(1, 110) g join _l l on l.i = g;
insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
select o.origen, '00000000-0000-0000-0000-0000000000d1', o.formula, l.id, w.id, '{}', '{}', '{}', '{}', 10, 'Rel fondo ' || w.i || '-' || g,
       timestamptz '2026-01-01 00:00:00+00' + (g * 3 + w.i) * interval '1 minute 17 microseconds', now()
  from _w w cross join generate_series(1, 110) g join _l l on l.i = g cross join _o o;

-- Interesados de V: los 5.000 de la dueña, del más viejo (g = 1) al más nuevo; los 3 de Ana en las posiciones 1, 40 y 90 contando desde el más nuevo.
insert into public.vehiculos_interesados (vehiculo_id, lead_id, creado_en)
select (select id from _t where clave = 'v1'), l.id, timestamptz '2026-01-01 00:00:00+00' + g * interval '1 minute 5 microseconds'
  from generate_series(1, 5000) g join _l l on l.i = g;
insert into public.vehiculos_interesados (vehiculo_id, lead_id, creado_en)
select (select id from _t where clave = 'v1'), l.id, timestamptz '2026-01-01 00:00:00+00' + (5001 - p) * interval '1 minute 5 microseconds' + interval '1 microsecond'
  from (values (5001, 1), (5002, 40), (5003, 90)) x (i, p) join _l l on l.i = x.i;
insert into public.vehiculos_interesados (vehiculo_id, lead_id, creado_en)
select (select id from _t where clave = 'v2'), l.id, timestamptz '2026-01-01 00:00:00+00' + g * interval '1 minute 5 microseconds'
  from generate_series(1, 300) g join _l l on l.i = g;
-- Interesados de LV: sus 1.000 vehículos.
insert into public.vehiculos_interesados (vehiculo_id, lead_id, creado_en)
select w.id, (select id from _l where i = 5004), timestamptz '2026-02-01 00:00:00+00' + w.i * interval '1 minute 7 microseconds' from _w w;

-- Cotizaciones: 2.000 de V sobre 300 leads (unas siete por lead: las revisiones), una de cada 500 de Ana; 300 de V2 sobre 300 leads; 2.000 de LV (dos por vehículo).
insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, estado, creado_en, actualizado_en)
select o.origen, case when g % 500 = 0 then '00000000-0000-0000-0000-0000000000a1' else '00000000-0000-0000-0000-0000000000d1' end::uuid, o.formula,
       (select id from _l where i = 1 + g % 300), (select id from _t where clave = 'v1'), '{}', '{}', '{}', '{}', 10, 'Rel V ' || g,
       case when g % 11 = 0 then 'invalida' when g % 7 = 0 then 'reportada' else 'activa' end::public.estado_cotizacion,
       timestamptz '2026-01-01 00:00:00+00' + g * interval '1 minute 9 microseconds', now()
  from generate_series(1, 2000) g cross join _o o;
insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
select o.origen, '00000000-0000-0000-0000-0000000000d1', o.formula, (select id from _l where i = g), (select id from _t where clave = 'v2'), '{}', '{}', '{}', '{}', 10,
       'Rel V2 ' || g, timestamptz '2026-01-01 00:00:00+00' + g * interval '1 minute 9 microseconds', now()
  from generate_series(1, 300) g cross join _o o;
insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
select o.origen, '00000000-0000-0000-0000-0000000000d1', o.formula, (select id from _l where i = 5004), w.id, '{}', '{}', '{}', '{}', 10, 'Rel LV ' || w.i || '-' || k,
       timestamptz '2026-03-01 00:00:00+00' + (w.i * 2 + k) * interval '1 minute 11 microseconds', now()
  from _w w cross join generate_series(1, 2) k cross join _o o;
set local session_replication_role = origin;
analyze public.vehiculos_interesados; analyze public.cotizaciones; analyze public.vehiculos_vinculos; analyze public.vehiculos; analyze public.leads;

do $$ declare v uuid := (select id from _t where clave = 'v1'); l uuid := (select id from _l where i = 5004);
begin
  if (select count(*) from public.vehiculos_interesados where vehiculo_id = v) <> 5003 or (select count(*) from public.cotizaciones where vehiculo_id = v) <> 2000
     or (select count(*) from public.vehiculos_vinculos where lead_id = l and hasta is null) <> 1000 then
    raise exception 'el terreno no quedó como se esperaba';
  end if;
end $$;

-- Las relaciones que se leen: las tres tablas y sus índices (el heap, el TOAST de nada, cada índice).
create temp table _rel as
select c.oid, c.relname::text as nombre from pg_class c
 where c.oid in ('public.vehiculos_interesados'::regclass, 'public.cotizaciones'::regclass, 'public.vehiculos_vinculos'::regclass, 'public.leads'::regclass, 'public.vehiculos'::regclass)
    or c.oid in (select indexrelid from pg_index where indrelid in ('public.vehiculos_interesados'::regclass, 'public.cotizaciones'::regclass, 'public.vehiculos_vinculos'::regclass,
                                                                    'public.leads'::regclass, 'public.vehiculos'::regclass));
grant select on _rel, _p, _t, _l, _w to authenticated;
create temp table _med (nombre text, ms numeric, bloques numeric);
grant all on _med to authenticated;
create temp table _plan (fase text, consulta text, indices jsonb, sort boolean, seq boolean, descartadas numeric, plan text);
grant all on _plan to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.como(p_quien text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p where clave = p_quien)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p where clave = p_quien), 'role', 'authenticated')::text, true);
$$;

-- Una llamada, 7 veces (las 2 primeras calientan): la mediana de ms de las 5 últimas y los bloques leídos (en todas las relaciones, promedio de las 5).
create function pg_temp.medir(p_nombre text, p_sql text) returns void language plpgsql as $$
declare v_ms numeric[] := '{}'; v_bl numeric[] := '{}'; i int; t0 timestamptz; b0 bigint; b1 bigint; r jsonb;
begin
  for i in 1 .. 7 loop
    select sum(pg_stat_get_xact_blocks_fetched(oid)) into b0 from _rel;
    t0 := clock_timestamp();
    execute p_sql into r;
    select sum(pg_stat_get_xact_blocks_fetched(oid)) into b1 from _rel;
    continue when i <= 2;
    v_ms := v_ms || extract(epoch from clock_timestamp() - t0)::numeric * 1000;
    v_bl := v_bl || (b1 - b0)::numeric;
  end loop;
  insert into _med select p_nombre, (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m), (select avg(b) from unnest(v_bl) b);
end $$;

-- Los planes: cada consulta con el mismo texto que la función, como sentencia preparada con el plan genérico y como postgres (la definer lee sin RLS).
create function pg_temp.planear(p_fase text, p_nombre text, p_ejecutar text, p_tabla text) returns void language plpgsql as $$
declare v_plan jsonb; i int;
begin
  for i in 1 .. 3 loop execute 'explain (analyze, format json) ' || p_ejecutar into v_plan; end loop;
  insert into _plan values (p_fase, p_nombre, coalesce((select jsonb_agg(distinct m[1]) from regexp_matches(v_plan::text, '"Index Name": "([^"]+)"', 'g') m), '[]'::jsonb),
    v_plan::text ~ '"Node Type": "(Incremental )?Sort"',
    v_plan::text ~ ('"Node Type": "Seq Scan"[^{}]*?"Relation Name": "' || p_tabla || '"'),
    coalesce((select sum(m[1]::numeric) from regexp_matches(v_plan::text, '"Rows Removed by Filter": (\d+)', 'g') m), 0),
    (select string_agg(m[1] || ' ' || coalesce(m[2], ''), ' > ') from regexp_matches(v_plan::text, '"Node Type": "([^"]+)"(?:[^{}\[]*?"Index Name": "([^"]+)")?', 'g') m));
end $$;

create function pg_temp.planes(p_fase text) returns void language plpgsql as $$
declare v uuid := (select id from _t where clave = 'v1'); l uuid := (select id from _l where i = 5004); n int := current_setting('medir.n')::int; c record;
begin
  deallocate all;
  -- Los cursores: la fila 200 de cada recorrido.
  select creado_en as en, lead_id as id into c from public.vehiculos_interesados where vehiculo_id = v order by creado_en desc, lead_id desc offset 199 limit 1;
  prepare q_vi(uuid) as select i.lead_id, i.nota, i.creado_en, i.usuario_id, l.nombre, l.cartera, l.eliminado_en from public.vehiculos_interesados i join public.leads l on l.id = i.lead_id and l.eliminado_en is null
    where i.vehiculo_id = $1 order by i.creado_en desc, i.lead_id desc limit 101;
  prepare q_vip(uuid, timestamptz, uuid) as select i.lead_id from public.vehiculos_interesados i join public.leads l on l.id = i.lead_id
    where i.vehiculo_id = $1 and (i.creado_en, i.lead_id) < ($2, $3) order by i.creado_en desc, i.lead_id desc limit 100;
  prepare q_vc(uuid) as select c.id, c.numero, c.clase, c.creado_en, c.lead_id, c.origen_id, c.creado_por from public.cotizaciones c where c.vehiculo_id = $1 and c.lead_id is not null and c.eliminado_en is null and c.estado in ('activa', 'reportada')
    order by c.creado_en desc, c.id desc limit 101;
  prepare q_vcp(uuid, timestamptz, uuid) as select c1.id, c1.numero, c1.clase, c1.creado_en, c1.lead_id, c1.origen_id, c1.creado_por from public.cotizaciones c1 where c1.vehiculo_id = $1 and c1.lead_id is not null and c1.eliminado_en is null
    and c1.estado in ('activa', 'reportada') and (c1.creado_en, c1.id) < ($2, $3) order by c1.creado_en desc, c1.id desc limit 100;
  prepare q_lv(uuid) as select k.vehiculo_id, k.desde, v.origen_id, v.creado_por, v.lead_id from public.vehiculos_vinculos k join public.vehiculos v on v.id = k.vehiculo_id and v.eliminado_en is null
    where k.lead_id = $1 and k.hasta is null order by k.desde desc, k.vehiculo_id desc limit 101;
  prepare q_li(uuid) as select i.vehiculo_id, i.nota, i.creado_en, i.usuario_id, v.origen_id, v.creado_por, v.lead_id from public.vehiculos_interesados i join public.vehiculos v on v.id = i.vehiculo_id and v.eliminado_en is null
    where i.lead_id = $1 order by i.creado_en desc, i.vehiculo_id desc limit 101;
  prepare q_lc(uuid) as select c.id, c.numero, c.clase, c.creado_en, c.vehiculo_id, c.origen_id, c.creado_por from public.cotizaciones c where c.lead_id = $1 and c.vehiculo_id is not null and c.eliminado_en is null and c.estado in ('activa', 'reportada')
    order by c.creado_en desc, c.id desc limit 101;
  perform pg_temp.planear(p_fase, 'interesados de un vehículo', format('execute q_vi(%L)', v), 'vehiculos_interesados');
  perform pg_temp.planear(p_fase, 'interesados de un vehículo, con cursor', format('execute q_vip(%L, %L, %L)', v, c.en, c.id), 'vehiculos_interesados');
  perform pg_temp.planear(p_fase, 'cotizados de un vehículo', format('execute q_vc(%L)', v), 'cotizaciones');
  perform pg_temp.planear(p_fase, 'vinculados de un lead', format('execute q_lv(%L)', l), 'vehiculos_vinculos');
  perform pg_temp.planear(p_fase, 'interesados de un lead', format('execute q_li(%L)', l), 'vehiculos_interesados');
  perform pg_temp.planear(p_fase, 'cotizados de un lead', format('execute q_lc(%L)', l), 'cotizaciones');
  select creado_en as en, id into c from public.cotizaciones where vehiculo_id = v and lead_id is not null and eliminado_en is null and estado in ('activa', 'reportada')
   order by creado_en desc, id desc offset 199 limit 1;
  perform pg_temp.planear(p_fase, 'cotizados de un vehículo, con cursor', format('execute q_vcp(%L, %L, %L)', v, c.en, c.id), 'cotizaciones');
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- El Assert 1 de una fase: las fallas como texto.
create function pg_temp.fallas(p_fase text) returns text language plpgsql as $$
declare
  r record; v_f text := '';
  c_idx constant jsonb := '{"interesados de un vehículo": "vehiculos_interesados_vehiculo_reciente_idx", "interesados de un vehículo, con cursor": "vehiculos_interesados_vehiculo_reciente_idx",
    "cotizados de un vehículo": "cotizaciones_relacion_vehiculo_idx", "cotizados de un vehículo, con cursor": "cotizaciones_relacion_vehiculo_idx",
    "vinculados de un lead": "vehiculos_vinculos_lead_abierto_idx", "interesados de un lead": "vehiculos_interesados_lead_reciente_idx", "cotizados de un lead": "cotizaciones_relacion_lead_idx"}';
begin
  for r in select * from _plan where fase = p_fase order by consulta loop
    if not r.indices ? (c_idx ->> r.consulta) then v_f := v_f || format(E'\n  «%s» no camina %s: %s (plan: %s)', r.consulta, c_idx ->> r.consulta, r.indices, r.plan); end if;
    if r.sort then v_f := v_f || format(E'\n  «%s» ordena (Sort) (plan: %s)', r.consulta, r.plan); end if;
    if r.seq then v_f := v_f || format(E'\n  «%s» recorre la tabla entera', r.consulta); end if;
    if r.descartadas > 1 then v_f := v_f || format(E'\n  «%s» descarta %s filas', r.consulta, r.descartadas); end if;
  end loop;
  return v_f;
end $$;
grant execute on function pg_temp.fallas(text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Medir y asertar
-- ---------------------------------------------------------------------------------------------------------------------------------
set local plan_cache_mode = force_generic_plan;
-- (lo mismo que fija el `set random_page_cost = 1.1` de las funciones: una sentencia preparada no lo hereda)
set local random_page_cost = 1.1;
select pg_temp.planes('hoy');
set local role authenticated;
select pg_temp.como('ana');
select pg_temp.medir('Ana · resumen del vehículo con 5.000 interesados y 2.000 cotizaciones', format('select public.vehiculo_relacionados(%L)', (select id from _t where clave = 'v1')));
select pg_temp.medir('Ana · resumen del vehículo con 300 y 300', format('select public.vehiculo_relacionados(%L)', (select id from _t where clave = 'v2')));
select pg_temp.medir('Ana · página de interesados, la primera', format('select public.vehiculo_relacionados_pagina(%L, ''interesado'', null, null, %s)', (select id from _t where clave = 'v1'), current_setting('medir.n')));
select pg_temp.medir('Ana · página de cotizados, la primera', format('select public.vehiculo_relacionados_pagina(%L, ''cotizado'', null, null, %s)', (select id from _t where clave = 'v1'), current_setting('medir.n')));
select pg_temp.medir('Ana · resumen del lead con 1.000 vinculados, 1.000 interesados y 2.000 cotizaciones', format('select public.lead_relacionados(%L)', (select id from _l where i = 5004)));
select pg_temp.medir('Ana · página de vinculados del lead, la primera', format('select public.lead_relacionados_pagina(%L, ''vinculado'', null, null, %s)', (select id from _l where i = 5004), current_setting('medir.n')));
select pg_temp.medir('Ana · página de interesados del lead, la primera', format('select public.lead_relacionados_pagina(%L, ''interesado'', null, null, %s)', (select id from _l where i = 5004), current_setting('medir.n')));
select pg_temp.medir('Ana · página de cotizados del lead, la primera', format('select public.lead_relacionados_pagina(%L, ''cotizado'', null, null, %s)', (select id from _l where i = 5004), current_setting('medir.n')));
select pg_temp.como('duena');
select pg_temp.medir('Dueña · resumen del vehículo con 5.000 interesados y 2.000 cotizaciones', format('select public.vehiculo_relacionados(%L)', (select id from _t where clave = 'v1')));
select pg_temp.medir('Dueña · resumen del lead con 1.000 vinculados, 1.000 interesados y 2.000 cotizaciones', format('select public.lead_relacionados(%L)', (select id from _l where i = 5004)));
select pg_temp.medir('Dueña · página de interesados, la primera', format('select public.vehiculo_relacionados_pagina(%L, ''interesado'', null, null, %s)', (select id from _t where clave = 'v1'), current_setting('medir.n')));
reset role;

do $$
declare r record; v_fallas text := pg_temp.fallas('hoy');
begin
  -- Las cuatro funciones llevan su `random_page_cost` (sin él, el plan genérico ordena todo lo de un vehículo caliente).
  select string_agg(p.proname, ', ') into v_fallas from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('vehiculo_relacionados', 'lead_relacionados', 'vehiculo_relacionados_pagina', 'lead_relacionados_pagina')
     and not coalesce(p.proconfig @> array['random_page_cost=1.1'], false);
  if v_fallas is not null then raise exception 'sin set random_page_cost = 1.1: %', v_fallas; end if;
  v_fallas := pg_temp.fallas('hoy');
end $$;
do $$
declare r record; v_fallas text := pg_temp.fallas('hoy'); v_a numeric; v_b numeric; v_ms constant numeric := 20;
begin
  for r in select * from _med order by nombre loop
    raise notice 'medicion|%|%', r.nombre, round(r.ms, 2);
    raise notice 'nota|% · bloques leídos: %|', r.nombre, round(r.bloques, 1);
    if r.ms > v_ms then v_fallas := v_fallas || format(E'\n  «%s»: %s ms, el tope es %s', r.nombre, round(r.ms, 1), v_ms); end if;
  end loop;
  for r in select * from _plan where fase = 'hoy' order by consulta loop
    raise notice 'nota|Plan de «%»: % (descartadas %)|', r.consulta, r.indices, r.descartadas;
  end loop;
  -- Assert 2: no crece con N (el mismo resumen con 5.000 y con 300).
  select bloques into v_a from _med where nombre like 'Ana · resumen del vehículo con 5.000%';
  select bloques into v_b from _med where nombre like 'Ana · resumen del vehículo con 300%';
  if v_a > 1.2 * v_b + 30 then v_fallas := v_fallas || format(E'\n  crece con N: %s bloques con 5.000 y %s con 300', round(v_a, 1), round(v_b, 1)); end if;
  if v_fallas <> '' then raise exception 'Los relacionados rompen su presupuesto:%', v_fallas; end if;
end $$;

-- La guarda: sin los dos índices del vehículo, el Assert 1 tiene que caer.
drop index public.vehiculos_interesados_vehiculo_reciente_idx;
drop index public.cotizaciones_relacion_vehiculo_idx;
analyze public.vehiculos_interesados; analyze public.cotizaciones;
select pg_temp.planes('sin');
do $$
declare v_sin text := pg_temp.fallas('sin');
begin
  if v_sin !~ 'no camina' then raise exception 'la guarda no muerde: sin los índices las consultas cumplen (fallas:%)', coalesce(nullif(v_sin, ''), ' ninguna'); end if;
  raise notice 'nota|guarda: cae (sin los índices del vehículo: %)|', replace(split_part(trim(both E'\n' from v_sin), E'\n', 1), '|', '/');
end $$;
rollback;
vacuum public.vehiculos_interesados;
