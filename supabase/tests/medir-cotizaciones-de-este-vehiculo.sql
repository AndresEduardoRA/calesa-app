-- Medición de «De este vehículo» (`cotizaciones_de_este_vehiculo()`) con 50.000 y con 250.000 cotizaciones: `pnpm db:medir:volumen`, contra el Supabase LOCAL con la
-- siembra de volumen (la dueña y Ana de `sembrar.sql`). Todo en una transacción que se revierte: ninguna cotización queda. La forma es la de
-- `medir-historial-del-vehiculo.sql` (el terreno) y `medir-cotizaciones-listado.sql` (lo leído por relación y las llamadas).
--
-- Qué se mide: la RPC (invocadora: la RLS decide) como `authenticated`, con el plan genérico, de a `TAMANO_DE_ESTE_VEHICULO` + 1: la primera página (con la aprobada fijada, que
-- está entre las más viejas del vehículo: fuera de toda página) y una profunda por cursor (la fila 4.000). Un vehículo «caliente» lleva 5.000 cotizaciones (una de cada mil, de
-- Ana); las demás se reparten entre 100 vehículos. Por caso, 7 corridas de `EXPLAIN (ANALYZE, BUFFERS)` y la mediana de las 5 últimas; lo leído de `cotizaciones` y de
-- `cotizaciones_aprobadas` por relación (`pg_stat_get_xact_blocks_fetched`), los recorridos enteros del heap y las llamadas a funciones de la última corrida.
--
-- Asserta para la dueña, con los dos volúmenes: lee `cotizaciones_vehiculo_creado_idx` y, en la primera, `cotizaciones_aprobadas_pkey`; ningún otro índice de `cotizaciones`
-- con bloques salvo `cotizaciones_pkey` (la fijada); ningún recorrido entero; ≤ 10 ms y ≤ 150 bloques de `cotizaciones`; que no crece con N (con 250.000, el tiempo a lo sumo
-- `greatest(1,5 × t, t + 3 ms)` y los bloques 1,2 × + 20); `_nombre_del_modo()` a lo sumo una vez por versión y modo distintos (aquí, una). Ana, ≤ 100 ms como en el listado (recorre las del vehículo
-- hasta llenar la página: crece con ellas, no con N). Comprueba que mide: la dueña recibe sus n + 1 filas (más la fijada en la primera) y Ana las 5 suyas. Los buffers totales, como nota (el costo fijo de la RLS).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.pagina', :tam_este_vehiculo::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if transaction_timestamp() = statement_timestamp() then
    raise exception 'la medición tiene que correr dentro de su begin: vaciar las cotizaciones fuera de una transacción borraría la siembra';
  end if;
  raise notice 'nota|La medición vacía las % cotizaciones de la base en su transacción (se revierte)|', (select count(*) from public.cotizaciones);
  truncate public.cotizaciones cascade;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir «De este vehículo»: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres: el origen sembrado `subasta_usa` con su fórmula publicada (y su primer modo, si tiene), el vehículo caliente y 100 más (sin triggers)
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1');
create temp table _o as select o.id as origen, f.id as formula, f.diseno -> 'cabecera' -> 'modos' -> 0 ->> 'clave' as modo
  from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.clave = 'subasta_usa';
do $$ begin
  if (select count(*) from _o) <> 1 then raise exception 'esperaba el origen sembrado subasta_usa con su fórmula publicada'; end if;
  if (select modo from _o) is null then raise notice 'nota|La fórmula de subasta_usa no tiene modos: _nombre_del_modo() corta antes de leer la fórmula|'; end if;
end $$;
create temp table _v (i int primary key, id uuid not null);
set local session_replication_role = replica;
with v as (insert into public.vehiculos (origen_id, titulo, creado_por) select (select origen from _o), 'Medir este vehículo ' || g, '00000000-0000-0000-0000-0000000000d1'
             from generate_series(0, 100) g returning id, titulo)
