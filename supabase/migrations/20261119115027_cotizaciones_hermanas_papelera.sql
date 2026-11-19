-- La papelera con las cotizaciones hermanas (glosario: «Cotizaciones hermanas»; docs/COTIZADOR.md › papelera): enviar una manda también su hermana viva al
-- mismo lote, sin versión (como una más del lote: si quien envía no la ve o no la puede enviar, queda viva y va en `rechazados` con su motivo); restaurar o purgar
-- sólo algunas del lote suma su hermana del MISMO lote (nunca cruza lotes ni purga una viva). Todas en el orden de id, en una sola pasada.

CREATE OR REPLACE FUNCTION "public"."cotizaciones_papelera_enviar"("p_cotizaciones" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  e record; v_lote uuid; v_version timestamptz; v_mensaje text; v_codigo text; v_titulo text;
  v_enviados jsonb := '[]'::jsonb; v_rechazados jsonb := '[]'::jsonb;
begin
  perform public.assert_activo();
  if jsonb_typeof(p_cotizaciones) is distinct from 'array' or jsonb_array_length(p_cotizaciones) = 0 then
    raise exception 'No llegó ninguna cotización.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_cotizaciones) > 200 then
    raise exception 'Se envían hasta 200 por vez.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_cotizaciones) x
    where jsonb_typeof(x) <> 'object'
       or coalesce(x ->> 'id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(x ->> 'actualizado_en', '2000-01-01') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}') then
    raise exception 'Una de las cotizaciones llegó incompleta. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;

  insert into public.lotes_papelera (tipo, creado_por) values ('cotizaciones', (select auth.uid())) returning id into v_lote;
  -- Lo pedido (con la versión que se tenía en pantalla) y la hermana viva de cada una que no se pidió (sin versión), todo en orden de id.
  for e in
    with pedidas as (
      select distinct on (x ->> 'id') (x ->> 'id')::uuid as id, x ->> 'actualizado_en' as version, true as con_version
        from jsonb_array_elements(p_cotizaciones) x order by x ->> 'id'
    ), hermanas as (
      select distinct c.hermana_id as id, null::text as version, false as con_version
        from public.cotizaciones c join public.cotizaciones h on h.id = c.hermana_id   -- cotizaciones_pkey
       where c.id in (select p.id from pedidas p) and h.eliminado_en is null and c.hermana_id not in (select p.id from pedidas p)
    )
    select t.id, t.version, t.con_version from (select * from pedidas union all select * from hermanas) t order by t.id
  loop
    begin
      v_enviados := v_enviados || public._cotizacion_a_papelera(e.id, v_lote, e.con_version, e.version::timestamptz);
    exception when others then
      get stacked diagnostics v_mensaje = message_text, v_codigo = returned_sqlstate;
      -- Sólo lo que escribimos nosotros llega a la pantalla (22023: falta la versión).
      if v_codigo not in ('PT409', '42501', '23514', '22023', 'P0001') then
        v_mensaje := 'No se pudo enviar. Vuelve a intentarlo.';
      end if;
      -- El título, sólo de lo que quien llama ve.
      v_titulo := null;
      select coalesce(x.titulo, 'Cotización #' || x.numero) into v_titulo from public.cotizaciones x
       where x.id = e.id and public.puede_cotizacion(x.id, 'cotizaciones.ver');
      v_rechazados := v_rechazados || jsonb_build_object('id', e.id, 'titulo', v_titulo, 'codigo', v_codigo, 'motivo', v_mensaje);
    end;
  end loop;

  if jsonb_array_length(v_enviados) = 0 then
    delete from public.lotes_papelera l where l.id = v_lote;
    return jsonb_build_object('lote', null, 'actualizado_en', null, 'enviados', v_enviados, 'rechazados', v_rechazados);
  end if;
  update public.lotes_papelera l
  set resumen = jsonb_build_object('cantidad', jsonb_array_length(v_enviados), 'restaurados', 0, 'purgados', 0)
  where l.id = v_lote;
  v_version := public._lote_papelera_tocar(v_lote);
  perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', v_lote::text, null, null,
    jsonb_build_object('tipo', 'cotizaciones', 'cantidad', jsonb_array_length(v_enviados)));
  return jsonb_build_object('lote', v_lote, 'actualizado_en', v_version, 'enviados', v_enviados, 'rechazados', v_rechazados);
