-- El orden «Cierre más próximo» (`p_orden = 'cierre'`, por tramos) y las ventanas de «Subasta» (`cierre_entre`) de `vehiculos_inventario()` con 50.000 y con 250.000
-- vehículos vivos: `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de volumen. Todo en una transacción que se revierte.
-- Terreno: el origen de subasta con la situación repartida con un patrón fijo: 1 % vivas con fecha (cierres repartidos en los próximos 2 días, desordenados respecto del
-- alta: «Cierra hoy» llena la página ya con 50.000), 0,2 % vivas sin fecha, 1 % «abiertas» viejas con el cierre pasado que nadie refrescó (situación `sin_resolver` o `fase`: siguen en `vehiculos_cierre_subasta_idx`
-- y no en el índice del tramo 0), 1 % sin resolver, 1 % no ganadas y el resto, su fase.
-- Por caso, como la dueña (R1), con `EXPLAIN (ANALYZE, BUFFERS)` del texto de `_vehiculos_inventario_sql()` con su orden, su sentido y su tramo, y sus seis parámetros (el
-- plan normal, con los valores, como corre la función):
--   · con el tramo 0: `Index Scan` de `vehiculos_subasta_viva_cierre_idx`; con el 1 y 250.000, de `vehiculos_subasta_viva_sin_fecha_idx` (con 50.000 hay unas cien vivas sin
--     fecha y el plan puede ir igual de barato por `vehiculos_situacion_idx`); ninguno de los dos descarta filas;
--   · en todos: ningún `Sort` con una lectura de `vehiculos` debajo y sin `Limit` en el medio (cada rama corta por su índice), y ningún `Seq Scan` de `vehiculos`;
--   · los bloques de `vehiculos` con 250.000 ≤ 1,2 × los de 50.000 + 20 (el costo no crece con N), y la dueña ≤ 10 ms con 250.000; ≤ 20 ms (el de una página del
--     inventario) la que lee los tres tramos («sin filtro · cierre»: tres ramas de una página cada una; con «Subasta» quedan una o dos).
-- Salvo «Cierra hoy · recientes» (una ventana con «Más recientes», que se elige a mano: el por defecto con una ventana es el cierre): lee las vivas de la ventana
-- por `vehiculos_subasta_viva_cierre_idx` y las ordena por alta. Crecen con las subastas vivas, no con el inventario (acá, con N, porque el terreno pone 1 % vivas):
-- sólo el tope de 10 ms.
-- Salidas: `medicion|…|número` y `nota|…|` por el runner (`scripts/medir-listado.mjs`).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.vehiculos;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.pagina', (:max_vehiculos + 1)::text, true) \g /dev/null
do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)'; end if;
  if (select count(*) from public.vehiculos where eliminado_en is null) > 20000 then raise exception 'la base ya trae demasiados vehículos vivos: la medición llega a 50.000 y 250.000 (pnpm db:reset)'; end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir el orden por el cierre: %|', current_setting('medir.carga');
end $$;

create temp table _o as select id from public.origenes where clave = 'subasta_usa';
create temp table _fase as select id from public.fases order by id limit 1;
grant select on _o, _fase to authenticated;

-- El relleno, sin disparadores (la situación se escribe a mano; `cierre_subasta_en` es generada y se calcula igual), de la dueña y del origen de subasta.
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en, situacion, fase_id, fase_desde, estado_subasta, subasta_fin_en)
  select (select id from _o), 'Medir cierre ' || g, '00000000-0000-0000-0000-0000000000d1', null,
         timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds',
         case when g % 100 = 2 or g % 500 = 3 then 'en_subasta' when g % 100 = 0 or g % 200 = 4 then 'sin_resolver' when g % 100 = 1 then 'no_ganada' else 'fase' end,
         case when g % 100 > 4 and g % 5 = 0 then (select id from _fase) end,
         case when g % 100 > 4 and g % 5 = 0 then timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds' end,
         case when g % 100 in (2, 4) or g % 500 = 3 then 'abierta'::public.estado_subasta when g % 100 in (0, 1) then 'terminada'::public.estado_subasta end,
         case when g % 100 = 2 then now() + ((g * 7919) % 2880) * interval '1 minute' when g % 100 = 4 then now() - g * interval '1 minute' end
    from generate_series(p_desde, p_hasta) g;
  set local session_replication_role = origin;
end $$;

create temp table _rel as select c.oid, c.relname::text as nombre from pg_class c where c.oid = 'public.vehiculos'::regclass
  union all select i.indexrelid, i.indexrelid::regclass::text from pg_index i where i.indrelid = 'public.vehiculos'::regclass;
-- Cada caso: los filtros, el orden, el sentido, el tramo del cursor y con el tramo 0 en su lectura. El cursor sale del terreno en cada corrida (`pg_temp.cursor`).
create temp table _caso (caso text primary key, filtros jsonb, orden text, sentido text, tramo smallint, con_tramo_0 boolean, con_tramo_1 boolean, ordena_las_vivas boolean, tope_ms numeric default 10);
insert into _caso (caso, filtros, orden, sentido, tramo, con_tramo_0, con_tramo_1, ordena_las_vivas, tope_ms) select * from (values
  ('cierra hoy · cierre', jsonb_build_array(jsonb_build_object('tipo', 'cierre_entre', 'desde', to_jsonb(now()), 'hasta', to_jsonb(now() + interval '1 day')),
     '{"tipo":"situacion_fuera_de","valores":["no_ganada"]}'::jsonb), 'cierre', 'primera', null::smallint, true, false, false, 10),
  ('todas las vivas · cierre', '[{"tipo":"situacion_en","situaciones":["en_subasta"],"fases":[],"sinFase":false},{"tipo":"situacion_fuera_de","valores":["no_ganada"]}]'::jsonb,
     'cierre', 'primera', null, true, true, false, 10),
  ('sin filtro · cierre', '[{"tipo":"situacion_fuera_de","valores":["no_ganada"]}]'::jsonb, 'cierre', 'primera', null, true, true, false, 20),
  ('siguiente hondo en el tramo 2 · cierre', '[{"tipo":"situacion_fuera_de","valores":["no_ganada"]}]'::jsonb, 'cierre', 'siguiente', 2, false, false, false, 10),
  ('anterior desde el tramo 1 · cierre', '[{"tipo":"situacion_fuera_de","valores":["no_ganada"]}]'::jsonb, 'cierre', 'anterior', 1, true, true, false, 10),
  ('cierra hoy · recientes', jsonb_build_array(jsonb_build_object('tipo', 'cierre_entre', 'desde', to_jsonb(now()), 'hasta', to_jsonb(now() + interval '1 day')),
     '{"tipo":"situacion_fuera_de","valores":["no_ganada"]}'::jsonb), 'reciente', 'primera', null, false, false, true, 10)) x;
grant select on _rel, _caso to authenticated;
create temp table _med (fase text, caso text, ms numeric, total numeric, bloques jsonb, forma text, primary key (fase, caso));
grant all on _med to authenticated;

-- El cursor de un caso: en el tramo 2, una fila vieja (la página siguiente camina lo más hondo); en el tramo 1, la más vieja de las vivas sin fecha (hacia atrás
-- quedan todas las vivas sin fecha más nuevas y el tramo 0 al revés).
create function pg_temp.cursor(p_caso _caso, out en timestamptz, out id uuid) language plpgsql as $$
begin
  if p_caso.tramo = 2 then
    select v.creado_en, v.id into en, id from public.vehiculos v where v.origen_id = (select x.id from _o x) and v.eliminado_en is null and v.situacion = 'fase'
      and v.creado_en >= timestamptz '2020-01-01 00:00:00+00' + 2000 * interval '10 seconds' order by v.creado_en, v.id limit 1;
  elsif p_caso.tramo = 1 then
    select v.creado_en, v.id into en, id from public.vehiculos v where v.origen_id = (select x.id from _o x) and v.eliminado_en is null and v.situacion = 'en_subasta'
      and v.cierre_subasta_en is null order by v.creado_en, v.id limit 1;
  end if;
end $$;

-- Una corrida: el plan con ANALYZE de la página de la dueña, los bloques de `vehiculos` por relación y los nodos de interés.
create function pg_temp.corrida(p_caso _caso) returns table (ms numeric, b jsonb, plan jsonb) language plpgsql as $$
declare v_plan jsonb; b0 jsonb; b1 jsonb; c record;
begin
  c := pg_temp.cursor(p_caso);
  select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b0 from _rel r;
  execute 'explain (analyze, buffers, format json) ' || public._vehiculos_inventario_sql(p_caso.filtros, 'origen', p_caso.sentido, p_caso.orden, p_caso.tramo) into v_plan
    using p_caso.filtros, (select id from _o), current_setting('medir.pagina')::int, '00000000-0000-0000-0000-0000000000d1'::uuid, c.en, c.id;
  select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b1 from _rel r;
  return query select (v_plan -> 0 ->> 'Execution Time')::numeric,
    (select coalesce(jsonb_object_agg(key, (b1 ->> key)::numeric - (b0 ->> key)::numeric) filter (where (b1 ->> key)::numeric - (b0 ->> key)::numeric > 0), '{}') from jsonb_object_keys(b1) key), v_plan;
end $$;

-- Los nodos de un plan, aplanados.
create function pg_temp.nodos(p jsonb) returns setof jsonb language sql immutable as $$
  with recursive n(nodo) as (select p union all select h.x from n, jsonb_array_elements(coalesce(n.nodo -> 'Plans', '[]')) h(x)) select nodo from n
$$;
-- Los nodos debajo de uno sin pasar por un Limit (el Limit corta la rama: lo de abajo no se ordena entero).
create function pg_temp.sin_limit(p jsonb) returns setof jsonb language sql immutable as $$
  with recursive n(nodo) as (select h.x from jsonb_array_elements(coalesce(p -> 'Plans', '[]')) h(x)
    union all select h.x from n, jsonb_array_elements(coalesce(n.nodo -> 'Plans', '[]')) h(x) where n.nodo ->> 'Node Type' <> 'Limit') select nodo from n
$$;

-- La forma de un plan, '' si cumple.
create function pg_temp.forma(p_plan jsonb, p_tramo_0 boolean, p_tramo_1 boolean, p_ordena_las_vivas boolean) returns text language plpgsql as $$
declare v_f text := ''; v_raiz jsonb := p_plan -> 0 -> 'Plan';
begin
  if exists (select 1 from pg_temp.nodos(v_raiz) n where n ->> 'Node Type' = 'Seq Scan' and n ->> 'Relation Name' = 'vehiculos') then v_f := v_f || ' [1] recorre vehiculos'; end if;
  if p_tramo_0 and not exists (select 1 from pg_temp.nodos(v_raiz) n where n ->> 'Index Name' = 'vehiculos_subasta_viva_cierre_idx') then
    v_f := v_f || ' [2] el tramo 0 sin vehiculos_subasta_viva_cierre_idx';
  end if;
  if p_tramo_1 and not exists (select 1 from pg_temp.nodos(v_raiz) n where n ->> 'Index Name' = 'vehiculos_subasta_viva_sin_fecha_idx') then
    v_f := v_f || ' [2] el tramo 1 sin vehiculos_subasta_viva_sin_fecha_idx';
  end if;
  if exists (select 1 from pg_temp.nodos(v_raiz) n where n ->> 'Index Name' in ('vehiculos_subasta_viva_cierre_idx', 'vehiculos_subasta_viva_sin_fecha_idx')
             and coalesce((n ->> 'Rows Removed by Filter')::bigint, 0) > 0) then
    v_f := v_f || ' [4] un tramo descarta filas de su índice';
  end if;
  if not p_ordena_las_vivas and exists (select 1 from pg_temp.nodos(v_raiz) s where s ->> 'Node Type' in ('Sort', 'Incremental Sort')
             and exists (select 1 from pg_temp.sin_limit(s) n where n ->> 'Relation Name' = 'vehiculos' and n ->> 'Node Type' <> 'Index Only Scan' and n ->> 'Index Name' is distinct from 'vehiculos_pkey')) then
    v_f := v_f || ' [3] ordena una rama entera';
  end if;
  return v_f;
end $$;

-- 5 corridas (la primera calienta): la mediana de ms y los bloques medios de `vehiculos` por relación.
create function pg_temp.medir(p_fase text) returns void language plpgsql as $$
declare c _caso; r record; v_ms numeric[]; v_suma jsonb; i int; v_plan jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
  for c in select * from _caso order by caso loop
    v_ms := '{}'; v_suma := '{}';
    for i in 1 .. 5 loop
      select * into r from pg_temp.corrida(c);
      v_plan := r.plan;
      continue when i = 1;
      v_ms := v_ms || r.ms;
      v_suma := (select coalesce(jsonb_object_agg(k, coalesce((v_suma ->> k)::numeric, 0) + coalesce((r.b ->> k)::numeric, 0)), '{}')
                   from (select jsonb_object_keys(v_suma || r.b) k) x);
    end loop;
    insert into _med select p_fase, c.caso, (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m), (select coalesce(sum(value::numeric), 0) / 4 from jsonb_each_text(v_suma)),
      (select coalesce(jsonb_object_agg(key, round(value::numeric / 4, 1)), '{}') from jsonb_each_text(v_suma)), pg_temp.forma(v_plan, c.con_tramo_0, c.con_tramo_1 and p_fase = '250.000', c.ordena_las_vivas);
  end loop;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

set local track_functions = 'all';
select pg_temp.rellenar(1, 50000);
analyze public.vehiculos;
set local role authenticated;
select pg_temp.medir('50.000') \g /dev/null
reset role;
select pg_temp.rellenar(50001, 250000);
analyze public.vehiculos;
set local role authenticated;
select pg_temp.medir('250.000') \g /dev/null
reset role;

do $$
declare c _caso; a _med; b _med;
begin
  for c in select * from _caso order by caso loop
    a := (select m from _med m where fase = '50.000' and caso = c.caso); b := (select m from _med m where fase = '250.000' and caso = c.caso);
    raise notice 'medicion|cierre · % · 50.000 (ms)|%', c.caso, round(a.ms, 2);
    raise notice 'medicion|cierre · % · 250.000 (ms)|%', c.caso, round(b.ms, 2);
    raise notice 'medicion|cierre · % · 250.000 (bloques de vehiculos)|%', c.caso, b.total;
    raise notice 'nota|cierre · %: bloques por relación con 250.000: %; forma: %|', c.caso, b.bloques, coalesce(nullif(b.forma, ''), 'ok');
    if a.forma <> '' or b.forma <> '' then raise exception 'cierre · %: la forma no cumple (50.000:% 250.000:%)', c.caso, a.forma, b.forma; end if;
    if not c.ordena_las_vivas and b.total > 1.2 * a.total + 20 then raise exception 'cierre · %: el costo crece con N (% → % bloques de vehiculos)', c.caso, a.total, b.total; end if;
    if b.ms > c.tope_ms then raise exception 'cierre · %: la dueña tarda % ms con 250.000 (tope %)', c.caso, round(b.ms, 2), c.tope_ms; end if;
  end loop;
end $$;
rollback;
vacuum public.vehiculos;
