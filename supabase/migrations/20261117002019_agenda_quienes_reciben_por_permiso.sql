-- «Pedirlo» de «Qué falta» (logística): a quién darle una tarea para destrabar un requisito de una unidad. `agenda_quienes_reciben` suma dos parámetros
-- al final, con default, para filtrar por quien tiene un permiso en el origen de esa unidad y la ve; la llamada de siempre (`p_texto`, `p_conversacion`)
-- no cambia. Cambiar la firma es `drop` + `create` (con `create or replace` quedarían dos sobrecargas) y repetir los grants.
-- Prueba: supabase/tests/areas/agenda/quienes-reciben-por-permiso.sql.

-- ¿Esa persona tiene `p_clave` en el origen del vehículo y lo ve? Espejo de quién recibe `alertas_demora`: la clave, `logistica.ver` y `vehiculos.ver` del
-- origen; con las tres en «todos» lo ve entero, si no, sólo el que creó o el de su cartera vigente (sin una baja en curso). Una clave sin alcance (global o
-- por origen sin alcance) cuenta como «todos». Vehículo inexistente o en la papelera: falso.
create function public._quien_puede_en_la_unidad(p_usuario uuid, p_clave text, p_vehiculo uuid) returns boolean
    language sql stable security definer
    set search_path = ''
    as $$
  select coalesce((
    select x.c is not null and x.l is not null and x.w is not null
       and (((x.c = 'todos' or not x.con_alcance) and x.l = 'todos' and x.w = 'todos')
            or x.creado_por = p_usuario
            or (x.lead_id is not null and p_usuario <> all (public._bajas_en_curso())
                and exists (select 1 from public.leads_asesores la
                             where la.lead_id = x.lead_id and la.usuario_id = p_usuario and la.revocado_en is null)))
      from (select v.creado_por, v.lead_id,
                   public._alcance_de_usuario(p_usuario, p_clave, v.origen_id) as c,
                   public._alcance_de_usuario(p_usuario, 'logistica.ver', v.origen_id) as l,
                   public._alcance_de_usuario(p_usuario, 'vehiculos.ver', v.origen_id) as w,
                   coalesce((select pm.con_alcance from public.permisos pm where pm.clave = p_clave), false) as con_alcance
              from public.vehiculos v
             where v.id = p_vehiculo and v.eliminado_en is null) x
  ), false);
$$;

