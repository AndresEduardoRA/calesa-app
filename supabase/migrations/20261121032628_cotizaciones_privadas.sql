-- Cotizaciones privadas (T413): quien crea una cotización puede marcarla privada; la ven sólo quien la creó y quien tiene
-- `cotizaciones.privadas.ver` de su origen. Para el resto es como si no existiera: la policy «cotizaciones: leer», `puede_cotizacion()` (y con ella
-- todo lo que pide ver una cotización) y las copias de la policy en las funciones definer suman la misma regla. Aprobar o marcar final una privada la
-- hace pública; una final o la aprobada de un vehículo nunca son privadas; las hermanas comparten la marca. docs/COTIZADOR.md › «Cotizaciones privadas».

-- 1. La marca. Nace falsa: ninguna fila existente cambia.
alter table public.cotizaciones add column privada boolean not null default false;
comment on column public.cotizaciones.privada is
  'Privada: la ven sólo quien la creó y quien tiene cotizaciones.privadas.ver de su origen. La cambia sólo quien la creó (cotizacion_privada_cambiar, o p_privada al crearla); aprobarla o marcarla final la hace pública. Una final nunca es privada (cotizaciones_final_no_privada) ni la aprobada de un vehículo; las hermanas comparten la marca.';
alter table public.cotizaciones add constraint cotizaciones_final_no_privada check (not (privada and clase = 'final'));
-- La tabla da `select` por columna (una columna nueva nace sin grant): la marca viaja en el listado, la ficha y las revisiones.
grant select (privada) on public.cotizaciones to authenticated;

-- 2. El permiso. Por origen y sin alcance («propios» no tiene sentido para ver lo ajeno). El dueño es todo el catálogo: sin la clave nadie podría concederla
-- (concesion_dominada() pide tenerla).
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('cotizaciones.privadas.ver', 'cotizaciones', 'Ver las privadas de otros',
   'Ver las cotizaciones privadas que crearon otras personas (por origen; pide también cotizaciones.ver). Sin él, la privada de otro no aparece en ninguna lista, búsqueda ni ficha',
   true, false, 'policy cotizaciones: leer, puede_cotizacion, _cotizaciones_ids_por_titulo, buscador_cotizaciones, vehiculo_relacionados, lead_relacionados', 221)
on conflict (clave) do update
  set modulo = excluded.modulo, nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen,
      con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, orden = excluded.orden;

insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select r.id, 'cotizaciones.privadas.ver', null, 'todos' from public.roles r where r.clave = 'dueno'
on conflict (rol_id, permiso_clave, origen_id) do nothing;

-- 3. La policy: la de siempre y, además, la regla de la privada (es la misma que repartir la marca entre «todos» y la cartera: la propia siempre se ve).
drop policy "cotizaciones: leer" on public.cotizaciones;
create policy "cotizaciones: leer" on public.cotizaciones for select to authenticated using (
  eliminado_en is null
  and (not privada
       or creado_por = (select auth.uid())
       or origen_id = any ((select public.origenes_con_alcance('cotizaciones.privadas.ver', 'propios'))::uuid[]))
  and (origen_id = any ((select public.origenes_con_alcance('cotizaciones.ver', 'todos'))::uuid[])
       or (origen_id = any ((select public.origenes_con_alcance('cotizaciones.ver', 'propios'))::uuid[])
           and (creado_por = (select auth.uid()) or public.en_cartera(lead_id)))));

-- 4. La regla de una fila, para todo lo que pide ver (o editar) una cotización: la heredan las RPC, las policies de las tablas hijas y del bucket.

CREATE OR REPLACE FUNCTION public.puede_cotizacion(p_cot uuid, p_clave text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((
    select case public.alcance_de(p_clave, c.origen_id)
             when 'todos' then true
             when 'propios' then c.creado_por = (select auth.uid()) or public.en_cartera(c.lead_id)
             else false
           end
           -- La privada de otra persona, sólo con cotizaciones.privadas.ver de su origen, con cualquier clave: para el resto no existe.
           and (not c.privada or c.creado_por = (select auth.uid()) or public.tiene_permiso('cotizaciones.privadas.ver', c.origen_id))
      from public.cotizaciones c
     where c.id = p_cot and c.eliminado_en is null
  ), false);
$function$;

comment on function public.puede_cotizacion(uuid, text) is
  'Si quien llama puede usar esa cotización con esa clave (cotizaciones.ver o cotizaciones.editar): por el alcance del origen («todos», o «propios» = la creó o su lead está en su cartera), fuera de la papelera, y una privada (`privada`) la ven sólo quien la creó y quien tiene cotizaciones.privadas.ver de su origen: para el resto no existe. Lo usan las RPC que piden ver una cotización y las policies de sus tablas hijas y del bucket.';

-- 5. Las copias de la policy en las definer (sin la RLS): la misma regla, también en la ventana de candidatas (una privada ajena no ocupa su lugar).

CREATE OR REPLACE FUNCTION public._cotizaciones_ids_por_titulo(p_texto text, p_origen uuid DEFAULT NULL::uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET plan_cache_mode TO 'force_generic_plan'
AS $function$
declare
  v_yo constant uuid := (select auth.uid());
  v_t uuid[];
  v_p uuid[];
  v_pv uuid[];
  v_solo_propios uuid[];
  v_texto text;
  v_patron text;
  v_ids uuid[] := array[]::uuid[];
begin
  if v_yo is null then
    return array[]::uuid[];
  end if;
  select i.texto into v_texto from public._buscador_interpretar(p_texto) i;
  if v_texto is null then
    return array[]::uuid[];
  end if;
  v_t := coalesce((select public.origenes_con_alcance('cotizaciones.ver', 'todos')), '{}');
  v_p := coalesce((select public.origenes_con_alcance('cotizaciones.ver', 'propios')), '{}');
  v_pv := coalesce((select public.origenes_con_alcance('cotizaciones.privadas.ver', 'propios')), '{}');
  -- El origen del listado sólo estrecha.
  if p_origen is not null then
    v_t := case when p_origen = any (v_t) then array[p_origen] else array[]::uuid[] end;
    v_p := case when p_origen = any (v_p) then array[p_origen] else array[]::uuid[] end;
  end if;
  if cardinality(v_t) = 0 and cardinality(v_p) = 0 then
    return array[]::uuid[];
  end if;
  v_patron := '%' || replace(replace(replace(v_texto, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  -- `cotizaciones_titulo_trgm`: a lo sumo 1.000 candidatas de los orígenes que se ven, antes del resto de la visibilidad.
  v_ids := array(
    select c.id from public.cotizaciones c
     where c.titulo ilike v_patron and c.eliminado_en is null and c.origen_id = any (v_t || v_p)
       and (not c.privada or c.creado_por = v_yo or c.origen_id = any (v_pv))
     limit 1000);
  -- Las propias, por `cotizaciones_creador_idx (creado_por, creado_en desc, id desc) where eliminado_en is null`, sólo donde se tiene «propios» sin «todos».
  v_solo_propios := array(select unnest(v_p) except select unnest(v_t));
  if cardinality(v_solo_propios) > 0 then
    v_ids := v_ids || array(
      select c.id from public.cotizaciones c
       where c.creado_por = v_yo and c.eliminado_en is null and c.origen_id = any (v_solo_propios) and c.titulo ilike v_patron
       order by c.creado_en desc, c.id desc
       limit 51);
  end if;
  if cardinality(v_ids) = 0 then
    return array[]::uuid[];
  end if;
  -- La policy «cotizaciones: leer», tal cual, sobre las candidatas (por la PK): no nombra lo que quien llama no ve.
  return array(
    select c.id from public.cotizaciones c
     where c.id = any (v_ids)
       and c.eliminado_en is null
       and (not c.privada or c.creado_por = v_yo or c.origen_id = any (v_pv))
       and (c.origen_id = any (v_t)
            or (c.origen_id = any (v_p) and (c.creado_por = v_yo or public.en_cartera(c.lead_id))))
     order by c.creado_en desc, c.id desc
     limit 51);
end $function$;

CREATE OR REPLACE FUNCTION public.buscador_cotizaciones(p_texto text, p_tamano integer)
 RETURNS TABLE(id uuid, numero bigint, origen_id uuid, titulo text, clase clase_cotizacion, estado estado_cotizacion, creado_en timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_yo constant uuid := (select auth.uid());
  v_n constant integer := public._acotar_pagina(p_tamano, 5, 20);
  v_t uuid[];
  v_p uuid[];
  v_pv uuid[];
  v_solo_propios uuid[];
  b record;
  v_patron text;
  v_ids uuid[] := '{}'::uuid[];
begin
  if v_yo is null then
    return;
  end if;
  select i.numero, i.texto into b from public._buscador_interpretar(p_texto) i;
  if b.numero is null and b.texto is null then
    return;
  end if;
  v_t := coalesce((select public.origenes_con_alcance('cotizaciones.ver', 'todos')), '{}');
  v_p := coalesce((select public.origenes_con_alcance('cotizaciones.ver', 'propios')), '{}');
  v_pv := coalesce((select public.origenes_con_alcance('cotizaciones.privadas.ver', 'propios')), '{}');
  if cardinality(v_t) = 0 and cardinality(v_p) = 0 then
    return;
  end if;
  -- El número exacto, por `cotizaciones_numero_key`.
  if b.numero is not null then
    v_ids := array(select c.id from public.cotizaciones c where c.numero = b.numero and c.eliminado_en is null);
  end if;
  if b.texto is not null then
    v_patron := '%' || replace(replace(replace(b.texto, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    -- El título, por `cotizaciones_titulo_trgm`: a lo sumo 1.000 candidatas de los orígenes que quien llama ve, antes del resto de la visibilidad
    -- (sin el filtro de origen, 1.000 de otros orígenes con el mismo título dejaban fuera las que sí le corresponden).
    v_ids := v_ids || array(
      select c.id from public.cotizaciones c
       where c.titulo ilike v_patron and c.eliminado_en is null and c.origen_id = any (v_t || v_p)
         and (not c.privada or c.creado_por = v_yo or c.origen_id = any (v_pv))
       limit 1000);
    -- Las propias, por `cotizaciones_creador_idx (creado_por, creado_en desc, id desc) where eliminado_en is null`, sólo donde quien llama tiene «propios» sin
    -- «todos»: encuentra las suyas aunque el título lo compartan miles de ajenas que no ve. Donde ve «todos» no corre (recorría todas sus propias con un título
    -- raro): ahí, con más de 1.000 coincidencias, las suyas no tienen prioridad. Crece con las propias de quien busca, no con N (límite declarado en RENDIMIENTO).
    v_solo_propios := array(select unnest(v_p) except select unnest(v_t));
    if cardinality(v_solo_propios) > 0 then
      v_ids := v_ids || array(
        select c.id from public.cotizaciones c
         where c.creado_por = v_yo and c.eliminado_en is null and c.origen_id = any (v_solo_propios) and c.titulo ilike v_patron
         order by c.creado_en desc, c.id desc
         limit v_n + 1);
    end if;
  end if;
  if cardinality(v_ids) = 0 then
    return;
  end if;
  -- La policy «cotizaciones: leer», tal cual, sobre las candidatas (por la PK).
  return query
    select c.id, c.numero, c.origen_id, c.titulo, c.clase, c.estado, c.creado_en
      from public.cotizaciones c
     where c.id = any (v_ids)
       and c.eliminado_en is null
       and (not c.privada or c.creado_por = v_yo or c.origen_id = any (v_pv))
       and (c.origen_id = any (v_t)
            or (c.origen_id = any (v_p) and (c.creado_por = v_yo or public.en_cartera(c.lead_id))))
     order by (c.numero = b.numero) desc nulls last, c.creado_en desc, c.id desc
     limit v_n + 1;
end $function$;

CREATE OR REPLACE FUNCTION public.vehiculo_relacionados(p_vehiculo uuid, p_primeros integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET random_page_cost TO '1.1'
AS $function$
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
  v_pv uuid[] := public.origenes_con_alcance('cotizaciones.privadas.ver', 'propios');
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
         -- Una privada ajena que no se ve no entra a la ventana: no cuenta ni como oculta.
         and (not c.privada or c.creado_por = v_yo or c.origen_id = any (v_pv))
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
$function$;

CREATE OR REPLACE FUNCTION public.vehiculo_relacionados_pagina(p_vehiculo uuid, p_tipo text, p_cursor_en timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid, p_tamano integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET random_page_cost TO '1.1'
AS $function$
declare
  v_yo uuid := (select auth.uid());
  v_alcance public.alcance_permiso := public.alcance_de('leads.ver');
  v_fuera uuid[] := public._bajas_en_curso();
  v_global boolean := public.tiene_permiso('leads.numero_global.ver');
  v_edita boolean := public.alcance_de('leads.editar') is not null;
  v_n int := public._acotar_pagina(p_tamano, 20, 20) + 1;
  v_todos uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_propios uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  v_pv uuid[] := public.origenes_con_alcance('cotizaciones.privadas.ver', 'propios');
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
               and (not c1.privada or c1.creado_por = v_yo or c1.origen_id = any (v_pv))
               and not exists (
                 select 1 from public.cotizaciones c2
                  where c2.vehiculo_id = c1.vehiculo_id and c2.lead_id = c1.lead_id
                    and c2.eliminado_en is null and c2.estado in ('activa', 'reportada')
                    and (c2.creado_en, c2.id) > (c1.creado_en, c1.id)
                    and (c2.origen_id = any (v_todos)
                         or (c2.origen_id = any (v_propios) and (c2.creado_por = v_yo or public.en_cartera(c2.lead_id))))
                    and (not c2.privada or c2.creado_por = v_yo or c2.origen_id = any (v_pv))) as visible
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
               and (not c1.privada or c1.creado_por = v_yo or c1.origen_id = any (v_pv))
               and not exists (
                 select 1 from public.cotizaciones c2
                  where c2.vehiculo_id = c1.vehiculo_id and c2.lead_id = c1.lead_id
                    and c2.eliminado_en is null and c2.estado in ('activa', 'reportada')
                    and (c2.creado_en, c2.id) > (c1.creado_en, c1.id)
                    and (c2.origen_id = any (v_todos)
                         or (c2.origen_id = any (v_propios) and (c2.creado_por = v_yo or public.en_cartera(c2.lead_id))))
                    and (not c2.privada or c2.creado_por = v_yo or c2.origen_id = any (v_pv))) as visible
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
$function$;

CREATE OR REPLACE FUNCTION public.lead_relacionados(p_lead uuid, p_primeros integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET random_page_cost TO '1.1'
AS $function$
declare
  v_yo uuid := (select auth.uid());
  v_n int := public._acotar_pagina(p_primeros, 3, 5);
  v_vtodos uuid[] := public.origenes_con_alcance('vehiculos.ver', 'todos');
  v_vpropios uuid[] := public.origenes_con_alcance('vehiculos.ver', 'propios');
  v_ctodos uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_cpropios uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  v_pv uuid[] := public.origenes_con_alcance('cotizaciones.privadas.ver', 'propios');
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
         -- Una privada ajena que no se ve no entra a la ventana: no cuenta ni como oculta.
         and (not c.privada or c.creado_por = v_yo or c.origen_id = any (v_pv))
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
$function$;

CREATE OR REPLACE FUNCTION public.lead_relacionados_pagina(p_lead uuid, p_tipo text, p_cursor_en timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid, p_tamano integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET random_page_cost TO '1.1'
AS $function$
declare
  v_yo uuid := (select auth.uid());
  v_n int := public._acotar_pagina(p_tamano, 20, 20) + 1;
  v_vtodos uuid[] := public.origenes_con_alcance('vehiculos.ver', 'todos');
  v_vpropios uuid[] := public.origenes_con_alcance('vehiculos.ver', 'propios');
  v_ctodos uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_cpropios uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  v_pv uuid[] := public.origenes_con_alcance('cotizaciones.privadas.ver', 'propios');
  v_cartera boolean := public.en_cartera(p_lead);
  c refcursor;
  r record;
  v_ids uuid[] := array[]::uuid[];
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
               and (not c1.privada or c1.creado_por = v_yo or c1.origen_id = any (v_pv))
               and not exists (
                 select 1 from public.cotizaciones c2
                  where c2.vehiculo_id = c1.vehiculo_id and c2.lead_id = c1.lead_id
                    and c2.eliminado_en is null and c2.estado in ('activa', 'reportada')
                    and (c2.creado_en, c2.id) > (c1.creado_en, c1.id)
                    and (c2.origen_id = any (v_ctodos)
                         or (c2.origen_id = any (v_cpropios) and (c2.creado_por = v_yo or v_cartera)))
                    and (not c2.privada or c2.creado_por = v_yo or c2.origen_id = any (v_pv))) as visible
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
               and (not c1.privada or c1.creado_por = v_yo or c1.origen_id = any (v_pv))
               and not exists (
                 select 1 from public.cotizaciones c2
                  where c2.vehiculo_id = c1.vehiculo_id and c2.lead_id = c1.lead_id
                    and c2.eliminado_en is null and c2.estado in ('activa', 'reportada')
                    and (c2.creado_en, c2.id) > (c1.creado_en, c1.id)
                    and (c2.origen_id = any (v_ctodos)
                         or (c2.origen_id = any (v_cpropios) and (c2.creado_por = v_yo or v_cartera)))
                    and (not c2.privada or c2.creado_por = v_yo or c2.origen_id = any (v_pv))) as visible
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
$function$;

-- 6. Las lecturas invocadoras (el listado, la lista agrupada, la búsqueda): la RLS decide qué se ve, también la marca, sobre la fila que cada ruta ya leyó
-- por su índice (ningún índice sirve a la marca: lo leído de más crece con la proporción de privadas ajenas, docs/RENDIMIENTO.md). Suman `privada` al final de
-- lo que devuelven: la insignia sale sin otra lectura. Cambiar lo que devuelve pide drop y create (con `create or replace` quedaría otra firma).

drop function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean, uuid);

CREATE OR REPLACE FUNCTION public.cotizaciones_listado(p_tamano integer, p_origen uuid DEFAULT NULL::uuid, p_clase clase_cotizacion DEFAULT NULL::clase_cotizacion, p_mias boolean DEFAULT false, p_vehiculo uuid DEFAULT NULL::uuid, p_cursor_en timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid, p_hacia_atras boolean DEFAULT false, p_lead uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, numero bigint, origen_id uuid, lead_id uuid, vehiculo_id uuid, creado_por uuid, clase clase_cotizacion, estado estado_cotizacion, titulo text, total_base numeric, moneda_mostrar character, creado_en timestamp with time zone, vence_el date, vencida boolean, privada boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  -- MAXIMO_DE_PAGINA_DE_COTIZACIONES (src/modules/cotizaciones/entities/listado/listado.ts) por defecto; hasta 100, lo medido; más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 50, 100) + 1;
  v_uid uuid := (select auth.uid());
  v_t uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_p uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  v_clases public.clase_cotizacion[] := case when p_clase is null then enum_range(null::public.clase_cotizacion) else array[p_clase] end;
  v_mias_en uuid[]; v_ver uuid[]; v_zona text; v_dias integer; v_hoy date;
  -- Con el lead, la ruta es la del lead y el vehículo, si llega, es un filtro sobre sus filas (4.17-4a).
  v_final boolean := p_clase is not distinct from 'final'; v_por_lead boolean := p_lead is not null; v_por_vehiculo boolean := p_vehiculo is not null and p_lead is null; v_todos boolean;
  v_listado boolean; v_finales boolean; v_por_origen boolean; v_origen_finales boolean; v_propias boolean; v_cartera boolean;
begin
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del listado está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_p := array(select x from unnest(v_p) x where x <> all (v_t));
  if p_origen is not null then
    v_t := case when p_origen = any (v_t) then array[p_origen] else '{}' end;
    v_p := case when p_origen = any (v_p) then array[p_origen] else '{}' end;
    v_todos := false;
  else
    v_todos := cardinality(v_t) > 0 and not exists (select 1 from public.origenes o where o.id <> all (v_t));
  end if;
  v_ver := v_t || v_p;
  v_mias_en := case when p_mias then v_ver else v_p end;
  -- La clase nunca es columna de un índice (`enum_eq` no es leakproof: bajo la RLS no sería condición de índice): la final va por sus parciales, con `'final'` literal.
  v_listado := not p_mias and not v_por_vehiculo and not v_por_lead and v_todos and not v_final;
  v_finales := not p_mias and not v_por_vehiculo and not v_por_lead and v_todos and v_final;
  v_por_origen := not p_mias and not v_por_vehiculo and not v_por_lead and not v_todos and cardinality(v_t) > 0 and not v_final;
  v_origen_finales := not p_mias and not v_por_vehiculo and not v_por_lead and not v_todos and cardinality(v_t) > 0 and v_final;
  v_propias := not v_por_vehiculo and not v_por_lead and cardinality(v_mias_en) > 0;
  v_cartera := not p_mias and not v_por_vehiculo and not v_por_lead and cardinality(v_p) > 0;
  select e.zona_horaria, e.vigencia_dias into v_zona, v_dias from public.ajustes_empresa e where e.id = 1;
  v_hoy := (now() at time zone v_zona)::date;

  if p_cursor_en is null then
    return query
    with filas as (
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_listado_idx
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_finales_idx
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_origen_creado_idx
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_origen_finales_idx
        where v_origen_finales)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases)
        order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_creador_idx
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases)
          order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_lead_creado_idx
        where v_cartera)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_por_vehiculo and c.vehiculo_id = p_vehiculo and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_vehiculo_creado_idx
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (p_vehiculo is null or c.vehiculo_id = p_vehiculo) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_lead_creado_idx
    )
    select f.id, f.numero, f.origen_id, f.lead_id, f.vehiculo_id, f.creado_por, f.clase, f.estado, f.titulo, f.total_base, f.moneda_mostrar, f.creado_en,
           (f.creado_en at time zone v_zona)::date + v_dias, (f.creado_en at time zone v_zona)::date + v_dias < v_hoy, f.privada
      from filas f order by f.creado_en desc, f.id desc limit v_n;
  elsif not p_hacia_atras then
    return query
    with filas as (
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n) x
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n) x
        where v_origen_finales)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
        order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
          order by c.creado_en desc, c.id desc limit v_n) x
        where v_cartera)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_por_vehiculo and c.vehiculo_id = p_vehiculo and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (p_vehiculo is null or c.vehiculo_id = p_vehiculo) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
        order by c.creado_en desc, c.id desc limit v_n))
    select f.id, f.numero, f.origen_id, f.lead_id, f.vehiculo_id, f.creado_por, f.clase, f.estado, f.titulo, f.total_base, f.moneda_mostrar, f.creado_en,
           (f.creado_en at time zone v_zona)::date + v_dias, (f.creado_en at time zone v_zona)::date + v_dias < v_hoy, f.privada
      from filas f order by f.creado_en desc, f.id desc limit v_n;
  else
    -- Hacia atrás: lo estrictamente anterior, en orden ascendente (`armarPagina` lo da vuelta).
    return query
    with filas as (
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n) x
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n) x
        where v_origen_finales)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
        order by c.creado_en, c.id limit v_n)
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
          order by c.creado_en, c.id limit v_n) x
        where v_cartera)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_por_vehiculo and c.vehiculo_id = p_vehiculo and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (p_vehiculo is null or c.vehiculo_id = p_vehiculo) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
        order by c.creado_en, c.id limit v_n))
    select f.id, f.numero, f.origen_id, f.lead_id, f.vehiculo_id, f.creado_por, f.clase, f.estado, f.titulo, f.total_base, f.moneda_mostrar, f.creado_en,
           (f.creado_en at time zone v_zona)::date + v_dias, (f.creado_en at time zone v_zona)::date + v_dias < v_hoy, f.privada
      from filas f order by f.creado_en, f.id limit v_n;
  end if;