insert into _v select replace(titulo, 'Medir este vehículo ', '')::int, id from v;
set local session_replication_role = origin;
create temp table _snap as select (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
                                  (select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')) as fuentes
  from public.formulas f join _o on f.id = _o.formula;
grant select on _p, _o, _v to authenticated;

-- Las filas g ∈ [desde, hasta], más nuevas cuanto mayor es g: las 5.000 primeras son del vehículo caliente (`_v.i = 0`; una de cada mil, de Ana), las demás de los otros 100.
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, modo_tc, creado_en, actualizado_en)
  select o.origen, case when g <= 5000 and g % 1000 = 1 then (select id from _p where clave = 'ana') else (select id from _p where clave = 'duena') end,
         o.formula, (select id from _v where i = case when g <= 5000 then 0 else 1 + g % 100 end),
         s.valores, s.fuentes, '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5, 'Este vehículo ' || g, o.modo,
         timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g cross join _o o cross join _snap s;
  set local session_replication_role = origin;
end $$;

-- Lo que se mide por relación: el heap de `cotizaciones`, cada índice suyo y los de `cotizaciones_aprobadas`.
create temp table _rel as
select c.oid, case when c.oid = 'public.cotizaciones'::regclass then 'heap' else c.relname::text end as nombre from pg_class c
 where c.oid = 'public.cotizaciones'::regclass or c.oid in (select indexrelid from pg_index where indrelid in ('public.cotizaciones'::regclass, 'public.cotizaciones_aprobadas'::regclass));
grant select on _rel to authenticated;
create temp table _med (fase text, pagina text, quien text, ms numeric, buffers bigint, bloques jsonb, seq bigint, llamadas jsonb, filas int);
grant all on _med to authenticated;

-- Una consulta 7 veces (las 2 primeras calientan): la mediana de ms y de buffers, el promedio de lo leído por relación, los recorridos enteros y las llamadas de la última.
create function pg_temp.medir(p_sql text) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; i int; b0 jsonb; b1 jsonb; l0 jsonb; l1 jsonb; s0 bigint; v_seq bigint := 0; v_suma jsonb := '{}'; v_llam jsonb; k text;
  v_heap constant oid := 'public.cotizaciones'::regclass;
begin
  for i in 1 .. 7 loop
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b0 from _rel r;
    select coalesce(jsonb_object_agg(funcname, calls), '{}') into l0 from pg_stat_xact_user_functions where schemaname = 'public';
    s0 := pg_stat_get_xact_numscans(v_heap);
    execute 'explain (analyze, buffers, format json) ' || p_sql into v_plan;
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b1 from _rel r;
    select coalesce(jsonb_object_agg(funcname, calls), '{}') into l1 from pg_stat_xact_user_functions where schemaname = 'public';
    v_seq := v_seq + pg_stat_get_xact_numscans(v_heap) - s0;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_buf := v_buf || (coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0));
    for k in select jsonb_object_keys(b1) loop
      v_suma := v_suma || jsonb_build_object(k, coalesce((v_suma ->> k)::numeric, 0) + (b1 ->> k)::numeric - (b0 ->> k)::numeric);
    end loop;
    select coalesce(jsonb_object_agg(x, coalesce((l1 ->> x)::bigint, 0) - coalesce((l0 ->> x)::bigint, 0)), '{}') into v_llam
      from jsonb_object_keys(l1) x where coalesce((l1 ->> x)::bigint, 0) - coalesce((l0 ->> x)::bigint, 0) > 0;
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
                            'buffers', (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b),
                            'bloques', (select jsonb_object_agg(key, round(value::numeric / 5, 1)) from jsonb_each_text(v_suma) where value::numeric > 0),
                            'seq', v_seq, 'llamadas', v_llam);
end $$;

create function pg_temp.como(p_quien text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p where clave = p_quien)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p where clave = p_quien), 'role', 'authenticated')::text, true);
$$;

