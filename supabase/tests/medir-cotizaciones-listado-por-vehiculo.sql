-- Medición de la lista de cotizaciones agrupada por vehículo (`cotizaciones_listado_por_vehiculo()`) con 50.000 y con 250.000 cotizaciones: `pnpm db:medir:volumen`
-- (`MEDIR_SOLO=medir-cotizaciones-listado-por-vehiculo`), contra el Supabase LOCAL con la siembra de volumen (la dueña, Ana y su cartera de `sembrar.sql`). Todo en una
-- transacción que se revierte: ninguna cotización queda. La forma es la de `medir-cotizaciones-listado.sql` (el terreno y lo leído por relación).
--
-- El terreno: el 70 % de las cotizaciones con vehículo, de 1 a 8 por vehículo y juntas en el tiempo (bloques de 16 altas seguidas: 8, 4, 2, 1 y 1), de varias personas
-- (Ana tiene cotizaciones en vehículos con otras más nuevas que no ve), las sueltas intercaladas; un vehículo con 5.005 repartidas (5 de Ana) de un lead fuera de toda
-- cartera; 1.000 de Berta sobre leads de la cartera de Ana; la «chica» con 3 propias; Teo con «todos» en subasta_usa y «propios» en los otros dos; la aprobada de un
-- vehículo de cada cinco (su cotización más vieja). Sin triggers.
--
-- Qué se mide: la RPC (invocadora: la RLS decide) como `authenticated`, con el plan genérico, con el máximo de la página (`MAXIMO_DE_PAGINA_DE_COTIZACIONES` grupos): la página 1, una profunda por
-- cursor (la página 20 de la dueña, la 10 de los demás) y, donde se marca, una hacia atrás:
--   - la dueña: todas (también hacia atrás), un origen, finales, mías y un lead (el del vehículo de 5.005: un solo grupo);
--   - Ana: todas (también hacia atrás), un origen, mías y el lead del vehículo de 5.005 (ve 5: el conteo de su grupo recorre las 5.005 con la RLS);
--   - la «chica» y Teo: todas.
-- Por caso, 7 corridas de `EXPLAIN (ANALYZE, BUFFERS)` y la mediana de las 5 últimas; lo leído de `cotizaciones` y `cotizaciones_aprobadas` por relación
-- (`pg_stat_get_xact_blocks_fetched`), los recorridos enteros del heap y las llamadas de la última corrida.
--
-- Asserta con los dos volúmenes: cada caso lee los índices de su ruta del listado (por nombre), `cotizaciones_vehiculo_creado_idx` (la sonda, con cursor, y el
-- conteo, con la página llena; la página 1 leída entera cuenta lo leído) y `cotizaciones_pkey` (la cabeza), y los de la dueña además `cotizaciones_aprobadas_pkey`; ningún otro índice de `cotizaciones`; ningún recorrido entero; que no crece con
-- N (con 250.000, los bloques de `cotizaciones` de la llamada a lo sumo 1,2 × los de 50.000 + 20); el tiempo: la
-- dueña y la «chica» ≤ 30 ms, Ana y Teo ≤ 100 ms (con el conteo acotado de sus grupos); que mide: cada página 1 trae su página llena (el máximo y una de más), salvo la «chica» (sus 3)
-- y el lead (1 grupo). Los buffers totales, como nota (el costo fijo de la RLS). Lo que hacía antes por PostgREST no aplica: la lista agrupada es nueva.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.pagina', (:max_cotizaciones)::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if transaction_timestamp() = statement_timestamp() then
    raise exception 'la medición tiene que correr dentro de su begin: vaciar las cotizaciones fuera de una transacción borraría la siembra';
  end if;
  raise notice 'nota|La medición vacía las % cotizaciones de la base en su transacción (se revierte)|', (select count(*) from public.cotizaciones);
  truncate public.cotizaciones cascade;
  if exists (select 1 from public.cotizaciones) or exists (select 1 from public.cotizaciones_aprobadas) then
    raise exception 'el truncate no dejó vacías cotizaciones y sus aprobadas';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir la lista agrupada por vehículo: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres: la «chica», Teo con su rol, los tres orígenes de la semilla y la cartera de Ana
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1'), ('berta', '00000000-0000-0000-0000-0000000000b1'),
  ('carlos', '00000000-0000-0000-0000-0000000000b2'), ('diana', '00000000-0000-0000-0000-0000000000b3'), ('elias', '00000000-0000-0000-0000-0000000000b4'),
  ('chica', '00000000-0000-0000-0000-0000000000c9'), ('teo', '00000000-0000-0000-0000-0000000000e1');
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000c9', 'medir-agrupada-chica@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000e1', 'medir-agrupada-teo@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Chica agrupada', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-0000000000c9';
update public.perfiles set nombre = 'Teo agrupada', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-0000000000e1';
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-0000000000c9', id, true from public.roles where clave = 'asesor' on conflict do nothing;
create temp table _o (i int primary key, clave text not null, origen uuid not null, formula uuid not null);
insert into _o select row_number() over (order by o.clave), o.clave, o.id, f.id from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada'
  where o.clave in ('subasta_usa', 'planilla_usa', 'oficina');