end $function$;

revoke all on function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean, uuid) from public, anon;
grant execute on function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean, uuid) to authenticated, service_role;

comment on function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean, uuid) is
  'Una página del listado /cotizaciones de la más nueva a la más vieja (creado_en desc, id desc), por cursor (hacia atrás, en orden ascendente), con los filtros origen, clase, mías (las que creó quien mira), vehículo y lead, y la vigencia (vence_el, vencida) de cotizacion_hoja_guardada. Corre como quien la llama: la RLS decide qué se ve; cada ruta (lo de «todos», lo propio, la cartera de mis_leads(), el vehículo, el lead) va por su índice; con el lead, una sola ruta y el vehículo como filtro. Sin el snapshot; con la marca privada. Una privada (`privada`) la ven sólo quien la creó y quien tiene cotizaciones.privadas.ver de su origen: para el resto no existe (lo decide la RLS). Lo mide supabase/tests/medir-cotizaciones-listado.sql.';

drop function public.cotizaciones_listado_por_vehiculo(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean);

CREATE OR REPLACE FUNCTION public.cotizaciones_listado_por_vehiculo(p_tamano integer, p_origen uuid DEFAULT NULL::uuid, p_clase clase_cotizacion DEFAULT NULL::clase_cotizacion, p_mias boolean DEFAULT false, p_lead uuid DEFAULT NULL::uuid, p_cursor_en timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid, p_hacia_atras boolean DEFAULT false)
 RETURNS TABLE(tipo text, orden_en timestamp with time zone, orden_id uuid, id uuid, numero bigint, origen_id uuid, lead_id uuid, vehiculo_id uuid, creado_por uuid, clase clase_cotizacion, estado estado_cotizacion, titulo text, total_base numeric, moneda_mostrar character, creado_en timestamp with time zone, vence_el date, vencida boolean, grupo_n integer, privada boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  -- MAXIMO_DE_PAGINA_DE_COTIZACIONES (src/modules/cotizaciones/entities/listado/listado.ts), más una para saber si hay otra.
  v_meta integer := public._acotar_pagina(p_tamano, 50, 50) + 1;
  -- Lo más que se recorre para una página: sin completarla, `cortada`.
  c_recorrido constant integer := 2020;
  v_uid uuid := (select auth.uid());
  v_clases public.clase_cotizacion[] := case when p_clase is null then enum_range(null::public.clase_cotizacion) else array[p_clase] end;
  v_ids uuid[] := array[]::uuid[];
  v_lote integer;
  v_pedidas integer;
  v_vino integer;
  v_leidas integer := 0;
  v_en timestamptz := p_cursor_en;
  v_id uuid := p_cursor_id;
  v_cortada boolean := false;
  -- Hacia adelante: los vehículos ya vistos en esta lectura y cuántas suyas se leyeron, y si se leyó todo (sin cursor y hasta el final: el conteo sale de ahí).
  v_vistos uuid[] := array[]::uuid[];
  v_cuantas integer[] := array[]::integer[];
  v_todo boolean := false;
  v_pos integer;
  v_hay boolean;
  v_zona text;
  v_dias integer;
  v_hoy date;
  r record;
begin
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del listado está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_lote := 4 * v_meta;
  loop
    v_pedidas := least(v_lote, c_recorrido - v_leidas);
    v_vino := 0;
    -- Con y sin sentido, dos consultas: cada una recorre su lote en su orden. Una cotización sin vehículo es una suelta; una con vehículo es cabeza si quien mira no
    -- ve otra más nueva del mismo vehículo que coincida. Hacia adelante se recorre de la más nueva a la más vieja: la primera de un vehículo en esta lectura es la
    -- única candidata (las siguientes tienen una más nueva que ya pasó), y sólo hace falta preguntar por las anteriores al cursor (la sonda, con `limit 1`: nunca
    -- `exists`); sin cursor, ni eso.
    if not p_hacia_atras then
      for r in
        select l.id, l.vehiculo_id, l.creado_en
          from public._cotizaciones_lote_del_listado(v_pedidas, p_origen, p_clase, p_mias, p_lead, v_en, v_id, false) l
         order by l.creado_en desc, l.id desc
      loop
        v_vino := v_vino + 1;
        v_en := r.creado_en;
        v_id := r.id;
        if r.vehiculo_id is null then
          v_ids := v_ids || r.id;
        else
          v_pos := array_position(v_vistos, r.vehiculo_id);
          if v_pos is not null then
            v_cuantas[v_pos] := v_cuantas[v_pos] + 1;
          else
            v_vistos := v_vistos || r.vehiculo_id;
            v_cuantas := v_cuantas || 1;
            v_hay := null;
            if p_cursor_en is not null then
              select true into v_hay from public.cotizaciones c2
               where c2.vehiculo_id = r.vehiculo_id and (c2.creado_en, c2.id) >= (p_cursor_en, p_cursor_id)
                 and c2.clase = any (v_clases) and (p_origen is null or c2.origen_id = p_origen)
                 and (not p_mias or c2.creado_por = v_uid) and (p_lead is null or c2.lead_id = p_lead)
               order by c2.creado_en, c2.id limit 1;  -- cotizaciones_vehiculo_creado_idx
            end if;
            if v_hay is null then
              v_ids := v_ids || r.id;
            end if;
          end if;
        end if;
        exit when cardinality(v_ids) >= v_meta;
      end loop;
    else
      for r in
        select l.id, l.vehiculo_id, l.creado_en, s.hay
          from public._cotizaciones_lote_del_listado(v_pedidas, p_origen, p_clase, p_mias, p_lead, v_en, v_id, true) l
          left join lateral (
            select true as hay from public.cotizaciones c2
             where c2.vehiculo_id = l.vehiculo_id and (c2.creado_en, c2.id) > (l.creado_en, l.id)
               and c2.clase = any (v_clases) and (p_origen is null or c2.origen_id = p_origen)
               and (not p_mias or c2.creado_por = v_uid) and (p_lead is null or c2.lead_id = p_lead)
             order by c2.creado_en, c2.id limit 1) s on true  -- cotizaciones_vehiculo_creado_idx
         order by l.creado_en, l.id
      loop
        v_vino := v_vino + 1;
        v_en := r.creado_en;
        v_id := r.id;
        if r.vehiculo_id is null or r.hay is null then
          v_ids := v_ids || r.id;
          exit when cardinality(v_ids) >= v_meta;
        end if;
      end loop;
    end if;
    v_leidas := v_leidas + v_vino;
    -- La página está llena, o el lote vino incompleto: no hay más (y, sin cursor ni página llena, se leyó todo lo que coincide).
    v_todo := not p_hacia_atras and p_cursor_en is null and cardinality(v_ids) < v_meta and v_vino < v_pedidas;
    exit when cardinality(v_ids) >= v_meta or v_vino < v_pedidas;
    if v_leidas >= c_recorrido then
      v_cortada := true;
      exit;
    end if;
    v_lote := least(2 * v_lote, c_recorrido - v_leidas);
  end loop;

  -- La vigencia, espejo de `cotizaciones_listado()`: si una cambia, cambia la otra.
  select e.zona_horaria, e.vigencia_dias into v_zona, v_dias from public.ajustes_empresa e where e.id = 1;
  v_hoy := (now() at time zone v_zona)::date;

  -- Lo derivado, sobre las ≤ 51 cabezas ya elegidas: la que representa al grupo (la aprobada que coincide, por cotizaciones_aprobadas_pkey, o la cabeza) por
  -- la PK, y el conteo acotado del grupo por cotizaciones_vehiculo_creado_idx (o lo leído, si se leyó todo). Todo con la RLS de quien mira. Cada lectura es un lateral con `limit`: así el
  -- planificador no la aplana en un hash join que recorre `cotizaciones` entera (con el plan genérico no sabe cuántas cabezas trae el arreglo).
  return query
  select case when n.vehiculo_id is null then 'suelta' else 'grupo' end,
         n.creado_en, n.id,
         h.id, h.numero, h.origen_id, h.lead_id, h.vehiculo_id, h.creado_por, h.clase, h.estado, h.titulo, h.total_base, h.moneda_mostrar, h.creado_en,
         (h.creado_en at time zone v_zona)::date + v_dias, (h.creado_en at time zone v_zona)::date + v_dias < v_hoy,
         case when n.vehiculo_id is null then null
              -- Se leyó todo lo que coincide: el conteo es lo leído de su vehículo (acotado como el otro), sin volver a pasar la RLS por sus filas.
              when v_todo then least(v_cuantas[array_position(v_vistos, n.vehiculo_id)], 101)
              else (select count(*)::integer
                      from (select 1 from public.cotizaciones c3
                             where c3.vehiculo_id = n.vehiculo_id
                               and c3.clase = any (v_clases) and (p_origen is null or c3.origen_id = p_origen)
                               and (not p_mias or c3.creado_por = v_uid) and (p_lead is null or c3.lead_id = p_lead)
                             order by c3.creado_en desc, c3.id desc limit 101) z)  -- cotizaciones_vehiculo_creado_idx
         end,
         h.privada
    from unnest(v_ids) with ordinality u (id, k)
   cross join lateral (
     select c.id, c.vehiculo_id, c.creado_en from public.cotizaciones c where c.id = u.id limit 1  -- cotizaciones_pkey
   ) n
   cross join lateral (
     (select a.id, a.numero, a.origen_id, a.lead_id, a.vehiculo_id, a.creado_por, a.clase, a.estado, a.titulo, a.total_base, a.moneda_mostrar, a.creado_en, a.privada
        from public.cotizaciones_aprobadas ap
       cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
           from public.cotizaciones c
          where c.id = ap.cotizacion_id  -- cotizaciones_pkey
            and c.clase = any (v_clases) and (p_origen is null or c.origen_id = p_origen)
            and (not p_mias or c.creado_por = v_uid) and (p_lead is null or c.lead_id = p_lead)
          limit 1) a
       where ap.vehiculo_id = n.vehiculo_id)  -- cotizaciones_aprobadas_pkey
     union all
     (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada
        from public.cotizaciones c where c.id = n.id)  -- cotizaciones_pkey
     limit 1
   ) h
   order by u.k;

  if v_cortada then
    return query
    select 'cortada'::text, v_en, v_id, null::uuid, null::bigint, null::uuid, null::uuid, null::uuid, null::uuid, null::public.clase_cotizacion,
           null::public.estado_cotizacion, null::text, null::numeric, null::character, null::timestamptz, null::date, null::boolean, null::integer, null::boolean;
  end if;
