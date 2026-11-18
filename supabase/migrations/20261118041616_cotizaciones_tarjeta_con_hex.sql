-- La tarjeta de la cotización (la vista previa, el PDF y la imagen) pinta cada grupo con el hex de su color del catálogo, igual en los dos temas, y el texto
-- que se lee sobre él. `tonos[]` de `cotizacion_tarjeta` pasa a ser `{clave, hex, tarjeta: {fondo, borde, tinta}}` (antes, claro y oscuro de la hoja).
-- `_tarjeta_grupos` sólo mira las claves (`p_tonos ? clave`) y no cambia. Lo demás de la función es el de siempre.

create or replace function public.cotizacion_tarjeta(p_formula uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  fo public.formulas; v_pla public.plantillas_tarjeta; v_p jsonb; v_nodos jsonb; v_total text; v_ton jsonb; v_grupos jsonb; v_opcion jsonb;
  v_claves text[]; v_buckets text[];
begin
  perform public.assert_activo();
  select * into fo from public.formulas f where f.id = p_formula;
  -- La inexistencia y el borrador se deciden antes del permiso (`tiene_permiso` con un origen nulo da verdadero) y dan lo mismo que no tenerlo.
  if not found or fo.estado = 'borrador' then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;
  if not public.tiene_permiso('cotizaciones.ver', fo.origen_id) then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;

  -- La publicada del origen (plantillas_publicada_unica), validada contra ESTA versión; sin tonos: uno borrado cae al del grupo.
  select * into v_pla from public.plantillas_tarjeta p where p.origen_id = fo.origen_id and p.estado = 'publicada';
  if not found then return jsonb_build_object('estado', 'sin_plantilla'); end if;
  begin
    perform public.validar_plantilla(v_pla.definicion, fo.definicion, fo.diseno, fo.visibilidad, null);
  exception when sqlstate '22023' then
    return jsonb_build_object('estado', 'sin_plantilla');
  end;

  v_p := v_pla.definicion;
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  select n ->> 'id' into v_total from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'salida' = 'total' limit 1;
  select n into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;
  -- Cada color del catálogo por su clave, con lo que pinta la tarjeta, igual en los dos temas: el hex de fondo, el borde claro y el texto que se lee
  -- (`_color_tinta_de_la_tarjeta`: la tinta clara si cumple AA sobre el hex; si no, #1b2130 o blanco). La regla se calcula aquí: la hoja no carga su espejo.
  v_ton := coalesce((select jsonb_object_agg(t.clave, jsonb_build_object('clave', t.clave, 'hex', t.hex,
                                                    'tarjeta', jsonb_build_object('fondo', t.hex, 'borde', t.claro_borde,
                                                                                  'tinta', public._color_tinta_de_la_tarjeta(t.hex, t.claro_tinta))))
                       from public.tonos t), '{}'::jsonb);
  v_grupos := public._tarjeta_grupos(v_p, fo.definicion, v_ton);
  v_claves := array(select distinct g ->> 'tono' from jsonb_array_elements(v_grupos) g where g ->> 'tono' is not null);
  v_buckets := array(select distinct g ->> 'bucket' from jsonb_array_elements(v_grupos) g where g ->> 'bucket' is not null);

  return jsonb_build_object(
    'estado', 'lista',
    'plantilla', jsonb_build_object('version', v_pla.version),
    'logo', v_p -> 'logo',
    'nota', v_p -> 'nota',
    'columnas', v_p -> 'columnas',
    'total', jsonb_build_object('nodo', v_total, 'etiqueta', v_p -> 'total' ->> 'etiqueta', 'leyenda', v_p -> 'total' ->> 'leyenda'),
    'secundarios', coalesce((select jsonb_agg(jsonb_build_object('nodo', x.s, 'etiqueta', coalesce(v_p -> 'etiquetas' ->> x.s, v_nodos -> x.s ->> 'etiqueta')) order by x.o)
                               from jsonb_array_elements_text(coalesce(fo.diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality x (s, o)), '[]'::jsonb),
    'grupos', v_grupos,
    'tipos_de_cambio', case when (v_p -> 'columnas' ->> 'tipo_cambio')::boolean then public._tarjeta_tipos_de_cambio(fo.definicion, fo.diseno, v_buckets)
                            else '{"buckets": {}, "modos": {}}'::jsonb end,
    'variante', case when (fo.visibilidad -> (v_opcion ->> 'id') ->> 'ver') = 'todos'
                     then jsonb_build_object('nodo', v_opcion ->> 'id', 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', x.v ->> 'clave', 'titulo', x.v ->> 'titulo') order by x.o)
                                                                                               from jsonb_array_elements(v_opcion -> 'opciones') with ordinality x (v, o)), '[]'::jsonb)) end,
    'tonos', coalesce((select jsonb_agg(v_ton -> c order by c collate "C") from unnest(v_claves) c), '[]'::jsonb),
    -- La moneda del total en Bs: la `moneda_a` del tipo de cambio activo que nombra el `total_en` de esta versión (la regla de la hoja).
    'moneda_bs', (select to_jsonb(t.moneda_a::text) from public.tipos_cambio t where t.activo and t.clave = (v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave'));
end;
$$;

revoke all on function public.cotizacion_tarjeta(uuid) from public, anon;
grant execute on function public.cotizacion_tarjeta(uuid) to authenticated, service_role;