with r as (insert into public.roles (clave, nombre) values ('medir_teo_agrupada', 'Medir Teo agrupada') returning id)
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select r.id, 'cotizaciones.ver', o.origen, (case when o.clave = 'subasta_usa' then 'todos' else 'propios' end)::public.alcance_permiso from r cross join _o o;
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-0000000000e1', id, true from public.roles where clave = 'medir_teo_agrupada';
create temp table _snap as select (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
                                  (select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')) as fuentes
  from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = 'subasta_usa' and f.estado = 'publicada';
create temp table _leads_de_ana (i int primary key, lead uuid not null);
insert into _leads_de_ana select row_number() over (order by la.lead_id), la.lead_id from public.leads_asesores la
 where la.usuario_id = '00000000-0000-0000-0000-0000000000a1' and la.revocado_en is null order by la.lead_id limit 1000;
-- El vehículo muy cotizado y su lead (sin filas en `vehiculos` ni en `leads`: la RPC no los lee y la FK no se mira al sembrar).
create temp table _fijos (clave text primary key, id uuid not null);
insert into _fijos values ('caliente', gen_random_uuid()), ('lead_ajeno', gen_random_uuid());
do $$ begin
  if (select count(*) from _o) <> 3 then raise exception 'esperaba los tres orígenes de la semilla con su fórmula publicada y hay %', (select count(*) from _o); end if;
  if (select count(*) from _leads_de_ana) < 1000 then raise exception 'Ana debía tener al menos 1.000 leads en su cartera y tiene %', (select count(*) from _leads_de_ana); end if;
end $$;
grant select on _p, _o, _leads_de_ana, _fijos to authenticated;

-- El vehículo de la fila g: en cada bloque de 16 altas seguidas, 8, 4, 2, 1 y 1 (juntas en el tiempo); g % 10 ∈ {6, 8} es suelta; una final va en su propio vehículo
-- (a lo sumo una final activa por vehículo); en las primeras 50.000, g % 10 = 9 y
-- cinco de Ana son del muy cotizado. El origen sale del vehículo (las sueltas, de g).
create function pg_temp.vehiculo_de(g int) returns uuid language sql immutable as $$
  select case when g % 10 in (6, 8) then null
              else md5('agrupada-' || (g / 16) || '-' || case when g % 16 < 8 then 0 when g % 16 < 12 then 1 when g % 16 < 14 then 2 when g % 16 < 15 then 3 else 4 end)::uuid end;
$$;

create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base, creado_en, actualizado_en)
  select o.origen,
         case when g in (11, 10011, 20011, 30011, 40011) or (g <= 50000 and g % 10 = 1) then (select id from _p where clave = 'ana')
              when g in (10003, 20003, 30003) then (select id from _p where clave = 'chica')
              when g <= 50000 and g % 1000 = 4 then (select id from _p where clave = 'teo')
              when g <= 50000 and g % 50 = 2 then (select id from _p where clave = 'berta')
              else (select id from _p where clave = (array['duena', 'berta', 'carlos', 'diana', 'elias'])[1 + g % 5]) end,
         o.formula,
         case when g <= 50000 and g % 50 = 2 then (select lead from _leads_de_ana where i = 1 + (g / 50) % 1000)
              when g in (11, 10011, 20011, 30011, 40011) or (g <= 50000 and g % 10 = 9) then (select id from _fijos where clave = 'lead_ajeno') end,
         v.id,
         (case when g % 50 = 7 or (g <= 50000 and g % 500 = 1) then 'final' else 'preventa' end)::public.clase_cotizacion,
         s.valores, s.fuentes, '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5,
         timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2026-01-01 00:00:00+00'
    from generate_series(p_desde, p_hasta) g
   cross join lateral (select case when g in (11, 10011, 20011, 30011, 40011) or (g <= 50000 and g % 10 = 9) then (select id from _fijos where clave = 'caliente')
                                   when g % 50 = 7 or (g <= 50000 and g % 500 = 1) then md5('agrupada-final-' || g)::uuid
                                   else pg_temp.vehiculo_de(g) end as id) v
    join _o o on o.i = 1 + case when v.id is null then g % 3 else (g / 16) % 3 end
   cross join _snap s;
  -- La aprobada de un vehículo de cada cinco (su más vieja de las nuevas): la cabeza de su grupo, si coincide.
  insert into public.cotizaciones_aprobadas (vehiculo_id, cotizacion_id, origen_id, creado_por, lead_id, monto, moneda)
  select distinct on (c.vehiculo_id) c.vehiculo_id, c.id, c.origen_id, c.creado_por, c.lead_id, 1234.5, 'USD'
    from public.cotizaciones c
   where c.vehiculo_id is not null and get_byte(decode(md5(c.vehiculo_id::text), 'hex'), 0) % 5 = 0
     and c.creado_en >= timestamptz '2026-01-01 00:00:00+00' + p_desde * interval '10 seconds'
   order by c.vehiculo_id, c.creado_en, c.id
  on conflict (vehiculo_id) do nothing;
  set local session_replication_role = origin;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Los casos y la medición
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Un caso: quién, sus filtros, hasta qué página llega su profunda, si mide hacia atrás, su tope, los índices de la ruta de su lote y cuántas entradas trae su página 1
-- (0 = la página llena: el máximo y una de más).
create temp table _casos (caso text primary key, quien text not null, origen text, clase public.clase_cotizacion, mias boolean not null default false, lead boolean not null default false,
                          paginas int not null, atras boolean not null default false, tope_ms numeric not null, indices text[] not null, entradas int);
insert into _casos values
  ('dueña · todas', 'duena', null, null, false, false, 20, true, 30, '{cotizaciones_listado_idx}', 0),
  ('dueña · un origen', 'duena', 'planilla_usa', null, false, false, 10, false, 30, '{cotizaciones_origen_creado_idx}', 0),
  ('dueña · finales', 'duena', null, 'final', false, false, 5, false, 30, '{cotizaciones_finales_idx}', 0),
  ('dueña · mías', 'duena', null, null, true, false, 10, false, 30, '{cotizaciones_creador_idx}', 0),
  ('dueña · un lead', 'duena', null, null, false, true, 1, false, 30, '{cotizaciones_lead_creado_idx}', 1),
  ('Ana · todas', 'ana', null, null, false, false, 10, true, 100, '{cotizaciones_creador_idx,cotizaciones_lead_creado_idx}', 0),
  ('Ana · un origen', 'ana', 'planilla_usa', null, false, false, 5, false, 100, '{cotizaciones_creador_idx,cotizaciones_lead_creado_idx}', 0),
  ('Ana · mías', 'ana', null, null, true, false, 10, false, 100, '{cotizaciones_creador_idx}', 0),
  -- El peor conteo: el lead del vehículo de 5.005, del que Ana ve 5 (un grupo; su conteo pasa la RLS por las 5.005).
  ('Ana · un lead ajeno', 'ana', null, null, false, true, 1, false, 100, '{cotizaciones_lead_creado_idx}', 1),
  ('chica · todas', 'chica', null, null, false, false, 1, false, 30, '{cotizaciones_creador_idx}', null),
  ('Teo · todas', 'teo', null, null, false, false, 10, false, 100, '{cotizaciones_origen_creado_idx,cotizaciones_creador_idx}', 0);
grant select on _casos to authenticated;
create temp table _rel as
select c.oid, case when c.oid = 'public.cotizaciones'::regclass then 'heap' else c.relname::text end as nombre from pg_class c
 where c.oid = 'public.cotizaciones'::regclass
    or c.oid in (select indexrelid from pg_index where indrelid in ('public.cotizaciones'::regclass, 'public.cotizaciones_aprobadas'::regclass));
grant select on _rel to authenticated;
create temp table _med (fase text, caso text, pagina text, ms numeric, buffers bigint, bloques jsonb, seq bigint, llamadas jsonb, filas int);
grant all on _med to authenticated;

create function pg_temp.sql_de(p_caso text, p_en timestamptz, p_id uuid, p_atras boolean) returns text language plpgsql as $$
declare c record;
begin
  select * into c from _casos x where x.caso = p_caso;
  return format('select * from public.cotizaciones_listado_por_vehiculo(%s, %L::uuid, %L::public.clase_cotizacion, %L, %L::uuid, %L::timestamptz, %L::uuid, %L)',
                current_setting('medir.pagina'), (select o.origen from _o o where o.clave = c.origen), c.clase, c.mias,
                case when c.lead then (select id from _fijos where clave = 'lead_ajeno') end, p_en, p_id, p_atras);
end $$;

create function pg_temp.como(p_quien text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p where clave = p_quien)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p where clave = p_quien), 'role', 'authenticated')::text, true);
$$;