end $function$;

revoke all on function public.cotizaciones_listado_por_vehiculo(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) from public, anon;
grant execute on function public.cotizaciones_listado_por_vehiculo(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) to authenticated, service_role;

comment on function public.cotizaciones_listado_por_vehiculo(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) is
  'Una página de la lista /cotizaciones agrupada por vehículo (docs/UX.md › «Cotizaciones»): grupos (la cabeza: la cotización más reciente de un vehículo que quien mira ve y coincide) y sueltas (sin vehículo), de la más nueva a la más vieja por cursor (orden_en, orden_id), con los filtros del listado. Recorre lotes de _cotizaciones_lote_del_listado (las rutas e índices de cotizaciones_listado()) con una sonda por cotizaciones_vehiculo_creado_idx, hasta llenar la página o leer 2.020 (entonces una fila cortada con dónde siguió). Cada grupo trae su aprobada si quien mira la ve y coincide (cotizaciones_aprobadas_pkey), si no la cabeza, y su conteo acotado a 101 (cotizaciones_vehiculo_creado_idx). No lee vehiculos. Corre como quien la llama: la RLS decide (también la marca privada). Lo mide supabase/tests/medir-cotizaciones-listado-por-vehiculo.sql.';

drop function public.cotizaciones_buscar(text, integer, uuid, public.clase_cotizacion, boolean, uuid, uuid, timestamptz, uuid, boolean);

CREATE OR REPLACE FUNCTION public.cotizaciones_buscar(p_texto text, p_tamano integer, p_origen uuid DEFAULT NULL::uuid, p_clase clase_cotizacion DEFAULT NULL::clase_cotizacion, p_mias boolean DEFAULT false, p_vehiculo uuid DEFAULT NULL::uuid, p_lead uuid DEFAULT NULL::uuid, p_cursor_en timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid, p_hacia_atras boolean DEFAULT false)
 RETURNS TABLE(id uuid, numero bigint, origen_id uuid, lead_id uuid, vehiculo_id uuid, creado_por uuid, clase clase_cotizacion, estado estado_cotizacion, titulo text, total_base numeric, moneda_mostrar character, creado_en timestamp with time zone, vence_el date, vencida boolean, acotada boolean, privada boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  -- MAXIMO_DE_PAGINA_DE_COTIZACIONES (src/modules/cotizaciones/entities/listado/listado.ts) por defecto; hasta 100, lo medido; más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 50, 100) + 1;
  -- TOPE_DE_COINCIDENCIAS (src/modules/cotizaciones/entities/listado/listado.ts): cuántos clientes, vehículos o autores nombra una búsqueda.
  v_tope constant integer := 50;
  v_uid uuid := (select auth.uid());
  -- Los orígenes donde quien busca ve «todos» y todos los que ve: lo ajeno sólo se busca por autor donde ve «todos» (abajo).
  v_todos uuid[] := coalesce((select public.origenes_con_alcance('cotizaciones.ver', 'todos')), '{}');
  v_ver uuid[] := coalesce((select public.origenes_con_alcance('cotizaciones.ver', 'propios')), '{}');
  b record;
  v_patron text;
  v_candidatos uuid[];
  v_leads uuid[] := '{}'::uuid[];
  v_vehiculos uuid[] := '{}'::uuid[];
  v_autores uuid[] := '{}'::uuid[];
  v_titulos uuid[] := '{}'::uuid[];
  v_acotada boolean;
  v_clases public.clase_cotizacion[] := case when p_clase is null then enum_range(null::public.clase_cotizacion) else array[p_clase] end;
  v_zona text; v_dias integer; v_hoy date;
  v_sentido text := case when p_hacia_atras then 'asc' else 'desc' end;
  v_cursor text := case
    when p_cursor_en is null then ''
    when p_hacia_atras then 'and (c.creado_en, c.id) > ($12, $13)'
    else 'and (c.creado_en, c.id) < ($12, $13)' end;
  v_filtros text;
  v_columnas constant text := 'c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en, c.privada';
  v_ruta text;
