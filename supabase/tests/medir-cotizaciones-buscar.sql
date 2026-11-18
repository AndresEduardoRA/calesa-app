-- Medición de `cotizaciones_buscar()` (la búsqueda del listado `/cotizaciones`, T15) con 50.000 y con 250.000 cotizaciones: `pnpm db:medir:volumen` (sola:
-- `MEDIR_SOLO=medir-cotizaciones-buscar`), contra el Supabase LOCAL con la siembra de volumen (la dueña, Ana y los cuatro asesores de `sembrar.sql`, y sus 50.000
-- cotizaciones «Volumen cotización g» sobre leads y vehículos «Volumen»). Todo en una transacción que se revierte: la fase de 250.000 suma 200.000 cotizaciones sin lead ni
-- vehículo y el `rollback` las quita.
--
-- Qué se mide: la llamada entera, como `authenticated` y con el plan genérico (`plan_cache_mode = force_generic_plan`), con la página de `MAXIMO_DE_PAGINA_DE_COTIZACIONES`, ×7 y la
-- mediana de las 5 últimas. Lo que mide el EXPLAIN de una función es sólo su Function Scan: lo leído sale por relación (`pg_stat_get_xact_blocks_fetched` del heap y cada índice de
-- `cotizaciones`), los recorridos enteros del heap (`pg_stat_get_xact_numscans`) y las llamadas (`pg_stat_xact_user_functions`). Casos, de la dueña («todos») y de Ana («propios»):
--   - número:          `#<número>`, por `cotizaciones_numero_key`;
--   - cliente raro:    el nombre entero de un lead «Volumen n Apellido» con cotizaciones, por `leads_candidatos()` y `cotizaciones_lead_creado_idx`;
--   - cliente común:   «Quispe» (≈ 6.250 leads: nombra los 50 más nuevos y dice `acotada`);
--   - vehículo raro:   el lote de un vehículo, por `vehiculos_origen_listado_idx` y `cotizaciones_vehiculo_creado_idx`;
--   - vehículo común:  «Toyota» (2.000 vehículos: nombra los 50 más nuevos y dice `acotada`);
--   - autor:           el nombre de un asesor con 7.000 cotizaciones, por `cotizaciones_creador_idx` (con «propios», sólo las propias: sin un `en_cartera()` por cada ajena);
--   - título raro:     «cotización 4242» (11 títulos), por `cotizaciones_titulo_trgm` en `_cotizaciones_ids_por_titulo()` (definer, plan genérico) y la página por la PK;
--   - título común:    «Volumen cotización» (las 50.000: ≤ 1.000 candidatas por el trigrama, nombra las 50 más nuevas y dice `acotada`).
--
-- Asserta (abajo, con su motivo): ningún recorrido entero de `cotizaciones`; cada caso lee el índice que declara; un presupuesto de tiempo por caso; y lo que no depende de cuántas
-- cotizaciones hay (número, cliente raro, vehículo raro y título raro) no crece con N: a lo sumo 1,2 × los bloques de 50.000 + 20 y `greatest(1,5 × t, t + 3 ms)`. Lo común y el autor crecen con lo
-- que coincide, no con N: van como nota.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.n', :'max_cotizaciones', true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if (select count(*) from public.cotizaciones where titulo like 'Volumen cotización %') < 50000 then
    raise exception 'faltan las 50.000 cotizaciones de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if transaction_timestamp() = statement_timestamp() then
    raise exception 'la medición tiene que correr dentro de su begin';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir la búsqueda de cotizaciones: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres: lo que se busca, sacado de lo sembrado
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1');
create temp table _casos (caso text, quien text, texto text, primary key (caso, quien));
insert into _casos
select x.caso, q.quien, x.texto from (values
  ('número', '#' || (select numero from public.cotizaciones where titulo = 'Volumen cotización 777')),
  ('cliente raro', (select l.nombre from public.cotizaciones c join public.leads l on l.id = c.lead_id where c.titulo = 'Volumen cotización 4601')),
  ('cliente común', 'Quispe'),
  ('vehículo raro', (select v.lote from public.cotizaciones c join public.vehiculos v on v.id = c.vehiculo_id where c.titulo = 'Volumen cotización 4602')),
  ('vehículo común', 'Toyota'),
  ('autor', (select nombre from public.perfiles where id = '00000000-0000-0000-0000-0000000000b1')),
  ('título raro', 'cotización 4242'),
  ('título común', 'Volumen cotización')) x (caso, texto)
 cross join (values ('duena'), ('ana')) q (quien);
do $$ begin
  if exists (select 1 from _casos where texto is null) then
    raise exception 'la siembra no trae lo que la medición busca (una cotización con lead y con vehículo, o el asesor): %', (select string_agg(caso || '/' || quien, ', ') from _casos where texto is null);
  end if;
end $$;
create temp table _rel as
select c.oid, case when c.oid = 'public.cotizaciones'::regclass then 'heap' else c.relname::text end as nombre from pg_class c
 where c.oid = 'public.cotizaciones'::regclass or c.oid in (select indexrelid from pg_index where indrelid = 'public.cotizaciones'::regclass);
