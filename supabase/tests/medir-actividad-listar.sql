-- Medición de `actividad_listar()` con 300.000 filas de actividad: `pnpm db:medir:volumen` (o `MEDIR_SOLO=medir-actividad-listar`), contra el Supabase
-- LOCAL con la siembra de volumen (la dueña, Ana, sus vehículos y sus leads). Todo en una transacción que se revierte: ninguna fila queda.
--
-- Qué se mide: cada ruta de la página (sin filtro, persona, tipo de registro, un registro caliente con 1.000 cambios, acción e «Ir a una fecha»), de a
-- `TAMANO_DE_VER_MAS`, como la dueña con el plan genérico. Dos cosas: (1) el plan de la consulta de cada ruta (la de la función, escrita igual) camina su
-- índice, sin `Seq Scan` de `actividad` ni `Sort`; (2) la llamada entera (mediana de 5 de 7) contra una copia de la función de antes de la frase
-- (sin `registro_titulo`, `registro_destino` ni `primer_cambio`): lo nuevo se lee por PK de las filas ya elegidas, así que cuesta lo mismo en toda ruta y no
-- crece con N. Asserta: cada ruta por su índice; la llamada ≤ 60 ms y a lo sumo `greatest(2 × antes, antes + 15 ms)`.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.ver_mas', (:ver_mas)::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if (select count(*) from (select 1 from public.vehiculos limit 1000) v) < 1000 or (select count(*) from (select 1 from public.leads limit 1000) l) < 1000 then
    raise exception 'la siembra de volumen no trajo 1.000 vehículos y 1.000 leads';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir actividad_listar: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno: 300.000 filas a lo largo de 14 días, repartidas como en una empresa: casi todo de la dueña y cambios de nombre de 1.000 leads; Ana
-- hace una de cada 100 y los vehículos una de cada 200 (cambios de precio de 500 vehículos, con un vehículo caliente de 1.000). Lo raro es lo
-- que cada ruta filtra: así su índice gana a recorrer la PK.
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _v as select row_number() over (order by id) as i, id from (select id from public.vehiculos order by id limit 1000) x;
create temp table _l as select row_number() over (order by id) as i, id from (select id from public.leads order by id limit 1000) x;
alter table _v add primary key (i);
alter table _l add primary key (i);
insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues, creado_en)
select case when g % 200 = 0 then 'vehiculos.update' else 'leads.update' end,
       case when g % 100 = 1 then '00000000-0000-0000-0000-0000000000a1'::uuid else '00000000-0000-0000-0000-0000000000d1'::uuid end,
       case when g % 200 = 0 then 'vehiculos' else 'leads' end,
       case when g % 200 = 0 then (select id::text from _v where i = case when g <= 200000 then 1 else 1 + (g / 200) % 1000 end)
            else (select id::text from _l where i = 1 + g % 1000) end,
       case when g % 200 = 0 then jsonb_build_object('precio', g) else jsonb_build_object('nombre', 'Medir ' || g) end,
       case when g % 200 = 0 then jsonb_build_object('precio', g + 1) else jsonb_build_object('nombre', 'Medir ' || g || ' bis') end,
       now() - interval '14 days' + g * interval '4 seconds'
  from generate_series(1, 300000) g;
analyze public.actividad;

-- La función de antes de la frase, como estaba (la cabecera, `visible` y los campos), para comparar la llamada entera.
create function pg_temp.listar_antes(p_antes_id bigint default null, p_tamano integer default null, p_actor uuid default null, p_tabla text default null,
                                     p_registro text default null, p_hasta timestamptz default null, p_accion text default null) returns jsonb
language plpgsql stable as $$
declare
  v_n int := public._acotar_pagina(p_tamano, 20, 100); v_antes bigint := p_antes_id; v_t timestamptz; v_filas public.actividad[]; v_salida jsonb;
begin
  if v_antes is null and p_hasta is not null then
    select a.creado_en into v_t from public.actividad a where a.creado_en < p_hasta order by a.creado_en desc limit 1;
    select a.id + 1 into v_antes from public.actividad a where a.creado_en = v_t order by a.id desc limit 1;
  end if;
  v_antes := coalesce(v_antes, 9223372036854775807);
  if p_registro is not null then
    v_filas := array(select a from public.actividad a where a.tabla = p_tabla and a.registro_id = p_registro and a.id < v_antes order by a.id desc limit v_n + 1);
  elsif p_actor is not null then
    v_filas := array(select a from public.actividad a where a.actor_id = p_actor and a.id < v_antes order by a.id desc limit v_n + 1);
  elsif p_accion is not null then
    v_filas := array(select a from public.actividad a where a.accion = p_accion and a.id < v_antes order by a.id desc limit v_n + 1);
  elsif p_tabla is not null then
    v_filas := array(select a from public.actividad a where a.tabla = p_tabla and a.id < v_antes order by a.id desc limit v_n + 1);
  else
    v_filas := array(select a from public.actividad a where a.id < v_antes order by a.id desc limit v_n + 1);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'visible', r.visible, 'campos', to_jsonb(coalesce(c.claves[1:5], '{}'::text[]))) order by f.id desc), '[]')
    into v_salida
    from unnest(v_filas[1:v_n]) f
    left join public.perfiles p on p.id = f.actor_id
   cross join lateral (select public._actividad_recortar(f.tabla, f.registro_id, f.antes, f.despues) as v) x
   cross join lateral (select coalesce((x.v ->> 'visible')::boolean, false) as visible) r
   cross join lateral (select case when r.visible and f.accion like '%.update' then array(select k from jsonb_object_keys(x.v -> 'cambios') k order by k limit 6)
                                   else '{}'::text[] end as claves) c;
  return jsonb_build_object('hay_mas', coalesce(cardinality(v_filas), 0) > v_n, 'filas', v_salida);
