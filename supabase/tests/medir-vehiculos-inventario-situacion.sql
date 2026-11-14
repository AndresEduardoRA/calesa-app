-- El filtro «Situación» del inventario (`situacion_en` de `vehiculos_inventario()`) con 50.000 y con 250.000 vehículos vivos: `pnpm db:medir:volumen`, contra el Supabase LOCAL con
-- la siembra de volumen. Todo en una transacción que se revierte.
-- Terreno: el origen de subasta lleva la situación repartida con un patrón fijo, para que las propias sean una fracción chica y repartida en todo el orden de la
-- lista (1 % «Sin resolver», 1 % «No ganadas», 1 % «En subasta»; una de cada cinco «fase», en una fase): quien recorra el origen en orden y descarte lo que no cumple
-- lee ≈ 100 filas por cada fila de la página.
-- Por caso, como la dueña (R1), con `EXPLAIN (ANALYZE, BUFFERS)` del texto de `_vehiculos_inventario_sql()` y sus seis parámetros (el plan normal, con los valores):
--   · una situación propia: `Index Scan` de `vehiculos_situacion_idx` bajo el `Limit`, sin `Sort` sobre `vehiculos`, sin filas descartadas por el filtro y sin `Seq Scan`;
--   · dos propias, una fase y «sin fase»: sin `Seq Scan` de `vehiculos`;
--   · en todos, los bloques de `vehiculos` con 250.000 ≤ 1,2 × los de 50.000 + 20 (el costo no crece con N).
-- Salidas: `medicion|…|número` y `nota|…|` por el runner (`scripts/medir-listado.mjs`).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.vehiculos;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.pagina', (:max_vehiculos + 1)::text, true) \g /dev/null
do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)'; end if;
  if (select count(*) from public.vehiculos where eliminado_en is null) > 20000 then raise exception 'la base ya trae demasiados vehículos vivos: la medición llega a 50.000 y 250.000 (pnpm db:reset)'; end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir el filtro de situación: %|', current_setting('medir.carga');
end $$;

create temp table _o as select id from public.origenes where clave = 'subasta_usa';
create temp table _fase as select id from public.fases order by id limit 1;
grant select on _o, _fase to authenticated;

-- El relleno, sin disparadores (la situación se escribe a mano), de la dueña y del origen de subasta; lo más nuevo, lo último en entrar.
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en, situacion, fase_id, fase_desde)
  select (select id from _o), 'Medir situación ' || g, '00000000-0000-0000-0000-0000000000d1', null,
         timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds',
         case g % 100 when 0 then 'sin_resolver' when 1 then 'no_ganada' when 2 then 'en_subasta' else 'fase' end,
         case when g % 100 > 2 and g % 5 = 0 then (select id from _fase) end,
         case when g % 100 > 2 and g % 5 = 0 then timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds' end
    from generate_series(p_desde, p_hasta) g;
  set local session_replication_role = origin;
end $$;

create temp table _rel as select c.oid, c.relname::text as nombre from pg_class c where c.oid = 'public.vehiculos'::regclass
  union all select i.indexrelid, i.indexrelid::regclass::text from pg_index i where i.indrelid = 'public.vehiculos'::regclass;
create temp table _caso (caso text primary key, filtros jsonb, una_propia boolean);
insert into _caso select * from (values
  ('sin resolver', '[{"tipo":"situacion_en","situaciones":["sin_resolver"],"fases":[],"sinFase":false}]'::jsonb, true),
  ('no ganadas', '[{"tipo":"situacion_en","situaciones":["no_ganada"],"fases":[],"sinFase":false}]'::jsonb, true),
  ('en subasta', '[{"tipo":"situacion_en","situaciones":["en_subasta"],"fases":[],"sinFase":false}]'::jsonb, true),
  ('sin resolver y no ganadas', '[{"tipo":"situacion_en","situaciones":["sin_resolver","no_ganada"],"fases":[],"sinFase":false}]'::jsonb, false),
  ('sin resolver con la de siempre', '[{"tipo":"situacion_en","situaciones":["sin_resolver"],"fases":[],"sinFase":false},{"tipo":"situacion_fuera_de","valores":["no_ganada"]}]'::jsonb, true),
  ('una fase', jsonb_build_array(jsonb_build_object('tipo', 'situacion_en', 'situaciones', '[]'::jsonb, 'fases', jsonb_build_array((select id from _fase)), 'sinFase', false)), false),
  ('sin fase', '[{"tipo":"situacion_en","situaciones":[],"fases":[],"sinFase":true}]'::jsonb, false),
  ('las tres propias', '[{"tipo":"situacion_en","situaciones":["en_subasta","sin_resolver","no_ganada"],"fases":[],"sinFase":false}]'::jsonb, false),
  ('dos propias y una fase', jsonb_build_array(jsonb_build_object('tipo', 'situacion_en', 'situaciones', '["sin_resolver","no_ganada"]'::jsonb, 'fases', jsonb_build_array((select id from _fase)), 'sinFase', false)), false)) x;