begin
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del listado está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  if v_uid is null then
    return;
  end if;
  -- Qué se busca: un número (con o sin #) y/o un texto de 3 letras o dígitos seguidos (`_buscador_interpretar`, el mismo mínimo del buscador).
  select i.numero, i.texto into b from public._buscador_interpretar(p_texto) i;
  if b.numero is null and b.texto is null then
    return;
  end if;
  if b.texto is not null then
    v_patron := '%' || replace(replace(replace(b.texto, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    -- Los clientes: la ventana de `leads_candidatos()` (índice de trigramas de `leads.nombre`) con sólo el texto, pasada por `leads_vista_por_ids()`: la RLS de
    -- leads es el único filtro. Sin `leads.ver` no hay candidatos.
    v_candidatos := array(
      select j.x::uuid
        from jsonb_array_elements_text(public.leads_candidatos(jsonb_build_object('texto', b.texto, 'sentido', 'siguiente')) -> 'ids') with ordinality j (x, o)
       order by j.o);
    v_leads := array(
      select u.id from unnest(v_candidatos) with ordinality u (id, o)
       where u.id in (select v.id from public.leads_vista_por_ids(v_candidatos) v)
       order by u.o limit v_tope + 1);
    -- Los vehículos que quien busca ve, por origen, por `vehiculos_origen_listado_idx (origen_id, creado_en desc, id desc) where eliminado_en is null`.
    v_vehiculos := array(
      select v.id
        from unnest(public.origenes_con_alcance('vehiculos.ver', 'propios')) o (id)
       cross join lateral (
         select x.id, x.creado_en from public.vehiculos x
          where x.origen_id = o.id and x.eliminado_en is null
            and (x.titulo ilike v_patron or x.vin ilike v_patron or x.lote ilike v_patron)
          order by x.creado_en desc, x.id desc
          limit v_tope + 1) v
       order by v.creado_en desc, v.id desc
       limit v_tope + 1);
    -- Las personas del equipo por nombre (decenas de filas: sin índice propio), sin tildes.
    v_autores := array(
      select p.id from public.perfiles p
       where public._sin_tildes(p.nombre) ilike public._sin_tildes(v_patron)
       order by p.nombre, p.id
       limit v_tope + 1);
    -- Las cotizaciones por su título (T307): un ayudante definer por `cotizaciones_titulo_trgm` (bajo la RLS el `ilike` no es condición de índice) que sólo
    -- nombra las que quien busca ve, hasta v_tope + 1. Abajo se leen otra vez por la PK, bajo la RLS.
    v_titulos := public._cotizaciones_ids_por_titulo(p_texto, p_origen);
  end if;
  v_acotada := cardinality(v_leads) > v_tope or cardinality(v_vehiculos) > v_tope or cardinality(v_autores) > v_tope
               or cardinality(v_titulos) > v_tope;
  v_leads := v_leads[1:v_tope];
  v_vehiculos := v_vehiculos[1:v_tope];
  v_autores := v_autores[1:v_tope];
  v_titulos := v_titulos[1:v_tope];
  select e.zona_horaria, e.vigencia_dias into v_zona, v_dias from public.ajustes_empresa e where e.id = 1;
  v_hoy := (now() at time zone v_zona)::date;
  -- Lo que todas las rutas comparten: los filtros del listado y el cursor. Los valores van por `using`.
  v_filtros := ' and c.clase = any ($6) and ($5 is null or c.origen_id = $5) and (not $7 or c.creado_por = $8) and ($9 is null or c.vehiculo_id = $9) and ($10 is null or c.lead_id = $10) '
    || v_cursor || ' order by c.creado_en ' || v_sentido || ', c.id ' || v_sentido || ' limit $11';
  v_ruta := 'select ' || v_columnas || ' from public.cotizaciones c where ';
  return query execute
    'with filas as ('
    -- El número, por `cotizaciones_numero_key`.
    || '(' || v_ruta || 'c.numero = $1' || v_filtros || ')'
    -- Cada cliente, por `cotizaciones_lead_creado_idx (lead_id, creado_en desc, id desc)`.
    || ' union all (select x.* from unnest($2) l (id) cross join lateral (' || v_ruta || 'c.lead_id = l.id' || v_filtros || ') x)'
    -- Cada vehículo, por `cotizaciones_vehiculo_creado_idx (vehiculo_id, creado_en desc, id desc) where eliminado_en is null`.
    || ' union all (select x.* from unnest($3) v (id) cross join lateral (' || v_ruta || 'c.vehiculo_id = v.id' || v_filtros || ') x)'
    -- Cada autor, por `cotizaciones_creador_idx (creado_por, creado_en desc, id desc) where eliminado_en is null`. Las propias, en todo lo que se ve; las de otra persona, sólo donde se
    -- ve «todos»: con «propios» se verían las de su cartera, y encontrarlas pagaría `en_cartera()` por cada cotización de esa persona (7.000 de un asesor: 98 ms y 6.900 llamadas
    -- para no encontrar nada). Sin ningún origen donde buscar, ni se lee el índice; si no, `origen_id = any(...)` (un operador seguro) corre antes que la RLS.
    || ' union all (select x.* from unnest($4) a (id) cross join lateral (select o from (select case when a.id = $8 then $19 else $18 end as o) y where cardinality(y.o) > 0) z cross join lateral ('
    || v_ruta || 'c.creado_por = a.id and c.origen_id = any (z.o)' || v_filtros || ') x)'
    -- Cada cotización nombrada por su título, por la PK.
    || ' union all (select x.* from unnest($20) t (id) cross join lateral (' || v_ruta || 'c.id = t.id' || v_filtros || ') x)'
    || ') select d.id, d.numero, d.origen_id, d.lead_id, d.vehiculo_id, d.creado_por, d.clase, d.estado, d.titulo, d.total_base, d.moneda_mostrar, d.creado_en,'
    || ' (d.creado_en at time zone $14)::date + $15, (d.creado_en at time zone $14)::date + $15 < $16, $17, d.privada'
    || ' from (select distinct on (f.id) f.* from filas f) d'
    || ' order by d.creado_en ' || v_sentido || ', d.id ' || v_sentido || ' limit $11'
    using b.numero, v_leads, v_vehiculos, v_autores, p_origen, v_clases, coalesce(p_mias, false), v_uid, p_vehiculo, p_lead, v_n, p_cursor_en, p_cursor_id,
          v_zona, v_dias, v_hoy, v_acotada, v_todos, v_ver || v_todos, v_titulos;
end $function$;

revoke all on function public.cotizaciones_buscar(text, integer, uuid, public.clase_cotizacion, boolean, uuid, uuid, timestamptz, uuid, boolean) from public, anon;
grant execute on function public.cotizaciones_buscar(text, integer, uuid, public.clase_cotizacion, boolean, uuid, uuid, timestamptz, uuid, boolean) to authenticated, service_role;

comment on function public.cotizaciones_buscar(text, integer, uuid, public.clase_cotizacion, boolean, uuid, uuid, timestamptz, uuid, boolean) is
  'La búsqueda del listado /cotizaciones: por número exacto (cotizaciones_numero_key), por cliente (leads_candidatos y leads_vista_por_ids, cotizaciones_lead_creado_idx), por vehículo (título, VIN o lote, vehiculos_origen_listado_idx y cotizaciones_vehiculo_creado_idx), por quien la creó (por nombre en perfiles, cotizaciones_creador_idx) y por el título de la cotización (_cotizaciones_ids_por_titulo, cotizaciones_titulo_trgm, y la página por la PK), de la más nueva a la más vieja (creado_en desc, id desc), sin repetir, por cursor y con los filtros del listado. Invocadora: la RLS decide qué se ve (también la marca privada) y qué se puede nombrar. Cada fuente nombra hasta 50 ids (el más nuevo primero); acotada dice si alguna se pasó. Por autor, la de otra persona sólo se busca donde se ve «todos» (con «propios» se verían las de la cartera, a un en_cartera() por cotización). Mínimo de _buscador_interpretar. Lo mide supabase/tests/medir-cotizaciones-buscar.sql.';

-- 7. Hacerla privada o pública: sólo quien la creó, con la versión que tenía en pantalla. Candados en el orden común (vehículo → las cotizaciones por id →
-- el de la aprobada). La versión, la revisión ({privada: {de, a}}) y la actividad las dejan los triggers de siempre.
create function public.cotizacion_privada_cambiar(p_cotizacion uuid, p_privada boolean, p_actualizado_en_esperado timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  c record;
  v_final boolean;
  v_aprobada boolean;
begin
  perform public.assert_activo();
  -- Ver antes de tomar nada: lo que no se ve da el mismo 42501 que lo que no existe.
  select x.id, x.vehiculo_id, x.hermana_id, x.creado_por into c from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if c.creado_por is distinct from v_yo then
    raise exception 'Sólo quien la creó la hace privada o pública.' using errcode = '42501';
  end if;
  if p_privada is null then
    raise exception 'Elige si la cotización es privada o pública.' using errcode = '22023', hint = 'privada';
  end if;
  if c.vehiculo_id is not null then
    perform 1 from public.vehiculos v where v.id = c.vehiculo_id for key share;
  end if;
  -- Ella y su hermana (comparten la marca), por id.
  perform 1 from public.cotizaciones x where x.id in (c.id, c.hermana_id) order by x.id for no key update;
  select x.id, x.vehiculo_id, x.hermana_id, x.creado_por, x.clase, x.privada, x.actualizado_en into c
    from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado,
                                 'Alguien cambió esta cotización mientras la mirabas. Recarga e intenta de nuevo.');
  if c.privada = p_privada then
    return jsonb_build_object('resultado', 'sin_cambios', 'privada', c.privada, 'actualizado_en', c.actualizado_en);
  end if;
  if p_privada then
    select exists (select 1 from public.cotizaciones x where x.id in (c.id, c.hermana_id) and x.clase = 'final') into v_final;
    if v_final then
      raise exception 'Una final no se hace privada.' using errcode = '23514';
    end if;
    -- La aprobada de un vehículo nunca es privada: se mira con su candado (aprobar y reponer lo toman).
    perform public._aprobada_candado(array[c.vehiculo_id]);
    select exists (select 1 from public.cotizaciones_aprobadas a where a.cotizacion_id in (c.id, c.hermana_id)) into v_aprobada;
    if v_aprobada then
      raise exception 'Es la aprobada de su vehículo: no se hace privada.' using errcode = '23514';
    end if;
  end if;
  update public.cotizaciones x set privada = p_privada where x.id in (c.id, c.hermana_id) and x.privada is distinct from p_privada;
  return (select jsonb_build_object('resultado', 'cambiada', 'privada', x.privada, 'actualizado_en', x.actualizado_en)
            from public.cotizaciones x where x.id = c.id);
end $$;
revoke all on function public.cotizacion_privada_cambiar(uuid, boolean, timestamptz) from public, anon;
grant execute on function public.cotizacion_privada_cambiar(uuid, boolean, timestamptz) to authenticated, service_role;
comment on function public.cotizacion_privada_cambiar(uuid, boolean, timestamptz) is
  'Hace privada o pública una cotización (y su hermana: comparten la marca). Pide verla (42501, también si no existe o está en la papelera) y ser quien la creó (42501 «Sólo quien la creó…»); sin la marca, 22023 (hint privada); la versión (PT409). Una final o la aprobada de su vehículo no se hacen privadas (23514). Candados: el vehículo (for key share), ella y su hermana por id (for no key update) y, al hacerla privada, el de la aprobada. La versión, la revisión y la actividad las dejan los triggers. {resultado: cambiada | sin_cambios, privada, actualizado_en}.';

-- 8. Crear: la marca al guardar (atómico: crear y después marcar dejaría un momento en que se ve). Una final privada, 22023.

drop function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean, text, boolean);

CREATE OR REPLACE FUNCTION public.cotizacion_crear(p_id uuid, p_origen uuid, p_lead uuid, p_entradas jsonb, p_abierta text, p_vehiculo uuid DEFAULT NULL::uuid, p_vehiculo_nuevo jsonb DEFAULT NULL::jsonb, p_modo_tc text DEFAULT NULL::text, p_clase clase_cotizacion DEFAULT 'preventa'::clase_cotizacion, p_con_la_abierta boolean DEFAULT false, p_ver_total_bs boolean DEFAULT false, p_titulo text DEFAULT NULL::text, p_titulo_manual boolean DEFAULT false, p_privada boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_yo uuid := (select auth.uid());
  c public.cotizaciones;
  a record;
  v_formula uuid; v_uso uuid; v_vuelta int := 0; v_version int; v_fdo uuid; v_otra text;
  v_ab_formula uuid; v_ab_en timestamptz; v_ab_huella text;
  v_veh uuid := p_vehiculo;
  v_modo jsonb;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb;
  v_k text; v_opc text;
  v_res jsonb;
  v_total_base numeric;
  v_constraint text;
  v_ids uuid[]; v_tomadas uuid[];
  v_titulo text := nullif(btrim(p_titulo), '');
  v_titulo_manual boolean;
  -- Lo fija `cotizacion_crear_en_par` (la opción por su posición, la hermana y la hora); nulo fuera de ella.
  v_par jsonb := nullif(current_setting('importadora.en_par', true), '')::jsonb;
  v_par_nodo text; v_par_clave text; v_par_etiqueta text; v_tope int;
begin
  perform public.assert_activo();
  if p_id is null or p_origen is null then
    raise exception 'Faltan el identificador y el origen de la cotización.' using errcode = '22023';
  end if;
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  -- Cotizar pide también ver: con sólo `crear` la hoja no tiene nada que mostrar (4-32). Después de `crear`: quien no cotiza ahí sigue recibiendo ese permiso en el error.
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  -- D2: la hoja que se abrió. La firma la base (`cotizacion_hoja()`): trae la versión de la fórmula y la hora de la apertura, y no se puede inventar (4-27).
  if p_abierta is null then
    raise exception 'Falta la hoja que abriste: ábrela de nuevo.' using errcode = '22023', hint = 'abierta';
  end if;
  if p_clase = 'final' then
    perform public.assert_permiso('cotizaciones.final.gestionar', p_origen);
  end if;
  -- Una final nunca es privada (cotizaciones_final_no_privada).
  if coalesce(p_privada, false) and p_clase = 'final' then
    raise exception 'Una final no se hace privada.' using errcode = '22023', hint = 'privada';
  end if;

  -- El intento: dos llamadas con el mismo id se ordenan acá (la segunda espera a que la primera confirme). Sólo una cotización MÍA, de este origen y viva se devuelve; un id ajeno
  -- no se mira (sería una sonda barata de ids): sigue y choca con la clave en el `insert`.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.origen_id = p_origen and x.eliminado_en is null;
  if found then
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- La hoja abierta: su firma, su versión, su hora y la huella de las tarifas que vio. Después del intento: un reintento vuelve lo guardado aunque la clave haya rotado o la hoja sea vieja.
  select l.formula_id, l.abierta_en, l.huella into v_ab_formula, v_ab_en, v_ab_huella from public._cotizacion_abierta_leer(p_abierta, p_origen) l;

  -- 4.25-1b, C1.1: una final sin vehículo, antes de mirar el lead (el mismo error que abajo).
  if p_clase = 'final' and p_vehiculo is null and p_vehiculo_nuevo is null then
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- El lead (comprobar, bloquear y volver a comprobar: nadie bloquea un lead que no ve).
  -- Sin lead sólo con `cotizaciones.crear.sin_lead` de ese origen, y nunca una final.
  if p_lead is null then
    if p_clase = 'final' or not public.tiene_permiso('cotizaciones.crear.sin_lead', p_origen) then
      raise exception 'Elige el lead de la cotización.' using errcode = '22023', hint = 'lead';
    end if;
  else
    if not public.puede_lead(p_lead, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    if p_clase = 'final' then
      -- 4.25-1b, una final mira sin candado lo que mira marcar (C1): el lead en la cartera con leads.editar (P2 a) y, con un vehículo del inventario, que lo
      -- vea (antes que nada que delate su final, su vínculo o sus preventas) y, en la ayudante, otra final activa (P7 a), las preventas que no puede mandar a la
      -- papelera (P3 a) y el vínculo de otro lead (P4 a). Después toma el lead como marcar (no key update); una preventa, como siempre (key share).
      if not public.puede_actuar_lead(p_lead, 'leads.editar') then
        raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
      end if;
      if p_vehiculo is not null and p_vehiculo_nuevo is null then
        if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
          raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
        end if;
        v_ids := array(select z.id from public.cotizaciones z where z.vehiculo_id = p_vehiculo and z.eliminado_en is null order by z.id);
        perform public._final_crear_mirar(p_vehiculo, p_lead, v_ids);
      end if;
      perform 1 from public.leads l where l.id = p_lead and l.eliminado_en is null for no key update;
    else
      perform 1 from public.leads l where l.id = p_lead and l.eliminado_en is null for key share;
    end if;
    if not found or not public.puede_lead(p_lead, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
  end if;

  -- El vehículo.
  if p_vehiculo is not null and p_vehiculo_nuevo is not null then
    raise exception 'Elige un vehículo del inventario o carga uno a mano, no los dos.' using errcode = '22023', hint = 'vehiculo';
  end if;
  if p_vehiculo_nuevo is not null then
    if jsonb_typeof(p_vehiculo_nuevo) <> 'object' or (p_vehiculo_nuevo - array['id', 'datos', 'consulta']) <> '{}'::jsonb
       or coalesce(p_vehiculo_nuevo ->> 'id', '') !~ c_uuid
       or (p_vehiculo_nuevo ? 'consulta' and coalesce(p_vehiculo_nuevo ->> 'consulta', '') !~ c_uuid)
       or (p_vehiculo_nuevo ? 'datos' and jsonb_typeof(p_vehiculo_nuevo -> 'datos') <> 'object') then
      raise exception 'El vehículo a mano lleva su identificador y sus datos.' using errcode = '22023', hint = 'vehiculo';
    end if;
    v_veh := (p_vehiculo_nuevo ->> 'id')::uuid;
    -- En su propia sentencia y antes de armar: `_cotizacion_armar()` es STABLE y ve lo que esta transacción ya escribió.
    perform public.vehiculo_crear(v_veh, p_origen, coalesce(p_vehiculo_nuevo -> 'datos', '{}'::jsonb), (p_vehiculo_nuevo ->> 'consulta')::uuid, 'cotizar');
  elsif p_vehiculo is not null then
    perform public._cotizacion_vehiculo(p_vehiculo);
  elsif p_clase = 'final' or not public.tiene_permiso('cotizaciones.crear.sin_vehiculo', p_origen) then
    -- Sin la clave de ese origen el vehículo es obligatorio; una final lo pide siempre.
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- El título, después del lead y del vehículo (T307): manual si trae texto y lo pide (sin vehículo no hay automático: el texto que llega es manual); si no, el del
  -- vehículo cortado a 120 puntos de código (`tituloAutomatico()` es su espejo). Sin vehículo y sin título, no se guarda.
  v_titulo_manual := v_titulo is not null and (coalesce(p_titulo_manual, false) or v_veh is null);
  if v_titulo_manual then
    if char_length(v_titulo) > 120 then
      raise exception 'El título tiene como máximo 120 caracteres.' using errcode = '22023', detail = 'titulo_largo', hint = 'titulo';
    end if;
  else
    v_titulo := null;
    if v_veh is not null then
      select nullif(btrim(left(btrim(v.titulo), 120)), '') into v_titulo from public.vehiculos v where v.id = v_veh;
    end if;
  end if;
  if v_titulo is null and v_veh is null then
    raise exception 'Escribe el título de la cotización.' using errcode = '22023', hint = 'titulo';
  end if;

  -- La fórmula activa y su publicada, `for share` por su id: activar otra espera a esta alta, y si publicaron o activaron mientras esperábamos,
  -- READ COMMITTED descarta la fila que ya cambió y se vuelve a leer.
  loop
    v_vuelta := v_vuelta + 1;
    v_formula := null;
    select d.id into v_fdo from public.formulas_del_origen d where d.origen_id = p_origen and d.activa;   -- formulas_del_origen_activa_unica
    if v_fdo is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas_del_origen d where d.id = v_fdo and d.activa for share;
    if found then
      select f.id into v_formula from public.formulas f where f.formula_del_origen_id = v_fdo and f.estado = 'publicada';   -- formulas_publicada_unica
      if v_formula is null then
        perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
      end if;
      perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    end if;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  -- D2: la hoja se abrió sobre otra versión que la publicada. Sin «Guardar con la N», se avisa y no se guarda; con ella, se usa esa versión (publicada o archivada de este origen, y reciente).
  -- «Con la abierta» vale siempre dentro de las 24 h de la apertura (4-27): con la versión vigente sólo cambia algo si una tarifa cambió desde entonces, y la hora ya no la elige el cliente.
  v_uso := v_formula;
  if v_ab_formula is distinct from v_formula then
    select f.version into v_version from public.formulas f where f.id = v_formula;
    if not p_con_la_abierta then
      -- La abierta es de otra fórmula del origen: mientras cotizaba se activó la de ahora (formulas_pkey y formulas_del_origen_pkey).
      select d.nombre into v_otra from public.formulas ab, public.formulas_del_origen d
       where ab.id = v_ab_formula and ab.formula_del_origen_id is distinct from v_fdo and d.id = v_fdo;
      if v_otra is not null then
        raise exception 'Se activó la fórmula «%» mientras cotizabas: ahora se cotiza con su versión %.', v_otra, v_version using errcode = 'PT409', detail = 'desactualizada', hint = 'formula';
      end if;
      raise exception 'Se publicó la versión % de la hoja mientras cotizabas.', v_version using errcode = 'PT409', detail = 'desactualizada', hint = 'formula';
    end if;
    perform public._cotizacion_abierta(p_origen, v_ab_formula, v_ab_en);
    -- `for share`, como la publicada: archivada ya no cambia, pero el candado ordena esta alta con quien la borre (un origen que se elimina).
    perform 1 from public.formulas f where f.id = v_ab_formula and f.estado in ('publicada', 'archivada') for share;
    if not found then
      raise exception 'La versión de la hoja que abriste ya no está disponible: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_no_disponible', hint = 'abierta';
    end if;
    v_uso := v_ab_formula;
  elsif p_con_la_abierta then
    perform public._cotizacion_abierta(p_origen, v_ab_formula, v_ab_en);
  end if;

  select * into a from public._cotizacion_armar(p_entradas, null, p_origen, v_veh, v_uso, v_ab_en, p_con_la_abierta);
  if a.formula_id is distinct from v_uso then
    raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
  end if;
  -- D2 (4-33): las tarifas de la apertura que ARMAR reconstruyó del historial son las que la hoja vio. Un cambio que confirmó después de abrirla con un
  -- `cambiado_en` anterior (una transacción larga) entra en la reconstrucción sin haberse visto: la huella firmada no coincide. Va en una sentencia posterior a ARMAR,
  -- con una foto igual o más nueva: lo que ARMAR vio, la huella lo ve. Con «Guardar con la N», lo que la hoja vio ya no se puede reproducir: recargar.
  if public._cotizacion_huella_tarifas(v_ab_formula, v_ab_en) is distinct from v_ab_huella then
    if p_con_la_abierta then
      raise exception 'Cambió un tipo de cambio mientras abrías la hoja: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_tarifas', hint = 'abierta';
    end if;
    raise exception 'Cambió un tipo de cambio de la hoja mientras cotizabas.' using errcode = 'PT409', detail = 'desactualizada', hint = 'tipo_cambio';
  end if;
  -- D2: algún tipo de cambio que la hoja usa cambió desde que se abrió (ARMAR lo lee en una sola foto con los de hoy).
  if a.tc_cambiado and not p_con_la_abierta then
    raise exception 'Cambió un tipo de cambio de la hoja mientras cotizabas.' using errcode = 'PT409', detail = 'desactualizada', hint = 'tipo_cambio';
  end if;

  -- La variante en par (glosario: «Variante en par»): una versión en par se cotiza sólo en par (`cotizacion_crear_en_par`). La opción la pone la base y el título
  -- lleva su etiqueta: el manual entra si cabe con « · <etiqueta>»; el automático es el del vehículo cortado para que quepa.
  v_par_nodo := public._variante_en_par(a.definicion);
  if v_par is null and v_par_nodo is not null then
    raise exception 'Esta hoja cotiza dos opciones a la vez: ábrela de nuevo.' using errcode = '22023', detail = 'cotizar_en_par', hint = 'variante';
  end if;
  if v_par is not null and v_par_nodo is null then
    raise exception 'Esta hoja ya no cotiza dos opciones a la vez: ábrela de nuevo.' using errcode = '22023', detail = 'sin_par', hint = 'variante';
  end if;
  if v_par_nodo is not null then
    if a.entrada ? 'variante' then
      raise exception 'En esta hoja las dos opciones se cotizan a la vez: la opción no se elige.' using errcode = '22023', detail = 'variante_en_par', hint = 'variante';
    end if;
    select x.o ->> 'clave', x.o ->> 'etiqueta' into v_par_clave, v_par_etiqueta
      from jsonb_array_elements(a.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') with ordinality x (o, k)
     where n ->> 'id' = v_par_nodo and x.k = (v_par ->> 'opcion')::int;
    v_tope := 120 - char_length(' · ' || v_par_etiqueta);
    if v_titulo_manual then
      if char_length(v_titulo) > v_tope then
        raise exception 'El título tiene como máximo % caracteres.', v_tope using errcode = '22023', detail = 'titulo_largo', hint = 'titulo';
      end if;
    elsif v_veh is not null then
      select nullif(btrim(left(btrim(v.titulo), v_tope)), '') into v_titulo from public.vehiculos v where v.id = v_veh;
    end if;
    v_titulo := v_titulo || ' · ' || v_par_etiqueta;
  end if;

  -- El modo de cambio: la clave de uno de los modos del diseño de esa versión, convertido a la forma del motor.
  v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);
  -- «Ver total Bs»: sólo si el diseño de esa versión lo ofrece (y nunca nulo).
  perform public._cotizacion_ver_total_bs(a.formula_id, p_ver_total_bs);

  -- Lo que se ve y lo que se edita (una sola lectura de los niveles) y la revisión de lo tipeado, la misma que hace `cotizacion_evaluar()`.
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb)
    into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  perform public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ctx -> 'ok', v_par_nodo is not null);

  -- Un override de un nodo que no se ve y uno de un nodo que no existe: el mismo error (el primero por id, en bytes).
  select min(k collate "C") into v_k from jsonb_object_keys(a.entrada -> 'overrides') k where not (v_ctx -> 'ok') ? k;
  if v_k is not null then
    raise exception 'La hoja no tiene un nodo «%».', v_k using errcode = '22023', detail = 'nodo_inexistente', hint = v_k;
  end if;
  -- Un valor para un nodo que se ve y no se edita.
  select min(t.k collate "C") into v_k
    from (select jsonb_object_keys(a.entrada -> 'inputs') as k
          union all select jsonb_object_keys(a.entrada -> 'banderas')
          union all select jsonb_object_keys(a.entrada -> 'overrides')) t
   where not v_editables ? t.k;
  if v_k is null and a.entrada ? 'variante' then
    select n ->> 'id' into v_opc from jsonb_array_elements(a.definicion -> 'nodos') n where n ->> 'tipo' = 'opcion' limit 1;
    if v_opc is not null and not v_editables ? v_opc then v_k := v_opc; end if;
  end if;
  if v_k is not null then
    raise exception 'No puedes cambiar «%» en esta hoja.', v_k using errcode = '42501', detail = 'nodo_no_editable', hint = v_k;
  end if;

  -- El cálculo, entero (los nodos que quien llama no ve toman el valor de la fórmula y se guardan igual).
  v_res := public.evaluar_formula(a.definicion, a.params,
                                  case when v_par_clave is null then a.entrada else a.entrada || jsonb_build_object('variante', v_par_clave) end, v_modo);
  -- Lo que el motor descarta de un nodo visible no se guarda en silencio; el total tiene que tener valor, caber y estar en la moneda base: `_cotizacion_guardable()`.
  v_total_base := public._cotizacion_guardable(v_res, a.entrada -> 'overrides');

  -- 4.25-1b, una final (C2.4 y C3): después del cálculo, las vivas del vehículo en una pasada por id (el orden de marcar y de la papelera de cotizaciones);
  -- con todo tomado, otra vez la cartera y la ayudante, que relee el vínculo en una sentencia nueva (otro pudo escribirlo mientras se esperaba).
  if p_clase = 'final' then
    v_tomadas := array(select z.id from public.cotizaciones z where z.vehiculo_id = v_veh and z.eliminado_en is null order by z.id for no key update);
    if not public.puede_actuar_lead(p_lead, 'leads.editar') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    perform public._final_crear_mirar(v_veh, p_lead, v_tomadas);
  end if;

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, ver_total_bs,
                                     titulo, titulo_manual, hermana_id, creado_en, privada)
    values (p_id, p_origen, p_lead, v_veh, v_yo, p_clase, a.formula_id, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, p_modo_tc, p_ver_total_bs, v_titulo, v_titulo_manual, (v_par ->> 'hermana')::uuid,
            coalesce((v_par ->> 'creado_en')::timestamptz, now()), coalesce(p_privada, false))
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_hermana_unica' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_final_por_vehiculo' then
      raise exception 'Este vehículo ya tiene una cotización final activa.' using errcode = '23505', hint = 'vehiculo';
    end if;
    raise;
  end;
  -- 4.25-1b, C4: los efectos de marcar, con todo tomado (la cotización ya es final: el paso 2 no la toca). La respuesta no cambia.
  if p_clase = 'final' then
    perform public._final_aplicar(c, v_tomadas);
  end if;

  return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
end $function$;

revoke all on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean, text, boolean, boolean) from public, anon;
grant execute on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean, text, boolean, boolean) to authenticated, service_role;

comment on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean, text, boolean, boolean) is
  'Crea una cotización calculada en la base (evaluar_formula sobre la fórmula publicada del origen, o sobre la abierta con p_con_la_abierta) y devuelve lo que quien llama ve (_cotizacion_respuesta). Pide cotizaciones.crear y cotizaciones.ver. El lead y el vehículo son obligatorios salvo con cotizaciones.crear.sin_lead y cotizaciones.crear.sin_vehiculo del origen (22023 con hint lead o vehiculo, el lead primero); una final siempre pide los dos. El título (T307): manual con p_titulo_manual y texto (sin vehículo, el texto que llega es manual; más de 120: 22023 detail titulo_largo); si no, el del vehículo cortado a 120; sin vehículo y sin título, 22023 hint titulo (después del lead y del vehículo). Idempotente por el id del intento. D2: PT409 desactualizada si la hoja que se abrió (p_abierta, la de cotizacion_hoja) ya no es la vigente o si las tarifas de la apertura que reconstruye del historial no son las que vio (su huella, _cotizacion_huella_tarifas; con p_con_la_abierta, 22023 abierta_tarifas). «Ver total Bs» (p_ver_total_bs, falso por omisión) sólo vale si el diseño de la versión que se usa lo ofrece (_cotizacion_ver_total_bs). Una final (4.25-1b) deja el estado de marcarla: mira sin candado (el lead en la cartera con leads.editar, ver el vehículo y, en _final_crear_mirar, otra final activa, las preventas que no puede mandar a la papelera y el vínculo de otro lead), toma lead (no key update) → vehículo → fórmula → las vivas del vehículo, vuelve a mirar y aplica _final_aplicar. p_privada (falso por omisión) la crea privada; una final privada, 22023 (hint privada). docs/COTIZADOR.md › «Quién escribe una cotización y cómo (4.10-2)», «Cómo se guarda (4.10-3)» y «La hoja abierta (4.13-3a)».';