-- El cursor de la última entrada de la página `p_paginas` del caso, caminando la lista agrupada (o de la última, si hay menos).
create function pg_temp.cursor_de(p_caso text, p_paginas int, out en timestamptz, out id uuid) language plpgsql as $$
declare i int; v_n int := current_setting('medir.pagina')::int; r record; v_cuantas int;
begin
  for i in 1 .. p_paginas loop
    v_cuantas := 0;
    for r in execute pg_temp.sql_de(p_caso, en, id, false) loop
      exit when r.tipo = 'cortada';
      v_cuantas := v_cuantas + 1;
      exit when v_cuantas > v_n;
      en := r.orden_en; id := r.orden_id;
    end loop;
    exit when v_cuantas <= v_n;
  end loop;
end $$;

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
                            'bloques', (select coalesce(jsonb_object_agg(key, round(value::numeric / 5, 1)), '{}') from jsonb_each_text(v_suma) where value::numeric > 0),
                            'seq', v_seq, 'llamadas', v_llam);
end $$;

create function pg_temp.anotar(p_fase text, p_caso text, p_pagina text, p_sql text) returns void language plpgsql as $$
declare m jsonb; v_filas int;
begin
  execute format('select count(*) from (%s) x where x.tipo <> ''cortada''', p_sql) into v_filas;
  m := pg_temp.medir(p_sql);
  insert into _med values (p_fase, p_caso, p_pagina, (m ->> 'ms')::numeric, (m ->> 'buffers')::bigint, m -> 'bloques', (m ->> 'seq')::bigint, m -> 'llamadas', v_filas);
