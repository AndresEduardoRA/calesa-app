-- «De este vehículo» y las tarjetas de la ficha del vehículo: `cotizaciones_de_este_vehiculo()` suma `vence_el` (hasta cuándo vale, la fecha que ya calcula `vencida`),
-- la misma que `cotizaciones_listado()`. Cambia el tipo de lo que devuelve, así que se borra y se crea otra vez con sus privilegios.
drop function public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid);

create or replace function "public"."cotizaciones_de_este_vehiculo"("p_vehiculo" "uuid", "p_tamano" integer, "p_cursor_en" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "numero" bigint, "origen_id" "uuid", "origen" "text", "clase" "public"."clase_cotizacion", "estado" "public"."estado_cotizacion", "titulo" "text", "total" numeric, "moneda" character, "modo" "text", "autor" "text", "creado_en" timestamp with time zone, "editada_en" timestamp with time zone, "vencida" boolean, "aprobada" boolean, "fijada" boolean, "vence_el" date)
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
              c.creado_en, c.actualizado_en, false as fijada
         from public.cotizaciones c
        where c.vehiculo_id = p_vehiculo and c.eliminado_en is null
        order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_vehiculo_creado_idx
      union all
      (select c.id, c.numero, c.origen_id, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.formula_id, c.modo_tc, c.creado_por,
              c.creado_en, c.actualizado_en, true as fijada
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
           (f.creado_en at time zone v_zona)::date + v_dias
      from filas f
      left join public.origenes o on o.id = f.origen_id  -- origenes_pkey
      left join public.perfiles p on p.id = f.creado_por  -- perfiles_pkey
      left join modos m on m.formula_id = f.formula_id and m.modo_tc = f.modo_tc
     order by f.fijada desc, f.creado_en desc, f.id desc;
  else
    return query
    with filas as (
      select c.id, c.numero, c.origen_id, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.formula_id, c.modo_tc, c.creado_por,
             c.creado_en, c.actualizado_en
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
           (f.creado_en at time zone v_zona)::date + v_dias
      from filas f
      left join public.origenes o on o.id = f.origen_id
      left join public.perfiles p on p.id = f.creado_por
      left join modos m on m.formula_id = f.formula_id and m.modo_tc = f.modo_tc
     order by f.creado_en desc, f.id desc;
  end if;
end $$;


alter function public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid) owner to postgres;

comment on function public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid) is 'El bloque «De este vehículo» y las tarjetas de la ficha del vehículo: una página de las cotizaciones de un vehículo que quien mira ve (creado_en desc, id desc) por cotizaciones_vehiculo_creado_idx y, sin cursor, además la aprobada del vehículo (fijada) por cotizaciones_aprobadas_pkey. Corre como quien la llama: la RLS decide. Devuelve el nombre del origen, el del modo (_nombre_del_modo), el autor visible, la versión (editada_en = actualizado_en, para aprobar) y la vigencia de cotizaciones_listado() (vencida y vence_el). Lo mide supabase/tests/medir-cotizaciones-de-este-vehiculo.sql.';

revoke all on function public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid) from public, anon;
grant execute on function public.cotizaciones_de_este_vehiculo(uuid, integer, timestamptz, uuid) to authenticated, service_role;