create temp table _med (fase text, caso text, quien text, ms numeric, bloques jsonb, total numeric, seq bigint, llamadas jsonb, acotada boolean, filas int);
grant select on _p, _casos, _rel to authenticated;
grant insert, select on _med to authenticated;

-- Las 200.000 de la fase 2: de la dueña, sin lead ni vehículo, más nuevas que todo lo demás. Sin triggers (cada fila auditaría y numeraría).
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, creado_en, actualizado_en)
  select o.id, (select id from _p where clave = 'duena'), f.id, '{}', '{}', '{"oficial": 6.96}', '{"usd": 1}', 1,
         now() + g * interval '10 seconds', now() + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g
    join lateral (select x.id from public.origenes x where x.activo order by x.orden, x.id offset g % 3 limit 1) o on true
    join public.formulas f on f.origen_id = o.id and f.estado = 'publicada';
  set local session_replication_role = origin;
end $$;

create function pg_temp.como(p_quien text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p where clave = p_quien)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p where clave = p_quien), 'role', 'authenticated')::text, true);
$$;

-- Una llamada, `p_corridas` veces (las 2 primeras calientan): mediana de ms; promedio de lo leído por relación de `cotizaciones`; recorridos enteros del heap
-- (de todas las corridas) y llamadas a funciones de la última.
create function pg_temp.medir(p_sql text, p_corridas int default 7) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; i int; b0 jsonb; b1 jsonb; l0 jsonb; l1 jsonb; s0 bigint; v_seq bigint := 0; v_suma jsonb := '{}'; v_llam jsonb; k text;
  v_heap constant oid := 'public.cotizaciones'::regclass; v_calientes int := 0;
begin
  for i in 1 .. p_corridas loop
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b0 from _rel r;
    select coalesce(jsonb_object_agg(funcname, calls), '{}') into l0 from pg_stat_xact_user_functions where schemaname = 'public';
    s0 := pg_stat_get_xact_numscans(v_heap);
    execute 'explain (analyze, buffers, format json) ' || p_sql into v_plan;
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b1 from _rel r;
    select coalesce(jsonb_object_agg(funcname, calls), '{}') into l1 from pg_stat_xact_user_functions where schemaname = 'public';
    v_seq := v_seq + pg_stat_get_xact_numscans(v_heap) - s0;
    continue when i <= least(2, p_corridas - 1);
    v_calientes := v_calientes + 1;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    for k in select jsonb_object_keys(b1) loop
      v_suma := v_suma || jsonb_build_object(k, coalesce((v_suma ->> k)::numeric, 0) + (b1 ->> k)::numeric - (b0 ->> k)::numeric);
    end loop;
    select coalesce(jsonb_object_agg(x, coalesce((l1 ->> x)::bigint, 0) - coalesce((l0 ->> x)::bigint, 0)), '{}') into v_llam
      from jsonb_object_keys(l1) x where coalesce((l1 ->> x)::bigint, 0) - coalesce((l0 ->> x)::bigint, 0) > 0;
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
                            'bloques', (select jsonb_object_agg(key, round(value::numeric / v_calientes, 1)) from jsonb_each_text(v_suma) where value::numeric > 0),
                            'seq', v_seq, 'llamadas', v_llam);
end $$;

create function pg_temp.fase(p_fase text, p_corridas int default 7) returns void language plpgsql as $$
declare c record; m jsonb; v_filas int; v_acotada boolean;
begin
  for c in select * from _casos order by caso, quien loop
    perform pg_temp.como(c.quien);
    m := pg_temp.medir(format('select * from public.cotizaciones_buscar(%L, %s)', c.texto, current_setting('medir.n')), p_corridas);
    select count(*), coalesce(bool_or(b.acotada), false) into v_filas, v_acotada from public.cotizaciones_buscar(c.texto, current_setting('medir.n')::int) b;
    -- Sin un solo bloque leído, `bloques` es el JSON `null`, no un objeto vacío.
    m := jsonb_set(m, '{bloques}', coalesce(nullif(m -> 'bloques', 'null'::jsonb), '{}'));
    insert into _med select p_fase, c.caso, c.quien, (m ->> 'ms')::numeric, m -> 'bloques',
                            coalesce((select sum(value::numeric) from jsonb_each_text(m -> 'bloques')), 0), (m ->> 'seq')::bigint, m -> 'llamadas', v_acotada, v_filas;
  end loop;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: las 50.000 de la siembra. Fase 2: 250.000 (200.000 más, de la dueña y sin lead ni vehículo)