end $$;

-- La mediana de 5 de 7 llamadas (las dos primeras calientan), en ms.
create function pg_temp.cronometrar(p_sql text) returns numeric language plpgsql as $$
declare v_ms numeric[] := '{}'; v_t timestamptz; i int;
begin
  for i in 1 .. 7 loop
    v_t := clock_timestamp();
    execute p_sql;
    continue when i <= 2;
    v_ms := v_ms || extract(epoch from clock_timestamp() - v_t) * 1000;
  end loop;
  return (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m);
end $$;

-- El plan de la consulta de una ruta: sus índices, si recorre `actividad` entera y si ordena.
create function pg_temp.plan(p_sql text) returns jsonb language plpgsql as $$
declare v_plan jsonb; v_texto text;
begin
  execute 'explain (analyze, format json) ' || p_sql into v_plan;
  v_texto := v_plan::text;
  return jsonb_build_object(
    'indices', coalesce((select jsonb_agg(distinct m[1]) from regexp_matches(v_texto, '"Index Name": "([^"]+)"', 'g') m), '[]'::jsonb),
    'seq', v_texto ~ '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "actividad"',
    'sort', v_texto ~ '"Node Type": "(Incremental )?Sort"');
end $$;

create temp table _med (ruta text, indice text, plan jsonb, ms numeric, ms_antes numeric);

do $$
declare
  v_n int := current_setting('medir.ver_mas')::int;
  v_cal text := (select id::text from _v where i = 1);
  v_ana uuid := '00000000-0000-0000-0000-0000000000a1';
  v_hasta timestamptz := now() - interval '3 days';
  v_antes bigint;
  r record;
  v_fallas text := '';
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
  perform set_config('plan_cache_mode', 'force_generic_plan', true);
  select a.id + 1 into v_antes from public.actividad a where a.creado_en < v_hasta order by a.creado_en desc, a.id desc limit 1;
  for r in select * from (values
      ('sin filtro', 'actividad_pkey', 'p_tamano => %1$s',
       format('select a.id from public.actividad a where a.id < 9223372036854775807 order by a.id desc limit %s', v_n + 1)),
      ('persona', 'actividad_actor_id_idx', format('p_tamano => %%1$s, p_actor => %L', v_ana),
       format('select a.id from public.actividad a where a.actor_id = %L and a.id < 9223372036854775807 order by a.id desc limit %s', v_ana, v_n + 1)),
      ('tipo de registro', 'actividad_tabla_id_idx', 'p_tamano => %1$s, p_tabla => ''vehiculos''',
       format('select a.id from public.actividad a where a.tabla = ''vehiculos'' and a.id < 9223372036854775807 order by a.id desc limit %s', v_n + 1)),
      ('un registro (1.000 cambios)', 'actividad_registro_id_idx', format('p_tamano => %%1$s, p_tabla => ''vehiculos'', p_registro => %L', v_cal),
       format('select a.id from public.actividad a where a.tabla = ''vehiculos'' and a.registro_id = %L and a.id < 9223372036854775807 order by a.id desc limit %s', v_cal, v_n + 1)),
      ('acción', 'actividad_accion_id_idx', 'p_tamano => %1$s, p_accion => ''vehiculos.update''',
       format('select a.id from public.actividad a where a.accion = ''vehiculos.update'' and a.id < 9223372036854775807 order by a.id desc limit %s', v_n + 1)),
      ('Ir a una fecha', 'actividad_pkey', format('p_tamano => %%1$s, p_hasta => %L', v_hasta),
       format('select a.id from public.actividad a where a.id < %s order by a.id desc limit %s', v_antes, v_n + 1))
    ) as x (ruta, indice, argumentos, consulta) loop
    insert into _med values (r.ruta, r.indice, pg_temp.plan(r.consulta),
      pg_temp.cronometrar(format('select public.actividad_listar(' || r.argumentos || ')', v_n)),
      pg_temp.cronometrar(format('select pg_temp.listar_antes(' || r.argumentos || ')', v_n)));
  end loop;
  for r in select * from _med loop
    raise notice 'medicion|actividad_listar, % (ms)|%', r.ruta, round(r.ms, 2);
    raise notice 'medicion|actividad_listar, % (ms, la de antes de la frase)|%', r.ruta, round(r.ms_antes, 2);
    if not r.plan -> 'indices' ? r.indice then v_fallas := v_fallas || format(E'\n  %s no camina %s: %s', r.ruta, r.indice, r.plan -> 'indices'); end if;
    if (r.plan ->> 'seq')::boolean then v_fallas := v_fallas || format(E'\n  %s recorre actividad entera', r.ruta); end if;
    if (r.plan ->> 'sort')::boolean then v_fallas := v_fallas || format(E'\n  %s ordena (Sort)', r.ruta); end if;
    if r.ms > 60 then v_fallas := v_fallas || format(E'\n  %s: %s ms, el presupuesto es 60', r.ruta, round(r.ms, 1)); end if;
    if r.ms > greatest(2 * r.ms_antes, r.ms_antes + 15) then
      v_fallas := v_fallas || format(E'\n  %s: %s ms contra %s de antes de la frase', r.ruta, round(r.ms, 1), round(r.ms_antes, 1)); end if;
  end loop;
  if v_fallas <> '' then raise exception 'actividad_listar rompe su presupuesto:%', v_fallas; end if;
end $$;

rollback;
