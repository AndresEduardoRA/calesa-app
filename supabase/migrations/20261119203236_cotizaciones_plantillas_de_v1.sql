-- Empezar un origen desde una plantilla de V1 (docs/COTIZADOR.md › «Plantillas de V1»): una RPC invocadora que crea, en una sola transacción, los borradores
-- de la fórmula (con su diseño) y de la tarjeta y los colores que falten en el catálogo. No publica. Sin tablas, índices, policies ni permisos nuevos: alcanza
-- con `cotizaciones.configurar` del origen, que vuelven a pedir las RPC que llama.

-- 1. Lo que necesita privilegios, acotado: el candado del catálogo de colores (`authenticated` no puede `lock table`), que los colores que se reusan sigan
-- con su hex y que haya lugar para los nuevos, bajo el mismo candado que los `tono_crear()` que siguen. Lo llama la invocadora `cotizacion_paquete_aplicar`.
create function public._paquete_colores_preparar(p_reusar jsonb, p_crear integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_tope integer := public._tonos_tope();
  v_hay integer;
  v_r jsonb;
  v_sigue boolean;
  v_cabe boolean;
begin
  perform public.assert_permiso('cotizaciones.configurar');
  lock table public.tonos in share row exclusive mode;
  for v_r in select x from jsonb_array_elements(coalesce(p_reusar, '[]'::jsonb)) x loop
    v_sigue := exists (select 1 from public.tonos t
                        where t.clave = v_r ->> 'clave' and lower(t.hex) = lower(v_r ->> 'hex'));   -- tonos_clave_key
    if not v_sigue then
      raise exception 'Mientras elegías, cambiaron los colores del catálogo. Vuelve a elegir la plantilla.' using errcode = 'PT409';
    end if;
  end loop;
  select count(*) into v_hay from (select 1 from public.tonos limit v_tope + 1) t;
  v_cabe := v_hay + coalesce(p_crear, 0) <= v_tope;
  if not v_cabe then
    raise exception 'No hay lugar para % más en el catálogo (máximo %): elimina alguno que no se use.',
      case when p_crear = 1 then '1 color' else p_crear || ' colores' end, v_tope
      using errcode = '22023', hint = 'colores';
  end if;
end;
$$;
comment on function public._paquete_colores_preparar(jsonb, integer) is
  'Toma tonos en share row exclusive (cotizaciones.configurar) y comprueba que cada color que se reusa ({clave, hex}) sigue con su hex (PT409) y que caben p_crear más (22023, hint colores). Lo llama la invocadora cotizacion_paquete_aplicar.';
revoke all on function public._paquete_colores_preparar(jsonb, integer) from public, anon;
-- `authenticated`: lo llama la invocadora `cotizacion_paquete_aplicar`, que corre con los privilegios de quien la llama.
grant execute on function public._paquete_colores_preparar(jsonb, integer) to authenticated, service_role;

-- 2. Aplicar una plantilla de V1: todo o nada. El orden es fijo para no cruzar candados con publicar (`formulas:` → `plantillas:` → `tonos`) y para que el
-- permiso del origen y los PT409 de los borradores salgan antes de tocar el catálogo.
create function public.cotizacion_paquete_aplicar(
  p_origen uuid,
  p_paquete jsonb,
  p_formula_esperada timestamptz,
  p_plantilla_esperada timestamptz
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
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

  -- Los dos borradores, con la hora del que se reemplaza (nula = crear). La publicada no se compara: el paquete no sale de ella.
  v_formula := public.formula_guardar_borrador(
    p_origen => p_origen, p_def => p_paquete -> 'definicion', p_params => p_paquete -> 'params', p_diseno => p_paquete -> 'diseno',
    p_nota => p_paquete ->> 'nota', p_publicada_esperada => null, p_actualizado_en_esperado => p_formula_esperada);
  v_plantilla := public.plantilla_guardar_borrador(
    p_origen => p_origen, p_actualizado_en_esperado => p_plantilla_esperada, p_def => p_paquete -> 'tarjeta', p_nota => p_paquete ->> 'nota');

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
$$;
comment on function public.cotizacion_paquete_aplicar(uuid, jsonb, timestamptz, timestamptz) is
  'Aplica una plantilla de V1 a un origen, todo o nada (cotizaciones.configurar del origen, 42501): la forma del paquete (22023, hint paquete.<pieza>), el borrador de la fórmula y el de la tarjeta (esperada nula = crear; sus PT409 tal cual), y los colores que faltan (PT409 si el catálogo cambió, 22023 colores sin lugar). No publica. Devuelve {formula: {id, actualizado_en}, plantilla, colores}. docs/COTIZADOR.md › «Plantillas de V1».';
revoke all on function public.cotizacion_paquete_aplicar(uuid, jsonb, timestamptz, timestamptz) from public, anon;
grant execute on function public.cotizacion_paquete_aplicar(uuid, jsonb, timestamptz, timestamptz) to authenticated, service_role;
