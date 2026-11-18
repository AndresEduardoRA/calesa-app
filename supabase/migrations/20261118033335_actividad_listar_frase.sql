-- La actividad como frase (`docs/UX.md` › «Actividad»): «Ana cambió Precio de Toyota Hilux #12: 10.000 → 12.000». `actividad_listar` suma a cada
-- fila visible el nombre del registro (`registro_titulo`), a dónde lleva su enlace (`registro_destino`) y el primer campo que cambió con su
-- antes y su después (`primer_cambio`), sacados del mismo recorte que ya hacía (`_actividad_recortar`): sin teléfonos, sin lo restringido de una
-- cotización, igual que `actividad_diff`. Una fila con `visible: false` no trae ninguna. Mismos parámetros y mismas rutas por índice: lo nuevo
-- se lee por la PK de la fila ya elegida, nunca filtra ni ordena.

-- Un valor corto para la frase: un texto (o un objeto o una lista, como texto) hasta 80 caracteres; un número, un sí/no o un nulo, tal cual.
create or replace function public._actividad_valor_corto(p_valor jsonb) returns jsonb
    language sql immutable
    set search_path = ''
    as $$
  select case jsonb_typeof(p_valor)
    when 'string' then to_jsonb(left(p_valor #>> '{}', 80))
    when 'object' then to_jsonb(left(p_valor::text, 80))
    when 'array' then to_jsonb(left(p_valor::text, 80))
    else p_valor
  end;
$$;

revoke all on function public._actividad_valor_corto(jsonb) from public, anon, authenticated;
grant execute on function public._actividad_valor_corto(jsonb) to service_role;

comment on function public._actividad_valor_corto(jsonb) is
  'Un lado del primer cambio de una fila de actividad_listar: texto, objeto o lista como texto de hasta 80 caracteres; número, sí/no y nulo, tal cual.';


-- El nombre de un registro de la actividad y a dónde lleva su enlace, leídos por su PK. Sólo para una fila que `_actividad_recortar` ya dio
-- por visible: lo que depende de la fila (no de su id) se vuelve a mirar sobre la fila vigente con `_actividad_puede_ver_fila`, porque la
-- foto pudo ser de otra unidad. Nulo si ya no existe o no se ve.
-- `titulo`: el del registro (lead, vehículo, cotización, comprobante, declaración, ítem de repuestos) o, en lo que cuelga de una unidad
-- (documento, gasto, transporte, pago, compra), el de esa unidad. `destino`: la cotización de un comprobante, el vehículo o el proyecto
-- (y el ítem) de lo que cuelga de una unidad; sin destino, el enlace va al registro mismo.
create or replace function public._actividad_registro(p_tabla text, p_registro text) returns jsonb
    language plpgsql stable security definer
    set search_path = ''
    as $_$
declare
  v_id uuid;
  v_fila jsonb;
  v_vehiculo uuid;
  v_item uuid;
  v_proyecto uuid;
begin
  if p_registro is null or p_registro !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  v_id := p_registro::uuid;
  if p_tabla in ('comprobantes', 'documentos', 'formulas', 'gastos', 'pagos', 'transportes')
     and not public._actividad_puede_ver_fila(p_tabla, p_registro, null) then
    return null;
  end if;
  -- Cada una por su PK (`<tabla>_pkey`).
  case p_tabla
    when 'leads' then
      return (select jsonb_build_object('titulo', nullif(btrim(l.nombre), '')) from public.leads l where l.id = v_id);
    when 'vehiculos' then
      return (select jsonb_build_object('titulo', v.titulo || ' #' || v.numero) from public.vehiculos v where v.id = v_id);
    when 'cotizaciones' then
      return (select jsonb_build_object('titulo', 'Cotización #' || c.numero) from public.cotizaciones c where c.id = v_id);
    when 'comprobantes' then
      return (select jsonb_build_object('titulo', 'Comprobante #' || c.numero, 'destino', jsonb_build_object('cotizacion_id', c.cotizacion_id))
                from public.comprobantes c where c.id = v_id);
    when 'declaraciones_aduana' then
      return (select jsonb_build_object('titulo', 'Declaración ' || d.numero) from public.declaraciones_aduana d where d.id = v_id);
    when 'repuestos_items' then
      return (select jsonb_build_object('titulo', i.descripcion, 'destino', jsonb_build_object('proyecto_id', i.proyecto_id, 'item_id', i.id))
                from public.repuestos_items i where i.id = v_id);
    when 'repuestos_compras' then
      return (select jsonb_build_object('titulo', 'Proyecto #' || p.numero, 'destino', jsonb_build_object('proyecto_id', p.id))
                from public.repuestos_compras c join public.repuestos_proyectos p on p.id = c.proyecto_id where c.id = v_id);
    when 'pagos' then
      select to_jsonb(t) into v_fila from public.pagos t where t.id = v_id;
      v_vehiculo := (v_fila ->> 'vehiculo_id')::uuid;
      v_proyecto := (v_fila ->> 'proyecto_repuestos_id')::uuid;
    when 'documentos' then
      select to_jsonb(t) into v_fila from public.documentos t where t.id = v_id;
      v_vehiculo := (v_fila ->> 'vehiculo_id')::uuid;
      v_item := (v_fila ->> 'repuesto_id')::uuid;
    when 'gastos' then
      select to_jsonb(t) into v_fila from public.gastos t where t.id = v_id;
      v_vehiculo := (v_fila ->> 'vehiculo_id')::uuid;
      v_item := (v_fila ->> 'repuesto_id')::uuid;
    when 'transportes' then
      select to_jsonb(t) into v_fila from public.transportes t where t.id = v_id;
      v_vehiculo := (v_fila ->> 'vehiculo_id')::uuid;
      v_item := (v_fila ->> 'repuesto_id')::uuid;
    else
      -- Una fórmula o una tabla de configuración: la app la nombra por su entidad y la lleva a su página de Configuración.
      return null;
  end case;
  -- Lo que cuelga de una unidad: el vehículo, el ítem de repuestos (con su proyecto) o el proyecto.
  if v_vehiculo is not null then
    return (select jsonb_build_object('titulo', v.titulo || ' #' || v.numero, 'destino', jsonb_build_object('vehiculo_id', v.id))
              from public.vehiculos v where v.id = v_vehiculo);
  elsif v_item is not null then
    return (select jsonb_build_object('titulo', i.descripcion, 'destino', jsonb_build_object('proyecto_id', i.proyecto_id, 'item_id', i.id))
              from public.repuestos_items i where i.id = v_item);
  elsif v_proyecto is not null then
    return (select jsonb_build_object('titulo', 'Proyecto #' || p.numero, 'destino', jsonb_build_object('proyecto_id', p.id))
              from public.repuestos_proyectos p where p.id = v_proyecto);
  end if;
  return null;
end;
$_$;

revoke all on function public._actividad_registro(text, text) from public, anon, authenticated;
grant execute on function public._actividad_registro(text, text) to service_role;

comment on function public._actividad_registro(text, text) is
  'El nombre de un registro de la actividad y a dónde lleva su enlace ({titulo, destino}), por su PK, sólo para una fila ya visible; lo que depende de la fila se vuelve a mirar sobre la vigente. Nulo si no existe o no se ve.';


create or replace function public.actividad_listar(
  p_antes_id bigint default null, p_tamano integer default null, p_actor uuid default null, p_tabla text default null,
  p_registro text default null, p_hasta timestamp with time zone default null, p_accion text default null
) returns jsonb
    language plpgsql stable security definer
    set search_path = ''
    as $$
declare
  v_n int := public._acotar_pagina(p_tamano, 20, 100);
  v_antes bigint := p_antes_id;
  v_t timestamptz;
  v_filas public.actividad[];
  v_salida jsonb;
begin
  if not public.tiene_permiso('actividad.ver') then
    raise exception 'No tienes permiso para ver la actividad.' using errcode = '42501';
  end if;
  if p_registro is not null and p_tabla is null then
    raise exception 'Para filtrar por un registro hace falta su entidad.' using errcode = '22023', hint = 'registro';
  end if;
  if v_antes is null and p_hasta is not null then
    -- actividad_fecha_idx: la última fila antes de esa hora y, de las que comparten su hora (una transacción escribe varias con el mismo now()),
    -- la de id mayor, para no perder ninguna.
    select a.creado_en into v_t from public.actividad a where a.creado_en < p_hasta order by a.creado_en desc limit 1;
    if v_t is null then
      return jsonb_build_object('hay_mas', false, 'filas', '[]'::jsonb);
    end if;
    select a.id + 1 into v_antes from public.actividad a where a.creado_en = v_t order by a.id desc limit 1;
  end if;
  v_antes := coalesce(v_antes, 9223372036854775807);

  if p_registro is not null then
    -- actividad_registro_id_idx (tabla, registro_id, id desc)
    v_filas := array(
      select a from public.actividad a
       where a.tabla = p_tabla and a.registro_id = p_registro and a.id < v_antes
         and (p_actor is null or a.actor_id = p_actor) and (p_accion is null or a.accion = p_accion)
       order by a.id desc limit v_n + 1);
  elsif p_actor is not null then
    -- actividad_actor_id_idx (actor_id, id desc)
    v_filas := array(
      select a from public.actividad a
       where a.actor_id = p_actor and a.id < v_antes
         and (p_tabla is null or a.tabla = p_tabla) and (p_accion is null or a.accion = p_accion)
       order by a.id desc limit v_n + 1);
  elsif p_accion is not null then
    -- actividad_accion_id_idx (accion, id desc)
    v_filas := array(
      select a from public.actividad a
       where a.accion = p_accion and a.id < v_antes and (p_tabla is null or a.tabla = p_tabla)
       order by a.id desc limit v_n + 1);
  elsif p_tabla is not null then
    -- actividad_tabla_id_idx (tabla, id desc)
    v_filas := array(
      select a from public.actividad a
       where a.tabla = p_tabla and a.id < v_antes
       order by a.id desc limit v_n + 1);
  else
    -- actividad_pkey
    v_filas := array(
      select a from public.actividad a
       where a.id < v_antes
       order by a.id desc limit v_n + 1);
  end if;

  -- Sobre las filas ya elegidas (a lo sumo v_n): el recorte de cada una y, si se ve, su registro por PK (`_actividad_registro`) y el primer
  -- campo que cambió, sacado de ese recorte. Un campo de `atributos` sale como el objeto con su primera clave que cambió.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'accion', f.accion, 'tabla', f.tabla, 'registro_id', f.registro_id, 'actor_id', f.actor_id,
           'actor_nombre', nullif(btrim(p.nombre), ''), 'creado_en', f.creado_en,
           'visible', r.visible,
           'campos', to_jsonb(coalesce(c.claves[1:5], '{}'::text[])),
           'mas_campos', coalesce(cardinality(c.claves), 0) > 5
         ) || case when r.visible then jsonb_build_object(
           'registro_titulo', g.registro ->> 'titulo',
           'registro_destino', g.registro -> 'destino',
           'primer_cambio', pc.primer
         ) else '{}'::jsonb end order by f.id desc), '[]'::jsonb)
    into v_salida
    from unnest(v_filas[1:v_n]) f
    left join public.perfiles p on p.id = f.actor_id
   cross join lateral (select public._actividad_recortar(f.tabla, f.registro_id, f.antes, f.despues) as v) x
   cross join lateral (select coalesce((x.v ->> 'visible')::boolean, false) as visible) r
   cross join lateral (
     select case when r.visible and f.accion like '%.update'
                 then array(select k from jsonb_object_keys(x.v -> 'cambios') k order by k limit 6)
                 else '{}'::text[] end as claves
   ) c
   cross join lateral (select case when r.visible then public._actividad_registro(f.tabla, f.registro_id) end as registro) g
   cross join lateral (
     select x.v -> 'cambios' -> c.claves[1] as cambio,
            -- La moneda con la regla de `actividad_diff`: fuera de leads y sólo si authenticated lee esa columna.
            c.claves[1] is not null and f.tabla <> 'leads' and exists (
              select 1 from pg_catalog.pg_attribute m
               where m.attrelid = to_regclass('public.' || quote_ident(f.tabla)) and m.attname = 'moneda' and not m.attisdropped
                 and has_column_privilege('authenticated', m.attrelid, m.attnum, 'select')) as con_moneda
   ) cc
   cross join lateral (
     select (select k from jsonb_object_keys(coalesce(nullif(cc.cambio -> 'antes', 'null'::jsonb), '{}'::jsonb)
                                            || coalesce(nullif(cc.cambio -> 'despues', 'null'::jsonb), '{}'::jsonb)) k
              where c.claves[1] in ('atributos', 'atributos_publicos')
                and (cc.cambio -> 'antes' -> k) is distinct from (cc.cambio -> 'despues' -> k)
              order by k limit 1) as interna
   ) ia
   cross join lateral (
     select case
       when cc.cambio is null then null
       when c.claves[1] in ('atributos', 'atributos_publicos') and ia.interna is null then null
       else jsonb_build_object(
         'campo', c.claves[1],
         'antes', case when ia.interna is null then public._actividad_valor_corto(cc.cambio -> 'antes')
                       else jsonb_build_object(ia.interna, public._actividad_valor_corto(cc.cambio -> 'antes' -> ia.interna)) end,
         'despues', case when ia.interna is null then public._actividad_valor_corto(cc.cambio -> 'despues')
                         else jsonb_build_object(ia.interna, public._actividad_valor_corto(cc.cambio -> 'despues' -> ia.interna)) end,
         'moneda_antes', case when cc.con_moneda then nullif(f.antes ->> 'moneda', '') end,
         'moneda_despues', case when cc.con_moneda then nullif(f.despues ->> 'moneda', '') end)
     end as primer
   ) pc;

  return jsonb_build_object('hay_mas', coalesce(cardinality(v_filas), 0) > v_n, 'filas', v_salida);
end;
$$;

comment on function public.actividad_listar(bigint, integer, uuid, text, text, timestamp with time zone, text) is
  'La página de /actividad (9.01-1): por cursor sobre id, una ruta por filtro con su índice, tamaño por _acotar_pagina (20, máx. 100), «Ir a una fecha» por actividad_fecha_idx. Pide actividad.ver (42501). Cada fila: cabecera, visible y hasta 5 campos que cambiaron; una visible suma registro_titulo y registro_destino (_actividad_registro, por PK) y primer_cambio (el primer campo con antes y después ya recortados por _actividad_recortar, cortos y con la moneda de cada lado). Nunca detalle.';