-- Una persona: la primera página del vehículo caliente y una profunda por cursor (la fila 4.000 de las 5.000).
create function pg_temp.ruta(p_fase text, p_quien text) returns void language plpgsql as $$
declare c record; v_q text; v_m jsonb; v_v uuid := (select id from _v where i = 0); v_n int := current_setting('medir.pagina')::int; v_filas int;
begin
  perform pg_temp.como(p_quien);
  select * into c from _cur;
  foreach v_q in array array[format('select * from public.cotizaciones_de_este_vehiculo(%L::uuid, %s)', v_v, v_n),
                             format('select * from public.cotizaciones_de_este_vehiculo(%L::uuid, %s, %L::timestamptz, %L::uuid)', v_v, v_n, c.ts, c.id)] loop
    execute format('select count(*) from (%s) x', v_q) into v_filas;
    v_m := pg_temp.medir(v_q);
    insert into _med values (p_fase, case when v_q like '%timestamptz%' then 'profunda' else 'página 1' end, p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint,
      coalesce(v_m -> 'bloques', '{}'), (v_m ->> 'seq')::bigint, v_m -> 'llamadas', v_filas);
  end loop;
end $$;

create function pg_temp.fallas(p_fase text) returns text language plpgsql as $$
declare
  r record; v_fallas text := ''; c_ms_duena constant numeric := 10; c_ms_ana constant numeric := 100; c_bloques constant numeric := 150; k text;
  v_n int := current_setting('medir.pagina')::int; v_cot numeric; v_esperadas int;
begin
  for r in select * from _med where fase = p_fase order by quien, pagina loop
    if r.quien = 'ana' then
      if r.ms > c_ms_ana then v_fallas := v_fallas || format(E'\n  %s · %s · ana: %s ms, el presupuesto es %s', r.fase, r.pagina, round(r.ms, 1), c_ms_ana); end if;
      if r.pagina = 'página 1' and r.filas <> 5 then v_fallas := v_fallas || format(E'\n  %s · página 1 · ana: %s filas, esperaba sus 5', r.fase, r.filas); end if;
      continue;
    end if;
    -- Comprobar que mide: n + 1 filas (y la fijada en la primera). El `case` va a una variable: un `if` termina en el primer `then`.
    v_esperadas := v_n + 1 + case when r.pagina = 'página 1' then 1 else 0 end;
    if r.filas <> v_esperadas then
      v_fallas := v_fallas || format(E'\n  %s · %s: %s filas, esperaba %s', r.fase, r.pagina, r.filas, v_esperadas);
    end if;
    if r.ms > c_ms_duena then v_fallas := v_fallas || format(E'\n  %s · %s: %s ms, el presupuesto es %s', r.fase, r.pagina, round(r.ms, 1), c_ms_duena); end if;
    if r.seq > 0 then v_fallas := v_fallas || format(E'\n  %s · %s recorre cotizaciones entera', r.fase, r.pagina); end if;
    if not r.bloques ? 'cotizaciones_vehiculo_creado_idx' then v_fallas := v_fallas || format(E'\n  %s · %s no lee cotizaciones_vehiculo_creado_idx: %s', r.fase, r.pagina, r.bloques); end if;
    if r.pagina = 'página 1' and not r.bloques ? 'cotizaciones_aprobadas_pkey' then
      v_fallas := v_fallas || format(E'\n  %s · página 1 no lee cotizaciones_aprobadas_pkey: %s', r.fase, r.bloques);
    end if;
    for k in select jsonb_object_keys(r.bloques) loop
      if k not in ('heap', 'cotizaciones_vehiculo_creado_idx', 'cotizaciones_pkey', 'cotizaciones_aprobadas_pkey', 'cotizaciones_aprobadas_cotizacion_id_key') then
        v_fallas := v_fallas || format(E'\n  %s · %s lee otro índice: %s', r.fase, r.pagina, k);
      end if;
    end loop;
    select coalesce(sum(value::numeric), 0) into v_cot from jsonb_each_text(r.bloques) where key in ('heap', 'cotizaciones_vehiculo_creado_idx', 'cotizaciones_pkey');
    if v_cot > c_bloques then v_fallas := v_fallas || format(E'\n  %s · %s: %s bloques de cotizaciones, el presupuesto es %s', r.fase, r.pagina, v_cot, c_bloques); end if;
    if coalesce((r.llamadas ->> '_nombre_del_modo')::int, 0) > 1 then
      v_fallas := v_fallas || format(E'\n  %s · %s llama a _nombre_del_modo %s veces (una versión y un modo)', r.fase, r.pagina, r.llamadas ->> '_nombre_del_modo');
    end if;
  end loop;
  return v_fallas;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 cotizaciones; fase 2: 250.000. La aprobada del vehículo caliente: la segunda más vieja (de la dueña), fuera de toda página.
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 50000);
insert into public.cotizaciones_aprobadas (vehiculo_id, cotizacion_id, origen_id, creado_por, lead_id, monto, moneda)
select c.vehiculo_id, c.id, c.origen_id, c.creado_por, c.lead_id, 1234.5, 'USD' from public.cotizaciones c where c.titulo = 'Este vehículo 2';
analyze public.cotizaciones;
create temp table _cur as select c.creado_en as ts, c.id from public.cotizaciones c where c.vehiculo_id = (select id from _v where i = 0) and c.eliminado_en is null
  order by c.creado_en desc, c.id desc offset 4000 limit 1;
