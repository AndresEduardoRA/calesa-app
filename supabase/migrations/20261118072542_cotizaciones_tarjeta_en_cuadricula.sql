-- `cotizacion_tarjeta(p_formula)` devuelve la cuadrícula (la forma 2): la plantilla publicada del origen, convertida si es de la forma 1 (`_plantilla_convertir()`)
-- y validada otra vez contra esa versión; si no le sirve (o la conversión rompe una regla de la cuadrícula: más de 120 filas, un `{{`), `sin_plantilla`.
-- Con ella, sólo lo que la plantilla nombra y todo del nivel «todos»: los nodos de las filas y de las celdas (y el `pct` de un porcentaje), los grupos de un
-- `tc_*` o un `plazo`, el tipo de cambio de esos buckets (por omisión y en cada modo: el nombre y el nodo cuyo valor se muestra), los modos si se usa `modo_tc`,
-- la variante si se usa `titulo_opcion`, los colores del catálogo que nombran los estilos, el total y `moneda_bs`. docs/COTIZADOR.md › «La lectura de la tarjeta».
-- `_tarjeta_grupos` y `_tarjeta_tipos_de_cambio` quedan sin uso y se borran.

create or replace function public.cotizacion_tarjeta(p_formula uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  fo public.formulas; v_pla public.plantillas_tarjeta; v_p jsonb; v_celdas jsonb; v_filas jsonb; v_nodos jsonb; v_grupos jsonb; v_total text; v_opcion jsonb;
  v_datos jsonb; v_ids text[]; v_pcts jsonb; v_de_grupo text[]; v_buckets text[]; v_tc jsonb; v_variables text[];
begin
  perform public.assert_activo();
  select * into fo from public.formulas f where f.id = p_formula;
  -- La inexistencia y el borrador se deciden antes del permiso (`tiene_permiso` con un origen nulo da verdadero) y dan lo mismo que no tenerlo.
  if not found or fo.estado = 'borrador' then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;
  if not public.tiene_permiso('cotizaciones.ver', fo.origen_id) then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;

  -- La publicada del origen (plantillas_publicada_unica), validada contra ESTA versión sin el catálogo: un color borrado se dibuja `auto`. La de la forma 1 se
  -- convierte con el catálogo de hoy (un color borrado cae al del grupo) y lo convertido se valida sin el tope de 24 KiB.
  select * into v_pla from public.plantillas_tarjeta p where p.origen_id = fo.origen_id and p.estado = 'publicada';
  if not found then return jsonb_build_object('estado', 'sin_plantilla'); end if;
  begin
    perform public.validar_plantilla(v_pla.definicion, fo.definicion, fo.diseno, fo.visibilidad, null);
    if v_pla.definicion ? 'forma' then
      v_p := v_pla.definicion;
    else
      v_p := public._plantilla_convertir(v_pla.definicion, fo.definicion, fo.diseno, fo.visibilidad, array(select t.clave from public.tonos t));
      perform public._plantilla_cuadricula_forma(v_p, false);
      perform public._plantilla_cuadricula_nodos(v_p, fo.definicion, fo.diseno, fo.visibilidad, null);
    end if;
  exception when sqlstate '22023' then
    return jsonb_build_object('estado', 'sin_plantilla');
  end;

  v_celdas := v_p -> 'celdas';
  v_filas := v_p -> 'filas';
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g) from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g), '{}'::jsonb);
  select n ->> 'id' into v_total from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'salida' = 'total' limit 1;
  select n into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;

  -- Lo que muestran las celdas de un nodo ({nodo, mostrar}) y el `pct` del par de cada porcentaje: el suyo si es el `porcentaje_de`, él mismo si es el `pct`.
  v_datos := coalesce((select jsonb_agg(jsonb_build_object('nodo', c -> 'contenido' ->> 'nodo', 'mostrar', c -> 'contenido' ->> 'mostrar'))
                         from jsonb_array_elements(v_celdas) c where c -> 'contenido' ->> 'tipo' = 'dato' and c -> 'contenido' ? 'nodo'), '[]'::jsonb);
  v_pcts := coalesce((select jsonb_object_agg(d ->> 'nodo',
                                              case when v_nodos -> (d ->> 'nodo') ->> 'tipo' = 'calculo' and v_nodos -> (d ->> 'nodo') ->> 'op' = 'porcentaje_de'
                                                   then v_nodos -> (d ->> 'nodo') ->> 'pct' else d ->> 'nodo' end)
                        from jsonb_array_elements(v_datos) d where d ->> 'mostrar' = 'porcentaje'), '{}'::jsonb);
  v_ids := array(select distinct x from (select f ->> 'nodo' as x from jsonb_array_elements(v_filas) f where f ? 'nodo'
                                         union all select d ->> 'nodo' from jsonb_array_elements(v_datos) d
                                         union all select value #>> '{}' from jsonb_each(v_pcts)) t where x is not null);
  v_de_grupo := array(select distinct v_nodos -> (d ->> 'nodo') ->> 'grupo' from jsonb_array_elements(v_datos) d
                       where d ->> 'mostrar' in ('tc_nombre', 'tc_valor', 'plazo') and v_nodos -> (d ->> 'nodo') ->> 'grupo' is not null);
  v_buckets := array(select distinct v_grupos -> (v_nodos -> (d ->> 'nodo') ->> 'grupo') ->> 'bucket' from jsonb_array_elements(v_datos) d
                      where d ->> 'mostrar' in ('tc_nombre', 'tc_valor') and v_grupos -> (v_nodos -> (d ->> 'nodo') ->> 'grupo') ->> 'bucket' is not null);
  v_variables := array(select distinct c -> 'contenido' ->> 'variable' from jsonb_array_elements(v_celdas) c where c -> 'contenido' ? 'variable');
  -- El nombre de cada tipo de cambio por su nodo: el de `tipos_cambio` activo con la clave del nodo (nulo si no hay uno activo), nunca la clave ni el id.
  v_tc := coalesce((select jsonb_object_agg(n ->> 'id', t.nombre) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                      left join public.tipos_cambio t on t.activo and t.clave = n ->> 'clave' where n ->> 'tipo' = 'tipo_cambio'), '{}'::jsonb);

  return jsonb_build_object(
    'estado', 'lista',
    'plantilla', jsonb_build_object('version', v_pla.version),
    'definicion', v_p,
    'nodos', coalesce((select jsonb_agg(jsonb_build_object('id', x, 'etiqueta', v_nodos -> x ->> 'etiqueta', 'descripcion', v_nodos -> x ->> 'descripcion',
                                                           'grupo', v_nodos -> x ->> 'grupo', 'pct', v_pcts ->> x) order by x collate "C")
                         from unnest(v_ids) x), '[]'::jsonb),
    'grupos', coalesce((select jsonb_agg(jsonb_build_object('id', g, 'etiqueta', v_grupos -> g ->> 'etiqueta',
                                                            'plazo', case when jsonb_typeof(v_grupos -> g -> 'plazo') = 'string' then v_grupos -> g -> 'plazo' end,
                                                            'bucket', v_grupos -> g ->> 'bucket') order by g collate "C")
                          from unnest(v_de_grupo) g), '[]'::jsonb),
    'tipos_de_cambio', jsonb_build_object(
      'buckets', coalesce((select jsonb_object_agg(b, jsonb_build_object('nombre', v_tc ->> (fo.definicion -> 'buckets' ->> b), 'nodo', fo.definicion -> 'buckets' ->> b))
                             from unnest(v_buckets) b), '{}'::jsonb),
      'modos', coalesce((select jsonb_object_agg(md ->> 'clave',
                                  coalesce((select jsonb_object_agg(mb ->> 'bucket', jsonb_build_object('nombre', v_tc ->> (mb ->> 'nodo'), 'nodo', mb ->> 'nodo'))
                                              from jsonb_array_elements(coalesce(md -> 'buckets', '[]'::jsonb)) mb where mb ->> 'bucket' = any (v_buckets)), '{}'::jsonb))
                           from jsonb_array_elements(coalesce(fo.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) md where cardinality(v_buckets) > 0), '{}'::jsonb)),
    'modos', case when 'modo_tc' = any (v_variables)
                  then coalesce((select jsonb_agg(jsonb_build_object('clave', md ->> 'clave', 'nombre', md ->> 'nombre') order by o)
                                   from jsonb_array_elements(coalesce(fo.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) with ordinality t (md, o)), '[]'::jsonb)
                  else '[]'::jsonb end,
    'variante', case when 'titulo_opcion' = any (v_variables) and (fo.visibilidad -> (v_opcion ->> 'id') ->> 'ver') = 'todos'
                     then jsonb_build_object('nodo', v_opcion ->> 'id', 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', x.v ->> 'clave', 'titulo', x.v ->> 'titulo') order by x.o)
                                                                                               from jsonb_array_elements(v_opcion -> 'opciones') with ordinality x (v, o)), '[]'::jsonb)) end,
    'colores', coalesce((select jsonb_agg(jsonb_build_object('clave', t.clave, 'hex', t.hex) order by t.clave collate "C")
                           from public.tonos t
                          where exists (select 1 from jsonb_array_elements(v_celdas) c where c -> 'estilo' ->> 'fondo' = t.clave or c -> 'estilo' ->> 'texto' = t.clave)), '[]'::jsonb),
    'total', jsonb_build_object('nodo', v_total),
    -- La moneda del total en Bs: la `moneda_a` del tipo de cambio activo que nombra el `total_en` de esta versión (la regla de la hoja).
    'moneda_bs', (select to_jsonb(t.moneda_a::text) from public.tipos_cambio t where t.activo and t.clave = (v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave'));
end;
$$;

revoke all on function public.cotizacion_tarjeta(uuid) from public, anon;
grant execute on function public.cotizacion_tarjeta(uuid) to authenticated, service_role;

drop function public._tarjeta_grupos(jsonb, jsonb, jsonb);
drop function public._tarjeta_tipos_de_cambio(jsonb, jsonb, text[]);