drop function public.cotizacion_crear_en_par(uuid[], uuid, uuid, jsonb, text, uuid, text, boolean, boolean, text, boolean);

CREATE OR REPLACE FUNCTION public.cotizacion_crear_en_par(p_ids uuid[], p_origen uuid, p_lead uuid, p_entradas jsonb, p_abierta text, p_vehiculo uuid DEFAULT NULL::uuid, p_modo_tc text DEFAULT NULL::text, p_con_la_abierta boolean DEFAULT false, p_ver_total_bs boolean DEFAULT false, p_titulo text DEFAULT NULL::text, p_titulo_manual boolean DEFAULT false, p_privada boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_yo uuid := (select auth.uid());
  v_a uuid := p_ids[1]; v_b uuid := p_ids[2];
  v_ok boolean; ca public.cotizaciones; cb public.cotizaciones; v_mias int;
  r1 jsonb; r2 jsonb; v_creado timestamptz;
begin
  perform public.assert_activo();
  if p_origen is null then
    raise exception 'Faltan el identificador y el origen de la cotización.' using errcode = '22023';
  end if;
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  v_ok := coalesce(array_length(p_ids, 1), 0) = 2 and v_a is not null and v_b is not null and v_a <> v_b;
  if v_ok is not true then
    raise exception 'Una cotización en par lleva dos identificadores distintos.' using errcode = '22023', hint = 'ids';
  end if;
  perform public._entradas_en_par(p_entradas);

  -- El intento: los dos ids, en orden de id (el candado de `cotizacion_crear` para cada uno). Dos MÍAS, vivas, de este origen y hermanas entre sí son las de este
  -- intento; una sola, o dos que no son hermanas, un intento que ya se usó. Un id ajeno no se mira: choca con la clave al insertar.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || least(v_a, v_b)::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || greatest(v_a, v_b)::text, 0));
  select * into ca from public.cotizaciones x where x.id = v_a and x.creado_por = v_yo and x.origen_id = p_origen and x.eliminado_en is null;
  select * into cb from public.cotizaciones x where x.id = v_b and x.creado_por = v_yo and x.origen_id = p_origen and x.eliminado_en is null;
  v_mias := (case when ca.id is null then 0 else 1 end) + (case when cb.id is null then 0 else 1 end);
  if v_mias = 2 and ca.hermana_id = v_b and cb.hermana_id = v_a then
    return jsonb_build_object('cotizaciones', jsonb_build_array(public._cotizacion_respuesta(ca), public._cotizacion_respuesta(cb)), 'repetido', true);
  end if;
  if v_mias > 0 then
    raise exception 'Ese intento ya se usó para otra cotización.' using errcode = '22023', detail = 'intento_reusado', hint = 'intento';
  end if;

  -- Una por opción: los pasos y candados de `cotizacion_crear` (lead, vehículo y fórmula: la segunda vez no esperan). «Desactualizada», «Guardar con la N» y las
  -- tarifas fallan en la primera, para las dos; cualquier error deshace las dos.
  perform set_config('importadora.en_par', jsonb_build_object('opcion', 1, 'hermana', v_b)::text, true);
  r1 := public.cotizacion_crear(v_a, p_origen, p_lead, p_entradas -> 0, p_abierta, p_vehiculo, null, p_modo_tc, 'preventa', p_con_la_abierta, p_ver_total_bs,
                                p_titulo, p_titulo_manual, p_privada);
  select x.creado_en into v_creado from public.cotizaciones x where x.id = v_a;
  perform set_config('importadora.en_par', jsonb_build_object('opcion', 2, 'hermana', v_a, 'creado_en', v_creado + interval '1 microsecond')::text, true);
  r2 := public.cotizacion_crear(v_b, p_origen, p_lead, p_entradas -> 1, p_abierta, p_vehiculo, null, p_modo_tc, 'preventa', p_con_la_abierta, p_ver_total_bs,
                                p_titulo, p_titulo_manual, p_privada);
  perform set_config('importadora.en_par', '', true);
  return jsonb_build_object('cotizaciones', jsonb_build_array(r1 - 'repetido', r2 - 'repetido'), 'repetido', false);