revoke all on function public._quien_puede_en_la_unidad(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public._quien_puede_en_la_unidad(uuid, text, uuid) to service_role;

drop function public.agenda_quienes_reciben(text, uuid);

create function public.agenda_quienes_reciben(p_texto text, p_conversacion uuid default null::uuid, p_permiso text default null::text,
                                              p_vehiculo uuid default null::uuid) returns jsonb
    language plpgsql stable security definer
    set search_path = ''
    as $$
declare
  v_texto text := left(btrim(coalesce(p_texto, '')), 100);
  v_tope constant int := 20;
  v_filas jsonb; v_hay boolean; v_filtra boolean;
begin
  perform public.assert_activo();
  perform public.assert_permiso('agenda.tareas.asignar');
  if (p_permiso is null) <> (p_vehiculo is null) or (p_permiso is not null and p_conversacion is not null) then
    raise exception 'El permiso va junto con la unidad y sin conversación.' using errcode = '22023', hint = 'p_permiso';
  end if;
  if p_conversacion is not null and not public.es_miembro(p_conversacion) then
    raise exception 'No estás en esa conversación.' using errcode = '42501', hint = 'conversacion_id';
  end if;
  if p_permiso is null then
    if not public._equipo_lista_indexable(v_texto) then
      return jsonb_build_object('personas', '[]'::jsonb, 'hay_mas', false);
    end if;
    -- `perfiles` es la tabla del equipo (decenas de filas, no crece): el patrón la recorre y el limit corta.
    select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'nombre', q.nombre) order by q.nombre, q.id), '[]'::jsonb), coalesce(count(*) > v_tope, false)
      into v_filas, v_hay
      from (select p.id, p.nombre from public.perfiles p
             where p.activo and not p.bloqueado
               and public._sin_tildes(p.nombre || ' ' || coalesce(p.email::text, '')) like public._equipo_busqueda_patron(v_texto)
               and (p_conversacion is null or public._chat_miembro_vigente(p_conversacion, p.id))
               and public._agenda_puede_recibir(p.id)
             order by p.nombre, p.id limit v_tope + 1) q;
  else
    -- Sólo las claves por las que «Qué falta» pide (`CLAVES_QUE_SE_PIDEN` de logística): con cualquier otra, quien da tareas averiguaría quién tiene
    -- cualquier permiso en un origen.
    if p_permiso <> all (array['logistica.documentos.subir', 'logistica.documentos.aprobar', 'logistica.transporte.editar', 'logistica.aduana.gestionar',
                               'logistica.pagos.confirmar', 'vehiculos.editar', 'cotizaciones.final.gestionar', 'repuestos.mover']) then
      raise exception 'No se puede pedir por ese permiso.' using errcode = '22023', hint = 'p_permiso';
    end if;
    if not public.puede_unidad(p_vehiculo, null, 'logistica.ver', 'repuestos.ver') then
      raise exception 'No tienes acceso a esa unidad.' using errcode = '42501', hint = 'acceso';
    end if;
    -- Con permiso el texto es opcional: sin texto indexable no filtra (lista hasta 20). Quien pide no sale. `perfiles` es la tabla del equipo (decenas de
    -- filas); `_quien_puede_en_la_unidad` mira los roles (tablas chicas) y la cartera por `leads_asesores`; el limit corta.
    v_filtra := public._equipo_lista_indexable(v_texto);
    select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'nombre', q.nombre) order by q.nombre, q.id), '[]'::jsonb), coalesce(count(*) > v_tope, false)
      into v_filas, v_hay
      from (select p.id, p.nombre from public.perfiles p
             where p.activo and not p.bloqueado
               and p.id <> (select auth.uid())
               and (not v_filtra
                    or public._sin_tildes(p.nombre || ' ' || coalesce(p.email::text, '')) like public._equipo_busqueda_patron(v_texto))
               and public._agenda_puede_recibir(p.id)
               and public._quien_puede_en_la_unidad(p.id, p_permiso, p_vehiculo)
             order by p.nombre, p.id limit v_tope + 1) q;
  end if;
  if v_hay then v_filas := v_filas - v_tope; end if;
  return jsonb_build_object('personas', v_filas, 'hay_mas', v_hay);
end $$;

revoke all on function public.agenda_quienes_reciben(text, uuid, text, uuid) from public, anon;
grant execute on function public.agenda_quienes_reciben(text, uuid, text, uuid) to authenticated, service_role;

comment on function public.agenda_quienes_reciben(text, uuid, text, uuid) is 'A quién puede darle una tarea quien pregunta: personas activas, sin bloqueo y con agenda.tareas.recibir. Sin p_permiso: cuyo nombre o email contiene p_texto (3 letras o dígitos seguidos; si no, lista vacía), y con p_conversacion sólo sus miembros vigentes (en el canal global, con chat.global; quien pregunta tiene que serlo: si no, 42501 hint conversacion_id). Con p_permiso (una de las claves que pide «Qué falta»; si no, 22023 hint p_permiso) y p_vehiculo (juntos, sin conversación; si no, 22023 hint p_permiso): quienes tienen esa clave en el origen de la unidad y la ven (_quien_puede_en_la_unidad), sin quien pregunta, que tiene que ver la unidad (42501 hint acceso); el texto filtra sólo si tiene 3 letras. Pide agenda.tareas.asignar. {personas: [{id, nombre}], hay_mas}, 20 como mucho.';
