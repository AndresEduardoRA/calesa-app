-- Los datos clave de un origen (docs/GLOSARIO.md › «Datos clave»): los hasta 4 datos, en orden, que la ficha de un vehículo de ese origen
-- muestra primero. Cada uno es un dato común (`{"comun": <columna de vehiculos>}`) o un campo activo del origen (`{"campo": <clave>}`).
-- Se escriben sólo por `origen_datos_clave_guardar()`; nacen con los de fábrica de su tipo (trigger BEFORE INSERT) y desactivar o eliminar
-- un campo lo quita de la lista en la misma llamada. La validación tiene su espejo en `src/modules/origenes/entities/datos-clave.ts`, con el
-- juego común `casos-de-datos-clave.json`.

-- Un elemento bien formado: un objeto con una sola clave, `comun` o `campo`, y un texto de 1 a 40 caracteres.
create function public._origen_dato_clave_bien_formado(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p) is distinct from 'object' then false
    when (p - 'comun' - 'campo') <> '{}'::jsonb then false
    when (p ? 'comun') = (p ? 'campo') then false
    else coalesce(
      jsonb_typeof(coalesce(p -> 'comun', p -> 'campo')) = 'string'
        and char_length(coalesce(p ->> 'comun', p ->> 'campo')) between 1 and 40,
      false)
  end
$$;

-- La forma que exige el `check`: un arreglo de hasta 4 elementos bien formados. Lo que depende de otras filas (que el campo esté activo y
-- sea del origen) lo valida la RPC.
create function public._origen_datos_clave_forma(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p) is distinct from 'array' then false
    when jsonb_array_length(p) > 4 then false
    else not exists (
      select 1 from jsonb_array_elements(p) e where not public._origen_dato_clave_bien_formado(e)
    )
  end
$$;

alter table public.origenes add column datos_clave jsonb not null default '[]'::jsonb;
alter table public.origenes add constraint origenes_datos_clave_forma check (public._origen_datos_clave_forma(datos_clave));
comment on column public.origenes.datos_clave is
  'Los hasta 4 datos que la ficha del vehículo muestra primero, en orden: {"comun": columna de vehiculos} o {"campo": clave del campo}. Vacía = los de fábrica de su tipo. Se escribe por origen_datos_clave_guardar().';

-- Las claves de los datos comunes que lleva un origen de ese tipo, con el nombre de su columna en `vehiculos` y en el orden de
-- `camposComunes()`. El lote, la plataforma y el enlace de la subasta sólo existen en uno de subasta.
create function public._origen_datos_clave_comunes(p_tipo public.tipo_origen)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case when p_tipo = 'subasta'
    then array['marca', 'modelo', 'anio', 'vin', 'categoria_id', 'kilometraje', 'placado', 'lote', 'plataforma', 'url_origen']
    else array['marca', 'modelo', 'anio', 'vin', 'categoria_id', 'kilometraje', 'placado']
  end
$$;

-- Los de fábrica de cada tipo (los mismos que `DATOS_CLAVE_DE_FABRICA`).
create function public._origen_datos_clave_de_fabrica(p_tipo public.tipo_origen)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when p_tipo = 'subasta'
    then '[{"comun": "plataforma"}, {"comun": "url_origen"}, {"comun": "kilometraje"}, {"comun": "anio"}]'::jsonb
    else '[{"comun": "anio"}, {"comun": "kilometraje"}, {"comun": "vin"}, {"comun": "categoria_id"}]'::jsonb
  end
$$;

-- Por qué una lista no sirve para un origen de ese tipo con esos campos activos, o nulo: `{"codigo", "mensaje"}`. Revisa en este orden y
-- con estos textos, los mismos de `errorDeDatosClave()` (el juego común lo comprueba).
create function public._origen_datos_clave_error(p_tipo public.tipo_origen, p_datos jsonb, p_campos_activos text[])
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_comunes constant text[] := public._origen_datos_clave_comunes('subasta');
  v_del_tipo constant text[] := public._origen_datos_clave_comunes(p_tipo);