grant select on _rel, _caso to authenticated;
create temp table _med (fase text, caso text, ms numeric, total numeric, bloques jsonb, forma text, primary key (fase, caso));
grant all on _med to authenticated;

-- Una corrida: el plan con ANALYZE de la página 1 de la dueña, los bloques de `vehiculos` por relación y los nodos de interés.
create function pg_temp.corrida(p_caso _caso) returns table (ms numeric, b jsonb, plan jsonb) language plpgsql as $$
declare v_plan jsonb; b0 jsonb; b1 jsonb;
begin
  select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b0 from _rel r;
  execute 'explain (analyze, buffers, format json) ' || public._vehiculos_inventario_sql(p_caso.filtros, 'origen', 'primera') into v_plan
    using p_caso.filtros, (select id from _o), current_setting('medir.pagina')::int, '00000000-0000-0000-0000-0000000000d1'::uuid, null::timestamptz, null::uuid;
  select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b1 from _rel r;
  return query select (v_plan -> 0 ->> 'Execution Time')::numeric,
    (select coalesce(jsonb_object_agg(key, (b1 ->> key)::numeric - (b0 ->> key)::numeric) filter (where (b1 ->> key)::numeric - (b0 ->> key)::numeric > 0), '{}') from jsonb_object_keys(b1) key), v_plan;
end $$;

-- Los nodos de un plan, aplanados.
create function pg_temp.nodos(p jsonb) returns setof jsonb language sql immutable as $$
  with recursive n(nodo) as (select p union all select h.x from n, jsonb_array_elements(coalesce(n.nodo -> 'Plans', '[]')) h(x)) select nodo from n
$$;

-- La forma de un plan, '' si cumple: sin Seq Scan de vehiculos; y con una sola propia, su índice, sin Sort sobre él ni filas descartadas.
create function pg_temp.forma(p_plan jsonb, p_una boolean) returns text language plpgsql as $$
declare v_f text := ''; v_raiz jsonb := p_plan -> 0 -> 'Plan';
begin
  if exists (select 1 from pg_temp.nodos(v_raiz) n where n ->> 'Node Type' = 'Seq Scan' and n ->> 'Relation Name' = 'vehiculos') then v_f := v_f || ' [1] recorre vehiculos'; end if;
  if p_una then
    if not exists (select 1 from pg_temp.nodos(v_raiz) n where n ->> 'Index Name' = 'vehiculos_situacion_idx') then v_f := v_f || ' [2] sin vehiculos_situacion_idx'; end if;
    if exists (select 1 from pg_temp.nodos(v_raiz) n where n ->> 'Index Name' = 'vehiculos_situacion_idx' and coalesce((n ->> 'Rows Removed by Filter')::bigint, 0) > 0) then v_f := v_f || ' [3] descarta filas del filtro'; end if;
    if exists (select 1 from pg_temp.nodos(v_raiz) s where s ->> 'Node Type' = 'Sort' and exists (select 1 from pg_temp.nodos(s) n where n ->> 'Index Name' = 'vehiculos_situacion_idx')
               and not exists (select 1 from pg_temp.nodos(s) l where l ->> 'Node Type' = 'Limit')) then v_f := v_f || ' [4] ordena todas las de la situación'; end if;
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
      (select coalesce(jsonb_object_agg(key, round(value::numeric / 4, 1)), '{}') from jsonb_each_text(v_suma)), pg_temp.forma(v_plan, c.una_propia);
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
    raise notice 'medicion|situación · % · 50.000 (ms)|%', c.caso, round(a.ms, 2);
    raise notice 'medicion|situación · % · 250.000 (ms)|%', c.caso, round(b.ms, 2);
    raise notice 'medicion|situación · % · 250.000 (bloques de vehiculos)|%', c.caso, b.total;
    raise notice 'nota|situación · %: bloques por relación con 250.000: %; forma: %|', c.caso, b.bloques, coalesce(nullif(b.forma, ''), 'ok');
    if a.forma <> '' or b.forma <> '' then raise exception 'situación · %: la forma no cumple (50.000:% 250.000:%)', c.caso, a.forma, b.forma; end if;
    if b.total > 1.2 * a.total + 20 then raise exception 'situación · %: el costo crece con N (% → % bloques de vehiculos)', c.caso, a.total, b.total; end if;
  end loop;
end $$;
rollback;
vacuum public.vehiculos;
