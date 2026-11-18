-- Como mucho una oportunidad abierta y viva por lead y embudo (`docs/DECISIONES.md` › «Una abierta por embudo»). Toda RPC que deja una
-- oportunidad abierta por un acto de la persona pasa por una sola guarda, `_oportunidad_abierta_unica`: `oportunidad_crear`,
-- `oportunidad_mover` al reabrir (de ganada, perdida o cancelada a una etapa abierta) y `oportunidad_restaurar` de una abierta.
-- `oportunidad_guardar` no cambia de embudo (rechaza la clave `embudo_id`), así que no la necesita. La oportunidad base del alta
-- (`_lead_oportunidad_base`) no falla nunca: si ya hay una abierta en ese embudo, no crea otra. Transferir un lead y guardar las etapas de un
-- embudo no pasan por la guarda (son de cartera y de configuración, en masa). No es un índice único: las duplicadas de antes quedan y la
-- migración no toca filas.
--
-- `lead_oportunidades` suma en su primera página `abiertas_por_embudo`: en qué embudos de quien mira el lead ya tiene una abierta, para que
-- la interfaz apague «Crear igual» y los embudos ocupados sin depender de que la abierta caiga entre las leídas.

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La guarda
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Toma un candado de transacción por (lead, embudo) y, en otra sentencia (otra foto en READ COMMITTED), busca otra abierta y viva del lead en
-- ese embudo de esa persona que no sea `p_excepto`. Si la hay: 22023 con el campo en `hint` (`embudo_id`) y el id de la abierta en `detail`,
-- para que la interfaz ofrezca «Abrir esa». Orden de candados de quien la llama: lead (`for update`) → embudo (`for share`) → la oportunidad
-- (al mover o restaurar) → este candado; como quien llega aquí ya tiene el lead, nadie espera en orden inverso. Hoy el `for update` del lead
-- ya serializa a dos pedidos del mismo lead; este candado es la defensa de la regla por sí misma (para una llamadora que no tomara el lead) y lo
-- fija `scripts/guardas/candado-de-oportunidad-abierta.test.ts`.
-- La sostiene oportunidades_lead_abiertas_idx: igualdad en (lead_id, usuario_id); embudo_id e id filtran sobre las pocas abiertas del lead.
create or replace function public._oportunidad_abierta_unica(p_lead uuid, p_embudo uuid, p_usuario uuid, p_excepto uuid default null)
    returns void
    language plpgsql security definer
    set search_path = ''
    as $$
declare v_otra uuid; v_nombre text;
begin
  perform pg_advisory_xact_lock(hashtextextended('oportunidad_abierta:' || p_lead::text || ':' || p_embudo::text, 0));
  select o.id into v_otra from public.oportunidades o
   where o.lead_id = p_lead and o.usuario_id = p_usuario and o.eliminado_en is null and o.estado = 'abierta'
     and o.embudo_id = p_embudo and o.id is distinct from p_excepto
   order by o.ultima_actividad_en desc, o.id desc
   limit 1;
  if v_otra is null then
    return;
  end if;
  select e.nombre into v_nombre from public.embudos e where e.id = p_embudo;
  raise exception 'Este lead ya tiene una oportunidad abierta en «%».', coalesce(v_nombre, 'este embudo')
    using errcode = '22023', hint = 'embudo_id', detail = v_otra::text;
end;
$$;