begin
  if jsonb_typeof(p_datos) is distinct from 'array'
     or exists (select 1 from jsonb_array_elements(p_datos) e where not public._origen_dato_clave_bien_formado(e)) then
    return jsonb_build_object('codigo', 'forma', 'mensaje', 'Los datos clave no tienen la forma esperada.');
  end if;
  if jsonb_array_length(p_datos) > 4 then
    return jsonb_build_object('codigo', 'tope', 'mensaje', 'Ya hay 4 datos clave: quita uno para sumar este.');
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_datos) with ordinality a(e, i)
      join jsonb_array_elements(p_datos) with ordinality b(e, j) on a.e = b.e and a.i < b.j
  ) then
    return jsonb_build_object('codigo', 'repetido', 'mensaje', 'Un dato clave está repetido.');
  end if;
  if exists (select 1 from jsonb_array_elements(p_datos) e where e ? 'comun' and not ((e ->> 'comun') = any (v_comunes))) then
    return jsonb_build_object('codigo', 'comun_desconocido', 'mensaje', 'Ese dato común no existe.');
  end if;
  if exists (select 1 from jsonb_array_elements(p_datos) e where e ? 'comun' and not ((e ->> 'comun') = any (v_del_tipo))) then
    return jsonb_build_object('codigo', 'solo_subasta', 'mensaje', 'Ese dato sólo existe en un origen de subasta.');
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_datos) e
     where e ? 'campo' and not ((e ->> 'campo') = any (coalesce(p_campos_activos, array[]::text[])))
  ) then
    return jsonb_build_object('codigo', 'campo_inactivo', 'mensaje',
      'Uno de los campos elegidos ya no está activo en este origen. Recarga para ver los de ahora.');
  end if;
  return null;
end $$;

-- La lista sin el campo de esa clave, en el mismo orden (desactivar o eliminar el campo).
create function public._origen_datos_clave_sin_campo(p jsonb, p_clave text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.e order by x.i), '[]'::jsonb)
    from jsonb_array_elements(p) with ordinality x(e, i)
   where not (x.e ? 'campo' and (x.e ->> 'campo') = p_clave)
$$;

revoke all on function public._origen_dato_clave_bien_formado(jsonb) from public, anon, authenticated;
grant execute on function public._origen_dato_clave_bien_formado(jsonb) to service_role;
revoke all on function public._origen_datos_clave_forma(jsonb) from public, anon, authenticated;
grant execute on function public._origen_datos_clave_forma(jsonb) to service_role;
revoke all on function public._origen_datos_clave_comunes(public.tipo_origen) from public, anon, authenticated;
grant execute on function public._origen_datos_clave_comunes(public.tipo_origen) to service_role;
revoke all on function public._origen_datos_clave_de_fabrica(public.tipo_origen) from public, anon, authenticated;
grant execute on function public._origen_datos_clave_de_fabrica(public.tipo_origen) to service_role;
revoke all on function public._origen_datos_clave_error(public.tipo_origen, jsonb, text[]) from public, anon, authenticated;
grant execute on function public._origen_datos_clave_error(public.tipo_origen, jsonb, text[]) to service_role;
revoke all on function public._origen_datos_clave_sin_campo(jsonb, text) from public, anon, authenticated;
grant execute on function public._origen_datos_clave_sin_campo(jsonb, text) to service_role;

-- Un origen nace con los datos clave de su tipo si no trae los suyos. En un trigger y no en `origen_crear()`: el seed, los e2e y las
-- pruebas insertan directo, y el trigger AFTER que preconfigura los campos no puede tocar `new`. El tipo no cambia: nunca quedan inválidos.
create function public.origen_datos_clave_de_fabrica()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.datos_clave is null or new.datos_clave = '[]'::jsonb then
    new.datos_clave := public._origen_datos_clave_de_fabrica(new.tipo);
  end if;
  return new;
end $$;

revoke all on function public.origen_datos_clave_de_fabrica() from public, anon, authenticated;
grant execute on function public.origen_datos_clave_de_fabrica() to service_role;

create trigger trg_origen_datos_clave_de_fabrica before insert on public.origenes
  for each row execute function public.origen_datos_clave_de_fabrica();

-- Los orígenes que ya existen, con los de su tipo.
update public.origenes set datos_clave = public._origen_datos_clave_de_fabrica(tipo) where datos_clave = '[]'::jsonb;

-- Guarda la lista entera de un origen, con la versión del origen. El permiso va antes que el candado y la versión; un campo que ya no está
-- activo (lo desactivó otra persona) sale PT409 para que la pantalla ofrezca «Recargar»; lo demás, 22023 (la pantalla ya lo impide).
create function public.origen_datos_clave_guardar(p_origen uuid, p_datos jsonb, p_actualizado_en_esperado timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.origenes;
  v_error jsonb;
  v_codigo text;
  v_nueva timestamptz;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into o from public.origenes x where x.id = p_origen for no key update;
  if not found then
    raise exception 'Ese origen ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este origen mientras lo editabas.');
  v_error := public._origen_datos_clave_error(
    o.tipo,
    coalesce(p_datos, 'null'::jsonb),
    array(select c.clave from public.origenes_campos c where c.origen_id = p_origen and c.activo)
  );
  if v_error is not null then
    v_codigo := case when v_error ->> 'codigo' = 'campo_inactivo' then 'PT409' else '22023' end;
    raise exception '%', v_error ->> 'mensaje' using errcode = v_codigo;
  end if;
  update public.origenes x set datos_clave = p_datos where x.id = p_origen returning x.actualizado_en into v_nueva;
  return v_nueva;
