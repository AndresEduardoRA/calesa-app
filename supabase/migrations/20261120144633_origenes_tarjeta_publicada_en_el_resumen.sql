-- El resumen de los orígenes dice también si cada uno tiene la tarjeta de la cotización publicada (`tarjeta_publicada`): la tira «Para cotizar
-- y mover» de la página del origen la muestra a quien entra con cualquiera de los tres permisos, aunque la RLS de `plantillas_tarjeta` sólo le
-- deje leer la plantilla a quien tiene `cotizaciones.configurar`. Va al final de las columnas: quien lee por posición no se corre. El `exists`
-- usa el índice parcial único `plantillas_publicada_unica`. Mismos permisos, mismo orden y mismos grants.
drop function public.origenes_resumen();

create function public.origenes_resumen()
returns table (
  origen_id uuid,
  vehiculos integer,
  cotizaciones integer,
  campos_activos integer,
  categorias integer,
  fases integer,
  formula_publicada boolean,
  concesiones integer,
  tarjeta_publicada boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_activo();
  if not (public.tiene_permiso('origenes.gestionar') or public.tiene_permiso('flujos.configurar') or public.tiene_permiso('cotizaciones.configurar')) then
    raise exception 'No tienes permiso para ver cómo está configurado cada origen.' using errcode = '42501';
  end if;
  return query
  select o.id,
    (select count(*)::int from public.vehiculos v where v.origen_id = o.id),
    (select count(*)::int from public.cotizaciones q where q.origen_id = o.id),
    (select count(*)::int from public.origenes_campos c where c.origen_id = o.id and c.activo),
    (select count(*)::int from public.categorias k where k.origen_id = o.id),
    (select count(*)::int from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = o.id and f.activa),
    exists (select 1 from public.formulas fo where fo.origen_id = o.id and fo.estado = 'publicada'),
    (select count(*)::int from public.roles_permisos rp where rp.origen_id = o.id),
    exists (select 1 from public.plantillas_tarjeta p where p.origen_id = o.id and p.estado = 'publicada')
  from public.origenes o
  order by o.orden, o.nombre;
end;
$$;

revoke all on function public.origenes_resumen() from public, anon;
grant execute on function public.origenes_resumen() to authenticated, service_role;