revoke all on function public._oportunidad_abierta_unica(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public._oportunidad_abierta_unica(uuid, uuid, uuid, uuid) to service_role;

comment on function public._oportunidad_abierta_unica(uuid, uuid, uuid, uuid) is
  'La guarda de «una abierta y viva por lead y embudo»: candado de transacción por (lead, embudo) y, si ya hay otra abierta y viva de esa persona (que no sea p_excepto), 22023 con hint embudo_id y el id de la abierta en detail. La llaman oportunidad_crear, oportunidad_mover (al reabrir) y oportunidad_restaurar (una abierta); no la llaman la base del alta, transferir ni guardar etapas. Por oportunidades_lead_abiertas_idx.';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Crear: la guarda después del embudo y la etapa, antes del insert (y después de la idempotencia: un reintento con el mismo id es «repetido»)
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public.oportunidad_crear(p_id uuid, p_lead uuid, p_datos jsonb) returns jsonb
    language plpgsql security definer
    set search_path = ''
    as $$
declare
  o public.oportunidades; v_yo uuid := (select auth.uid()); v_k text; v_embudo uuid; v_etapa uuid;
  v_titulo text; v_notas text; v_monto numeric; v_vehiculo uuid; v_abierta boolean;
begin
  perform public._lead_mio(p_lead, 'leads.editar', true);
  if p_id is null then
    raise exception 'Falta el identificador de la oportunidad.' using errcode = '22023';
  end if;
  select * into o from public.oportunidades x where x.id = p_id;
  if found then
    if o.usuario_id = v_yo and o.lead_id = p_lead then
      return jsonb_build_object('resultado', 'repetido', 'oportunidad', public._oportunidad_json(o));
    end if;
    raise exception 'No pudimos crear esta oportunidad. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los datos de una oportunidad tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_datos) loop
    if v_k not in ('titulo', 'notas', 'monto_estimado', 'vehiculo_id', 'embudo_id', 'etapa_id') then
      raise exception 'El dato «%» no es de una oportunidad.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  v_titulo := public._oportunidad_titulo(p_datos -> 'titulo');
  v_notas := public._oportunidad_notas(p_datos -> 'notas');
  v_monto := public._oportunidad_monto(p_datos -> 'monto_estimado');
  v_vehiculo := public._vehiculo_para_nota(public._uuid_de(p_datos -> 'vehiculo_id', 'vehiculo_id'));

  v_embudo := public._uuid_de(p_datos -> 'embudo_id', 'embudo_id');
  if v_embudo is null then
    v_embudo := public._embudo_defecto_de(v_yo);
  end if;
  perform 1 from public.embudos e where e.id = v_embudo and e.usuario_id = v_yo for share;
  if not found then
    raise exception 'No encontramos ese embudo. Recarga para ver los tuyos.' using errcode = '22023', hint = 'embudo_id';
  end if;
  v_etapa := public._uuid_de(p_datos -> 'etapa_id', 'etapa_id');
  if v_etapa is null then
    select s.id into v_etapa from public.embudos_etapas s where s.embudo_id = v_embudo and s.es_inicial;
  elsif not exists (select 1 from public.embudos_etapas s where s.id = v_etapa and s.embudo_id = v_embudo) then
    raise exception 'Esa etapa no es de este embudo.' using errcode = '22023', hint = 'etapa_id';
  end if;
  -- Nace abierta salvo en una etapa final (ganada o perdida): sólo entonces cuenta para «una abierta por embudo».
  v_abierta := not exists (select 1 from public.embudos_etapas s where s.id = v_etapa and (s.es_ganada or s.es_perdida));
  if v_abierta then
    perform public._oportunidad_abierta_unica(p_lead, v_embudo, v_yo, p_id);
  end if;

  insert into public.oportunidades (id, lead_id, vehiculo_id, usuario_id, embudo_id, etapa_id, titulo, notas,
    monto_estimado, moneda, creado_en, actualizado_en)
  values (p_id, p_lead, v_vehiculo, v_yo, v_embudo, v_etapa, v_titulo, v_notas, v_monto,
    (select a.moneda_base from public.ajustes_empresa a where a.id = 1), clock_timestamp(), clock_timestamp())
  returning * into o;
  perform public.registrar_actividad('oportunidad.creada', 'oportunidades', o.id::text, null, null,
    jsonb_build_object('lead', o.lead_id, 'embudo', o.embudo_id, 'etapa', o.etapa_id));
  perform public._oportunidad_constancia(o, 'abierta');
  return jsonb_build_object('resultado', 'creada', 'oportunidad', public._oportunidad_json(o));
end;
$$;

revoke all on function public.oportunidad_crear(uuid, uuid, jsonb) from public, anon;
grant execute on function public.oportunidad_crear(uuid, uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Mover: la guarda sólo al reabrir (de una cerrada a una etapa abierta); entre abiertas o hacia una final, no
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public.oportunidad_mover(p_id uuid, p_etapa_esperada uuid, p_etapa uuid, p_motivo_perdida text default null)
    returns jsonb
    language plpgsql security definer
    set search_path = ''
    as $$
declare o public.oportunidades; n public.oportunidades; s public.embudos_etapas; v_actual text; v_reabre boolean;
begin
  o := public._oportunidad_mia(p_id);
  if p_etapa is null then
    raise exception 'Elige una etapa.' using errcode = '22023', hint = 'etapa_id';
  end if;
  select * into s from public.embudos_etapas x where x.id = p_etapa and x.embudo_id = o.embudo_id;
  if not found then
    raise exception 'Esa etapa no es de este embudo.' using errcode = '22023', hint = 'etapa_id';
  end if;
  if o.etapa_id = p_etapa then
    return jsonb_build_object('resultado', 'sin_cambios', 'oportunidad', public._oportunidad_json(o));
  end if;
  if p_etapa_esperada is null then
    raise exception 'Falta la etapa que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if o.etapa_id <> p_etapa_esperada then
    select x.nombre into v_actual from public.embudos_etapas x where x.id = o.etapa_id;
    raise exception 'Esta oportunidad ya está en «%». Recarga para verla donde está.', v_actual using errcode = 'PT409';
  end if;
  v_reabre := o.estado <> 'abierta' and not (s.es_ganada or s.es_perdida);
  if v_reabre then
    perform public._oportunidad_abierta_unica(o.lead_id, o.embudo_id, o.usuario_id, o.id);
  end if;
  update public.oportunidades x set etapa_id = s.id,
    motivo_perdida = case when s.es_perdida then public._oportunidad_motivo(p_motivo_perdida) end,
    actualizado_en = greatest(clock_timestamp(), o.actualizado_en + interval '1 microsecond')
  where x.id = o.id
  returning * into n;
  perform public._oportunidad_constancia(n, o.estado);
  return jsonb_build_object('resultado', 'movida', 'oportunidad', public._oportunidad_json(n));
end;
$$;

revoke all on function public.oportunidad_mover(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.oportunidad_mover(uuid, uuid, uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Restaurar: la guarda sólo si vuelve abierta (una cerrada no cuenta)
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public.oportunidad_restaurar(p_id uuid, p_actualizado_en_esperado timestamp with time zone) returns jsonb
    language plpgsql security definer
    set search_path = ''
    as $$
declare o public.oportunidades; n public.oportunidades; v_abierta boolean;
begin
  o := public._oportunidad_mia(p_id, true);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if o.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._oportunidad_conflicto(o.actualizado_en);
  end if;
  v_abierta := o.estado = 'abierta';
  if v_abierta then
    perform public._oportunidad_abierta_unica(o.lead_id, o.embudo_id, o.usuario_id, o.id);
  end if;
  update public.oportunidades x set eliminado_en = null,
    actualizado_en = greatest(clock_timestamp(), o.actualizado_en + interval '1 microsecond')
  where x.id = o.id
  returning * into n;
  return jsonb_build_object('resultado', 'restaurada', 'oportunidad', public._oportunidad_json(n));
end;
$$;

revoke all on function public.oportunidad_restaurar(uuid, timestamp with time zone) from public, anon;
grant execute on function public.oportunidad_restaurar(uuid, timestamp with time zone) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La base del alta: nunca tumba el alta, la importación ni el turno de la web. Si ya hay una abierta y viva del lead en ese embudo (lo que
-- no pasa con un lead nuevo), no crea otra y sigue. Sin candado de aviso ni raise.
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public._lead_oportunidad_base(p_lead uuid, p_usuario uuid, p_nombre text) returns void
    language plpgsql security definer
    set search_path = ''
    as $$
declare o public.oportunidades; v_embudo uuid; v_etapa uuid; v_ahora timestamptz := clock_timestamp();
begin
  if p_usuario is null then
    return;
  end if;
  v_embudo := public._embudo_defecto_de(p_usuario);
  select s.id into v_etapa from public.embudos_etapas s where s.embudo_id = v_embudo and s.es_inicial;
  if v_embudo is null or v_etapa is null then
    return;
  end if;
  -- oportunidades_lead_abiertas_idx (lead_id, usuario_id), filtrando el embudo.
  perform 1 from public.oportunidades x
   where x.lead_id = p_lead and x.usuario_id = p_usuario and x.eliminado_en is null and x.estado = 'abierta' and x.embudo_id = v_embudo
   limit 1;
  if found then
    return;
  end if;
  -- El título es el nombre del lead (1 a 120 caracteres, como `_oportunidad_titulo`): se cambia en la oportunidad.
  insert into public.oportunidades (id, lead_id, usuario_id, embudo_id, etapa_id, titulo, moneda, creado_en, actualizado_en)
  values (gen_random_uuid(), p_lead, p_usuario, v_embudo, v_etapa, left(coalesce(nullif(btrim(p_nombre), ''), 'Oportunidad'), 120),
    -- La misma hora de alta y de versión: así se reconoce intacta (deshacer una importación no la cuenta como trabajo).
    (select a.moneda_base from public.ajustes_empresa a where a.id = 1), v_ahora, v_ahora)
  returning * into o;
  perform public.registrar_actividad('oportunidad.creada', 'oportunidades', o.id::text, null, null,
    jsonb_build_object('lead', o.lead_id, 'embudo', o.embudo_id, 'etapa', o.etapa_id, 'base', true));
  perform public._oportunidad_constancia(o, 'abierta');
end;
$$;

revoke all on function public._lead_oportunidad_base(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public._lead_oportunidad_base(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las oportunidades de un lead: en la primera página, también dónde ya tiene una abierta
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public.lead_oportunidades(p_lead uuid, p_antes_abierta boolean default null,
    p_antes_en timestamp with time zone default null, p_antes_id uuid default null, p_tamano integer default null) returns jsonb
    language plpgsql stable
    set search_path = ''
    as $$
declare
  v_n integer := public._acotar_pagina(p_tamano, 20, 100);
  v_yo uuid := (select auth.uid());
  v_filas public.oportunidades[];
  v_abiertas jsonb;
begin
  if p_antes_en is not null and (p_antes_abierta is null or p_antes_id is null) then
    raise exception 'El cursor de las oportunidades está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  if p_antes_en is null or p_antes_abierta then
    if p_antes_en is null then  -- (a) oportunidades_lead_abiertas_idx
      select array_agg(x.o order by (x.o).ultima_actividad_en desc, (x.o).id desc) into v_filas from (
        select o from public.oportunidades o
         where o.lead_id = p_lead and o.usuario_id = v_yo and o.eliminado_en is null and o.estado = 'abierta'
         order by o.ultima_actividad_en desc, o.id desc limit v_n + 1) x;
    else  -- (b) oportunidades_lead_abiertas_idx
      select array_agg(x.o order by (x.o).ultima_actividad_en desc, (x.o).id desc) into v_filas from (
        select o from public.oportunidades o
         where o.lead_id = p_lead and o.usuario_id = v_yo and o.eliminado_en is null and o.estado = 'abierta'
           and (o.ultima_actividad_en, o.id) < (p_antes_en, p_antes_id)
         order by o.ultima_actividad_en desc, o.id desc limit v_n + 1) x;
    end if;
    v_filas := coalesce(v_filas, '{}');
    if cardinality(v_filas) <= v_n then  -- se completa con las cerradas desde la primera: oportunidades_lead_cerradas_idx
      v_filas := v_filas || coalesce((
        select array_agg(x.o order by (x.o).ultima_actividad_en desc, (x.o).id desc) from (
          select o from public.oportunidades o
           where o.lead_id = p_lead and o.usuario_id = v_yo and o.eliminado_en is null and o.estado <> 'abierta'
           order by o.ultima_actividad_en desc, o.id desc limit v_n + 1 - cardinality(v_filas)) x), '{}');
    end if;
  else  -- (c) oportunidades_lead_cerradas_idx
    select array_agg(x.o order by (x.o).ultima_actividad_en desc, (x.o).id desc) into v_filas from (
      select o from public.oportunidades o
       where o.lead_id = p_lead and o.usuario_id = v_yo and o.eliminado_en is null and o.estado <> 'abierta'
         and (o.ultima_actividad_en, o.id) < (p_antes_en, p_antes_id)
       order by o.ultima_actividad_en desc, o.id desc limit v_n + 1) x;
  end if;
  if p_antes_en is null then
    -- (d) Una sonda por embudo de quien mira (10 como mucho), cada una por oportunidades_lead_abiertas_idx con limit 1: la abierta más reciente
    -- del lead en ese embudo. Sólo en la primera página.
    select coalesce(jsonb_agg(jsonb_build_object('embudo_id', e.id, 'embudo_nombre', e.nombre, 'es_default', e.es_default,
                                                 'oportunidad_id', a.id) order by e.es_default desc, e.creado_en, e.id), '[]'::jsonb)
      into v_abiertas
      from public.embudos e
      cross join lateral (
        select o.id from public.oportunidades o
         where o.lead_id = p_lead and o.usuario_id = v_yo and o.eliminado_en is null and o.estado = 'abierta' and o.embudo_id = e.id
         order by o.ultima_actividad_en desc, o.id desc limit 1) a
     where e.usuario_id = v_yo;
  end if;
  return jsonb_build_object(
    'puedo_crear', public.puede_actuar_lead(p_lead, 'leads.editar'),
    'hay_mas', coalesce(cardinality(v_filas), 0) > v_n,
    'oportunidades', coalesce((
      select jsonb_agg(public._oportunidad_json(v_filas[k]) || jsonb_build_object(
               'etapa', jsonb_build_object('id', s.id, 'nombre', s.nombre, 'color', s.color, 'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida),
               'embudo', jsonb_build_object('id', e.id, 'nombre', e.nombre)) order by k)
        from generate_series(1, least(v_n, coalesce(cardinality(v_filas), 0))) k
        join public.embudos e on e.id = (v_filas[k]).embudo_id
        join public.embudos_etapas s on s.id = (v_filas[k]).etapa_id), '[]'::jsonb))
    || case when p_antes_en is null then jsonb_build_object('abiertas_por_embudo', v_abiertas) else '{}'::jsonb end;
end $$;

revoke all on function public.lead_oportunidades(uuid, boolean, timestamp with time zone, uuid, integer) from public, anon;
grant execute on function public.lead_oportunidades(uuid, boolean, timestamp with time zone, uuid, integer) to authenticated, service_role;

comment on function public.lead_oportunidades(uuid, boolean, timestamp with time zone, uuid, integer) is
  'Una página de las oportunidades de quien mira sobre un lead: las abiertas primero y, en cada grupo, por ultima_actividad_en desc, id desc, de a p_tamano (por defecto 20, máximo 100). El cursor es la última fila de la página anterior (p_antes_abierta, p_antes_en, p_antes_id; incompleto da 22023 con hint cursor). Corre como quien la llama: la RLS de «oportunidades: leer» decide qué se ve. Cada ruta va por su índice parcial (oportunidades_lead_abiertas_idx, oportunidades_lead_cerradas_idx). Devuelve {puedo_crear, hay_mas, oportunidades} y, sólo en la primera página, abiertas_por_embudo: [{embudo_id, embudo_nombre, es_default, oportunidad_id}], una por embudo de quien mira donde el lead tiene una abierta (una sonda con limit 1 por embudo, por oportunidades_lead_abiertas_idx). Lo mide supabase/tests/medir-lead-oportunidades.sql.';

comment on table public.oportunidades is
  'Negocios de un lead dentro de un embudo de una persona. Un lead puede tener varias, pero como mucho una abierta y viva por embudo (la guarda _oportunidad_abierta_unica en crear, reabrir y restaurar; las duplicadas anteriores quedan). Ganada/perdida no la saca del kanban: queda en su columna final. Se escriben sólo por RPC (oportunidad_*): exigen ser su dueña, la cartera del lead y leads.editar. Sólo las ve su dueña, mientras tenga el lead en su cartera.';
