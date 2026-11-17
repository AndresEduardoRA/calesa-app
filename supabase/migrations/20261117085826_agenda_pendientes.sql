-- Los pendientes de la agenda: lo que está por hacer de quien mira, al costado de la hoja del día.
--   · `tareas_pendientes_idx`: mis tareas pendientes por vencimiento (las vencidas, sin recorrer el historial de hechas).
--   · `tareas_sin_fecha_idx` pasa a ser sólo de pendientes: «Sin fecha» ya no lista las hechas (se reabren desde su panel).
--   · `agenda_tareas_sin_fecha`: misma firma, sólo pendientes y cada fila con `actualizado_en` (completar en un toque exige la versión).
--   · `agenda_pendientes(p_grupo, …)`: «vencidas» (mis tareas pendientes con vence_en < now()) o «recordatorios» (mis recordatorios
--     pendientes con recordar_en < p_hasta, el fin de hoy en la zona de la empresa), por cursor. En plpgsql con el estado literal: así el
--     planificador prueba el índice parcial (por PostgREST el estado llega como parámetro y el plan genérico no lo usa).

create index tareas_pendientes_idx on public.tareas using btree (responsable_id, vence_en, id)
  where eliminado_en is null and estado = 'pendiente';
comment on index public.tareas_pendientes_idx is 'Mis tareas pendientes por vencimiento: agenda_pendientes (vencidas).';

drop index public.tareas_sin_fecha_idx;
create index tareas_sin_fecha_idx on public.tareas using btree (responsable_id, creado_en desc, id desc)
  where eliminado_en is null and vence_en is null and estado = 'pendiente';
comment on index public.tareas_sin_fecha_idx is 'Mis tareas pendientes sin fecha, la más nueva primero: agenda_tareas_sin_fecha.';

create or replace function public.agenda_tareas_sin_fecha(p_tamano integer default null, p_antes_en timestamptz default null, p_antes_id uuid default null)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_n int := public._acotar_pagina(p_tamano, 20, 50);
  v_a_medias boolean := (p_antes_en is null) <> (p_antes_id is null);
  v_filas jsonb; v_hay boolean;
begin
  perform public.assert_activo();
  if v_a_medias then
    raise exception 'El cursor de la página está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  -- Las dos por tareas_sin_fecha_idx (responsable_id, creado_en desc, id desc) where … estado = 'pendiente': el literal prueba el índice.
  if p_antes_en is null then
    select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'estado', t.estado, 'creado_en', t.creado_en,
                                                 'actualizado_en', t.actualizado_en, 'mia', t.creado_por = v_yo)
                              order by t.creado_en desc, t.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select x.id, x.titulo, x.estado, x.creado_en, x.actualizado_en, x.creado_por from public.tareas x
             where x.responsable_id = v_yo and x.eliminado_en is null and x.vence_en is null and x.estado = 'pendiente'
             order by x.creado_en desc, x.id desc limit v_n + 1) t;
  else
    select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'estado', t.estado, 'creado_en', t.creado_en,
                                                 'actualizado_en', t.actualizado_en, 'mia', t.creado_por = v_yo)
                              order by t.creado_en desc, t.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select x.id, x.titulo, x.estado, x.creado_en, x.actualizado_en, x.creado_por from public.tareas x
             where x.responsable_id = v_yo and x.eliminado_en is null and x.vence_en is null and x.estado = 'pendiente'
               and (x.creado_en, x.id) < (p_antes_en, p_antes_id)
             order by x.creado_en desc, x.id desc limit v_n + 1) t;
  end if;
  -- La de más no viaja: es sólo el aviso de que hay otra página.
  if v_hay then v_filas := v_filas - v_n; end if;
  return jsonb_build_object('tareas', v_filas, 'hay_mas', v_hay);
end $$;

comment on function public.agenda_tareas_sin_fecha(integer, timestamptz, uuid) is
  'Una página de mis tareas (responsable) vivas, sin fecha y pendientes, la más nueva primero (p_tamano: 20 por defecto, 50 como mucho). El cursor es (creado_en, id) de la última de la página anterior; a medias, 22023 hint cursor. De invocador. {tareas, hay_mas}; cada fila con actualizado_en para completarla.';
revoke all on function public.agenda_tareas_sin_fecha(integer, timestamptz, uuid) from public, anon;
grant execute on function public.agenda_tareas_sin_fecha(integer, timestamptz, uuid) to authenticated, service_role;