grant select on _cur to authenticated;
set local track_functions = 'all';
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.ruta('50.000', 'duena');
select pg_temp.ruta('50.000', 'ana');
reset role;

select pg_temp.rellenar(50001, 250000);
analyze public.cotizaciones;
do $$ begin
  if (select count(*) from public.cotizaciones) <> 250000 then raise exception 'esperaba 250.000 cotizaciones y hay %', (select count(*) from public.cotizaciones); end if;
  if (select count(*) from public.cotizaciones where vehiculo_id = (select id from _v where i = 0)) <> 5000 then raise exception 'el vehículo caliente debía tener 5.000 cotizaciones'; end if;
end $$;
set local role authenticated;
select pg_temp.ruta('250.000', 'duena');
select pg_temp.ruta('250.000', 'ana');
reset role;

do $$
declare r record; g record; v_fallas text := pg_temp.fallas('50.000') || pg_temp.fallas('250.000'); v_c50 numeric; v_c250 numeric;
begin
  for r in select * from _med order by fase, quien, pagina loop
    raise notice 'medicion|De este vehículo, % · % · % (ms%)|%', r.fase, r.pagina, r.quien, case r.quien when 'ana' then ', ≤ 100: crece con las del vehículo' else '' end, round(r.ms, 2);
    raise notice 'medicion|De este vehículo, % · % · % (buffers, sin assert)|%', r.fase, r.pagina, r.quien, r.buffers;
    raise notice 'medicion|De este vehículo, % · % · % (bloques de cotizaciones%)|%', r.fase, r.pagina, r.quien, case r.quien when 'ana' then ', sin assert' else '' end,
      (select coalesce(sum(value::numeric), 0) from jsonb_each_text(r.bloques) where key in ('heap', 'cotizaciones_vehiculo_creado_idx', 'cotizaciones_pkey'));
    raise notice 'medicion|De este vehículo, % · % · % (llamadas a _nombre_del_modo)|%', r.fase, r.pagina, r.quien, coalesce(r.llamadas ->> '_nombre_del_modo', '0');
  end loop;
  for g in select a.pagina, a.ms as ms_50, b.ms as ms_250, a.bloques as b_50, b.bloques as b_250
             from _med a join _med b on b.pagina = a.pagina and b.quien = a.quien and a.fase = '50.000' and b.fase = '250.000' where a.quien = 'duena' loop
    select coalesce(sum(value::numeric), 0) into v_c50 from jsonb_each_text(g.b_50) where key in ('heap', 'cotizaciones_vehiculo_creado_idx', 'cotizaciones_pkey');
    select coalesce(sum(value::numeric), 0) into v_c250 from jsonb_each_text(g.b_250) where key in ('heap', 'cotizaciones_vehiculo_creado_idx', 'cotizaciones_pkey');
    if g.ms_250 > greatest(1.5 * g.ms_50, g.ms_50 + 3) then v_fallas := v_fallas || format(E'\n  %s crece con N: %s ms y %s', g.pagina, round(g.ms_50, 1), round(g.ms_250, 1)); end if;
    if v_c250 > 1.2 * v_c50 + 20 then v_fallas := v_fallas || format(E'\n  %s crece con N: %s bloques y %s', g.pagina, v_c50, v_c250); end if;
  end loop;
  if v_fallas <> '' then raise exception '«De este vehículo» rompe su presupuesto:%', v_fallas; end if;
end $$;
rollback;
vacuum public.cotizaciones;