end $function$;

revoke all on function public.cotizacion_crear_en_par(uuid[], uuid, uuid, jsonb, text, uuid, text, boolean, boolean, text, boolean, boolean) from public, anon;
grant execute on function public.cotizacion_crear_en_par(uuid[], uuid, uuid, jsonb, text, uuid, text, boolean, boolean, text, boolean, boolean) to authenticated, service_role;

comment on function public.cotizacion_crear_en_par(uuid[], uuid, uuid, jsonb, text, uuid, text, boolean, boolean, text, boolean, boolean) is
  'Crea las dos cotizaciones hermanas de una versión con su variante en par, en una transacción (glosario: «Cotizaciones hermanas»): p_ids, los dos ids del cliente (el intento: dos mías, vivas, hermanas, se devuelven con repetido); p_entradas, un arreglo con lo tipeado de cada opción, sin la variante (entradas_invalidas). Llama a cotizacion_crear una vez por opción con importadora.en_par (la opción por su posición, la hermana y, la segunda, la hora de la primera + 1 µs). Siempre preventa; p_privada, las dos privadas (comparten la marca). Devuelve {cotizaciones: [la de la primera opción, la de la segunda], repetido}. docs/COTIZADOR.md › «Quién escribe una cotización y cómo».';

-- Cotizar encima hereda la marca (quien cotiza encima es el autor de la nueva y puede hacerla pública).

