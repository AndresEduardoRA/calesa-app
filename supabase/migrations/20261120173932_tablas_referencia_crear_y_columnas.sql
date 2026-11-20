-- Crear tablas de referencia, cambiar sus columnas y desactivarlas desde la configuración (docs/COTIZADOR.md › «Las tablas congeladas (D5)» ›
-- «Crear, columnas y desactivar»). Tres RPC nuevas (`tabla_referencia_crear`, `tabla_referencia_columnas`, `tabla_referencia_desactivar`) y sus
-- ayudantes; ninguna función existente se recrea y `authenticated` sigue sin escribir en las tablas (la policy de lectura no cambia).
--
-- Los candados: crear toma `tablas_referencia:crear` (el choque de claves y el tope salen exactos); columnas y desactivar toman la tabla
-- `for update` y después `formulas:<origen>` de cada origen que la recibe, en orden de origen (como `tabla_referencia_publicar`), y leen «en uso»
-- después de los candados: ven cualquier fórmula publicada antes.

-- La clave de una tabla, sacada de su nombre: minúsculas ASCII, sin acentos, `_` entre palabras, `t_` delante si empieza con un dígito y hasta 40
-- letras. Cumple siempre `esquemaId` (`entities/nodos.ts`). Espejo en `entities/tablas/estructura.ts` (`claveDeLaTabla`), probado en PGlite.
create or replace function public._tabla_referencia_clave(p_nombre text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v text;
begin
  -- `collate "C"`: `lower()` sólo toca ASCII, igual en la base real y en PGlite; las vocales con acento, en las dos cajas, las cambia `translate`.
  v := btrim(regexp_replace(
         translate(lower(coalesce(p_nombre, '') collate "C"),
                   'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
                   'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'),
         '[^abcdefghijklmnopqrstuvwxyz0123456789]+', '_', 'g'), '_');
  if v ~ '^[0123456789]' then
    v := 't_' || v;
  end if;
  v := rtrim(left(v, 40), '_');
  if char_length(v) < 2 then
    raise exception 'El nombre de la tabla necesita al menos dos letras o números.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;

-- Las columnas que se piden, validadas y en su orden: `{clave, etiqueta, tipo}` (la etiqueta sin espacios en los bordes; otra llave se descarta).
-- Un 22023 con el camino en `hint` (`columnas`, `columnas.<i>.clave|etiqueta|tipo`, `<i>` desde 0; el texto cuenta desde 1), el primero que
-- aparece recorriendo columna por columna. Un tipo fuera de número, año o texto sólo pasa si `p_anteriores` ya tenía esa columna con ese tipo (las
-- nacidas por SQL se conservan si no cambian). Espejo en `entities/tablas/validacion-de-columnas.ts`, probado en PGlite.
create or replace function public._tabla_referencia_columnas_validas(p_columnas jsonb, p_anteriores jsonb default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ok boolean; v_c jsonb; v_n bigint; v_camino text; v_clave text; v_etiqueta text; v_tipo text;
  v_claves text[] := array[]::text[]; v_etiquetas text[] := array[]::text[]; v_salida jsonb := '[]'::jsonb;
begin
  v_ok := coalesce(jsonb_typeof(p_columnas) = 'array', false);
  if v_ok then
    v_ok := jsonb_array_length(p_columnas) between 1 and 20;
  end if;
  if not v_ok then
    raise exception 'Una tabla tiene de 1 a 20 columnas.' using errcode = '22023', hint = 'columnas';
  end if;
  for v_c, v_n in select e.value, e.n from jsonb_array_elements(p_columnas) with ordinality e (value, n) loop
    v_camino := 'columnas.' || (v_n - 1);
    if jsonb_typeof(v_c) is distinct from 'object' then
      raise exception 'La columna %: no es una columna.', v_n using errcode = '22023', hint = v_camino;
    end if;
    v_clave := case when jsonb_typeof(v_c -> 'clave') = 'string' then v_c ->> 'clave' end;
    v_ok := coalesce(v_clave ~ '^[abcdefghijklmnopqrstuvwxyz][abcdefghijklmnopqrstuvwxyz0123456789_]{0,40}$', false);
    if not v_ok then
      raise exception 'La columna %: la clave va en minúsculas, sin espacios ni acentos, y empieza con una letra.', v_n
        using errcode = '22023', hint = v_camino || '.clave';
    end if;
    if v_clave = any (v_claves) then
      raise exception 'La columna %: ya hay otra con la clave «%».', v_n, v_clave using errcode = '22023', hint = v_camino || '.clave';
    end if;
    v_etiqueta := case when jsonb_typeof(v_c -> 'etiqueta') = 'string' then btrim(v_c ->> 'etiqueta', ' ') else '' end;
    if v_etiqueta = '' then
      raise exception 'La columna %: le falta el nombre.', v_n using errcode = '22023', hint = v_camino || '.etiqueta';
    end if;
    if char_length(v_etiqueta) > 60 then
      raise exception 'La columna %: el nombre pasa de 60 letras.', v_n using errcode = '22023', hint = v_camino || '.etiqueta';
    end if;
    if lower(v_etiqueta collate "C") = any (v_etiquetas) then
      raise exception 'La columna %: ya hay otra «%».', v_n, v_etiqueta using errcode = '22023', hint = v_camino || '.etiqueta';
    end if;
    v_tipo := case when jsonb_typeof(v_c -> 'tipo') = 'string' then v_c ->> 'tipo' end;
    v_ok := coalesce(v_tipo in ('numero', 'anio', 'texto'), false);
    if not v_ok and v_tipo is not null and jsonb_typeof(p_anteriores) = 'array' then
      v_ok := exists (select 1 from jsonb_array_elements(p_anteriores) a
                       where a.value ->> 'clave' = v_clave and a.value ->> 'tipo' = v_tipo);
    end if;
    if not v_ok then
      raise exception 'La columna %: el tipo es número, año o texto.', v_n using errcode = '22023', hint = v_camino || '.tipo';
    end if;
    v_claves := v_claves || v_clave;
    v_etiquetas := v_etiquetas || lower(v_etiqueta collate "C");
    v_salida := v_salida || jsonb_build_array(jsonb_build_object('clave', v_clave, 'etiqueta', v_etiqueta, 'tipo', v_tipo));
  end loop;
  return v_salida;
end;
$$;

-- Quién usa la tabla («en uso», glosario): por cada origen que la recibe (la propia de su origen, o la compartida en los orígenes sin una propia
-- activa de esa clave, como `_tabla_referencia_usada_en`), cada fórmula publicada o borrador que la nombra: un nodo con `tabla` = la clave, su copia
-- congelada en `params.tablas` o una ayuda `{tabla}` del diseño. `columnas`: las que nombran sus nodos de esa tabla (el `match` y la `columna` de un
-- `tabla`; la `columna`, `desde` y `hasta` de un `tramo` o de un `depreciar`). No supone una sola publicada por origen.
create or replace function public._tabla_referencia_usos(p_tabla uuid)
returns table (origen_id uuid, origen text, estado text, columnas text[])
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.nombre, f.estado::text,
         coalesce((select array_agg(distinct x.c order by x.c)
                     from (select k.c
                             from jsonb_array_elements(case when jsonb_typeof(f.definicion -> 'nodos') = 'array' then f.definicion -> 'nodos' else '[]'::jsonb end) n
                            cross join lateral (
                              select jsonb_object_keys(case when jsonb_typeof(n -> 'match') = 'object' then n -> 'match' else '{}'::jsonb end)
                               where n ->> 'tipo' = 'tabla'
                              union all select n ->> 'columna' where n ->> 'tipo' = 'tabla'
                              union all select y from unnest(array[n ->> 'columna', 'desde', 'hasta']) y
                               where n ->> 'tipo' = 'tramo' or (n ->> 'tipo' = 'calculo' and n ->> 'op' = 'depreciar')
                            ) k (c)
                            where n ->> 'tabla' = t.clave) x
                    where x.c is not null), array[]::text[])
    from public.tablas_referencia t                                                              -- tablas_referencia_pkey
    join public.origenes o
      on (t.origen_id is not null and o.id = t.origen_id)
      or (t.origen_id is null
          and not exists (select 1 from public.tablas_referencia r                               -- tablas_referencia_origen_id_clave_key
                           where r.origen_id = o.id and r.clave = t.clave and r.activa))
    join public.formulas f                                                                       -- formulas_publicada_unica, formulas_borrador_unico
      on f.origen_id = o.id and f.estado in ('publicada', 'borrador')
   where t.id = p_tabla
     and (exists (select 1 from jsonb_array_elements(case when jsonb_typeof(f.definicion -> 'nodos') = 'array' then f.definicion -> 'nodos' else '[]'::jsonb end) n
                   where n ->> 'tabla' = t.clave)
          or coalesce(jsonb_typeof(f.params -> 'tablas') = 'object' and (f.params -> 'tablas') ? t.clave, false)
          or coalesce(jsonb_path_exists(f.diseno, '$.secciones[*].items[*].ayuda.tabla ? (@ == $c)', jsonb_build_object('c', t.clave)), false))
   order by o.nombre collate "C", o.id, case f.estado when 'publicada' then 0 else 1 end, f.id;
$$;

-- «la fórmula publicada de Japón y el borrador de USA»: los usos de la tabla (con `p_columnas`, sólo los que nombran alguna de esas columnas), una vez
-- por origen y estado. Nombra hasta tres y después dice «y otras fórmulas», nunca un total. Nulo si nadie la usa.
create or replace function public._tabla_referencia_frase_de_usos(p_tabla uuid, p_columnas text[] default null)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_partes text[]; v_n int;
begin
  select array_agg(case u.estado when 'publicada' then 'la fórmula publicada de ' else 'el borrador de ' end || u.origen order by u.ord)
    into v_partes
    from (select d.origen, d.estado, row_number() over (order by d.origen collate "C", d.origen_id, d.estado_orden) as ord
            from (select distinct x.origen_id, x.origen, x.estado, case x.estado when 'publicada' then 0 else 1 end as estado_orden
                    from public._tabla_referencia_usos(p_tabla) x
                   where p_columnas is null or x.columnas && p_columnas) d
           order by d.origen collate "C", d.origen_id, d.estado_orden
           limit 4) u;
  v_n := coalesce(cardinality(v_partes), 0);
  if v_n = 0 then
    return null;
  elsif v_n = 1 then
    return v_partes[1];
  elsif v_n = 2 then
    return v_partes[1] || ' y ' || v_partes[2];
  elsif v_n = 3 then
    return v_partes[1] || ', ' || v_partes[2] || ' y ' || v_partes[3];
  end if;
  return v_partes[1] || ', ' || v_partes[2] || ', ' || v_partes[3] || ' y otras fórmulas';
end;
$$;

-- Una compartida cambia lo de cada origen que la usa: hace falta `cotizaciones.configurar` de cada origen cuya publicada o borrador la usa (publicar
-- mira sólo la publicada; aquí el borrador también cuenta como uso, y sin este permiso el 23503 nombraría el borrador de un origen ajeno). El 42501
-- nombra el origen y no dice si es la publicada o el borrador: cualquiera lee los nombres de los orígenes (policy `origenes: leer`).
create or replace function public._tabla_referencia_permiso_de_quienes_la_usan(p_tabla uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_o record;
begin
  for v_o in select distinct u.origen_id, u.origen as nombre from public._tabla_referencia_usos(p_tabla) u
              order by u.origen_id loop
    if not public.tiene_permiso('cotizaciones.configurar', v_o.origen_id) then
      raise exception 'La usa la fórmula de %, donde no tienes «cotizaciones.configurar».', v_o.nombre using errcode = '42501';
    end if;
  end loop;
end;
$$;

-- Crear una tabla de referencia, propia de un origen o compartida (`p_origen` nulo). La clave sale del nombre y no cambia; nace en la versión 1, activa
-- y sin filas. Idempotente por `p_id` (el intento): repetirlo devuelve la misma tabla con `repetido`.
create or replace function public.tabla_referencia_crear(p_id uuid, p_origen uuid, p_nombre text, p_columnas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_sin_permiso constant text := 'No tienes el permiso «cotizaciones.configurar».';
  v_nombre text; v_clave text; v_columnas jsonb; v_t public.tablas_referencia; v_estado text; v_lleno text;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  -- Con origen, el de ese origen; compartida, el de algún origen.
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  -- Con una concesión de todos los orígenes `tiene_permiso` da verdadero para cualquier id: sin esto caería la FK cruda.
  if p_origen is not null and not exists (select 1 from public.origenes o where o.id = p_origen) then   -- origenes_pkey
    raise exception 'Ese origen no existe.' using errcode = '22023', hint = 'origen';
  end if;
  v_nombre := btrim(coalesce(p_nombre, ''));
  if v_nombre = '' then
    raise exception 'La tabla necesita un nombre.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v_nombre) > 80 then
    raise exception 'El nombre pasa de 80 letras.' using errcode = '22023', hint = 'nombre';
  end if;
  v_clave := public._tabla_referencia_clave(v_nombre);
  v_columnas := public._tabla_referencia_columnas_validas(p_columnas);

  -- Dos que crean a la vez van en fila: la segunda ve la clave y el tope de la primera.
  perform pg_advisory_xact_lock(hashtextextended('tablas_referencia:crear', 0));
  select * into v_t from public.tablas_referencia r where r.id = p_id;                               -- tablas_referencia_pkey
  if v_t.id is not null then
    -- El mismo intento en otro destino no delata la fila.
    if v_t.origen_id is distinct from p_origen then
      raise exception '%', c_sin_permiso using errcode = '42501';
    end if;
    return jsonb_build_object('id', v_t.id, 'clave', v_t.clave, 'version', v_t.version, 'repetido', true);
  end if;

  -- tablas_referencia_origen_id_clave_key: la restricción cuenta también las desactivadas.
  if p_origen is null then
    select case when r.activa then '' else ' (desactivada)' end into v_estado
      from public.tablas_referencia r where r.origen_id is null and r.clave = v_clave;
  else
    select case when r.activa then '' else ' (desactivada)' end into v_estado
      from public.tablas_referencia r where r.origen_id = p_origen and r.clave = v_clave;
  end if;
  if v_estado is not null then
    raise exception 'Ya hay una tabla con la clave «%»%: elige otro nombre.', v_clave, v_estado using errcode = '23505', hint = 'nombre';
  end if;
  -- Una propia taparía a la compartida activa que las fórmulas del origen leen vivas.
  if p_origen is not null and exists (select 1 from public.tablas_referencia r
                                       where r.origen_id is null and r.clave = v_clave and r.activa) then   -- tablas_referencia_origen_id_clave_key
    raise exception 'Ya hay una tabla compartida con la clave «%»: elige otro nombre.', v_clave using errcode = '23505', hint = 'nombre';
  end if;

  -- El tope: un origen recibe hasta 100 tablas activas, propias y compartidas (la lista y el catálogo de BUSCARV muestran 100).
  if p_origen is not null then
    select o.nombre into v_lleno from public.origenes o                                              -- origenes_pkey
     where o.id = p_origen
       and (select count(*) from (select 1 from public.tablas_referencia r                           -- tablas_referencia_origen_id_clave_key
                                   where r.activa and (r.origen_id = p_origen or r.origen_id is null) limit 100) x) >= 100;
  else
    select o.nombre into v_lleno from public.origenes o
     where (select count(*) from (select 1 from public.tablas_referencia r                           -- tablas_referencia_origen_id_clave_key
                                   where r.activa and (r.origen_id = o.id or r.origen_id is null) limit 100) x) >= 100
     order by o.nombre collate "C", o.id limit 1;
  end if;
  if v_lleno is not null then
    raise exception '% ya recibe 100 tablas, que es el máximo: desactiva una que ninguna fórmula use.', v_lleno using errcode = '22023', hint = 'nombre';
  end if;

  begin
    insert into public.tablas_referencia (id, origen_id, clave, nombre, columnas)
    values (p_id, p_origen, v_clave, v_nombre, v_columnas);
  exception when unique_violation then
    raise exception 'Ya hay una tabla con la clave «%»: elige otro nombre.', v_clave using errcode = '23505', hint = 'nombre';
  end;

  -- La actividad no guarda las columnas (contenido oculto de las tablas de referencia): sólo cuántas.
  perform public.registrar_actividad('tabla_referencia.creada', 'tablas_referencia', p_id::text, null,
    jsonb_build_object('clave', v_clave, 'nombre', v_nombre, 'origen_id', p_origen, 'cuantas_columnas', jsonb_array_length(v_columnas)));
  return jsonb_build_object('id', p_id, 'clave', v_clave, 'version', 1, 'repetido', false);
end;
$$;

-- Toma la tabla y los candados de los orígenes que la reciben, con el permiso de quienes la usan y la versión esperada: lo común de cambiar las
-- columnas y de desactivar. Devuelve la tabla leída tras su candado.
create or replace function public._tabla_referencia_tomar(p_tabla uuid, p_version_esperada integer)
returns public.tablas_referencia
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_sin_permiso constant text := 'No tienes el permiso «cotizaciones.configurar».';
  v_t public.tablas_referencia; v_o record; v_f text;
begin
  perform public.assert_activo();
  -- Una tabla que no existe, una inactiva y una de un origen ajeno dan el mismo 42501, como publicar.
  select * into v_t from public.tablas_referencia r where r.id = p_tabla;                          -- tablas_referencia_pkey
  if v_t.id is null or not v_t.activa then raise exception '%', c_sin_permiso using errcode = '42501'; end if;
  perform public.assert_permiso('cotizaciones.configurar', v_t.origen_id);
  if p_version_esperada is null then
    raise exception 'Falta la versión de la tabla que tenías.' using errcode = '22023', hint = 'version';
  end if;
  select * into v_t from public.tablas_referencia r where r.id = p_tabla for update;
  if not v_t.activa then raise exception '%', c_sin_permiso using errcode = '42501'; end if;
  -- Los orígenes que la reciben, en orden de origen (como publicar): «en uso» se lee después y ve lo que otro publicó antes.
  for v_o in select distinct u.origen_id from public._tabla_referencia_usada_en(p_tabla) u order by u.origen_id loop
    perform pg_advisory_xact_lock(hashtextextended('formulas:' || v_o.origen_id::text, 0));
  end loop;
  perform public._tabla_referencia_permiso_de_quienes_la_usan(p_tabla);
  if v_t.version <> p_version_esperada then
    v_f := public._tabla_referencia_publicada_por(p_tabla);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  return v_t;
end;
$$;

-- Cambiar las columnas de una tabla: recibe la lista entera, en su orden, y la base calcula qué se sumó, renombró (cambió la etiqueta), movió o quitó.
-- La clave y el tipo de una columna no cambian. Quitar una que una fórmula del origen (publicada o borrador) nombra es 23503 con quién; quitar una sin
-- uso la borra de las filas. Sube la versión de la tabla con una nota automática y no publica la N+1 de ninguna fórmula.
create or replace function public.tabla_referencia_columnas(p_tabla uuid, p_columnas jsonb, p_version_esperada integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.tablas_referencia; v_anterior int; v_nuevas jsonb := '[]'::jsonb; v_validas jsonb; v_c jsonb; v_viejo jsonb; v_n bigint;
  v_quitadas text[]; v_usadas text[]; v_lista text[]; v_lista_texto text; v_frase text; v_usos int; v_verbo text; v_partes text[] := array[]::text[];
  v_sumadas text[]; v_renombradas text[]; v_orden_antes text[]; v_orden_ahora text[];
begin
  v_t := public._tabla_referencia_tomar(p_tabla, p_version_esperada);
  v_validas := public._tabla_referencia_columnas_validas(p_columnas, v_t.columnas);
  -- Una columna que ya estaba conserva lo suyo (también una llave que no es de esta pantalla) y sólo cambia su etiqueta.
  for v_c, v_n in select e.value, e.n from jsonb_array_elements(v_validas) with ordinality e (value, n) loop
    select a.value into v_viejo from jsonb_array_elements(v_t.columnas) a where a.value ->> 'clave' = v_c ->> 'clave' limit 1;
    if v_viejo is not null and (v_viejo ->> 'tipo') is distinct from (v_c ->> 'tipo') then
      raise exception 'La columna %: su tipo no cambia; quítala y súmala de nuevo.', v_n
        using errcode = '22023', hint = 'columnas.' || (v_n - 1) || '.tipo';
    end if;
    v_nuevas := v_nuevas || jsonb_build_array(case when v_viejo is null then v_c else v_viejo || jsonb_build_object('etiqueta', v_c -> 'etiqueta') end);
  end loop;
  if v_nuevas = v_t.columnas then
    raise exception 'Las columnas no cambiaron.' using errcode = '22023', hint = 'columnas';
  end if;

  select coalesce(array_agg(a.value ->> 'clave' order by a.n), array[]::text[]) into v_quitadas
    from jsonb_array_elements(v_t.columnas) with ordinality a (value, n)
   where not exists (select 1 from jsonb_array_elements(v_nuevas) b where b.value ->> 'clave' = a.value ->> 'clave');
  if cardinality(v_quitadas) > 0 then
    select coalesce(array_agg(distinct x.c), array[]::text[]) into v_usadas
      from public._tabla_referencia_usos(p_tabla) u cross join lateral unnest(u.columnas) x (c)
     where x.c = any (v_quitadas);
    if cardinality(v_usadas) > 0 then
      select array_agg('«' || (a.value ->> 'etiqueta') || '»' order by a.n) into v_lista
        from jsonb_array_elements(v_t.columnas) with ordinality a (value, n) where a.value ->> 'clave' = any (v_usadas);
      v_frase := public._tabla_referencia_frase_de_usos(p_tabla, v_usadas);
      select count(*) into v_usos from (select distinct u.origen_id, u.estado from public._tabla_referencia_usos(p_tabla) u
                                          where u.columnas && v_usadas limit 2) x;
      v_lista_texto := case when cardinality(v_lista) = 1 then v_lista[1]
                            else array_to_string(v_lista[1:cardinality(v_lista) - 1], ', ') || ' y ' || v_lista[cardinality(v_lista)] end;
      v_verbo := case when cardinality(v_lista) = 1 then 'la' else 'las' end || case when v_usos > 1 then ' usan' else ' usa' end;
      raise exception '% % % %.', case when cardinality(v_lista) = 1 then 'La columna' else 'Las columnas' end, v_lista_texto, v_verbo, v_frase
        using errcode = '23503', hint = 'columnas';
    end if;
  end if;

  -- La nota automática: qué se sumó, renombró y quitó, y si cambió el orden de las que siguen.
  select coalesce(array_agg('«' || (b.value ->> 'etiqueta') || '»' order by b.n), array[]::text[]) into v_sumadas
    from jsonb_array_elements(v_nuevas) with ordinality b (value, n)
   where not exists (select 1 from jsonb_array_elements(v_t.columnas) a where a.value ->> 'clave' = b.value ->> 'clave');
  select coalesce(array_agg('«' || (a.value ->> 'etiqueta') || '» a «' || (b.value ->> 'etiqueta') || '»' order by b.n), array[]::text[]) into v_renombradas
    from jsonb_array_elements(v_nuevas) with ordinality b (value, n)
    join jsonb_array_elements(v_t.columnas) a on a.value ->> 'clave' = b.value ->> 'clave'
   where (a.value ->> 'etiqueta') is distinct from (b.value ->> 'etiqueta');
  select coalesce(array_agg(a.value ->> 'clave' order by a.n), array[]::text[]) into v_orden_antes
    from jsonb_array_elements(v_t.columnas) with ordinality a (value, n) where not (a.value ->> 'clave') = any (v_quitadas);
  select coalesce(array_agg(b.value ->> 'clave' order by b.n), array[]::text[]) into v_orden_ahora
    from jsonb_array_elements(v_nuevas) with ordinality b (value, n) where (b.value ->> 'clave') = any (v_orden_antes);
  if cardinality(v_sumadas) > 0 then v_partes := v_partes || ('sumó ' || array_to_string(v_sumadas, ', ')); end if;
  if cardinality(v_renombradas) > 0 then v_partes := v_partes || ('renombró ' || array_to_string(v_renombradas, ', ')); end if;
  if cardinality(v_quitadas) > 0 then
    v_partes := v_partes || ('quitó ' || (select string_agg('«' || (a.value ->> 'etiqueta') || '»', ', ' order by a.n)
                                           from jsonb_array_elements(v_t.columnas) with ordinality a (value, n)
                                          where a.value ->> 'clave' = any (v_quitadas)));
  end if;
  if v_orden_antes is distinct from v_orden_ahora then v_partes := v_partes || 'cambió el orden'::text; end if;

  v_anterior := v_t.version;
  update public.tablas_referencia r
     set columnas = v_nuevas, version = r.version + 1, nota = left('Columnas: ' || array_to_string(v_partes, '; ') || '.', 2000),
         publicado_por = (select auth.uid()), publicado_en = now()
   where r.id = p_tabla
  returning * into v_t;
  -- Sin esto, el próximo publicar fallaría con «la tabla no tiene la columna».
  if cardinality(v_quitadas) > 0 then
    update public.tablas_referencia_filas x set valores = x.valores - v_quitadas                     -- tablas_referencia_filas_tabla_orden_idx
     where x.tabla_id = p_tabla and x.valores ?| v_quitadas;
  end if;

  perform public.registrar_actividad('tabla_referencia.columnas', 'tablas_referencia', p_tabla::text,
    jsonb_build_object('version', v_anterior), jsonb_build_object('version', v_t.version, 'nota', v_t.nota));
  return jsonb_build_object('version', v_t.version);
end;
$$;

-- Desactivar una tabla que ninguna fórmula (publicada o borrador) de los orígenes que la reciben usa. No se deshace desde la app; sus filas se
-- conservan y su clave queda tomada (la restricción única cuenta las inactivas).
create or replace function public.tabla_referencia_desactivar(p_tabla uuid, p_version_esperada integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_t public.tablas_referencia; v_frase text; v_usos int;
begin
  v_t := public._tabla_referencia_tomar(p_tabla, p_version_esperada);
  -- También cubre la propia que tapa una compartida: el origen usa esa clave.
  v_frase := public._tabla_referencia_frase_de_usos(p_tabla);
  if v_frase is not null then
    select count(*) into v_usos from (select distinct u.origen_id, u.estado from public._tabla_referencia_usos(p_tabla) u limit 2) x;
    if v_usos > 1 then
      raise exception 'La usan %: quítala de esas fórmulas para desactivarla.', v_frase using errcode = '23503', hint = 'tabla';
    end if;
    raise exception 'La usa %: quítala de esa fórmula para desactivarla.', v_frase using errcode = '23503', hint = 'tabla';
  end if;
  update public.tablas_referencia r set activa = false where r.id = p_tabla;
  perform public.registrar_actividad('tabla_referencia.desactivada', 'tablas_referencia', p_tabla::text,
    jsonb_build_object('version', v_t.version), jsonb_build_object('activa', false));
  return jsonb_build_object('id', p_tabla);
end;
$$;

-- Privilegios: los ayudantes sólo para el servidor; las RPC para quien entra (cada una pide su permiso).
revoke all on function public._tabla_referencia_clave(text) from public, anon, authenticated;
revoke all on function public._tabla_referencia_columnas_validas(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public._tabla_referencia_usos(uuid) from public, anon, authenticated;
revoke all on function public._tabla_referencia_frase_de_usos(uuid, text[]) from public, anon, authenticated;
revoke all on function public._tabla_referencia_permiso_de_quienes_la_usan(uuid) from public, anon, authenticated;
revoke all on function public._tabla_referencia_tomar(uuid, integer) from public, anon, authenticated;
grant execute on function public._tabla_referencia_clave(text) to service_role;
grant execute on function public._tabla_referencia_columnas_validas(jsonb, jsonb) to service_role;
grant execute on function public._tabla_referencia_usos(uuid) to service_role;
grant execute on function public._tabla_referencia_frase_de_usos(uuid, text[]) to service_role;
grant execute on function public._tabla_referencia_permiso_de_quienes_la_usan(uuid) to service_role;
grant execute on function public._tabla_referencia_tomar(uuid, integer) to service_role;

revoke all on function public.tabla_referencia_crear(uuid, uuid, text, jsonb) from public, anon;
revoke all on function public.tabla_referencia_columnas(uuid, jsonb, integer) from public, anon;
revoke all on function public.tabla_referencia_desactivar(uuid, integer) from public, anon;
grant execute on function public.tabla_referencia_crear(uuid, uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.tabla_referencia_columnas(uuid, jsonb, integer) to authenticated, service_role;
grant execute on function public.tabla_referencia_desactivar(uuid, integer) to authenticated, service_role;

comment on function public._tabla_referencia_clave(text) is
  'La clave de una tabla de referencia sacada de su nombre (minúsculas ASCII, sin acentos, _ entre palabras, t_ si empieza con un dígito, hasta 40). Espejo: claveDeLaTabla. docs/COTIZADOR.md › «Crear, columnas y desactivar».';
comment on function public._tabla_referencia_columnas_validas(jsonb, jsonb) is
  'Valida y normaliza las columnas de una tabla de referencia ({clave, etiqueta, tipo}, de 1 a 20); 22023 con el camino en hint. Espejo: validarColumnas. docs/COTIZADOR.md › «Crear, columnas y desactivar».';
comment on function public._tabla_referencia_usos(uuid) is
  'Las fórmulas (publicada o borrador) de cada origen que recibe la tabla y la usan, con las columnas que nombran sus nodos. docs/COTIZADOR.md › «Crear, columnas y desactivar».';
comment on function public._tabla_referencia_frase_de_usos(uuid, text[]) is
  '«la fórmula publicada de X y el borrador de Y»: hasta tres usos de la tabla (o de esas columnas), sin total. docs/COTIZADOR.md › «Crear, columnas y desactivar».';
comment on function public._tabla_referencia_permiso_de_quienes_la_usan(uuid) is
  '42501 si falta cotizaciones.configurar de algún origen cuya publicada o borrador usa la tabla, con su nombre. docs/COTIZADOR.md › «Crear, columnas y desactivar».';
comment on function public._tabla_referencia_tomar(uuid, integer) is
  'Lo común de cambiar las columnas y desactivar: permiso, la tabla for update, formulas:<origen> en orden, permiso de quienes la usan y PT409. docs/COTIZADOR.md › «Crear, columnas y desactivar».';
comment on function public.tabla_referencia_crear(uuid, uuid, text, jsonb) is
  'Crea una tabla de referencia del origen o compartida (origen nulo), idempotente por p_id; la clave sale del nombre. docs/COTIZADOR.md › «Crear, columnas y desactivar».';
comment on function public.tabla_referencia_columnas(uuid, jsonb, integer) is
  'Cambia las columnas de una tabla (suma, renombra, mueve, quita las sin uso) con la versión esperada; sube la versión sin publicar fórmulas. docs/COTIZADOR.md › «Crear, columnas y desactivar».';
comment on function public.tabla_referencia_desactivar(uuid, integer) is
  'Desactiva una tabla que ninguna fórmula usa, con la versión esperada; no se deshace desde la app. docs/COTIZADOR.md › «Crear, columnas y desactivar».';

comment on table public.tablas_referencia is
  'Tablas que alimentan los nodos tabla y tramo y el cálculo depreciar de la fórmula (impuestos por tipo, tramos por año y cilindrada, tarifas de transporte por ruta, depreciación por año). Las lee quien tiene cotizaciones.configurar; se escriben sólo por RPC: tabla_referencia_crear, tabla_referencia_columnas, tabla_referencia_desactivar y tabla_referencia_publicar (que publica la N+1 de cada fórmula que la usa con la copia congelada).';
comment on column public.tablas_referencia.version is
  'La versión de la tabla: nace en 1; publicar y cambiar las columnas la suben en uno. Es la esperada al publicar, cambiar las columnas y desactivar (PT409 si otra persona cambió antes).';
comment on column public.tablas_referencia.nota is
  'La nota de la última publicación o cambio de columnas (nula en la versión 1).';
comment on column public.tablas_referencia.publicado_por is
  'Quién publicó o cambió las columnas de la versión vigente (nulo en la versión 1 o si la cuenta se borró).';
comment on column public.tablas_referencia.publicado_en is
  'Cuándo se publicó o se cambiaron las columnas de la versión vigente (nulo en la versión 1).';

update public.permisos
   set aplicado_en = 'formula_*, plantilla_*, tono_*, formula_para_cotizar, policy tablas_referencia (leer), tabla_referencia_crear, tabla_referencia_columnas, tabla_referencia_desactivar, tabla_referencia_publicar, empresa_guardar_ajustes_de_cotizacion'
 where clave = 'cotizaciones.configurar';
