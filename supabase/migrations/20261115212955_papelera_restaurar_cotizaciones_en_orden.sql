-- Restaurar cotizaciones toma sus leads antes que sus vehículos, por id, y recién después las cotizaciones: el orden de candados
-- lead → vehículo → cotización de docs/DECISIONES.md (vincular toma el lead y después el vehículo; al revés, 40P01). Cotizar encima
-- (cotizacion_encima) sigue el mismo orden en cotizaciones_vinculos_por_rol. Sus carreras: scripts/carreras/candados-papelera.mjs.

CREATE OR REPLACE FUNCTION "public"."_papelera_restaurar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c record; v_vehiculo uuid; v_lead uuid; v_clase public.clase_cotizacion; v_vehiculo_fuera boolean; v_lead_fuera boolean;
  v_motivo text; v_restriccion text; v_quedan int; v_version timestamptz;
  v_restaurados jsonb := '[]'::jsonb; v_pendientes jsonb := '[]'::jsonb;
begin
  -- 0. Antes de tomar cotización alguna, sus leads y después sus vehículos, por id (cotizaciones_lote_papelera_idx; las PK): el orden lead → vehículo de
  -- vincular, que toma el lead y después el vehículo (al revés, 40P01).
  perform 1 from public.leads d
   where d.id in (select x.lead_id from public.cotizaciones x
                   where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids)))
   order by d.id for key share;
  perform 1 from public.vehiculos v
   where v.id in (select x.vehiculo_id from public.cotizaciones x
                   where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids)))
   order by v.id for key share;

  for c in
    select x.id, x.numero, coalesce(x.titulo, 'Cotización #' || x.numero) as titulo from public.cotizaciones x
     where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids))
     order by x.id for no key update
  loop
    begin
      -- 1. Sobre la fila tomada (la FK pudo poner nulos el vehículo o el lead mientras se esperaba).
      select x.vehiculo_id, x.lead_id, x.clase into v_vehiculo, v_lead, v_clase from public.cotizaciones x where x.id = c.id;
      v_vehiculo_fuera := false; v_lead_fuera := false;
      if v_lead is not null then
        select d.eliminado_en is not null into v_lead_fuera from public.leads d where d.id = v_lead for key share;
      end if;
      if v_vehiculo is not null then
        select v.eliminado_en is not null into v_vehiculo_fuera from public.vehiculos v where v.id = v_vehiculo for key share;
      end if;
      v_motivo := case
        when v_vehiculo_fuera then 'Su vehículo está en la papelera.'
        when v_lead_fuera then 'Su cliente está en la papelera.'
        when v_clase = 'final' and v_vehiculo is null then 'Su vehículo ya no existe.'
      end;
      -- 2. Si nada la detiene, vuelve.
      if v_motivo is null then
        update public.cotizaciones x set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where x.id = c.id;
      end if;
    exception
      when unique_violation then
        get stacked diagnostics v_restriccion = constraint_name;
        v_motivo := case v_restriccion
          when 'cotizaciones_encima_unica' then 'Esa cotización ya tiene otra versión nueva.'
          when 'cotizaciones_final_por_vehiculo' then 'Ese vehículo ya tiene otra cotización final.'
          else 'Choca con otro registro que ya existe.'
        end;
      when check_violation then
        -- La red por si la tabla suma reglas: su texto es nuestro.
        get stacked diagnostics v_motivo = message_text;
    end;
    if v_motivo is null then
      v_restaurados := v_restaurados || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo);
    else
      v_pendientes := v_pendientes || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'motivo', v_motivo);
    end if;
  end loop;

  -- Cuántas siguen en la papelera del lote (a lo sumo 200 por lote; cotizaciones_lote_papelera_idx).
  select count(*) into v_quedan from (
    select 1 from public.cotizaciones x where x.lote_papelera_id = p_lote and x.eliminado_en is not null limit 201) q;
  if jsonb_array_length(v_restaurados) = 0 then
    return jsonb_build_object('actualizado_en', (select l.actualizado_en from public.lotes_papelera l where l.id = p_lote),
      'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera l
  set resumen = l.resumen || jsonb_build_object('restaurados', coalesce((l.resumen ->> 'restaurados')::int, 0) + jsonb_array_length(v_restaurados)),
      restaurado_en = case when v_quedan = 0 then now() else l.restaurado_en end,
      restaurado_por = case when v_quedan = 0 then (select auth.uid()) else l.restaurado_por end
  where l.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'cotizaciones', 'cantidad', jsonb_array_length(v_restaurados)));
  return jsonb_build_object('actualizado_en', v_version, 'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
end;
$$;


COMMENT ON FUNCTION "public"."_papelera_restaurar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) IS 'Restaura del lote las cotizaciones en la papelera (p_ids nulo: todas), una a una por id: toma antes sus leads y sus vehículos for key share (el orden lead → vehículo); lo que choca con otra viva, cuelga de un vehículo o cliente en la papelera o es una final sin vehículo queda en pendientes con su motivo. Devuelve {actualizado_en, restaurados, pendientes, quedan}. De nadie: la llaman cotizaciones_papelera_restaurar y papelera_restaurar.';

REVOKE ALL ON FUNCTION "public"."_papelera_restaurar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON FUNCTION "public"."_papelera_restaurar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) TO "service_role";