CREATE OR REPLACE FUNCTION public.cotizacion_encima(p_id uuid, p_anterior uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_yo uuid := (select auth.uid());
  c public.cotizaciones; ant public.cotizaciones; a record;
  v_formula uuid; v_vuelta int := 0; v_enc uuid; v_fdo uuid;
  v_lleva jsonb; v_modo_tc text; v_bs boolean; v_res jsonb; v_total_base numeric; v_constraint text; v_desc int;
  v_lead uuid; v_vehiculo uuid; v_tomas int := 0;
  -- Lo fija `cotizacion_encima_en_par` (la posición de la opción, la hermana nueva y la hora); nulo fuera de ella.
  v_par jsonb := nullif(current_setting('importadora.en_par', true), '')::jsonb;
  v_par_nodo text; v_par_clave text; v_par_etiqueta text; v_ant_etiqueta text; v_titulo text; v_tope int;
begin
  perform public.assert_activo();
  if p_id is null or p_anterior is null then
    raise exception 'Faltan el identificador y la cotización anterior.' using errcode = '22023';
  end if;
  -- La anterior, antes que todo lo demás: una que no existe, está en la papelera o no se ve da el mismo error, con o sin permiso de cotizar y vea o no su lead.
  if not public.puede_cotizacion(p_anterior, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into ant from public.cotizaciones x where x.id = p_anterior;
  perform public.assert_permiso('cotizaciones.crear', ant.origen_id);
  perform public.assert_permiso('cotizaciones.ver', ant.origen_id);
  -- Cotizar encima es crear: una anterior sin lead pide `cotizaciones.crear.sin_lead` de su origen.
  if ant.lead_id is null then
    if not public.tiene_permiso('cotizaciones.crear.sin_lead', ant.origen_id) then
      raise exception 'La cotización anterior no tiene lead: cotiza una nueva.' using errcode = '22023', hint = 'lead';
    end if;
  elsif not public.puede_lead(ant.lead_id, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;

  -- El intento, como en `cotizacion_crear` (el mismo candado): una mía viva con ese id es la de este intento si es de esta anterior.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.eliminado_en is null;
  if found then
    if c.cotizacion_padre_id is distinct from p_anterior then
      raise exception 'Ese intento ya se usó para otra cotización.' using errcode = '22023', detail = 'intento_reusado', hint = 'intento';
    end if;
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- El orden de candados (lead → vehículo → cotización): el lead y el vehículo de la anterior, leídos sin candado, antes que la anterior `for share` (choca con
  -- guardarla y con mandarla a la papelera). Al revés se cruza en un 40P01 con mandar su vehículo a la papelera, que toma el vehículo y después sus cotizaciones.
  -- Sólo se toma lo que se ve: lo demás falla abajo sin esperar. Con la anterior tomada, otra vez visible y se relee lo que quedó; si mientras se esperaba
  -- cambió su lead o su vehículo, los candados son de otros y se vuelve a tomar.
  loop
    v_tomas := v_tomas + 1;
    v_lead := ant.lead_id;
    v_vehiculo := ant.vehiculo_id;
    if v_lead is not null and public.puede_lead(v_lead, 'leads.ver') then
      perform 1 from public.leads l where l.id = v_lead for key share;
    end if;
    if v_vehiculo is not null and public.puede_vehiculo(v_vehiculo, 'vehiculos.ver') then
      perform 1 from public.vehiculos v where v.id = v_vehiculo for key share;
    end if;
    perform 1 from public.cotizaciones x where x.id = p_anterior and x.eliminado_en is null for share;
    if not found or not public.puede_cotizacion(p_anterior, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    select * into ant from public.cotizaciones x where x.id = p_anterior;
    exit when ant.lead_id is not distinct from v_lead and ant.vehiculo_id is not distinct from v_vehiculo;
    if v_tomas >= 3 then
      raise exception 'La cotización cambió mientras cotizabas encima. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;
  -- Una versión nueva viva por anterior (P3): de la que se ve, su id en el hint; de la que no, sólo que existe (P11).
  select x.id into v_enc from public.cotizaciones x where x.cotizacion_padre_id = p_anterior and x.eliminado_en is null limit 1;   -- cotizaciones_encima_unica
  if v_enc is not null and public.puede_cotizacion(v_enc, 'cotizaciones.ver') then
    raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima', hint = v_enc::text;
  elsif v_enc is not null then
    raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima';
  end if;

  -- El lead (ya tomado: volver a mirar) y el vehículo de la anterior.
  if ant.lead_id is not null then
    perform 1 from public.leads l where l.id = ant.lead_id and l.eliminado_en is null for key share;
    if not found or not public.puede_lead(ant.lead_id, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
  elsif not public.tiene_permiso('cotizaciones.crear.sin_lead', ant.origen_id) then
    raise exception 'La cotización anterior no tiene lead: cotiza una nueva.' using errcode = '22023', hint = 'lead';
  end if;
  if ant.vehiculo_id is not null then
    perform public._cotizacion_vehiculo(ant.vehiculo_id);
  elsif not public.tiene_permiso('cotizaciones.crear.sin_vehiculo', ant.origen_id) then
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- La publicada de la fórmula activa de hoy, `for share` (como en `cotizacion_crear`).
  loop
    v_vuelta := v_vuelta + 1;
    v_formula := null;
    select d.id into v_fdo from public.formulas_del_origen d where d.origen_id = ant.origen_id and d.activa;   -- formulas_del_origen_activa_unica
    if v_fdo is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas_del_origen d where d.id = v_fdo and d.activa for share;
    if found then
      select f.id into v_formula from public.formulas f where f.formula_del_origen_id = v_fdo and f.estado = 'publicada';   -- formulas_publicada_unica
      if v_formula is null then
        perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
      end if;
      perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    end if;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  -- La versión y las tarifas de hoy, con lo que se lleva de la anterior (P2: también lo que quien llama no ve); el modo de la anterior si sigue (si no, el primero de hoy) y
  -- «Ver total Bs» si hoy se ofrece. Un override llevado que el motor descarta no falla (nadie lo mandó): cuenta en `descartados`.
  select * into a from public._cotizacion_armar('{}'::jsonb, null, ant.origen_id, ant.vehiculo_id, v_formula);
  v_lleva := public._cotizacion_lo_que_se_lleva(a.definicion, a.entrada, ant.valores, ant.fuentes);
  v_titulo := ant.titulo;
  -- En par: la opción de su misma posición en el par de hoy, y el título otra vez con la etiqueta de esa opción sobre el de la anterior sin la suya.
  if v_par is not null then
    v_par_nodo := public._variante_en_par(a.definicion);
    if v_par_nodo is null then
      raise exception 'La hoja de hoy no cotiza dos opciones a la vez.' using errcode = '22023', detail = 'sin_par', hint = 'variante';
    end if;
    select x.o ->> 'clave', x.o ->> 'etiqueta' into v_par_clave, v_par_etiqueta
      from jsonb_array_elements(a.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') with ordinality x (o, k)
     where n ->> 'id' = v_par_nodo and x.k = (v_par ->> 'opcion')::int;
    v_lleva := v_lleva || jsonb_build_object('variante', v_par_clave);
    select (select o ->> 'etiqueta' from jsonb_array_elements(f.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') o
             where n ->> 'id' = public._variante_en_par(f.definicion) and o ->> 'clave' = ant.valores ->> (n ->> 'id'))
      into v_ant_etiqueta from public.formulas f where f.id = ant.formula_id;
    if v_ant_etiqueta is not null and right(v_titulo, char_length(' · ' || v_ant_etiqueta)) = ' · ' || v_ant_etiqueta then
      v_titulo := left(v_titulo, char_length(v_titulo) - char_length(' · ' || v_ant_etiqueta));
    end if;
    v_tope := 120 - char_length(' · ' || v_par_etiqueta);
    v_titulo := nullif(btrim(left(v_titulo, v_tope)), '') || ' · ' || v_par_etiqueta;
  end if;
  select coalesce((select m ->> 'clave' from jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m where m ->> 'clave' = ant.modo_tc),
                  case when ant.modo_tc is not null then f.diseno -> 'cabecera' -> 'modos' -> 0 ->> 'clave' end),
         ant.ver_total_bs and coalesce((f.diseno -> 'cabecera' ->> 'ver_total_bs')::boolean, false)
    into v_modo_tc, v_bs from public.formulas f where f.id = v_formula;
  v_res := public.evaluar_formula(a.definicion, a.params, v_lleva, public._cotizacion_modo(v_formula, v_modo_tc));
  v_total_base := public._cotizacion_guardable(v_res, '{}'::jsonb);
  v_desc := public._cotizacion_descartados((select f.definicion from public.formulas f where f.id = ant.formula_id),
                                           coalesce(array(select n.nodo from public._nodos_visibles(ant.formula_id) n), '{}'), ant.valores, ant.fuentes, v_lleva, v_res);

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, ver_total_bs,
                                     titulo, titulo_manual, notas, tarjeta_retoques, cotizacion_padre_id, version, hermana_id, creado_en, privada)
    values (p_id, ant.origen_id, ant.lead_id, ant.vehiculo_id, v_yo, 'preventa', v_formula, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, v_modo_tc, v_bs, v_titulo, ant.titulo_manual, ant.notas, ant.tarjeta_retoques, p_anterior, ant.version + 1,
            (v_par ->> 'hermana')::uuid, coalesce((v_par ->> 'creado_en')::timestamptz, now()), ant.privada)
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_hermana_unica' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_encima_unica' then
      raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima';
    end if;
    raise;
  end;

  return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', false, 'descartados', v_desc);
end $function$;

-- 9. Aprobar una privada la hace pública (con su hermana) en la misma transacción, y sólo si se pide (p_hacerla_publica): una pantalla vieja que no
-- avisó recibe 22023 (hint privada) y abre el aviso. Ella y su hermana se toman for no key update (el candado de escribir: subirlo de for share interbloquea).

drop function public.cotizacion_aprobar(uuid, timestamptz);

CREATE OR REPLACE FUNCTION public.cotizacion_aprobar(p_cotizacion uuid, p_actualizado_en_esperado timestamp with time zone, p_hacerla_publica boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c record;
  k record;
  v_ant record;
  v_ver_ant boolean;
  v_anterior jsonb := null;
  v_version timestamptz;
begin
  perform public.assert_activo();
  -- Ver, y el permiso del origen, antes de tomar nada: quien no puede recibe 42501 sin esperar.
  select x.id, x.vehiculo_id, x.origen_id, x.estado, x.hermana_id into c from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if not public.tiene_permiso('cotizaciones.aprobar', c.origen_id) then
    raise exception 'No tienes permiso para aprobar cotizaciones de este origen.' using errcode = '42501';
  end if;
  if c.vehiculo_id is null then
    raise exception 'Para aprobarla, asígnale un vehículo.' using errcode = '22023', hint = 'vehiculo';
  end if;
  if c.estado = 'invalida' then
    raise exception 'Una cotización inválida no se aprueba: reactívala primero.' using errcode = '23514';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  -- Candados en el orden común: vehículo, la cotización y su hermana por id, y al final el de la aprobada.
  perform 1 from public.vehiculos v where v.id = c.vehiculo_id for key share;
  perform 1 from public.cotizaciones x where x.id in (c.id, c.hermana_id) order by x.id for no key update;
  select x.id, x.numero, x.vehiculo_id, x.estado, x.actualizado_en, x.privada, x.hermana_id into k
    from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if k.vehiculo_id is distinct from c.vehiculo_id or k.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('cotizaciones', k.id, k.actualizado_en, 'esta cotización');
  end if;
  if k.estado = 'invalida' then
    raise exception 'Una cotización inválida no se aprueba: reactívala primero.' using errcode = '23514';
  end if;
  if k.privada and not coalesce(p_hacerla_publica, false) then
    raise exception 'Al aprobarla deja de ser privada.' using errcode = '22023', hint = 'privada';
  end if;
  perform public._aprobada_candado(array[k.vehiculo_id]);

  select a.cotizacion_id into v_ant from public.cotizaciones_aprobadas a where a.vehiculo_id = k.vehiculo_id;
  if found and v_ant.cotizacion_id = k.id then
    return jsonb_build_object('cotizacion', jsonb_build_object('id', k.id, 'numero', k.numero, 'actualizado_en', k.actualizado_en), 'anterior', null);
  end if;

  -- La aprobada nunca es privada: deja de serlo antes de aprobarla (sube su versión y deja su revisión).
  v_version := k.actualizado_en;
  if k.privada then
    update public.cotizaciones x set privada = false where x.id in (k.id, k.hermana_id) and x.privada;
    select x.actualizado_en into v_version from public.cotizaciones x where x.id = k.id;
  end if;
  perform public._aprobada_poner(k.vehiculo_id, k.id);
  perform public.registrar_actividad('cotizacion.aprobada', 'cotizaciones', k.id::text,
    jsonb_build_object('aprobada', v_ant.cotizacion_id), jsonb_build_object('aprobada', k.id), jsonb_build_object('vehiculo', k.vehiculo_id));

  -- La anterior sólo se nombra si quien llama la ve, puede aprobarla (su origen) y sigue activa: es lo que «Deshacer» necesita.
  if v_ant.cotizacion_id is not null then
    select x.id, x.numero, x.origen_id, x.actualizado_en into c
      from public.cotizaciones x where x.id = v_ant.cotizacion_id and x.eliminado_en is null and x.estado <> 'invalida';
    if found then
      v_ver_ant := public.puede_cotizacion(c.id, 'cotizaciones.ver') and public.tiene_permiso('cotizaciones.aprobar', c.origen_id);
      if v_ver_ant then
        v_anterior := jsonb_build_object('id', c.id, 'numero', c.numero, 'actualizado_en', c.actualizado_en);
      end if;
    end if;
  end if;

  return jsonb_build_object('cotizacion', jsonb_build_object('id', k.id, 'numero', k.numero, 'actualizado_en', v_version), 'anterior', v_anterior);
end;
$function$;

revoke all on function public.cotizacion_aprobar(uuid, timestamptz, boolean) from public, anon;
grant execute on function public.cotizacion_aprobar(uuid, timestamptz, boolean) to authenticated, service_role;

comment on function public.cotizacion_aprobar(uuid, timestamptz, boolean) is
  'Aprueba una cotización: pasa a ser la aprobada de su vehículo y la anterior deja de serlo (una por vehículo). Pide ver (42501, también si no existe o está en la papelera) y cotizaciones.aprobar de su origen (42501); sin vehículo 22023 (hint vehiculo); inválida 23514; la versión de esa cotización (PT409); una privada sin p_hacerla_publica, 22023 (hint privada). No mueve su versión ni escribe cotizaciones, salvo una privada: con p_hacerla_publica la hace pública con su hermana (la versión sube y queda su revisión). Deja cotizacion.aprobada en la actividad. Candados: vehículo (for key share), la cotización y su hermana por id (for no key update) y el de la aprobada. {cotizacion: {id, numero, actualizado_en}, anterior: {id, numero, actualizado_en} | null} (la anterior sólo si quien llama la ve, la aprueba y sigue activa).';

-- 10. Marcar final una privada la hace pública, a ella y a su hermana (antes de que la hermana, preventa del mismo vehículo, vaya a la papelera).

CREATE OR REPLACE FUNCTION public._final_aplicar(c cotizaciones, p_tomadas uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_ids uuid[]; v_lote uuid; v_n int := 0; v_lead uuid; v_es_cliente boolean; v_tipo uuid; v_a_cliente boolean := false;
begin
  -- 0. (4.26-1, P7 a) Una tomada con un comprobante vigente no se reemplaza: hay que anularlo antes. Quien llama ya tomó esas filas y emitir toma la misma
  --    fila de la cotización, así que no se cuela un comprobante entre esta mirada y los `update`. El texto no dice cuál (su serie y su número): el
  --    inventario del número global de los leads tomaría a esta ayudante, y a quienes la llaman, por una fuente. La pantalla lo muestra en «Comprobantes».
  if exists (select 1 from public.comprobantes cp where cp.cotizacion_id = any (p_tomadas) and cp.cotizacion_id <> c.id and cp.anulado_en is null) then
    raise exception 'La final actual tiene un comprobante vigente: anúlalo antes de marcar otra final.' using errcode = '23514';
  end if;
  -- 1. La final anterior baja a preventa sólo si se tomó en la pasada: por id, nunca por el vehículo (una final que se confirmó después da 23505 en el paso 2).
  update public.cotizaciones x set clase = 'preventa'
   where x.id = any (p_tomadas) and x.id <> c.id and x.clase = 'final' and x.eliminado_en is null;
  -- 2. La cotización, final y pública (una final nunca es privada); una que ya lo es no se toca. La hermana deja de ser privada con ella.
  update public.cotizaciones x set clase = 'final', privada = false where x.id = c.id and (x.clase <> 'final' or x.privada);
  update public.cotizaciones x set privada = false where x.id = c.hermana_id and x.privada;
  -- 3. Las preventas tomadas (con la que bajó), a un lote de la papelera de quien marca, como `_cotizacion_a_papelera`. Una con comprobante (sólo anulados, por
  --    el paso 0) baja y queda viva: ninguna cotización con comprobante entra a la papelera (4.26-1, P7 a).
  v_ids := array(select x.id from public.cotizaciones x
                  where x.id = any (p_tomadas) and x.id <> c.id and x.clase = 'preventa' and x.eliminado_en is null
                    and not exists (select 1 from public.comprobantes cp where cp.cotizacion_id = x.id)
                  order by x.id);
  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n > 0 then
    insert into public.lotes_papelera (tipo, creado_por) values ('cotizaciones', (select auth.uid())) returning id into v_lote;
    update public.cotizaciones x set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = v_lote where x.id = any (v_ids);
    update public.lotes_papelera l set resumen = jsonb_build_object('cantidad', v_n, 'restaurados', 0, 'purgados', 0) where l.id = v_lote;
    perform public._lote_papelera_tocar(v_lote);
    perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', v_lote::text, null, jsonb_build_object('tipo', 'cotizaciones', 'cantidad', v_n));
  end if;
  -- 4. El vínculo (el historial lo escribe su trigger). Cinturón: si ya es de otro lead, el 23514 de P4 a; si ya es de éste, no se escribe.
  update public.vehiculos v set lead_id = c.lead_id where v.id = c.vehiculo_id and v.lead_id is null;
  if not found then
    select v.lead_id into v_lead from public.vehiculos v where v.id = c.vehiculo_id;
    if v_lead is distinct from c.lead_id then
      raise exception 'Este vehículo está vinculado a otro lead. Desvincúlalo antes de marcar la final.' using errcode = '23514';
    end if;
  end if;
  -- 5. El lead, a cliente: al primer tipo activo de esa clase por orden y nombre (el orden de `_tipo_lead_por_defecto`), si no era de esa clase.
  select t.clase = 'cliente' into v_es_cliente from public.leads l join public.tipos_lead t on t.id = l.tipo_lead_id where l.id = c.lead_id;
  if not coalesce(v_es_cliente, false) then
    select t.id into v_tipo from public.tipos_lead t where t.clase = 'cliente' and t.activo order by t.orden, t.nombre limit 1;
    if v_tipo is null then
      raise exception 'No hay un tipo de lead activo de la clase cliente.' using errcode = '23514';
    end if;
    update public.leads l set tipo_lead_id = v_tipo where l.id = c.lead_id;
    v_a_cliente := true;
  end if;
  -- 6. La actividad.
  perform public.registrar_actividad('cotizacion.final', 'cotizaciones', c.id::text, null,
    jsonb_build_object('vehiculo', c.vehiculo_id, 'preventas_a_papelera', v_n, 'lead_a_cliente', v_a_cliente));
end;
$function$;

comment on function public._final_aplicar(public.cotizaciones, uuid[]) is
  'Los efectos de marcar final, llamado con todo tomado (el lead, el vehículo y las cotizaciones p_tomadas): si otra tomada tiene un comprobante vigente, 23514 (4.26-1); la final anterior tomada baja a preventa, c pasa a final y pública (con su hermana), las preventas tomadas sin comprobante van a un lote de la papelera de quien llama (con uno anulado bajan y quedan vivas), el vehículo sin lead queda con el de c (con otro lead, 23514), el lead pasa al primer tipo activo de la clase cliente y la actividad. No toma candados y escribe cotizaciones sólo por id. De nadie: lo llama cotizacion_marcar_final (y el 4.25-1b, cotizacion_crear).';

-- 11. La aprobada se elige sólo entre las públicas: un vehículo con sólo privadas no tiene aprobada; hacer pública una la vuelve candidata.

CREATE OR REPLACE FUNCTION public._aprobada_reponer(p_vehiculo uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_viva boolean;
  a record;
  c record;
  r record;
begin
  if p_vehiculo is null then
    return;
  end if;
  select exists (select 1 from public.vehiculos v where v.id = p_vehiculo and v.eliminado_en is null) into v_viva;
  if not v_viva then
    delete from public.cotizaciones_aprobadas x where x.vehiculo_id = p_vehiculo;
    return;
  end if;
  -- Activa = con este vehículo, fuera de la papelera, no inválida (la reportada cuenta) y pública.
  select x.cotizacion_id, x.origen_id, x.creado_por, x.lead_id, x.monto, x.moneda into a
    from public.cotizaciones_aprobadas x where x.vehiculo_id = p_vehiculo;
  if found then
    select k.origen_id, k.creado_por, k.lead_id, k.totales into c
      from public.cotizaciones k
     where k.id = a.cotizacion_id and k.vehiculo_id = p_vehiculo and k.eliminado_en is null and k.estado <> 'invalida' and not k.privada;
    if found then
      -- Se queda; sólo se refrescan el primer resultado y las copias si cambiaron.
      select * into r from public._cotizacion_primer_resultado(c.totales);
      if a.origen_id is distinct from c.origen_id or a.creado_por is distinct from c.creado_por or a.lead_id is distinct from c.lead_id
         or a.monto is distinct from r.monto or a.moneda is distinct from r.moneda then
        update public.cotizaciones_aprobadas x
           set origen_id = c.origen_id, creado_por = c.creado_por, lead_id = c.lead_id, monto = r.monto, moneda = r.moneda, actualizado_en = now()
         where x.vehiculo_id = p_vehiculo;
      end if;
      return;
    end if;
  end if;
  -- La más antigua activa (cotizaciones_vehiculo_creado_idx hacia atrás).
  select k.id into c from public.cotizaciones k
   where k.vehiculo_id = p_vehiculo and k.eliminado_en is null and k.estado <> 'invalida' and not k.privada
   order by k.creado_en, k.id limit 1;
  if found then
    perform public._aprobada_poner(p_vehiculo, c.id);
  else
    delete from public.cotizaciones_aprobadas x where x.vehiculo_id = p_vehiculo;
  end if;
end;
$function$;

comment on function public._aprobada_reponer(uuid) is
  'La regla única de la aprobada de un vehículo: si apunta a una cotización activa y pública se queda (refresca monto y copias si cambiaron); si no, pasa a la más antigua activa y pública por (creado_en, id); sin activas, o con el vehículo en la papelera o inexistente, no hay fila. Supone el candado de _aprobada_candado(). De nadie.';

CREATE OR REPLACE FUNCTION public._cotizacion_aprobada_anotar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ids uuid[] := '{}';
  v_actual text;
  v_activa_old boolean;
  v_activa_new boolean;
begin
  if tg_op = 'INSERT' then
    if new.vehiculo_id is not null and new.eliminado_en is null and new.estado <> 'invalida' and not new.privada then
      v_ids := array[new.vehiculo_id];
    end if;
  elsif tg_op = 'DELETE' then
    if old.vehiculo_id is not null then
      v_ids := array[old.vehiculo_id];
    end if;
  else
    v_activa_old := old.vehiculo_id is not null and old.eliminado_en is null and old.estado <> 'invalida' and not old.privada;
    v_activa_new := new.vehiculo_id is not null and new.eliminado_en is null and new.estado <> 'invalida' and not new.privada;
    if new.vehiculo_id is distinct from old.vehiculo_id then
      v_ids := array_remove(array[old.vehiculo_id, new.vehiculo_id], null);
    elsif v_activa_old is distinct from v_activa_new
          or (v_activa_new and (new.totales is distinct from old.totales or new.lead_id is distinct from old.lead_id
                                or new.creado_por is distinct from old.creado_por or new.origen_id is distinct from old.origen_id)) then
      v_ids := array[new.vehiculo_id];
    end if;
  end if;
  if cardinality(v_ids) > 0 then
    v_actual := coalesce(current_setting('importadora.aprobadas_por_reponer', true), '');
    select string_agg(distinct x::text, ',') into v_actual
      from unnest(string_to_array(nullif(v_actual, ''), ',')::uuid[] || v_ids) as x;
    perform set_config('importadora.aprobadas_por_reponer', v_actual, true);
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public._cotizaciones_aprobadas_rellenar()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
  insert into public.cotizaciones_aprobadas (vehiculo_id, cotizacion_id, origen_id, creado_por, lead_id, monto, moneda)
  select distinct on (c.vehiculo_id) c.vehiculo_id, c.id, c.origen_id, c.creado_por, c.lead_id, r.monto, r.moneda
    from public.cotizaciones c
    join public.vehiculos v on v.id = c.vehiculo_id and v.eliminado_en is null
    cross join lateral public._cotizacion_primer_resultado(c.totales) r
   where c.eliminado_en is null and c.estado <> 'invalida' and not c.privada
   order by c.vehiculo_id, c.creado_en, c.id
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$function$;

drop trigger trg_cotizacion_aprobada_anotar on public.cotizaciones;
create trigger trg_cotizacion_aprobada_anotar after insert or delete or update of vehiculo_id, estado, eliminado_en, totales, lead_id, creado_por, origen_id, privada
  on public.cotizaciones for each row execute function public._cotizacion_aprobada_anotar();
drop trigger trg_cotizaciones_aprobadas_al_confirmar on public.cotizaciones;
create constraint trigger trg_cotizaciones_aprobadas_al_confirmar after insert or delete or update of vehiculo_id, estado, eliminado_en, totales, lead_id, creado_por, origen_id, privada
  on public.cotizaciones deferrable initially deferred for each row execute function public._cotizaciones_aprobadas_al_confirmar();

-- 12. Las hermanas comparten la marca (son una sola hoja): el trigger diferido la compara.

CREATE OR REPLACE FUNCTION public._cotizaciones_hermanas_comprobar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  yo public.cotizaciones; h public.cotizaciones; v_ok boolean;
begin
  -- Diferido: al confirmar se mira la fila como quedó (otra sentencia de la transacción pudo cambiarla o borrarla después).
  select * into yo from public.cotizaciones x where x.id = new.id;
  if not found or yo.hermana_id is null then
    return null;
  end if;
  select * into h from public.cotizaciones x where x.id = yo.hermana_id;
  v_ok := found and h.hermana_id = yo.id and h.lead_id is not distinct from yo.lead_id and h.vehiculo_id is not distinct from yo.vehiculo_id
          and h.origen_id = yo.origen_id and h.formula_id = yo.formula_id and h.privada = yo.privada;
  if v_ok is not true then
    raise exception 'Las cotizaciones hermanas se apuntan entre sí y comparten el lead, el vehículo, el origen, la versión de la fórmula y la marca privada.'
      using errcode = '23514', detail = 'hermanas';
  end if;
  return null;
end $function$;

drop trigger trg_cotizaciones_hermanas on public.cotizaciones;
create constraint trigger trg_cotizaciones_hermanas after insert or update of hermana_id, lead_id, vehiculo_id, origen_id, formula_id, privada
  on public.cotizaciones deferrable initially deferred for each row when (new.hermana_id is not null)
  execute function public._cotizaciones_hermanas_comprobar();

-- 13. Una privada no mueve `vehiculos.cotizado_en` (no delata que se cotizó el vehículo); hacerla pública sí.

CREATE OR REPLACE FUNCTION public._vehiculo_cotizado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.vehiculo_id is not null and not new.privada
     and (tg_op = 'INSERT' or new.vehiculo_id is distinct from old.vehiculo_id or old.privada) then
    update public.vehiculos set cotizado_en = now()
     where id = new.vehiculo_id and (cotizado_en is null or cotizado_en < now());
  end if;
  return null;
end;
$function$;

drop trigger trg_vehiculo_cotizado on public.cotizaciones;
create trigger trg_vehiculo_cotizado after insert or update of vehiculo_id, privada on public.cotizaciones
  for each row execute function public._vehiculo_cotizado();

-- La policy de la aprobada no cambia: la aprobada nunca es privada, así que quien ve la cotización ve su fila.
comment on table public.cotizaciones_aprobadas is
  'La cotización aprobada de cada vehículo (una fila por vehículo) con su primer resultado congelado (monto, moneda). Sólo la escriben cotizacion_aprobar() y _aprobada_reponer() (al confirmar, por trg_cotizaciones_aprobadas_al_confirmar). origen_id, creado_por y lead_id son copias de la cotización: su policy espeja «cotizaciones: leer», así que la fila y el monto los ve exactamente quien ve esa cotización. La aprobada nunca es privada (aprobarla la hace pública, una privada no se elige al reponer y la aprobada no se hace privada): la regla de la marca no hace falta en su policy.';

-- 14. «De este vehículo» y las tarjetas de la ficha del vehículo devuelven también la marca, como `cotizaciones_listado()`: la tarjeta dibuja la insignia «Privada».
-- La regla de quién la ve sigue siendo la policy (invocadora). Cambia el tipo de lo que devuelve, así que se borra y se crea otra vez con sus privilegios.
drop function public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid);

create or replace function "public"."cotizaciones_de_este_vehiculo"("p_vehiculo" "uuid", "p_tamano" integer, "p_cursor_en" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "numero" bigint, "origen_id" "uuid", "origen" "text", "clase" "public"."clase_cotizacion", "estado" "public"."estado_cotizacion", "titulo" "text", "total" numeric, "moneda" character, "modo" "text", "autor" "text", "creado_en" timestamp with time zone, "editada_en" timestamp with time zone, "vencida" boolean, "aprobada" boolean, "fijada" boolean, "vence_el" date, "privada" boolean)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
declare
  -- TAMANO_DE_ESTE_VEHICULO / TOPE_DE_ESTE_VEHICULO (src/shared/lib/paginacion.ts): nunca se dibujan más de 100; una más para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 10, 100) + 1;
  v_zona text;
  v_dias integer;
  v_hoy date;
begin
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor de la lista está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  if p_vehiculo is null then
    return;
  end if;
  -- La vigencia (`vencida` y `vence_el`), espejo de `cotizaciones_listado()`: si una cambia, cambia la otra.
  select e.zona_horaria, e.vigencia_dias into v_zona, v_dias from public.ajustes_empresa e where e.id = 1;
  v_hoy := (now() at time zone v_zona)::date;

  if p_cursor_en is null then
    return query
    with filas as (
      (select c.id, c.numero, c.origen_id, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.formula_id, c.modo_tc, c.creado_por,
              c.creado_en, c.actualizado_en, c.privada, false as fijada
         from public.cotizaciones c
        where c.vehiculo_id = p_vehiculo and c.eliminado_en is null
        order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_vehiculo_creado_idx
      union all
      (select c.id, c.numero, c.origen_id, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.formula_id, c.modo_tc, c.creado_por,
              c.creado_en, c.actualizado_en, c.privada, true as fijada
         from public.cotizaciones_aprobadas a
         join public.cotizaciones c on c.id = a.cotizacion_id and c.eliminado_en is null
        where a.vehiculo_id = p_vehiculo)  -- cotizaciones_aprobadas_pkey, cotizaciones_pkey
    ),
    -- El nombre del modo, una vez por versión y modo (casi siempre uno o dos): cada llamada pregunta el permiso.
    modos as (
      select d.formula_id, d.modo_tc, public._nombre_del_modo(d.formula_id, d.modo_tc) as nombre
        from (select distinct x.formula_id, x.modo_tc from filas x where x.modo_tc is not null) d
    )
    select f.id, f.numero, f.origen_id, o.nombre, f.clase, f.estado, f.titulo, f.total_base, f.moneda_mostrar,
           m.nombre,
           -- Espejo de `autorVisible()` (entities/historial-del-vehiculo.ts): su nombre o la parte local de su correo.
           coalesce(nullif(btrim(p.nombre), ''), nullif(split_part(p.email, '@', 1), ''), 'Sin nombre'),
           f.creado_en, f.actualizado_en,
           (f.creado_en at time zone v_zona)::date + v_dias < v_hoy,
           exists (select 1 from public.cotizaciones_aprobadas x where x.cotizacion_id = f.id),  -- cotizaciones_aprobadas_cotizacion_id_key
           f.fijada,
           (f.creado_en at time zone v_zona)::date + v_dias,
           f.privada
      from filas f
      left join public.origenes o on o.id = f.origen_id  -- origenes_pkey
      left join public.perfiles p on p.id = f.creado_por  -- perfiles_pkey
      left join modos m on m.formula_id = f.formula_id and m.modo_tc = f.modo_tc
     order by f.fijada desc, f.creado_en desc, f.id desc;
  else
    return query
    with filas as (
      select c.id, c.numero, c.origen_id, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.formula_id, c.modo_tc, c.creado_por,
             c.creado_en, c.actualizado_en, c.privada
        from public.cotizaciones c
       where c.vehiculo_id = p_vehiculo and c.eliminado_en is null and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
       order by c.creado_en desc, c.id desc limit v_n  -- cotizaciones_vehiculo_creado_idx
    ),
    modos as (
      select d.formula_id, d.modo_tc, public._nombre_del_modo(d.formula_id, d.modo_tc) as nombre
        from (select distinct x.formula_id, x.modo_tc from filas x where x.modo_tc is not null) d
    )
    select f.id, f.numero, f.origen_id, o.nombre, f.clase, f.estado, f.titulo, f.total_base, f.moneda_mostrar,
           m.nombre,
           coalesce(nullif(btrim(p.nombre), ''), nullif(split_part(p.email, '@', 1), ''), 'Sin nombre'),
           f.creado_en, f.actualizado_en,
           (f.creado_en at time zone v_zona)::date + v_dias < v_hoy,
           exists (select 1 from public.cotizaciones_aprobadas x where x.cotizacion_id = f.id),
           false,
           (f.creado_en at time zone v_zona)::date + v_dias,
           f.privada
      from filas f
      left join public.origenes o on o.id = f.origen_id
      left join public.perfiles p on p.id = f.creado_por
      left join modos m on m.formula_id = f.formula_id and m.modo_tc = f.modo_tc
     order by f.creado_en desc, f.id desc;
  end if;
end $$;


alter function public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid) owner to postgres;

comment on function public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid) is 'El bloque «De este vehículo» y las tarjetas de la ficha del vehículo: una página de las cotizaciones de un vehículo que quien mira ve (creado_en desc, id desc) por cotizaciones_vehiculo_creado_idx y, sin cursor, además la aprobada del vehículo (fijada) por cotizaciones_aprobadas_pkey. Corre como quien la llama: la RLS decide. Devuelve el nombre del origen, el del modo (_nombre_del_modo), el autor visible, la versión (editada_en = actualizado_en, para aprobar), la vigencia de cotizaciones_listado() (vencida y vence_el) y la marca privada (la insignia de la tarjeta; una privada ajena sin cotizaciones.privadas.ver no llega). Lo mide supabase/tests/medir-cotizaciones-de-este-vehiculo.sql.';

revoke all on function public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid) from public, anon;
grant execute on function public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid) to authenticated, service_role;