end;
$_$;

revoke all on function public.cotizaciones_papelera_enviar(jsonb) from public, anon;
grant execute on function public.cotizaciones_papelera_enviar(jsonb) to authenticated, service_role;

-- Las pedidas y su hermana del mismo lote, que todavía está en él (restaurar o purgar algunas no separa un par del lote).
create or replace function public._lote_con_hermanas(p_lote uuid, p_cotizaciones uuid[]) returns uuid[]
    language sql stable
    set search_path to ''
    as $$
  select case when p_cotizaciones is null then null else array(
    select distinct t.x from (
      select unnest(p_cotizaciones) as x
      union all
      select c.hermana_id
        from public.cotizaciones c join public.cotizaciones h on h.id = c.hermana_id   -- cotizaciones_pkey
       where c.id = any (p_cotizaciones) and c.lote_papelera_id = p_lote and h.lote_papelera_id = p_lote and h.eliminado_en is not null
    ) t where t.x is not null order by t.x) end;
$$;
comment on function public._lote_con_hermanas(uuid, uuid[]) is 'Las cotizaciones pedidas de un lote de la papelera más la hermana de cada una que está en el mismo lote y todavía en la papelera (glosario: «Cotizaciones hermanas»), en orden de id; nulo si se pide el lote entero. De nadie.';
revoke all on function public._lote_con_hermanas(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public._lote_con_hermanas(uuid, uuid[]) to service_role;

CREATE OR REPLACE FUNCTION "public"."cotizaciones_papelera_restaurar"("p_lote" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_cotizaciones" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare l public.lotes_papelera;
begin
  perform public.assert_activo();
  -- Sin candado: quien no puede nunca espera el del lote.
  select * into l from public.lotes_papelera x
   where x.id = p_lote and x.tipo = 'cotizaciones' and x.purgado_en is null and x.restaurado_en is null;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if l.creado_por is distinct from (select auth.uid()) and not public.tiene_permiso('cotizaciones.papelera.purgar') then
    raise exception 'Sólo lo restaura quien lo envió o quien puede vaciar la papelera.' using errcode = '42501';
  end if;
  -- El lote tomado (no se borra: no choca con quien lo nombra) y otra vez las dos miradas.
  select * into l from public.lotes_papelera x
   where x.id = p_lote and x.tipo = 'cotizaciones' and x.purgado_en is null and x.restaurado_en is null for no key update;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if l.creado_por is distinct from (select auth.uid()) and not public.tiene_permiso('cotizaciones.papelera.purgar') then
    raise exception 'Sólo lo restaura quien lo envió o quien puede vaciar la papelera.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('lotes_papelera', l.id, l.actualizado_en, 'este lote de la papelera');
  end if;
  -- Restaurar algunas suma su hermana del mismo lote.
  return public._papelera_restaurar_cotizaciones(l.id, public._lote_con_hermanas(l.id, p_cotizaciones));
end;
$$;

revoke all on function public.cotizaciones_papelera_restaurar(uuid, timestamptz, uuid[]) from public, anon;
grant execute on function public.cotizaciones_papelera_restaurar(uuid, timestamptz, uuid[]) to authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."cotizaciones_papelera_purgar"("p_lote" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_cotizaciones" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare l public.lotes_papelera;
begin
  perform public.assert_activo();
  -- Antes de mirar el lote: sin la clave no se sabe ni si existe.
  if not public.tiene_permiso('cotizaciones.papelera.purgar') then
    raise exception 'No tienes permiso para purgar la papelera.' using errcode = '42501';
  end if;
  select * into l from public.lotes_papelera x
   where x.id = p_lote and x.tipo = 'cotizaciones' and x.purgado_en is null and x.restaurado_en is null for no key update;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('lotes_papelera', l.id, l.actualizado_en, 'este lote de la papelera');
  end if;
  -- Purgar algunas suma su hermana del mismo lote (nunca una viva).
  return public._papelera_purgar_cotizaciones(l.id, public._lote_con_hermanas(l.id, p_cotizaciones));
end;
$$;

revoke all on function public.cotizaciones_papelera_purgar(uuid, timestamptz, uuid[]) from public, anon;
grant execute on function public.cotizaciones_papelera_purgar(uuid, timestamptz, uuid[]) to authenticated, service_role;