end $$;

revoke all on function public.origen_datos_clave_guardar(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.origen_datos_clave_guardar(uuid, jsonb, timestamptz) to authenticated, service_role;

comment on function public.origen_datos_clave_guardar(uuid, jsonb, timestamptz) is
  'Guarda los datos clave de un origen (hasta 4, en orden, sin repetidos, comunes de su tipo o campos activos del origen) con la versión del origen. Pide origenes.gestionar. PT409: versión vieja, origen inexistente o un campo que ya no está activo; 22023: lo demás.';

-- Desactivar un campo que es dato clave lo quita de la lista en la misma llamada (sólo escribe si estaba, para no mover la versión del
-- origen en vano). Lo demás, igual que la definición vigente.
create or replace function public.origen_campo_guardar(p_campo uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.origenes_campos; v_origen public.origenes; v_clave text; v_nueva timestamptz;
  v_editables constant text[] := array['etiqueta', 'tipo', 'opciones', 'requerido', 'grupo', 'en_tarjeta', 'filtrable', 'publico_web', 'clave_apibara', 'activo', 'valor_defecto', 'principal', 'minimo', 'maximo'];
  v_tipo public.tipo_campo; v_opciones jsonb; v_grupo text; v_apibara text; v_con int; v_orden smallint; v_defecto jsonb;
  v_origen_id uuid; v_activo boolean; v_principal boolean; v_restriccion text;
  v_minimo numeric; v_maximo numeric;
begin
  perform public.assert_permiso('origenes.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if not (v_clave = any (v_editables)) then
      raise exception 'El dato «%» no se cambia desde el layout de campos.', v_clave;
    end if;
    if v_clave in ('etiqueta', 'tipo', 'opciones', 'requerido', 'en_tarjeta', 'filtrable', 'publico_web', 'activo', 'principal') and p_cambios -> v_clave = 'null'::jsonb then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave;
    end if;
  end loop;

  select x.origen_id into v_origen_id from public.origenes_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  select * into v_origen from public.origenes o where o.id = v_origen_id for no key update;
  select * into c from public.origenes_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');

  v_tipo := coalesce((p_cambios ->> 'tipo')::public.tipo_campo, c.tipo);
  if v_tipo is distinct from c.tipo then
    if c.es_sistema then
      raise exception 'El tipo de «%» no cambia: es un campo de fábrica.', c.etiqueta;
    end if;
    v_con := public._origen_vehiculos_con_valor(c.origen_id, c.clave);
    if v_con > 0 then
      raise exception '% % ya tienen un valor en «%»: no se puede cambiar su tipo. Desactívalo y crea otro campo.',
        v_con, case when v_con = 1 then 'vehículo' else 'vehículos' end, c.etiqueta;
    end if;
  end if;

  -- Desactivar el principal lo desmarca; marcar principal un desactivado o un monto es un error de validación.
  v_activo := coalesce((p_cambios ->> 'activo')::boolean, c.activo);
  if not v_activo and coalesce((p_cambios ->> 'principal')::boolean, false) then
    raise exception 'Un campo desactivado no puede ser el principal. Actívalo primero.' using hint = 'principal';
  end if;
  v_principal := v_activo and coalesce((p_cambios ->> 'principal')::boolean, c.principal);
  if v_principal and v_tipo = 'moneda' then
    raise exception 'Un monto no identifica a un vehículo: elige otro campo como principal.' using hint = 'principal';
  end if;

  v_opciones := coalesce(p_cambios -> 'opciones', c.opciones);
  if v_tipo not in ('opcion', 'multi_opcion') then
    v_opciones := '[]'::jsonb;
  else
    perform public._origen_opciones_validas(v_opciones);
  end if;

  if p_cambios ? 'valor_defecto' then
    v_defecto := public._origen_valor_defecto(v_tipo, v_opciones, p_cambios -> 'valor_defecto');
  elsif v_tipo is distinct from c.tipo then
    v_defecto := null;
  else
    begin
      v_defecto := public._origen_valor_defecto(v_tipo, v_opciones, c.valor_defecto);
    exception when invalid_parameter_value then
      v_defecto := null;
    end;
  end if;

  -- El rango: lo que se manda (null = sin límite) o el vigente; si el tipo deja de ser numérico, se va solo, como las opciones.
  v_minimo := public._campo_limite(p_cambios, 'minimo', case when v_tipo in ('numero', 'moneda') then c.minimo end);
  v_maximo := public._campo_limite(p_cambios, 'maximo', case when v_tipo in ('numero', 'moneda') then c.maximo end);
  perform public._campo_rango(v_tipo, v_minimo, v_maximo, v_defecto);

  v_grupo := case when p_cambios ? 'grupo' then nullif(btrim(p_cambios ->> 'grupo'), '') else c.grupo end;
  if v_grupo is not null and length(v_grupo) > 40 then raise exception 'El nombre del grupo no puede pasar de 40 caracteres.'; end if;
  v_apibara := case when p_cambios ? 'clave_apibara' then nullif(btrim(p_cambios ->> 'clave_apibara'), '') else c.clave_apibara end;
  if v_apibara is not null and v_origen.tipo <> 'subasta' then
    raise exception 'La clave de apibara sólo se usa en orígenes de subasta.';
  end if;

  -- Cambiar de grupo lo manda al final del grupo nuevo.
  v_orden := c.orden;
  if v_grupo is distinct from c.grupo then
    select max(x.orden) + 1 into v_orden from public.origenes_campos x
    where x.origen_id = c.origen_id and x.id <> c.id and x.grupo is not distinct from v_grupo;
    v_orden := coalesce(v_orden, (select coalesce(max(x.orden), 0) + 10 from public.origenes_campos x where x.origen_id = c.origen_id));
  end if;

  if v_principal and not c.principal then
    perform public._origen_campos_desmarcar_principal(c.origen_id, c.id);
  end if;
  begin
    update public.origenes_campos x set
      etiqueta = case when p_cambios ? 'etiqueta' then public._origen_nombre_valido(p_cambios ->> 'etiqueta', 'el nombre del campo', 60) else x.etiqueta end,
      tipo = v_tipo,
      opciones = v_opciones,
      requerido = coalesce((p_cambios ->> 'requerido')::boolean, x.requerido),
      grupo = v_grupo,
      en_tarjeta = coalesce((p_cambios ->> 'en_tarjeta')::boolean, x.en_tarjeta),
      filtrable = coalesce((p_cambios ->> 'filtrable')::boolean, x.filtrable),
      publico_web = coalesce((p_cambios ->> 'publico_web')::boolean, x.publico_web),
      clave_apibara = v_apibara,
      activo = v_activo,
      principal = v_principal,
      valor_defecto = v_defecto,
      minimo = v_minimo,
      maximo = v_maximo,
      orden = v_orden
    where x.id = p_campo
    returning x.actualizado_en into v_nueva;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    if v_restriccion = 'origenes_campos_principal_unico' then
      raise exception 'Otra persona marcó otro campo como principal mientras editabas.' using errcode = 'PT409';
    end if;
    raise;
  end;
  -- Desactivado: deja de ser dato clave del origen (el origen ya está tomado arriba).
  if c.activo and not v_activo then
    update public.origenes o
       set datos_clave = public._origen_datos_clave_sin_campo(o.datos_clave, c.clave)
     where o.id = c.origen_id
       and o.datos_clave @> jsonb_build_array(jsonb_build_object('campo', c.clave));
  end if;
  if v_orden is distinct from c.orden then
    perform public._origen_campos_renumerar(c.origen_id);
  end if;
  return v_nueva;
end;
$$;

revoke all on function public.origen_campo_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.origen_campo_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

-- Eliminar un campo también lo quita de los datos clave. Toma el origen `for no key update` antes que el campo (el orden origen → campo de
-- `origen_campo_guardar`): sin eso, el `update` del origen cerraría un ciclo de candados con quien guarda un campo del mismo origen.
create or replace function public.origen_campo_eliminar(p_campo uuid, p_actualizado_en_esperado timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare c public.origenes_campos; v_con int; v_origen_id uuid;
begin
  perform public.assert_permiso('origenes.gestionar');
  select x.origen_id into v_origen_id from public.origenes_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform 1 from public.origenes o where o.id = v_origen_id for no key update;
  select * into c from public.origenes_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  if c.es_sistema then
    raise exception '«%» es un campo de fábrica: no se elimina. Puedes desactivarlo.', c.etiqueta using errcode = '23503';
  end if;
  v_con := public._origen_vehiculos_con_valor(c.origen_id, c.clave);
  if v_con > 0 then
    raise exception '% % tienen un valor en «%». Desactívalo para conservarlo.',
      v_con, case when v_con = 1 then 'vehículo' else 'vehículos' end, c.etiqueta using errcode = '23503';
  end if;
  update public.origenes o
     set datos_clave = public._origen_datos_clave_sin_campo(o.datos_clave, c.clave)
   where o.id = c.origen_id
     and o.datos_clave @> jsonb_build_array(jsonb_build_object('campo', c.clave));
  delete from public.origenes_campos where id = p_campo;
end;
$$;

revoke all on function public.origen_campo_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.origen_campo_eliminar(uuid, timestamptz) to authenticated, service_role;