create function public.agenda_pendientes(p_grupo text, p_hasta timestamptz default null, p_tamano integer default null,
                                         p_despues_en timestamptz default null, p_despues_id uuid default null)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_n int := public._acotar_pagina(p_tamano, 20, 50);
  v_grupo_malo boolean := p_grupo is null or p_grupo not in ('vencidas', 'recordatorios');
  v_a_medias boolean := (p_despues_en is null) <> (p_despues_id is null);
  v_sin_hasta boolean := p_grupo = 'recordatorios' and p_hasta is null;
  v_vencidas boolean := p_grupo = 'vencidas';
  v_filas jsonb; v_hay boolean;
begin
  perform public.assert_activo();
  if v_grupo_malo then
    raise exception 'El grupo de pendientes no existe.' using errcode = '22023', hint = 'grupo';
  end if;
  if v_a_medias then
    raise exception 'El cursor de la página está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  if v_sin_hasta then
    raise exception 'Falta hasta cuándo leer los recordatorios.' using errcode = '22023', hint = 'hasta';
  end if;

  if v_vencidas then
    -- Las dos por tareas_pendientes_idx (responsable_id, vence_en, id) where … estado = 'pendiente': el literal prueba el índice.
    if p_despues_en is null then
      select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'vence_en', t.vence_en, 'actualizado_en', t.actualizado_en)
                                order by t.vence_en, t.id), '[]'::jsonb),
             coalesce(count(*) > v_n, false)
        into v_filas, v_hay
        from (select x.id, x.titulo, x.vence_en, x.actualizado_en from public.tareas x
               where x.responsable_id = v_yo and x.eliminado_en is null and x.estado = 'pendiente' and x.vence_en < now()
               order by x.vence_en, x.id limit v_n + 1) t;
    else
      select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'vence_en', t.vence_en, 'actualizado_en', t.actualizado_en)
                                order by t.vence_en, t.id), '[]'::jsonb),
             coalesce(count(*) > v_n, false)
        into v_filas, v_hay
        from (select x.id, x.titulo, x.vence_en, x.actualizado_en from public.tareas x
               where x.responsable_id = v_yo and x.eliminado_en is null and x.estado = 'pendiente' and x.vence_en < now()
                 and (x.vence_en, x.id) > (p_despues_en, p_despues_id)
               order by x.vence_en, x.id limit v_n + 1) t;
    end if;
  else
    -- Las dos por recordatorios_usuario_idx (usuario_id, recordar_en) where completado_en is null and eliminado_en is null. Sin lead: el
    -- panel lo lee si se ve (como agenda_rango).
    if p_despues_en is null then
      select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'titulo', r.titulo, 'recordar_en', r.recordar_en, 'actualizado_en', r.actualizado_en)
                                order by r.recordar_en, r.id), '[]'::jsonb),
             coalesce(count(*) > v_n, false)
        into v_filas, v_hay
        from (select x.id, x.titulo, x.recordar_en, x.actualizado_en from public.recordatorios x
               where x.usuario_id = v_yo and x.completado_en is null and x.eliminado_en is null and x.recordar_en < p_hasta
               order by x.recordar_en, x.id limit v_n + 1) r;
    else
      -- `recordar_en >= p_despues_en` es la condición de índice; la tupla sólo descarta los empates ya entregados.
      select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'titulo', r.titulo, 'recordar_en', r.recordar_en, 'actualizado_en', r.actualizado_en)
                                order by r.recordar_en, r.id), '[]'::jsonb),
             coalesce(count(*) > v_n, false)
        into v_filas, v_hay
        from (select x.id, x.titulo, x.recordar_en, x.actualizado_en from public.recordatorios x
               where x.usuario_id = v_yo and x.completado_en is null and x.eliminado_en is null and x.recordar_en < p_hasta
                 and x.recordar_en >= p_despues_en and (x.recordar_en, x.id) > (p_despues_en, p_despues_id)
               order by x.recordar_en, x.id limit v_n + 1) r;
    end if;
  end if;
  -- La de más no viaja: es sólo el aviso de que hay otra página.
  if v_hay then v_filas := v_filas - v_n; end if;
  return jsonb_build_object('filas', v_filas, 'hay_mas', v_hay);
end $$;

comment on function public.agenda_pendientes(text, timestamptz, integer, timestamptz, uuid) is
  'Una página de mis pendientes de la agenda. p_grupo «vencidas»: mis tareas (responsable) pendientes y vivas con vence_en < now(), la más vieja primero, cursor (vence_en, id). «recordatorios»: mis recordatorios pendientes con recordar_en < p_hasta (obligatorio), cursor (recordar_en, id). p_tamano: 20 por defecto, 50 como mucho. 22023 con hint grupo, cursor o hasta. De invocador. {filas, hay_mas}; cada fila con actualizado_en para completarla.';
revoke all on function public.agenda_pendientes(text, timestamptz, integer, timestamptz, uuid) from public, anon;
grant execute on function public.agenda_pendientes(text, timestamptz, integer, timestamptz, uuid) to authenticated, service_role;