end $$;

create function pg_temp.fase(p_fase text) returns void language plpgsql as $$
declare c record; v_cur record;
begin
  for c in select * from _casos order by caso loop
    perform pg_temp.como(c.quien);
    perform pg_temp.anotar(p_fase, c.caso, 'página 1', pg_temp.sql_de(c.caso, null, null, false));
    if c.paginas > 1 then
      select * into v_cur from pg_temp.cursor_de(c.caso, c.paginas);
      perform pg_temp.anotar(p_fase, c.caso, 'profunda', pg_temp.sql_de(c.caso, v_cur.en, v_cur.id, false));
      if c.atras then
        perform pg_temp.anotar(p_fase, c.caso, 'hacia atrás', pg_temp.sql_de(c.caso, v_cur.en, v_cur.id, true));
      end if;
    end if;
  end loop;
end $$;

-- Los bloques de `cotizaciones` (el heap y sus índices) de una medición.
create function pg_temp.de_cotizaciones(b jsonb) returns numeric language sql as $$
  select coalesce(sum(value::numeric), 0) from jsonb_each_text(b) where key = 'heap' or key like 'cotizaciones\_%' and key not like 'cotizaciones\_aprobadas%';
$$;

create function pg_temp.fallas(p_fase text) returns text language plpgsql as $$
declare r record; c record; v_fallas text := ''; k text; v_ix text; v_llena int; v_esperadas int;
begin
  for r in select m.*, x.quien, x.tope_ms, x.indices, x.entradas from _med m join _casos x on x.caso = m.caso where m.fase = p_fase order by m.caso, m.pagina loop
    if r.ms > r.tope_ms then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s ms, el presupuesto es %s', r.fase, r.caso, r.pagina, round(r.ms, 1), r.tope_ms); end if;
    if r.seq > 0 then v_fallas := v_fallas || format(E'\n  %s · %s · %s recorre cotizaciones entera', r.fase, r.caso, r.pagina); end if;
    -- Comprobar que mide: la página 1 llena (con la de más), salvo los casos que dicen otra cosa.
    v_llena := current_setting('medir.pagina')::int + 1;
    v_esperadas := case when r.entradas = 0 then v_llena else r.entradas end;
    if r.pagina = 'página 1' and v_esperadas is not null and r.filas <> v_esperadas then
      v_fallas := v_fallas || format(E'\n  %s · %s · página 1: %s entradas, esperaba %s', r.fase, r.caso, r.filas, v_esperadas);
    end if;
    if r.quien = 'chica' and r.filas < 1 then v_fallas := v_fallas || format(E'\n  %s · chica: no ve nada (la medición no mide)', r.fase); end if;
    foreach v_ix in array r.indices || array['cotizaciones_pkey'] loop
      if not r.bloques ? v_ix then v_fallas := v_fallas || format(E'\n  %s · %s · %s no lee %s: %s', r.fase, r.caso, r.pagina, v_ix, r.bloques); end if;
    end loop;
    -- La sonda (con cursor) y el conteo por su índice (con la página llena): la página 1 leída entera cuenta lo leído y no lo necesita.
    if (r.pagina <> 'página 1' or r.filas = v_llena) and r.filas > 1 and not r.bloques ? 'cotizaciones_vehiculo_creado_idx' then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s no lee cotizaciones_vehiculo_creado_idx (la sonda y el conteo): %s', r.fase, r.caso, r.pagina, r.bloques);
    end if;
    if r.quien = 'duena' and r.filas > 1 and not r.bloques ? 'cotizaciones_aprobadas_pkey' then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s no lee cotizaciones_aprobadas_pkey: %s', r.fase, r.caso, r.pagina, r.bloques);
    end if;
    for k in select jsonb_object_keys(r.bloques) loop
      if k like 'cotizaciones\_%' and k not like 'cotizaciones\_aprobadas%'
         and not (k = any (r.indices || array['cotizaciones_pkey', 'cotizaciones_vehiculo_creado_idx'])) then
        v_fallas := v_fallas || format(E'\n  %s · %s · %s lee otro índice: %s', r.fase, r.caso, r.pagina, k);
      end if;
    end loop;
  end loop;
  return v_fallas;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 cotizaciones; fase 2: 250.000 (las 200.000 de más, de la dueña y de cuatro asesores, más nuevas)
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 50000);
analyze public.cotizaciones;
analyze public.cotizaciones_aprobadas;
do $$ begin
  if (select count(*) from public.cotizaciones where vehiculo_id = (select id from _fijos where clave = 'caliente')) <> 5005 then
    raise exception 'el vehículo muy cotizado debía tener 5.005 cotizaciones';
  end if;
  raise notice 'nota|Con 50.000: % con vehículo, % vehículos, % aprobadas|', (select count(vehiculo_id) from public.cotizaciones),
    (select count(distinct vehiculo_id) from public.cotizaciones), (select count(*) from public.cotizaciones_aprobadas);
