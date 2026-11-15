-- Medición de «visto» (`pnpm db:medir:volumen`, contra el Supabase LOCAL; A3b).
--
-- Una persona con 2.000 y luego con 19.999 vistos (el techo es 20.000), repartidos en los ocho pares (módulo, tipo) válidos, y un vecino con otros
-- tantos. Todo en una transacción que se revierte. Cada llamada corre como `authenticated`, 7 veces (las 2 primeras calientan), y se informa la
-- mediana de ms y los bloques que toca `vistos` (el heap y sus tres índices, por `pg_stat_get_xact_blocks_fetched`, no los buffers totales: los de otras
-- tablas se mueven con el autovacuum).
--   · `vistos_de` con 100 ids (la lectura de una página): sus bloques no crecen con las filas del par de 2.000 a 20.000 (sólo la altura del árbol).
--   · el `select` por la PK del último de la agenda (evento y tarea): `vistos_pkey` sin Seq Scan, tampoco crece; y el último del módulo por `vistos_ultimo_idx`.
--   · `visto_registrar` de uno nuevo con 19.999 filas: cuenta hasta el techo por `vistos_usuario_visto_idx` (crece hasta 20.000 por diseño: se anota).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
begin;

select set_config('medir.carga', :'carga', true) \g /dev/null

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'vistos-yo-medir@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000e2', 'vistos-vecino-medir@ejemplo.com', '{"invitado": true}');

create temporary table _res (etapa int, caso text, ms numeric, bloques numeric);

-- Vistos de la persona `p_u`, desde la posición `p_desde` hasta `p_hasta`: ocho pares (módulo, tipo), ids repartidos y horas distintas (la mayor es la más nueva).
create function pg_temp.sembrar(p_u uuid, p_desde int, p_hasta int) returns void language plpgsql as $$
declare v_pares text[][] := array[
  ['vehiculos', 'vehiculo'], ['leads', 'lead'], ['cotizaciones', 'cotizacion'], ['agenda', 'evento'],
  ['agenda', 'tarea'], ['logistica', 'vehiculo'], ['repuestos', 'proyecto_repuestos'], ['notificaciones', 'notificacion']];
begin
  insert into public.vistos (usuario_id, modulo, tipo, referencia_id, visto_en)
  select p_u, v_pares[1 + g % 8][1], v_pares[1 + g % 8][2], md5(p_u::text || g::text)::uuid,
         timestamptz '2026-01-01 00:00:00+00' + g * interval '1 minute'
    from generate_series(p_desde, p_hasta) g;
end $$;

-- Una llamada, 7 veces como `authenticated` con la sesión de la persona: mediana de ms y promedio de bloques de `vistos` (heap e índices) de las 5 calientes.
create function pg_temp.medir(p_etapa int, p_caso text, p_sql text) returns void language plpgsql as $$
declare
  v_oids constant oid[] := array['public.vistos'::regclass::oid, 'public.vistos_pkey'::regclass::oid,
    'public.vistos_ultimo_idx'::regclass::oid, 'public.vistos_usuario_visto_idx'::regclass::oid];
  v_plan json; v_ms numeric[] := '{}'; v_bl numeric[] := '{}'; v_b0 bigint; v_b1 bigint; i int;
begin
  set local role authenticated;
  for i in 1 .. 7 loop
    select sum(pg_stat_get_xact_blocks_fetched(o)) into v_b0 from unnest(v_oids) o;
    execute 'explain (analyze, format json) ' || p_sql into v_plan;
    select sum(pg_stat_get_xact_blocks_fetched(o)) into v_b1 from unnest(v_oids) o;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_bl := v_bl || (v_b1 - v_b0);
  end loop;
  reset role;
  insert into _res values (p_etapa, p_caso,
    (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
    (select avg(b) from unnest(v_bl) b));
end $$;

-- Las llamadas de una etapa (con N vistos por persona).
create function pg_temp.etapa(p_n int) returns void language plpgsql as $$
declare
  v_yo constant uuid := '00000000-0000-0000-0000-0000000000e1';
  v_ids uuid[]; v_evento uuid; v_tarea uuid;
begin
  perform set_config('request.jwt.claim.sub', v_yo::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_yo, 'role', 'authenticated')::text, true);
  -- 100 ids de una página: 50 que sí vio y 50 que no.
  select array_agg(referencia_id) into v_ids from (
    select referencia_id from public.vistos where usuario_id = v_yo and modulo = 'logistica' and tipo = 'vehiculo'
    order by referencia_id limit 50) x;
  v_ids := v_ids || array(select md5('no-visto' || g::text)::uuid from generate_series(1, 50) g);
  select referencia_id into v_evento from public.vistos where usuario_id = v_yo and modulo = 'agenda' and tipo = 'evento' order by visto_en desc limit 1;
  select referencia_id into v_tarea from public.vistos where usuario_id = v_yo and modulo = 'agenda' and tipo = 'tarea' order by visto_en desc limit 1;

  perform pg_temp.medir(p_n, 'vistos_de, 100 ids', format('select public.vistos_de(%L, %L, %L::uuid[])', 'logistica', 'vehiculo', v_ids));
  perform pg_temp.medir(p_n, 'el último de la agenda por la PK (evento y tarea)', format(
    'select tipo, referencia_id, visto_en from public.vistos where modulo = %L and tipo = any (%L::text[]) and referencia_id = any (%L::uuid[]) limit 2',
    'agenda', '{evento,tarea}', array[v_evento, v_tarea]));
  -- Sólo con el techo a un paso: uno nuevo cuenta los 19.999 y entra; los siguientes (el techo) cuentan 20.000 y no escriben.
  if p_n >= 19999 then
    perform pg_temp.medir(p_n, 'visto_registrar de uno nuevo', 'select public.visto_registrar(''leads'', ''lead'', md5(clock_timestamp()::text)::uuid)');
  end if;
  -- Los planes, sólo con volumen: la PK y `vistos_ultimo_idx`, sin recorrer la tabla.
  if p_n >= 19999 then
    perform set_config('medir.ids', v_ids::text, true);
    perform set_config('medir.par', array[v_evento, v_tarea]::text, true);
  end if;
