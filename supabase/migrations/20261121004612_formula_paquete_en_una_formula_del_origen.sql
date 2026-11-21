-- Una plantilla de V1 se aplica a una fórmula del origen elegida (`p_formula_del_origen`, al final y nula por omisión: la de trabajo): la pestaña
-- «Fórmulas» edita cada fórmula en su URL y el paquete escribe los borradores de ésa. Sigue siendo invocadora: los permisos y las reglas son los de
-- `formula_guardar_borrador()` y `plantilla_guardar_borrador()`.
drop function public.cotizacion_paquete_aplicar(uuid, jsonb, timestamptz, timestamptz);

create function public.cotizacion_paquete_aplicar(p_origen uuid, p_paquete jsonb, p_formula_esperada timestamptz, p_plantilla_esperada timestamptz,
                                                  p_formula_del_origen uuid default null)
  returns jsonb language plpgsql set search_path = '' as $_$
declare
  v_pieza text;
  v_tipo text;
  v_falta boolean;
  v_c jsonb;
  v_formula jsonb;
  v_plantilla timestamptz;
  v_respuesta jsonb;
  v_clave text;
  v_distinta boolean;
  v_creados jsonb := '[]'::jsonb;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);

  -- La forma del paquete: cada pieza con su tipo; un color que se reusa, {clave, hex}; uno nuevo, {id, nombre, hex, clave} con el id del intento.
  v_falta := coalesce(jsonb_typeof(p_paquete), '') <> 'object';
  if v_falta then
    raise exception 'El paquete está incompleto.' using errcode = '22023', hint = 'paquete';
  end if;
  for v_pieza, v_tipo in
    select x.pieza, x.tipo from (values ('definicion', 'object'), ('params', 'object'), ('diseno', 'object'), ('tarjeta', 'object'),
                                        ('nota', 'string'), ('reusar', 'array'), ('crear', 'array')) x (pieza, tipo)
  loop
    v_falta := coalesce(jsonb_typeof(p_paquete -> v_pieza), '') <> v_tipo;
    if v_falta then
      raise exception 'El paquete está incompleto.' using errcode = '22023', hint = 'paquete.' || v_pieza;
    end if;
  end loop;
  for v_c in select x from jsonb_array_elements(p_paquete -> 'reusar') x loop
    v_falta := coalesce(jsonb_typeof(v_c -> 'clave'), '') <> 'string' or coalesce(jsonb_typeof(v_c -> 'hex'), '') <> 'string';
    if v_falta then
      raise exception 'El paquete está incompleto.' using errcode = '22023', hint = 'paquete.reusar';
    end if;
  end loop;
  for v_c in select x from jsonb_array_elements(p_paquete -> 'crear') x loop
    v_falta := coalesce(v_c ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            or coalesce(jsonb_typeof(v_c -> 'nombre'), '') <> 'string'
            or coalesce(jsonb_typeof(v_c -> 'hex'), '') <> 'string'
            or coalesce(jsonb_typeof(v_c -> 'clave'), '') <> 'string';
    if v_falta then
      raise exception 'El paquete está incompleto.' using errcode = '22023', hint = 'paquete.crear';
    end if;
  end loop;

  -- Los dos borradores de la fórmula del origen pedida (nula: la de trabajo), con la hora del que se reemplaza (nula = crear). La publicada no se
  -- compara: el paquete no sale de ella. Las dos RPC validan que la fórmula sea del origen (42501) y no esté archivada (22023).
  v_formula := public.formula_guardar_borrador(
    p_origen => p_origen, p_def => p_paquete -> 'definicion', p_params => p_paquete -> 'params', p_diseno => p_paquete -> 'diseno',
    p_nota => p_paquete ->> 'nota', p_publicada_esperada => null, p_actualizado_en_esperado => p_formula_esperada,
    p_formula_del_origen => p_formula_del_origen);
  v_plantilla := public.plantilla_guardar_borrador(
    p_origen => p_origen, p_actualizado_en_esperado => p_plantilla_esperada, p_def => p_paquete -> 'tarjeta', p_nota => p_paquete ->> 'nota',
    p_formula_del_origen => p_formula_del_origen);

  -- Los colores: el candado del catálogo, el reuso y el lugar; después cada color nuevo con la clave que se eligió (`_tono_clave()` suma `_2` en silencio si
  -- otro la tomó mientras tanto, y un nombre que otro tomó da 23505: los dos son un PT409, no otro color).
  perform public._paquete_colores_preparar(p_paquete -> 'reusar', jsonb_array_length(p_paquete -> 'crear'));
  for v_c in select x from jsonb_array_elements(p_paquete -> 'crear') x loop
    begin
      v_respuesta := public.tono_crear((v_c ->> 'id')::uuid, v_c ->> 'nombre', v_c ->> 'hex');
    exception when unique_violation then
      raise exception 'Mientras elegías, cambiaron los colores del catálogo. Vuelve a elegir la plantilla.' using errcode = 'PT409';
    end;
    select t ->> 'clave' into v_clave from jsonb_array_elements(v_respuesta -> 'lista' -> 'tonos') t where t ->> 'id' = v_c ->> 'id';
    v_distinta := v_clave is distinct from v_c ->> 'clave';
    if v_distinta then
      raise exception 'Mientras elegías, cambiaron los colores del catálogo. Vuelve a elegir la plantilla.' using errcode = 'PT409';
    end if;
    v_creados := v_creados || to_jsonb(v_clave);
  end loop;

  return jsonb_build_object('formula', v_formula, 'plantilla', v_plantilla, 'colores', v_creados);
end;
$_$;

revoke all on function public.cotizacion_paquete_aplicar(uuid, jsonb, timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.cotizacion_paquete_aplicar(uuid, jsonb, timestamptz, timestamptz, uuid) to authenticated, service_role;
comment on function public.cotizacion_paquete_aplicar(uuid, jsonb, timestamptz, timestamptz, uuid) is 'Aplica una plantilla de V1 a una fórmula del origen, todo o nada (cotizaciones.configurar del origen, 42501; p_formula_del_origen nula: la de trabajo; de otro origen, 42501; archivada, 22023): la forma del paquete (22023, hint paquete.<pieza>), el borrador de la fórmula y el de la tarjeta (esperada nula = crear; sus PT409 tal cual), y los colores que faltan (PT409 si el catálogo cambió, 22023 colores sin lugar). No publica. Devuelve {formula: {id, actualizado_en}, plantilla, colores}. docs/COTIZADOR.md › «Plantillas de V1».';