-- ---------------------------------------------------------------------------------------------------------------------------------
analyze public.cotizaciones;
set local track_functions = 'all';
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.fase('50.000');
reset role;
select pg_temp.rellenar(1, 200000);
-- La lista pendiente del GIN del título (fastupdate) se recorre entera en cada búsqueda y crece con lo insertado desde el último vacuum, que en la nube pasa solo (como en
-- `medir-buscador.sql`): aquí, dentro de la transacción, se vacía a mano.
select gin_clean_pending_list('public.cotizaciones_titulo_trgm') \g /dev/null
analyze public.cotizaciones;
set local role authenticated;
select pg_temp.fase('250.000');
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo que se asserta
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare
  r record; v_g record; v_fallas text := ''; v_tope numeric;
  -- Presupuestos: el número, 1 a 3 lecturas por PK; lo raro, la ventana de leads_candidatos (cliente) o el recorrido de un origen (vehículo: la RLS no deja usar su trigrama) y
  -- 50 ids por índice; lo común nombra 50 y lee su página de cada uno; Ana, una en_cartera() por fila que lee. El título suma su trigrama (≤ 1.000 candidatas) al piso de
  -- las otras fuentes de texto, que corren igual.
  v_tope_ms constant jsonb := '{"número": 20, "cliente raro": 80, "cliente común": 400, "vehículo raro": 150, "vehículo común": 400, "autor": 60, "título raro": 80, "título común": 150}';
  v_indice constant jsonb := '{"número": "cotizaciones_numero_key", "cliente raro": "cotizaciones_lead_creado_idx", "cliente común": "cotizaciones_lead_creado_idx",
                              "vehículo raro": "cotizaciones_vehiculo_creado_idx", "vehículo común": "cotizaciones_vehiculo_creado_idx", "autor": "cotizaciones_creador_idx",
                              "título raro": "cotizaciones_titulo_trgm", "título común": "cotizaciones_titulo_trgm"}';
begin
  for r in select * from _med order by fase, caso, quien loop
    raise notice 'medicion|Búsqueda de cotizaciones, % · % · % (ms)|%', r.fase, r.caso, r.quien, round(r.ms, 2);
    raise notice 'medicion|Búsqueda de cotizaciones, % · % · % (bloques de cotizaciones)|%', r.fase, r.caso, r.quien, round(r.total, 1);
    raise notice 'nota|% · % · %: % filas, acotada %, bloques por relación % · llamadas %|', r.fase, r.caso, r.quien, r.filas, r.acotada, r.bloques, r.llamadas;
    if r.seq > 0 then v_fallas := v_fallas || format(E'\n  %s · %s · %s recorre cotizaciones entera (%s veces)', r.fase, r.caso, r.quien, r.seq); end if;
    -- Un `case` dentro de la condición de un `if` la corta en su primer `then`: el tope, antes.
    v_tope := (v_tope_ms ->> r.caso)::numeric * (case when r.quien = 'ana' then 2 else 1 end);
    if r.ms > v_tope then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s ms, el presupuesto es %s', r.fase, r.caso, r.quien, round(r.ms, 1), v_tope);
    end if;
    -- El índice de su ruta: uno de cotizaciones tiene que leerse con bloques (un caso sin filas para esa persona no lo lee: Ana no ve lo ajeno).
    if r.filas > 0 and coalesce((r.bloques ->> (v_indice ->> r.caso))::numeric, 0) = 0
       and not (r.caso = 'autor' and coalesce((r.bloques ->> 'cotizaciones_creado_por_idx')::numeric, 0) > 0) then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s no leyó %s: %s', r.fase, r.caso, r.quien, v_indice ->> r.caso, r.bloques);
    end if;
    -- Por autor, con «propios» sólo se buscan las propias: nada de un `en_cartera()` por cada cotización de otra persona (7.000: era 98 ms y 6.900 llamadas).
    if r.caso = 'autor' and r.quien = 'ana' and coalesce((r.llamadas ->> 'en_cartera')::int, 0) > 200 then
      v_fallas := v_fallas || format(E'\n  %s · autor · ana llama a en_cartera %s veces (a lo sumo 200)', r.fase, r.llamadas ->> 'en_cartera');
    end if;
    if r.caso in ('cliente común', 'vehículo común', 'título común') and r.quien = 'duena' and not r.acotada then
      v_fallas := v_fallas || format(E'\n  %s · %s · duena: debía pasarse del tope de coincidencias (acotada) y no lo dijo', r.fase, r.caso);
    end if;
  end loop;
  -- No crece con N: lo que no depende de cuántas cotizaciones hay.
  for v_g in select a.caso, a.quien, a.ms as ms_chico, b.ms as ms_grande, a.total as bl_chico, b.total as bl_grande
               from _med a join _med b on b.caso = a.caso and b.quien = a.quien and a.fase = '50.000' and b.fase = '250.000'
              where a.caso in ('número', 'cliente raro', 'vehículo raro', 'título raro') loop
    if v_g.bl_grande > 1.2 * v_g.bl_chico + 20 then
      v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s bloques con 50.000 y %s con 250.000', v_g.caso, v_g.quien, v_g.bl_chico, v_g.bl_grande);
    end if;
    if v_g.ms_grande > greatest(1.5 * v_g.ms_chico, v_g.ms_chico + 3) then
      v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s ms con 50.000 y %s con 250.000', v_g.caso, v_g.quien, round(v_g.ms_chico, 1), round(v_g.ms_grande, 1));
    end if;
  end loop;
  if v_fallas <> '' then raise exception 'cotizaciones_buscar rompe su presupuesto:%', v_fallas; end if;
end $$;
rollback;
vacuum public.cotizaciones;
