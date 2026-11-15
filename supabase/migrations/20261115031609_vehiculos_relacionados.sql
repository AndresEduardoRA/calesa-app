-- «Relacionados»: lo que un vehículo y un lead tienen en común, en una sola lectura por bloque (docs/GLOSARIO.md › Relacionados).
-- Tres grupos por lado: Vinculado (el lead dueño o comprador), Interesado (`vehiculos_interesados`) y Cotizado (una cotización activa).
--
-- Las cuatro RPC son `security definer` con el predicado de las policies (`vehiculos: leer`, `leads: leer`, `cotizaciones: leer`,
-- `vehiculos_interesados: leer`, `leads_numeros_*: leer`) y el alcance resuelto UNA vez: bajo RLS cada fila de `vehiculos_interesados`
-- paga dos `puede_*` y un recorrido con muchas ocultas no tiene tope. Además una definer puede CONTAR lo oculto sin devolver sus datos:
-- lo que quien mira no ve llega como un número, sin id, sin nombre y sin nota. Lo que está en una papelera no se relaciona ni se cuenta;
-- un lead en limbo (su cartera entera en baja) sí cuenta como oculto, porque sigue frenando vincular.
--
-- `set random_page_cost = 1.1` en las cuatro: el plan genérico estima por el promedio de la tabla (unas decenas de filas por vehículo o lead) y con el costo de
-- disco de 4 prefiere un bitmap y ordenar todo lo del vehículo antes que recorrer su índice en orden; en un vehículo caliente (miles) eso lee y ordena todo y crece con N.
-- Con 1,1 (el de un disco de estado sólido) recorre el índice en orden y para en la fila 101, con cualquier volumen (supabase/tests/medir-relacionados.sql).
-- Su prueba: supabase/tests/areas/vehiculos/relacionados*.sql; su medición: supabase/tests/medir-relacionados.sql.

-- ─── Índices: uno por recorrido ───────────────────────────────────────────────────────────────────────────────────────
-- Cada uno va en el sentido del orden del cursor (`desc, desc`). Los de cotizaciones llevan el literal `estado in ('activa','reportada')`,
-- porque bajo RLS una comparación de enum sólo es condición de índice si está en el predicado del índice parcial.

-- vehiculo_relacionados() y vehiculo_relacionados_pagina('interesado'): los interesados de un vehículo, del más reciente al más viejo.
create index vehiculos_interesados_vehiculo_reciente_idx
  on public.vehiculos_interesados (vehiculo_id, creado_en desc, lead_id desc);

-- lead_relacionados() y lead_relacionados_pagina('interesado'): los vehículos que le interesan a un lead.
create index vehiculos_interesados_lead_reciente_idx
  on public.vehiculos_interesados (lead_id, creado_en desc, vehiculo_id desc);

-- lead_relacionados() y lead_relacionados_pagina('vinculado'): los vehículos vinculados ahora a un lead.
create index vehiculos_vinculos_lead_abierto_idx
  on public.vehiculos_vinculos (lead_id, desde desc, vehiculo_id desc) where hasta is null;

-- vehiculo_relacionados() y vehiculo_relacionados_pagina('cotizado'): las cotizaciones activas de un vehículo con lead.
create index cotizaciones_relacion_vehiculo_idx
  on public.cotizaciones (vehiculo_id, creado_en desc, id desc)
  where eliminado_en is null and estado in ('activa', 'reportada') and lead_id is not null;

-- lead_relacionados() y lead_relacionados_pagina('cotizado'): las cotizaciones activas de un lead con vehículo.
create index cotizaciones_relacion_lead_idx
  on public.cotizaciones (lead_id, creado_en desc, id desc)
  where eliminado_en is null and estado in ('activa', 'reportada') and vehiculo_id is not null;

-- La sonda «¿hay otra activa más nueva del mismo par?» de las páginas de «Cotizado».
create index cotizaciones_relacion_par_idx
  on public.cotizaciones (vehiculo_id, lead_id, creado_en desc, id desc)
  where eliminado_en is null and estado in ('activa', 'reportada');

-- ─── La fila de un lead, con lo que quien mira puede ver de él ──────────────────────────────────────────────────────
-- Sólo se llama con un lead que quien mira ya vio (visible). El número global y el propio copian el predicado de las policies de
-- `leads_numeros_globales` y `leads_numeros_propios`; el teléfono nunca sale.
create or replace function public._relacion_de_lead(
  p_lead uuid, p_nombre text, p_cartera uuid[], p_yo uuid, p_global boolean, p_edita boolean
) returns jsonb
  language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'lead_id', p_lead,
    'nombre', p_nombre,
    'numero', case when p_global then (select g.numero from public.leads_numeros_globales g where g.lead_id = p_lead) end,
    'numero_propio', (select n.numero from public.leads_numeros_propios n
                       where n.lead_id = p_lead and (p_global or n.creado_por = p_yo)),
    -- Quién creó el lead, sólo si el propio que se ve no es de quien mira (con `leads.numero_global.ver`); nulo = «Tu n.º».
    'numero_propio_creador', (select coalesce(nullif(btrim(pf.nombre), ''), 'Otra persona')
                                from public.leads_numeros_propios n join public.perfiles pf on pf.id = n.creado_por
                               where n.lead_id = p_lead and p_global and n.creado_por <> p_yo),
    'en_cartera', coalesce(p_yo = any (p_cartera), false),
    'puedo_actuar', p_edita and coalesce(p_yo = any (p_cartera), false));
