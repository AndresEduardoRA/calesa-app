-- Lo que falta de un documento dice también cuántos están subidos y por revisar: «Qué falta» ofrece «Revisar» antes que «Subir» cuando ya hay uno
-- que contaría si se aprobara. Es la misma consulta por el mismo índice, con los dos estados; `cumplido` no cambia.
-- Prueba: supabase/tests/areas/mover/requisito-por-revisar.sql.

CREATE OR REPLACE FUNCTION "public"."evaluar_requisitos"("p_vehiculo" "uuid", "p_repuesto" "uuid", "p_fase" "uuid") RETURNS TABLE("requisito_id" "uuid", "tipo" "public"."tipo_requisito", "bloqueante" boolean, "descripcion" "text", "cumplido" boolean, "detalle" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r record; n int; v_por_revisar int; ok boolean; d jsonb; v_padre uuid; v_hijos int; v_hijos_ok int; v_sin_llegar int;
begin
  for r in select q.*, td.nombre as tipo_doc_nombre, td.formatos as tipo_doc_formatos, fe.nombre as espera_nombre
           from public.fases_requisitos q
           left join public.tipos_documento td on td.id = q.tipo_documento_id
           left join public.fases fe on fe.id = q.espera_fase_id
           where q.fase_id = p_fase order by q.orden loop
    d := '{}'::jsonb;
    if r.tipo = 'documento' then
      -- documentos_unidad_tipo_idx (vehiculo_id, tipo_documento_id, estado) o documentos_repuesto_idx: la unidad es un vehículo o un ítem (uno y sólo uno), así
      -- que se pregunta por la columna de la que viene, no con `is not distinct from`, que no usa el índice y recorría los documentos de todas las unidades.
      -- La misma lectura cuenta los aprobados y los subidos que contarían si se aprobaran (mismo tipo, formato y vigencia): `por_revisar` dice a quien mira
      -- «Qué falta» que hay algo para revisar antes que otro para subir. `cumplido` sigue siendo sólo de los aprobados.
      if p_vehiculo is not null then
        select count(*) filter (where doc.estado = 'aprobado'), count(*) filter (where doc.estado = 'subido')
          into n, v_por_revisar
          from public.documentos doc
        where doc.vehiculo_id = p_vehiculo and doc.repuesto_id is null
          and doc.tipo_documento_id = r.tipo_documento_id and doc.estado in ('aprobado', 'subido') and doc.eliminado_en is null
          and (doc.vence_el is null or doc.vence_el >= current_date)
          and (r.formatos is null or doc.mime is null or doc.mime = any (r.formatos));
      else
        select count(*) filter (where doc.estado = 'aprobado'), count(*) filter (where doc.estado = 'subido')
          into n, v_por_revisar
          from public.documentos doc
        where doc.repuesto_id = p_repuesto and doc.vehiculo_id is null
          and doc.tipo_documento_id = r.tipo_documento_id and doc.estado in ('aprobado', 'subido') and doc.eliminado_en is null
          and (doc.vence_el is null or doc.vence_el >= current_date)
          and (r.formatos is null or doc.mime is null or doc.mime = any (r.formatos));
      end if;
      ok := n >= coalesce(r.min_archivos, 1) and (r.max_archivos is null or n <= r.max_archivos);
      d := jsonb_build_object('aprobados', n, 'por_revisar', v_por_revisar, 'min', coalesce(r.min_archivos, 1), 'max', r.max_archivos,
                              'tipo_documento_id', r.tipo_documento_id);
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Documento: ' || r.tipo_doc_nombre; cumplido := ok; detalle := d;
      return next;
    elsif r.tipo = 'dato' then
      ok := public._requisito_dato_cumplido(p_vehiculo, p_repuesto, r.clave_dato, r.config);
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Dato: ' || r.clave_dato; cumplido := ok; detalle := coalesce(r.config, '{}'::jsonb) || jsonb_build_object('clave_dato', r.clave_dato);
      return next;
    elsif r.tipo = 'espera' then
      if r.espera_ambito = 'hijos' then
        -- vehículo espera a sus repuestos (los en stock no cuentan). Sin hijos = no aplica = cumple. Un ítem que terminó sin llegar (en una fase
        -- final que no es la esperada: «Perdido») no frena (8.08-1, C10): cuenta en `sin_llegar`. La regla vive en `_repuesto_ante_espera`.
        select count(*), count(*) filter (where e.estado = 'llego'), count(*) filter (where e.estado = 'sin_llegar')
          into v_hijos, v_hijos_ok, v_sin_llegar
        from public.repuestos_items i join public.repuestos_proyectos pr on pr.id = i.proyecto_id
        cross join lateral (select public._repuesto_ante_espera(i.id, r.espera_fase_id) as estado) e
        where pr.vehiculo_id = p_vehiculo and i.eliminado_en is null and i.en_stock_desde is null and pr.eliminado_en is null;
        ok := v_hijos = v_hijos_ok + v_sin_llegar;
        d := jsonb_build_object('hijos', v_hijos, 'llegaron', v_hijos_ok, 'sin_llegar', v_sin_llegar);
      else
        select pr.vehiculo_id into v_padre from public.repuestos_items i join public.repuestos_proyectos pr on pr.id = i.proyecto_id where i.id = p_repuesto;
        ok := v_padre is null or public.unidad_llego_a_fase(v_padre, null, r.espera_fase_id);
        d := jsonb_build_object('padre', v_padre);
      end if;
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Espera: ' || r.espera_nombre; cumplido := ok; detalle := d;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.evaluar_requisitos(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.evaluar_requisitos(uuid, uuid, uuid) to service_role;
