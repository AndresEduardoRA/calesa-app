-- «Costo estimado» del inventario (`/vehiculos`, docs/UX.md › «Vehículos»): la aprobada de cada vehículo de una página con el nombre del modo de tipo de
-- cambio de su cotización. Una lectura, como la de PostgREST que reemplaza: PostgREST no puede llamar `_nombre_del_modo()` dentro de un `select`.

-- La aprobada de cada vehículo de una página del inventario: el primer resultado congelado (como texto), su moneda y el nombre del modo de su cotización.
-- Corre como quien llama: la RLS de cotizaciones_aprobadas (espejo de la de cotizaciones) deja sólo las de las cotizaciones que ve, y la de cotizaciones
-- (formula_id y modo_tc tienen grant) da el modo. El nombre, una vez por versión y modo distintos.
create or replace function public.cotizaciones_aprobadas_de_vehiculos(p_vehiculos uuid[])
returns table (vehiculo_id uuid, cotizacion_id uuid, monto text, moneda text, modo text)
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_vehiculos is null or cardinality(p_vehiculos) = 0 then
    return;
  end if;
  -- MAXIMO_DE_PAGINA_DE_VEHICULOS (src/modules/vehiculos/entities/vehiculo.ts): una página, nunca más.
  if cardinality(p_vehiculos) > 100 then
    raise exception 'Son demasiados vehículos para una página.' using errcode = '22023', hint = 'vehiculos';
  end if;
  return query
  with filas as materialized (
    select a.vehiculo_id, a.cotizacion_id, a.monto, a.moneda, c.formula_id, c.modo_tc
      from public.cotizaciones_aprobadas a                       -- cotizaciones_aprobadas_pkey (vehiculo_id)
      left join public.cotizaciones c on c.id = a.cotizacion_id  -- cotizaciones_pkey
     where a.vehiculo_id = any (p_vehiculos)
  ),
  -- Una llamada por versión y modo (casi siempre uno o dos), como «De este vehículo».
  modos as materialized (
    select d.formula_id, d.modo_tc, public._nombre_del_modo(d.formula_id, d.modo_tc) as nombre
      from (select distinct f.formula_id, f.modo_tc from filas f where f.modo_tc is not null) d
  )
  select f.vehiculo_id, f.cotizacion_id, f.monto::text, f.moneda, m.nombre
    from filas f
    left join modos m on m.formula_id = f.formula_id and m.modo_tc = f.modo_tc;
end $$;

revoke all on function public.cotizaciones_aprobadas_de_vehiculos(uuid[]) from public, anon;
grant execute on function public.cotizaciones_aprobadas_de_vehiculos(uuid[]) to authenticated;

comment on function public.cotizaciones_aprobadas_de_vehiculos(uuid[]) is
  '«Costo estimado» de /vehiculos: la aprobada de cada vehículo de una página (hasta 100 ids, si no 22023) con el primer resultado como texto, su moneda y el nombre del modo de su cotización (_nombre_del_modo, una vez por versión y modo; nulo sin modo o sin cotizaciones.ver del origen de la versión). Por cotizaciones_aprobadas_pkey y cotizaciones_pkey. Corre como quien la llama: la RLS decide. Lo mide supabase/tests/medir-cotizaciones-aprobadas.sql.';

comment on function public._nombre_del_modo(uuid, text) is
  'El nombre del modo de tipo de cambio p_clave de esa versión de la fórmula (diseno.cabecera.modos), sólo para quien tiene cotizaciones.ver de su origen; nulo si la versión no existe, es borrador, no se tiene el permiso o el modo no está. Security definer porque formulas sólo la lee quien configura: el nombre del modo ya lo dan cotizacion_hoja y cotizacion_tarjeta con el mismo chequeo. La llaman cotizaciones_de_este_vehiculo y cotizaciones_aprobadas_de_vehiculos.';