$$;

revoke all on function public._relacion_de_lead(uuid, text, uuid[], uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public._relacion_de_lead(uuid, text, uuid[], uuid, boolean, boolean) to service_role;

-- ─── Los relacionados de un vehículo ────────────────────────────────────────────────────────────────────────────────
create or replace function public.vehiculo_relacionados(p_vehiculo uuid, p_primeros int default 3)
  returns jsonb
  language plpgsql stable security definer set search_path = '' set random_page_cost = 1.1
as $$
declare
  v_yo uuid := (select auth.uid());
  v_alcance public.alcance_permiso := public.alcance_de('leads.ver');
  v_fuera uuid[] := public._bajas_en_curso();
  v_global boolean := public.tiene_permiso('leads.numero_global.ver');
  v_edita boolean := public.alcance_de('leads.editar') is not null;
  v_n int := public._acotar_pagina(p_primeros, 3, 5);
  v_v public.vehiculos;
  v_todos uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_propios uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  v_lead record;
  v_vinculado jsonb;
  v_interesados jsonb;
  v_cotizados jsonb;
begin
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') or v_alcance is null then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  select * into v_v from public.vehiculos where id = p_vehiculo;

  -- Vinculado: el lead de `vehiculos.lead_id` (pk de leads) y su `desde` (vehiculos_vinculo_abierto_unico).
  v_vinculado := jsonb_build_object('fila', null, 'oculto', false, 'con_anteriores', exists (
    -- vehiculos_vinculos_vehiculo_idx: la primera fila cerrada basta.
    select 1 from public.vehiculos_vinculos k where k.vehiculo_id = p_vehiculo and k.hasta is not null));
  if v_v.lead_id is not null then
    select l.id, l.nombre, l.cartera, l.eliminado_en,
           public._lead_visible_para(l.eliminado_en, l.cartera, v_alcance, v_yo, v_fuera) as visible
      into v_lead from public.leads l where l.id = v_v.lead_id;
    if found and v_lead.eliminado_en is null then
      if v_lead.visible then
        v_vinculado := v_vinculado || jsonb_build_object('fila',
          public._relacion_de_lead(v_lead.id, v_lead.nombre, v_lead.cartera, v_yo, v_global, v_edita)
          || jsonb_build_object('desde', (select k.desde from public.vehiculos_vinculos k
                                           where k.vehiculo_id = p_vehiculo and k.hasta is null)));
      else
        v_vinculado := v_vinculado || jsonb_build_object('oculto', true);
      end if;
    end if;
  end if;

  -- Interesado: la ventana de 101 por vehiculos_interesados_vehiculo_reciente_idx, sin leads en la papelera.
  with ventana as materialized (
    select i.lead_id, i.nota, i.creado_en, i.usuario_id, l.nombre, l.cartera,
           public._lead_visible_para(l.eliminado_en, l.cartera, v_alcance, v_yo, v_fuera) as visible
      from public.vehiculos_interesados i
      join public.leads l on l.id = i.lead_id and l.eliminado_en is null
     where i.vehiculo_id = p_vehiculo
     order by i.creado_en desc, i.lead_id desc
     limit 101)
  select jsonb_build_object(
           'leidos', count(*),
           'ocultos', count(*) filter (where not visible),
           'filas', coalesce((
             select jsonb_agg(public._relacion_de_lead(f.lead_id, f.nombre, f.cartera, v_yo, v_global, v_edita)
                              || jsonb_build_object('nota', f.nota, 'creado_en', f.creado_en,
                                   'por_nombre', (select p.nombre from public.perfiles p where p.id = f.usuario_id))
                              order by f.creado_en desc, f.lead_id desc)
               from (select * from ventana w where w.visible order by w.creado_en desc, w.lead_id desc limit v_n) f),
             '[]'::jsonb))
    into v_interesados
    from ventana;

  -- Cotizado: sólo con cotizaciones.ver en el origen. La ventana son las 101 activas más nuevas
  -- (cotizaciones_relacion_vehiculo_idx), agrupadas por lead; cada lead lo representa su cotización visible más nueva.
  if cardinality(v_propios) > 0 then
    with ventana as materialized (
      select c.id, c.numero, c.clase, c.creado_en, c.lead_id, c.origen_id, c.creado_por
        from public.cotizaciones c
       where c.vehiculo_id = p_vehiculo and c.lead_id is not null
         and c.eliminado_en is null and c.estado in ('activa', 'reportada')
         and c.origen_id = any (v_propios)
       order by c.creado_en desc, c.id desc
       limit 101),
    marcada as (
      select w.*, l.nombre, l.cartera,
             public._lead_visible_para(l.eliminado_en, l.cartera, v_alcance, v_yo, v_fuera) as lead_visible,
             (w.origen_id = any (v_todos)
              or (w.origen_id = any (v_propios) and (w.creado_por = v_yo or public.en_cartera(w.lead_id)))) as cot_visible
        from ventana w
        join public.leads l on l.id = w.lead_id and l.eliminado_en is null),
    reps as (
      select distinct on (m.lead_id) m.*
        from marcada m
       where m.lead_visible and m.cot_visible
       order by m.lead_id, m.creado_en desc, m.id desc)
    select jsonb_build_object(
             'ventana_llena', (select count(*) from ventana) > 100,
             'leidos', (select count(distinct m.lead_id) from marcada m),
             'ocultos', (select count(distinct m.lead_id) from marcada m) - (select count(*) from reps),
             'filas', coalesce((
               select jsonb_agg(public._relacion_de_lead(f.lead_id, f.nombre, f.cartera, v_yo, v_global, v_edita)
                                || jsonb_build_object('cotizacion', jsonb_build_object(
                                     'id', f.id, 'numero', f.numero, 'clase', f.clase, 'creado_en', f.creado_en))
                                order by f.creado_en desc, f.id desc)
                 from (select * from reps r order by r.creado_en desc, r.id desc limit v_n) f),
               '[]'::jsonb))
      into v_cotizados;
  end if;

  return jsonb_build_object(
    'editable', public.puede_vehiculo(p_vehiculo, 'vehiculos.editar'),
    'titulo', v_v.titulo,
    'numero', v_v.numero,
    'actualizado_en', v_v.actualizado_en,
    'origen_id', v_v.origen_id,
    'vinculado', v_vinculado,
    'interesados', v_interesados,
    'cotizados', v_cotizados);
end;
$$;

-- ─── Los relacionados de un lead ────────────────────────────────────────────────────────────────────────────────────
create or replace function public.lead_relacionados(p_lead uuid, p_primeros int default 3)
  returns jsonb
  language plpgsql stable security definer set search_path = '' set random_page_cost = 1.1
as $$
declare
  v_yo uuid := (select auth.uid());
  v_n int := public._acotar_pagina(p_primeros, 3, 5);
  v_vtodos uuid[] := public.origenes_con_alcance('vehiculos.ver', 'todos');
  v_vpropios uuid[] := public.origenes_con_alcance('vehiculos.ver', 'propios');
  v_ctodos uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_cpropios uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  v_cartera boolean := public.en_cartera(p_lead);
  v_vinculados jsonb;
  v_interesados jsonb;
  v_cotizados jsonb;
begin
  if not public.puede_lead(p_lead, 'leads.ver') or not public.tiene_permiso('vehiculos.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;

  -- Vinculado: la ventana de 101 por vehiculos_vinculos_lead_abierto_idx y la pk de vehiculos.
  with ventana as materialized (
    select k.vehiculo_id, k.desde,
           (v.origen_id = any (v_vtodos)
            or (v.origen_id = any (v_vpropios)
                and (v.creado_por = v_yo or (v.lead_id is not null and case when v.lead_id = p_lead then v_cartera else public.en_cartera(v.lead_id) end)))) as visible
      from public.vehiculos_vinculos k
      join public.vehiculos v on v.id = k.vehiculo_id and v.eliminado_en is null
     where k.lead_id = p_lead and k.hasta is null
     order by k.desde desc, k.vehiculo_id desc
     limit 101)
  select jsonb_build_object(
           'leidos', count(*),
           'ocultos', count(*) filter (where not visible),
           'filas', coalesce((
             select jsonb_agg(public._vehiculo_resumen(v) || jsonb_build_object('desde', f.desde)
                              order by f.desde desc, f.vehiculo_id desc)
               from (select * from ventana w where w.visible order by w.desde desc, w.vehiculo_id desc limit v_n) f
               join public.vehiculos v on v.id = f.vehiculo_id),
             '[]'::jsonb))
    into v_vinculados
    from ventana;

  -- Interesado: vehiculos_interesados_lead_reciente_idx.
  with ventana as materialized (
    select i.vehiculo_id, i.nota, i.creado_en, i.usuario_id,
           (v.origen_id = any (v_vtodos)
            or (v.origen_id = any (v_vpropios)
                and (v.creado_por = v_yo or (v.lead_id is not null and case when v.lead_id = p_lead then v_cartera else public.en_cartera(v.lead_id) end)))) as visible
      from public.vehiculos_interesados i
      join public.vehiculos v on v.id = i.vehiculo_id and v.eliminado_en is null
     where i.lead_id = p_lead
     order by i.creado_en desc, i.vehiculo_id desc
     limit 101)
  select jsonb_build_object(
           'leidos', count(*),
           'ocultos', count(*) filter (where not visible),
           'filas', coalesce((
             select jsonb_agg(public._vehiculo_resumen(v)
                              || jsonb_build_object('nota', f.nota, 'creado_en', f.creado_en,
                                   'por_nombre', (select p.nombre from public.perfiles p where p.id = f.usuario_id))
                              order by f.creado_en desc, f.vehiculo_id desc)
               from (select * from ventana w where w.visible order by w.creado_en desc, w.vehiculo_id desc limit v_n) f
               join public.vehiculos v on v.id = f.vehiculo_id),
             '[]'::jsonb))
    into v_interesados
    from ventana;

  -- Cotizado: sólo con cotizaciones.ver en algún origen. cotizaciones_relacion_lead_idx, agrupadas por vehículo.
  if cardinality(v_cpropios) > 0 then
    with ventana as materialized (
      select c.id, c.numero, c.clase, c.creado_en, c.vehiculo_id, c.origen_id, c.creado_por
        from public.cotizaciones c
       where c.lead_id = p_lead and c.vehiculo_id is not null
         and c.eliminado_en is null and c.estado in ('activa', 'reportada')
         and c.origen_id = any (v_cpropios)
       order by c.creado_en desc, c.id desc
       limit 101),
    marcada as (
      select w.*,
             (v.origen_id = any (v_vtodos)
              or (v.origen_id = any (v_vpropios)
                  and (v.creado_por = v_yo or (v.lead_id is not null and case when v.lead_id = p_lead then v_cartera else public.en_cartera(v.lead_id) end)))) as vehiculo_visible,
             (w.origen_id = any (v_ctodos)
              or (w.origen_id = any (v_cpropios) and (w.creado_por = v_yo or v_cartera))) as cot_visible
        from ventana w
        join public.vehiculos v on v.id = w.vehiculo_id and v.eliminado_en is null),
    reps as (
      select distinct on (m.vehiculo_id) m.*
        from marcada m
       where m.vehiculo_visible and m.cot_visible
       order by m.vehiculo_id, m.creado_en desc, m.id desc)
    select jsonb_build_object(
             'ventana_llena', (select count(*) from ventana) > 100,
             'leidos', (select count(distinct m.vehiculo_id) from marcada m),
             'ocultos', (select count(distinct m.vehiculo_id) from marcada m) - (select count(*) from reps),
             'filas', coalesce((
               select jsonb_agg(public._vehiculo_resumen(v)
                                || jsonb_build_object('cotizacion', jsonb_build_object(
                                     'id', f.id, 'numero', f.numero, 'clase', f.clase, 'creado_en', f.creado_en))
                                order by f.creado_en desc, f.id desc)
                 from (select * from reps r order by r.creado_en desc, r.id desc limit v_n) f
                 join public.vehiculos v on v.id = f.vehiculo_id),
               '[]'::jsonb))
      into v_cotizados;
  end if;

  return jsonb_build_object(
    'puedo_actuar', public.puede_actuar_lead(p_lead, 'leads.editar'),
    'vinculados', v_vinculados,
    'interesados', v_interesados,
    'cotizados', v_cotizados);
end;
$$;

-- ─── «Ver todos» de un vehículo: de a una página, por cursor ──────────────────────────────────────────────────────────
-- Recorre el índice por lotes de 100, filtra la visibilidad en plpgsql y se detiene al juntar `tamaño + 1` visibles o al recorrer
-- 2.000 filas (`cortada`: había más, pero demasiadas ocultas seguidas). El cursor es el `(fecha, id)` de la última fila visible que
-- se devolvió. Sin cursor y con cursor son dos consultas distintas (un `is null or` dejaría de ser condición de índice).
create or replace function public.vehiculo_relacionados_pagina(
  p_vehiculo uuid, p_tipo text, p_cursor_en timestamptz default null, p_cursor_id uuid default null, p_tamano int default 20
) returns jsonb
  language plpgsql stable security definer set search_path = '' set random_page_cost = 1.1
as $$
declare
  v_yo uuid := (select auth.uid());
  v_alcance public.alcance_permiso := public.alcance_de('leads.ver');
  v_fuera uuid[] := public._bajas_en_curso();
  v_global boolean := public.tiene_permiso('leads.numero_global.ver');
  v_edita boolean := public.alcance_de('leads.editar') is not null;
  v_n int := public._acotar_pagina(p_tamano, 20, 20) + 1;
  v_todos uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_propios uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  c refcursor;
  r record;
  v_filas jsonb := '[]'::jsonb;
  v_vistas int := 0;
  v_recorridas int := 0;
  v_lote int;
  v_c_en timestamptz := p_cursor_en;
  v_c_id uuid := p_cursor_id;
begin
  if p_tipo is null or p_tipo not in ('interesado', 'cotizado') then
    raise exception 'El tipo de relación no es válido.' using errcode = '22023';
  end if;
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') or v_alcance is null then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  if p_tipo = 'cotizado' and cardinality(v_propios) = 0 then
    return jsonb_build_object('filas', '[]'::jsonb, 'cortada', false);
  end if;
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor está incompleto.' using errcode = '22023';
  end if;

  loop
    v_lote := 0;
    if p_tipo = 'interesado' then
      if v_c_en is null then
        -- vehiculos_interesados_vehiculo_reciente_idx
        open c for
          select i.lead_id as id, i.lead_id, i.nota, i.creado_en, i.usuario_id, null::bigint as numero,
                 null::public.clase_cotizacion as clase, l.nombre, l.cartera, l.eliminado_en,
                 public._lead_visible_para(l.eliminado_en, l.cartera, v_alcance, v_yo, v_fuera) as visible
            from public.vehiculos_interesados i
            join public.leads l on l.id = i.lead_id
           where i.vehiculo_id = p_vehiculo
           order by i.creado_en desc, i.lead_id desc
           limit 100;
      else
        open c for
          select i.lead_id as id, i.lead_id, i.nota, i.creado_en, i.usuario_id, null::bigint as numero,
                 null::public.clase_cotizacion as clase, l.nombre, l.cartera, l.eliminado_en,
                 public._lead_visible_para(l.eliminado_en, l.cartera, v_alcance, v_yo, v_fuera) as visible
            from public.vehiculos_interesados i
            join public.leads l on l.id = i.lead_id
           where i.vehiculo_id = p_vehiculo and (i.creado_en, i.lead_id) < (v_c_en, v_c_id)
           order by i.creado_en desc, i.lead_id desc
           limit 100;
      end if;
    elsif v_c_en is null then
      -- cotizaciones_relacion_vehiculo_idx; la sonda de «otra más nueva del mismo par» va por cotizaciones_relacion_par_idx.
      open c for
        select c1.id, l.id as lead_id, null::text as nota, null::uuid as usuario_id, c1.numero, c1.clase, c1.creado_en,
               l.nombre, l.cartera, l.eliminado_en,
               public._lead_visible_para(l.eliminado_en, l.cartera, v_alcance, v_yo, v_fuera)
               and (c1.origen_id = any (v_todos)
                    or (c1.origen_id = any (v_propios) and (c1.creado_por = v_yo or public.en_cartera(c1.lead_id))))
               and not exists (
                 select 1 from public.cotizaciones c2
                  where c2.vehiculo_id = c1.vehiculo_id and c2.lead_id = c1.lead_id
                    and c2.eliminado_en is null and c2.estado in ('activa', 'reportada')
                    and (c2.creado_en, c2.id) > (c1.creado_en, c1.id)
                    and (c2.origen_id = any (v_todos)
                         or (c2.origen_id = any (v_propios) and (c2.creado_por = v_yo or public.en_cartera(c2.lead_id))))) as visible
          from public.cotizaciones c1
          join public.leads l on l.id = c1.lead_id
         where c1.vehiculo_id = p_vehiculo and c1.lead_id is not null
           and c1.eliminado_en is null and c1.estado in ('activa', 'reportada')
         order by c1.creado_en desc, c1.id desc
         limit 100;
    else
      open c for
        select c1.id, l.id as lead_id, null::text as nota, null::uuid as usuario_id, c1.numero, c1.clase, c1.creado_en,
               l.nombre, l.cartera, l.eliminado_en,
               public._lead_visible_para(l.eliminado_en, l.cartera, v_alcance, v_yo, v_fuera)
               and (c1.origen_id = any (v_todos)
                    or (c1.origen_id = any (v_propios) and (c1.creado_por = v_yo or public.en_cartera(c1.lead_id))))
               and not exists (
                 select 1 from public.cotizaciones c2
                  where c2.vehiculo_id = c1.vehiculo_id and c2.lead_id = c1.lead_id
                    and c2.eliminado_en is null and c2.estado in ('activa', 'reportada')
                    and (c2.creado_en, c2.id) > (c1.creado_en, c1.id)
                    and (c2.origen_id = any (v_todos)
                         or (c2.origen_id = any (v_propios) and (c2.creado_por = v_yo or public.en_cartera(c2.lead_id))))) as visible
          from public.cotizaciones c1
          join public.leads l on l.id = c1.lead_id
         where c1.vehiculo_id = p_vehiculo and c1.lead_id is not null
           and c1.eliminado_en is null and c1.estado in ('activa', 'reportada')
           and (c1.creado_en, c1.id) < (v_c_en, v_c_id)
         order by c1.creado_en desc, c1.id desc
         limit 100;
    end if;

    loop
      fetch c into r;
      exit when not found;
      v_lote := v_lote + 1;
      v_recorridas := v_recorridas + 1;
      v_c_en := r.creado_en;
      v_c_id := r.id;
      if r.eliminado_en is null and r.visible then
        v_filas := v_filas || (
          public._relacion_de_lead(r.lead_id, r.nombre, r.cartera, v_yo, v_global, v_edita)
          || case when p_tipo = 'interesado'
                  then jsonb_build_object('nota', r.nota, 'creado_en', r.creado_en,
                         'por_nombre', (select p.nombre from public.perfiles p where p.id = r.usuario_id))
                  else jsonb_build_object('cotizacion', jsonb_build_object(
                         'id', r.id, 'numero', r.numero, 'clase', r.clase, 'creado_en', r.creado_en))
             end);
        v_vistas := v_vistas + 1;
        exit when v_vistas >= v_n;
      end if;
    end loop;
    close c;
    exit when v_vistas >= v_n or v_lote < 100 or v_recorridas >= 2000;
  end loop;

  -- Si se cortó, `siguiente` es hasta dónde se recorrió: «Seguir buscando» sigue desde ahí (el cursor de la última fila visible volvería a recorrer el mismo hueco).
  return jsonb_build_object('filas', v_filas, 'cortada', v_vistas < v_n and v_lote >= 100,
    'siguiente', case when v_vistas < v_n and v_lote >= 100 then jsonb_build_object('en', v_c_en, 'id', v_c_id) end);
end;
$$;

-- ─── «Ver todos» de un lead ─────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.lead_relacionados_pagina(
  p_lead uuid, p_tipo text, p_cursor_en timestamptz default null, p_cursor_id uuid default null, p_tamano int default 20
) returns jsonb
  language plpgsql stable security definer set search_path = '' set random_page_cost = 1.1
as $$
declare
  v_yo uuid := (select auth.uid());
  v_n int := public._acotar_pagina(p_tamano, 20, 20) + 1;
  v_vtodos uuid[] := public.origenes_con_alcance('vehiculos.ver', 'todos');
  v_vpropios uuid[] := public.origenes_con_alcance('vehiculos.ver', 'propios');
  v_ctodos uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_cpropios uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  v_cartera boolean := public.en_cartera(p_lead);
  c refcursor;
  r record;
  v_ids uuid[] := '{}';
  v_filas jsonb := '[]'::jsonb;
  v_vistas int := 0;
  v_recorridas int := 0;
  v_lote int;
  v_c_en timestamptz := p_cursor_en;
  v_c_id uuid := p_cursor_id;
begin
  if p_tipo is null or p_tipo not in ('vinculado', 'interesado', 'cotizado') then
    raise exception 'El tipo de relación no es válido.' using errcode = '22023';
  end if;
  if not public.puede_lead(p_lead, 'leads.ver') or not public.tiene_permiso('vehiculos.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if p_tipo = 'cotizado' and cardinality(v_cpropios) = 0 then
    return jsonb_build_object('filas', '[]'::jsonb, 'cortada', false);
  end if;
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor está incompleto.' using errcode = '22023';
  end if;

  loop
    v_lote := 0;
    if p_tipo = 'vinculado' then
      if v_c_en is null then
        -- vehiculos_vinculos_lead_abierto_idx
        open c for
          select k.vehiculo_id as id, k.vehiculo_id, k.desde as creado_en, null::text as nota, null::uuid as usuario_id,
                 null::bigint as numero, null::public.clase_cotizacion as clase,
                 (v.origen_id = any (v_vtodos)
                  or (v.origen_id = any (v_vpropios)
                      and (v.creado_por = v_yo or (v.lead_id is not null and case when v.lead_id = p_lead then v_cartera else public.en_cartera(v.lead_id) end)))) as visible
            from public.vehiculos_vinculos k
            join public.vehiculos v on v.id = k.vehiculo_id and v.eliminado_en is null
           where k.lead_id = p_lead and k.hasta is null
           order by k.desde desc, k.vehiculo_id desc
           limit 100;
      else
        open c for
          select k.vehiculo_id as id, k.vehiculo_id, k.desde as creado_en, null::text as nota, null::uuid as usuario_id,
                 null::bigint as numero, null::public.clase_cotizacion as clase,
                 (v.origen_id = any (v_vtodos)
                  or (v.origen_id = any (v_vpropios)
                      and (v.creado_por = v_yo or (v.lead_id is not null and case when v.lead_id = p_lead then v_cartera else public.en_cartera(v.lead_id) end)))) as visible
            from public.vehiculos_vinculos k
            join public.vehiculos v on v.id = k.vehiculo_id and v.eliminado_en is null
           where k.lead_id = p_lead and k.hasta is null and (k.desde, k.vehiculo_id) < (v_c_en, v_c_id)
           order by k.desde desc, k.vehiculo_id desc
           limit 100;
      end if;
    elsif p_tipo = 'interesado' then
      if v_c_en is null then
        -- vehiculos_interesados_lead_reciente_idx
        open c for
          select i.vehiculo_id as id, i.vehiculo_id, i.creado_en, i.nota, i.usuario_id,
                 null::bigint as numero, null::public.clase_cotizacion as clase,
                 (v.origen_id = any (v_vtodos)
                  or (v.origen_id = any (v_vpropios)
                      and (v.creado_por = v_yo or (v.lead_id is not null and case when v.lead_id = p_lead then v_cartera else public.en_cartera(v.lead_id) end)))) as visible
            from public.vehiculos_interesados i
            join public.vehiculos v on v.id = i.vehiculo_id and v.eliminado_en is null
           where i.lead_id = p_lead
           order by i.creado_en desc, i.vehiculo_id desc
           limit 100;
      else
        open c for
          select i.vehiculo_id as id, i.vehiculo_id, i.creado_en, i.nota, i.usuario_id,
                 null::bigint as numero, null::public.clase_cotizacion as clase,
                 (v.origen_id = any (v_vtodos)
                  or (v.origen_id = any (v_vpropios)
                      and (v.creado_por = v_yo or (v.lead_id is not null and case when v.lead_id = p_lead then v_cartera else public.en_cartera(v.lead_id) end)))) as visible
            from public.vehiculos_interesados i
            join public.vehiculos v on v.id = i.vehiculo_id and v.eliminado_en is null
           where i.lead_id = p_lead and (i.creado_en, i.vehiculo_id) < (v_c_en, v_c_id)
           order by i.creado_en desc, i.vehiculo_id desc
           limit 100;
      end if;
    elsif v_c_en is null then
      -- cotizaciones_relacion_lead_idx; la sonda de «otra más nueva del mismo par» va por cotizaciones_relacion_par_idx.
      open c for
        select c1.id, c1.creado_en, null::text as nota, null::uuid as usuario_id, c1.numero, c1.clase, c1.vehiculo_id,
               (v.origen_id = any (v_vtodos)
                or (v.origen_id = any (v_vpropios)
                    and (v.creado_por = v_yo or (v.lead_id is not null and case when v.lead_id = p_lead then v_cartera else public.en_cartera(v.lead_id) end))))
               and (c1.origen_id = any (v_ctodos) or (c1.origen_id = any (v_cpropios) and (c1.creado_por = v_yo or v_cartera)))
               and not exists (
                 select 1 from public.cotizaciones c2
                  where c2.vehiculo_id = c1.vehiculo_id and c2.lead_id = c1.lead_id
                    and c2.eliminado_en is null and c2.estado in ('activa', 'reportada')
                    and (c2.creado_en, c2.id) > (c1.creado_en, c1.id)
                    and (c2.origen_id = any (v_ctodos)
                         or (c2.origen_id = any (v_cpropios) and (c2.creado_por = v_yo or v_cartera)))) as visible
          from public.cotizaciones c1
          join public.vehiculos v on v.id = c1.vehiculo_id and v.eliminado_en is null
         where c1.lead_id = p_lead and c1.vehiculo_id is not null
           and c1.eliminado_en is null and c1.estado in ('activa', 'reportada')
         order by c1.creado_en desc, c1.id desc
         limit 100;
    else
      open c for
        select c1.id, c1.creado_en, null::text as nota, null::uuid as usuario_id, c1.numero, c1.clase, c1.vehiculo_id,
               (v.origen_id = any (v_vtodos)
                or (v.origen_id = any (v_vpropios)
                    and (v.creado_por = v_yo or (v.lead_id is not null and case when v.lead_id = p_lead then v_cartera else public.en_cartera(v.lead_id) end))))
               and (c1.origen_id = any (v_ctodos) or (c1.origen_id = any (v_cpropios) and (c1.creado_por = v_yo or v_cartera)))
               and not exists (
                 select 1 from public.cotizaciones c2
                  where c2.vehiculo_id = c1.vehiculo_id and c2.lead_id = c1.lead_id
                    and c2.eliminado_en is null and c2.estado in ('activa', 'reportada')
                    and (c2.creado_en, c2.id) > (c1.creado_en, c1.id)
                    and (c2.origen_id = any (v_ctodos)
                         or (c2.origen_id = any (v_cpropios) and (c2.creado_por = v_yo or v_cartera)))) as visible
          from public.cotizaciones c1
          join public.vehiculos v on v.id = c1.vehiculo_id and v.eliminado_en is null
         where c1.lead_id = p_lead and c1.vehiculo_id is not null
           and c1.eliminado_en is null and c1.estado in ('activa', 'reportada')
           and (c1.creado_en, c1.id) < (v_c_en, v_c_id)
         order by c1.creado_en desc, c1.id desc
         limit 100;
    end if;

    loop
      fetch c into r;
      exit when not found;
      v_lote := v_lote + 1;
      v_recorridas := v_recorridas + 1;
      v_c_en := r.creado_en;
      v_c_id := r.id;
      if r.visible then
        v_vistas := v_vistas + 1;
        -- Cada fila que se devuelve: el id de su vehículo y lo propio de su tipo (la cotización, la nota, la fecha del vínculo).
        v_ids := v_ids || r.vehiculo_id;
        v_filas := v_filas || case p_tipo
          when 'vinculado' then jsonb_build_object('desde', r.creado_en)
          when 'interesado' then jsonb_build_object('nota', r.nota, 'creado_en', r.creado_en,
            'por_nombre', (select p.nombre from public.perfiles p where p.id = r.usuario_id))
          else jsonb_build_object('cotizacion', jsonb_build_object(
            'id', r.id, 'numero', r.numero, 'clase', r.clase, 'creado_en', r.creado_en))
        end;
        exit when v_vistas >= v_n;
      end if;
    end loop;
    close c;
    exit when v_vistas >= v_n or v_lote < 100 or v_recorridas >= 2000;
  end loop;

  -- A lo sumo `tamaño + 1` vehículos: sus datos, por pk, en el orden en que se recorrieron.
  return jsonb_build_object(
    'filas', coalesce((
      select jsonb_agg(public._vehiculo_resumen(v) || x.detalle order by i.n)
        from unnest(v_ids) with ordinality as i (id, n)
        join lateral (select v_filas -> (i.n::int - 1) as detalle) x on true
        join public.vehiculos v on v.id = i.id), '[]'::jsonb),
    'cortada', v_vistas < v_n and v_lote >= 100,
    'siguiente', case when v_vistas < v_n and v_lote >= 100 then jsonb_build_object('en', v_c_en, 'id', v_c_id) end);
end;
$$;

-- ─── Privilegios y comentarios ───────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.vehiculo_relacionados(uuid, int) from public, anon, authenticated;
revoke all on function public.lead_relacionados(uuid, int) from public, anon, authenticated;
revoke all on function public.vehiculo_relacionados_pagina(uuid, text, timestamptz, uuid, int) from public, anon, authenticated;
revoke all on function public.lead_relacionados_pagina(uuid, text, timestamptz, uuid, int) from public, anon, authenticated;
grant execute on function public.vehiculo_relacionados(uuid, int) to authenticated, service_role;
grant execute on function public.lead_relacionados(uuid, int) to authenticated, service_role;
grant execute on function public.vehiculo_relacionados_pagina(uuid, text, timestamptz, uuid, int) to authenticated, service_role;
grant execute on function public.lead_relacionados_pagina(uuid, text, timestamptz, uuid, int) to authenticated, service_role;

comment on function public.vehiculo_relacionados(uuid, int) is
  'Los relacionados de un vehículo en una lectura: Vinculado, Interesado y Cotizado (null sin cotizaciones.ver en el origen). Definer con el predicado de las policies: cada grupo trae sus primeras filas visibles, `leidos` de una ventana de 101 y `ocultos` (lo que quien mira no ve, sin ningún dato). Sin leads en la papelera. 42501 si no ve el vehículo o no tiene leads.ver.';
comment on function public.lead_relacionados(uuid, int) is
  'Los relacionados de un lead en una lectura: vinculados, interesados y cotizados (null sin cotizaciones.ver). Mismo molde que vehiculo_relacionados(). 42501 si no ve el lead o no tiene vehiculos.ver.';
comment on function public.vehiculo_relacionados_pagina(uuid, text, timestamptz, uuid, int) is
  '«Ver todos» de interesado | cotizado de un vehículo: tamaño + 1 filas visibles tras el cursor (fecha, id) de la última devuelta, recorriendo el índice por lotes de 100 hasta 2.000 filas; `cortada` si se acabó el recorrido con más por ver. 22023 con otro tipo.';
comment on function public.lead_relacionados_pagina(uuid, text, timestamptz, uuid, int) is
  '«Ver todos» de vinculado | interesado | cotizado de un lead. Mismo molde que vehiculo_relacionados_pagina(). 22023 con otro tipo.';