end $$;
set local track_functions = 'all';
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.fase('50.000');
reset role;

select pg_temp.rellenar(50001, 250000);
analyze public.cotizaciones;
analyze public.cotizaciones_aprobadas;
do $$ begin
  if (select count(*) from public.cotizaciones) <> 250000 then raise exception 'esperaba 250.000 cotizaciones y hay %', (select count(*) from public.cotizaciones); end if;
end $$;
set local role authenticated;
select pg_temp.fase('250.000');
reset role;

do $$
declare r record; g record; v_fallas text := pg_temp.fallas('50.000') || pg_temp.fallas('250.000'); v_c50 numeric; v_c250 numeric;
begin
  for r in select * from _med order by fase, caso, pagina loop
    raise notice 'medicion|Lista agrupada, % · % · % (ms)|%', r.fase, r.caso, r.pagina, round(r.ms, 2);
    raise notice 'medicion|Lista agrupada, % · % · % (bloques de cotizaciones)|%', r.fase, r.caso, r.pagina, pg_temp.de_cotizaciones(r.bloques);
    raise notice 'medicion|Lista agrupada, % · % · % (buffers, sin assert)|%', r.fase, r.caso, r.pagina, r.buffers;
    raise notice 'medicion|Lista agrupada, % · % · % (entradas)|%', r.fase, r.caso, r.pagina, r.filas;
    raise notice 'medicion|Lista agrupada, % · % · % (lotes leídos)|%', r.fase, r.caso, r.pagina, coalesce(r.llamadas ->> '_cotizaciones_lote_del_listado', '0');
  end loop;
  for g in select a.caso, a.pagina, a.bloques as b_50, b.bloques as b_250 from _med a join _med b on b.caso = a.caso and b.pagina = a.pagina and a.fase = '50.000' and b.fase = '250.000' loop
    v_c50 := pg_temp.de_cotizaciones(g.b_50);
    v_c250 := pg_temp.de_cotizaciones(g.b_250);
    if v_c250 > 1.2 * v_c50 + 20 then v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s bloques y %s', g.caso, g.pagina, v_c50, v_c250); end if;
  end loop;
  if v_fallas <> '' then raise exception 'La lista agrupada por vehículo rompe su presupuesto:%', v_fallas; end if;
end $$;
rollback;
vacuum public.cotizaciones;