end $$;

create function pg_temp.plan(p_sql text) returns text language plpgsql as $$
declare v_linea text; v_texto text := '';
begin
  set local role authenticated;
  for v_linea in execute 'explain ' || p_sql loop v_texto := v_texto || v_linea || E'\n'; end loop;
  reset role;
  return v_texto;
end $$;

-- Etapa 1: 2.000 por persona.
select pg_temp.sembrar(u, 1, 2000) from unnest(array['00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2']::uuid[]) u;
analyze public.vistos;
select pg_temp.etapa(2000);

-- Etapa 2: 19.999 por persona (a un paso del techo).
select pg_temp.sembrar(u, 2001, 19999) from unnest(array['00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2']::uuid[]) u;
analyze public.vistos;
select pg_temp.etapa(19999);

do $$
declare
  v_yo constant uuid := '00000000-0000-0000-0000-0000000000e1';
  v_q2 text; v_q3 text; v_p2 text; v_p3 text;
  r record; v_fallas text := '';
  a_ms numeric; a_bl numeric; b_ms numeric; b_bl numeric; v_reg numeric;
begin
  perform set_config('request.jwt.claim.sub', v_yo::text, true);
  v_q2 := format('select v.referencia_id from public.vistos v where v.usuario_id = (select auth.uid()) and v.modulo = %L and v.tipo = %L order by v.visto_en desc limit 1', 'logistica', 'vehiculo');
  v_q3 := format('select tipo, referencia_id, visto_en from public.vistos where modulo = %L and tipo = any (%L::text[]) and referencia_id = any (%L::uuid[]) limit 2',
    'agenda', '{evento,tarea}', current_setting('medir.par'));
  v_p2 := pg_temp.plan(v_q2); v_p3 := pg_temp.plan(v_q3);

  -- El plan de la parte de ids de `vistos_de` no se ve desde afuera (es el cuerpo de una función): lo prueba el assert de bloques de abajo. Con la lista de ids recortada dentro
  -- de la consulta, la RLS la dejaba como filtro y se recorría todo el par (módulo, tipo): 30 bloques con 2.000 vistos y 268 con 20.000.
  if v_p2 !~ 'vistos_ultimo_idx' or v_p2 ~ 'Seq Scan' then v_fallas := v_fallas || E'\n- el último del módulo no va por vistos_ultimo_idx sin Seq Scan:\n' || v_p2; end if;
  if v_p3 !~ 'vistos_pkey' or v_p3 ~ 'Seq Scan' then v_fallas := v_fallas || E'\n- el último de la agenda no va por la PK sin Seq Scan:\n' || v_p3; end if;

  -- Los bloques de una lectura no crecen con lo visto: con 10 veces más filas sube un nivel del árbol por sonda (≈ 3 veces, con la página de 100 ids), nunca con las filas del par (≈ 9 veces).
  for r in select caso from _res group by caso having count(*) = 2 loop
    select ms, bloques into a_ms, a_bl from _res where caso = r.caso and etapa = 2000;
    select ms, bloques into b_ms, b_bl from _res where caso = r.caso and etapa = 19999;
    raise notice 'medicion|Vistos, % · 2.000 vistos (ms)|%', r.caso, round(a_ms, 2);
    raise notice 'medicion|Vistos, % · 20.000 vistos (ms)|%', r.caso, round(b_ms, 2);
    raise notice 'medicion|Vistos, % · 2.000 vistos (bloques de vistos)|%', r.caso, round(a_bl, 1);
    raise notice 'medicion|Vistos, % · 20.000 vistos (bloques de vistos)|%', r.caso, round(b_bl, 1);
    if b_bl > a_bl * 4 + 20 then v_fallas := v_fallas || format(E'\n- «%s» crece con lo visto: %s bloques con 2.000 y %s con 20.000', r.caso, a_bl, b_bl); end if;
    if b_ms > 50 then v_fallas := v_fallas || format(E'\n- «%s» tarda %s ms con 20.000 (tope 50)', r.caso, round(b_ms, 1)); end if;
  end loop;

  select ms into v_reg from _res where caso = 'visto_registrar de uno nuevo';
  raise notice 'medicion|Vistos, visto_registrar de uno nuevo · 19.999 vistos (ms)|%', round(v_reg, 2);
  raise notice 'medicion|Vistos, visto_registrar de uno nuevo · 19.999 vistos (bloques de vistos)|%', round((select bloques from _res where caso = 'visto_registrar de uno nuevo'), 1);
  raise notice 'nota|visto_registrar cuenta hasta el techo (20.000) por vistos_usuario_visto_idx: su costo sube con lo visto hasta ahí y no más; es una escritura por apertura, con antirrebote de 30 s|';
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir lo visto: %|', current_setting('medir.carga');
  if v_reg > 100 then v_fallas := v_fallas || format(E'\n- visto_registrar tarda %s ms con 19.999 (tope 100)', round(v_reg, 1)); end if;
  if v_fallas <> '' then raise exception 'lo visto rompe su presupuesto:%', v_fallas; end if;
end $$;

rollback;
