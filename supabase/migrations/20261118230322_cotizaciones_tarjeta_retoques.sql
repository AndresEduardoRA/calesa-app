-- Los retoques de la tarjeta (`docs/COTIZADOR.md` › «Retoques de la tarjeta»): quien puede guardar una cotización cambia los textos y oculta filas de SU
-- tarjeta, sin tocar la plantilla del origen. Se guardan en la cotización (`cotizaciones.tarjeta_retoques`), los escribe sólo
-- `cotizacion_retocar_tarjeta()` y la base los valida contra lo que se dibuja hoy: la plantilla publicada del origen, convertida a cuadrícula y validada
-- contra la versión de la cotización (`cotizacion_tarjeta()`). La app los aplica al dibujar (`aplicarRetoques()`): vista previa, PDF, «Copiar texto», la
-- portada y compartir. `cotizacion_hoja_guardada()` no cambia: el grant de la columna la hace viajar en `cotizacion` (`_cotizacion_respuesta()` devuelve
-- toda columna que `authenticated` lee), y también en lo que devuelven crear, guardar y cotizar encima.

-- 1. La columna. Nula = sin retoques; sin índice: se lee por la clave primaria con la fila.
alter table public.cotizaciones add column tarjeta_retoques jsonb
  constraint cotizaciones_tarjeta_retoques_objeto check (tarjeta_retoques is null or jsonb_typeof(tarjeta_retoques) = 'object');
comment on column public.cotizaciones.tarjeta_retoques is
  'Los retoques de la tarjeta de esta cotización: {celdas?: {<id de celda de texto>: texto}, filas_ocultas?: [<id de fila>]}, validados contra la plantilla publicada del origen (validar_retoques). Nula = la tarjeta tal cual la plantilla. Sólo la escribe cotizacion_retocar_tarjeta(); cotizacion_encima() la copia.';
grant select (tarjeta_retoques) on public.cotizaciones to authenticated;

-- 2. El validador, espejo de `validarRetoques()` (`entities/tarjeta/retoques/validar-retoques.ts`) con el juego `casos-de-retoques.json`. Invocador, sin leer
-- tablas: recibe los retoques y la cuadrícula contra la que valen (nula: ninguna, toda celda y fila es inexistente). 22023 con la regla en DETAIL y el
-- `donde` en HINT; el primer rechazo manda. Los textos se cuentan en code points (`char_length`) y las claves van en orden C.
create or replace function public.validar_retoques(p_retoques jsonb, p_plantilla jsonb) returns void
language plpgsql stable set search_path = '' as $$
declare
  v_forma constant text := 'Los retoques no tienen la forma esperada.';
  v_celdas jsonb; v_filas jsonb; v_vistas jsonb := '{}'::jsonb;
  v_k text; v_v jsonb; v_i bigint;
begin
  if jsonb_typeof(p_retoques) is distinct from 'object' then
    perform public._formula_rechazar('forma', 'retoques', v_forma);
  end if;
  -- El tope de la cuadrícula: el texto del `jsonb`, 24 KiB.
  if octet_length(p_retoques::text) > 24576 then
    perform public._formula_rechazar('demasiado_grande', 'retoques', 'Los retoques ocupan demasiado: acorta los textos o deja menos retoques.');
  end if;
  select k into v_k from jsonb_object_keys(p_retoques) k where k not in ('celdas', 'filas_ocultas') order by k collate "C" limit 1;
  if v_k is not null then perform public._formula_rechazar('forma', v_k, v_forma); end if;
  if p_retoques ? 'celdas' and jsonb_typeof(p_retoques -> 'celdas') is distinct from 'object' then
    perform public._formula_rechazar('forma', 'celdas', v_forma);
  end if;

  -- El tipo del contenido de cada celda de la cuadrícula y cada fila, por id (la cuadrícula ya está validada: los ids son únicos).
  v_celdas := coalesce((select jsonb_object_agg(c ->> 'id', c -> 'contenido' -> 'tipo')
                          from jsonb_array_elements(case when jsonb_typeof(p_plantilla -> 'celdas') = 'array' then p_plantilla -> 'celdas' else '[]'::jsonb end) c
                         where jsonb_typeof(c -> 'id') = 'string'), '{}'::jsonb);
  v_filas := coalesce((select jsonb_object_agg(f ->> 'id', true)
                         from jsonb_array_elements(case when jsonb_typeof(p_plantilla -> 'filas') = 'array' then p_plantilla -> 'filas' else '[]'::jsonb end) f
                        where jsonb_typeof(f -> 'id') = 'string'), '{}'::jsonb);

  -- Cada celda, en orden C: un texto, de una celda de texto que está, de hasta 300 caracteres.
  for v_k, v_v in select e.key, e.value from jsonb_each(coalesce(p_retoques -> 'celdas', '{}'::jsonb)) e order by e.key collate "C" loop
    if jsonb_typeof(v_v) is distinct from 'string' then perform public._formula_rechazar('forma', 'celdas.' || v_k, v_forma); end if;
    if not v_celdas ? v_k then
      perform public._formula_rechazar('celda_inexistente', 'celdas.' || v_k, format('La celda «%s» ya no está en la plantilla.', v_k));
    end if;
    if (v_celdas ->> v_k) is distinct from 'texto' then
      perform public._formula_rechazar('celda_no_es_texto', 'celdas.' || v_k, format('La celda «%s» muestra un dato de la cotización: no se retoca.', v_k));
    end if;
    if char_length(v_v #>> '{}') > 300 then
      perform public._formula_rechazar('texto_largo', 'celdas.' || v_k, format('El texto de la celda «%s» tiene como máximo 300 caracteres.', v_k));
    end if;
  end loop;

  -- Cada fila oculta, en su orden: un id de una fila que está, una vez.
  if p_retoques ? 'filas_ocultas' and jsonb_typeof(p_retoques -> 'filas_ocultas') is distinct from 'array' then
    perform public._formula_rechazar('forma', 'filas_ocultas', v_forma);
  end if;
  for v_v, v_i in select e.value, e.o - 1 from jsonb_array_elements(coalesce(p_retoques -> 'filas_ocultas', '[]'::jsonb)) with ordinality e (value, o) order by e.o loop
    if jsonb_typeof(v_v) is distinct from 'string' then perform public._formula_rechazar('forma', format('filas_ocultas[%s]', v_i), v_forma); end if;
    v_k := v_v #>> '{}';
    if not v_filas ? v_k then
      perform public._formula_rechazar('fila_inexistente', 'filas_ocultas.' || v_k, format('La fila «%s» ya no está en la plantilla.', v_k));
    end if;
    if v_vistas ? v_k then
      perform public._formula_rechazar('fila_repetida', 'filas_ocultas.' || v_k, format('La fila «%s» está dos veces.', v_k));
    end if;
    v_vistas := v_vistas || jsonb_build_object(v_k, true);
  end loop;
end;
$$;
comment on function public.validar_retoques(jsonb, jsonb) is
  'Valida los retoques de la tarjeta de una cotización contra una cuadrícula (nula: ninguna). Reglas en orden: forma, demasiado_grande, celda_inexistente, celda_no_es_texto, texto_largo, fila_inexistente, fila_repetida; 22023 con la regla en DETAIL y el donde en HINT. Espejo de validarRetoques() con el juego casos-de-retoques.json. docs/COTIZADOR.md › «Retoques de la tarjeta».';
revoke all on function public.validar_retoques(jsonb, jsonb) from public, anon;
grant execute on function public.validar_retoques(jsonb, jsonb) to authenticated, service_role;

-- 3. Lo que se guarda: sin `celdas` vacías ni `filas_ocultas` vacías; nulo si no queda nada.
create or replace function public._retoques_normalizados(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case when r = '{}'::jsonb then null else r end
    from (select case when jsonb_typeof(p) is distinct from 'object' then null
                      else p - array_remove(array[case when p -> 'celdas' = '{}'::jsonb then 'celdas' end,
                                                  case when p -> 'filas_ocultas' = '[]'::jsonb then 'filas_ocultas' end], null) end as r) x;
$$;
comment on function public._retoques_normalizados(jsonb) is
  'Los retoques como se guardan en cotizaciones.tarjeta_retoques: sin celdas ni filas_ocultas vacías; nulo si no queda nada. Interna de cotizacion_retocar_tarjeta().';
revoke all on function public._retoques_normalizados(jsonb) from public, anon, authenticated;
grant execute on function public._retoques_normalizados(jsonb) to service_role;

-- 4. Lo que la revisión guarda de los retoques: cuántos, nunca los textos.
create or replace function public._retoques_resumen(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p) = 'object' then jsonb_build_object(
           'celdas', case when jsonb_typeof(p -> 'celdas') = 'object' then cardinality(array(select jsonb_object_keys(p -> 'celdas'))) else 0 end,
           'filas_ocultas', case when jsonb_typeof(p -> 'filas_ocultas') = 'array' then jsonb_array_length(p -> 'filas_ocultas') else 0 end) end;
$$;
comment on function public._retoques_resumen(jsonb) is
  'Los retoques de la tarjeta en una revisión: {celdas: n, filas_ocultas: m}, o nulo sin retoques. Interna de cotizacion_revision().';
revoke all on function public._retoques_resumen(jsonb) from public, anon, authenticated;
grant execute on function public._retoques_resumen(jsonb) to service_role;

-- 5. La escritura. Pide lo que pide guardar (`_cotizacion_puede_guardar()`: ver y editar; una final, ver y `cotizaciones.final.gestionar`), antes y después
-- de tomar la fila con el candado de guardar; la papelera, lo que no existe y lo que no se ve dan el mismo 42501. La versión antes que nada más (el PT409 con
-- quién y cuándo). Los mismos retoques que hay no escriben (ni la versión, ni la revisión, ni la actividad). La revisión y la actividad las dejan sus
-- triggers: `_conflicto_de_edicion()` nombra después a quien retocó.
create or replace function public.cotizacion_retocar_tarjeta(p_id uuid, p_actualizado_en_esperado timestamptz, p_retoques jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c0 record; c public.cotizaciones; v_tarjeta jsonb; v_pla jsonb; v_r jsonb;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador de la cotización.' using errcode = '22023';
  end if;
  -- Sin candado: quien no la puede guardar recibe lo mismo que si no existiera, antes del candado y de la versión.
  select x.origen_id, x.clase into c0 from public.cotizaciones x where x.id = p_id and x.eliminado_en is null;
  if not found or not public._cotizacion_puede_guardar(p_id, c0.clase, c0.origen_id) then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into c from public.cotizaciones x where x.id = p_id and x.eliminado_en is null for no key update;
  if not found or not public._cotizacion_puede_guardar(p_id, c.clase, c.origen_id) then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;

  if p_actualizado_en_esperado is null then
    perform public._exigir_version(c.actualizado_en, null, '');
  elsif c.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('cotizaciones', c.id, c.actualizado_en, 'esta cotización');
  end if;

  -- Lo que se dibuja hoy (plantillas_publicada_unica y formulas_pkey, dentro de `cotizacion_tarjeta`): la cuadrícula si está lista; si no, ninguna.
  v_tarjeta := public.cotizacion_tarjeta(c.formula_id);
  v_pla := case when (v_tarjeta ->> 'estado') = 'lista' then v_tarjeta -> 'definicion' end;
  if p_retoques is not null then
    perform public.validar_retoques(p_retoques, v_pla);
  end if;
  v_r := public._retoques_normalizados(p_retoques);

  if c.tarjeta_retoques is not distinct from v_r then
    return jsonb_build_object('actualizado_en', c.actualizado_en, 'retoques', c.tarjeta_retoques, 'repetido', true);
  end if;
  update public.cotizaciones x set tarjeta_retoques = v_r where x.id = p_id returning * into c;
  return jsonb_build_object('actualizado_en', c.actualizado_en, 'retoques', c.tarjeta_retoques, 'repetido', false);
end $$;
comment on function public.cotizacion_retocar_tarjeta(uuid, timestamptz, jsonb) is
  'Guarda los retoques de la tarjeta de una cotización (nulo o vacío: vuelve a la plantilla). Pide poder guardarla (_cotizacion_puede_guardar, antes y después del candado), la versión esperada (PT409 con quién y cuándo) y valida contra la plantilla publicada de hoy (validar_retoques). Devuelve {actualizado_en, retoques, repetido}. docs/COTIZADOR.md › «Retoques de la tarjeta».';
revoke all on function public.cotizacion_retocar_tarjeta(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.cotizacion_retocar_tarjeta(uuid, timestamptz, jsonb) to authenticated, service_role;

-- 6. La revisión deja cantidades de los retoques, no sus textos (desde la definición vigente; sólo suma la rama `tarjeta_retoques`).
CREATE OR REPLACE FUNCTION "public"."cotizacion_revision"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  d jsonb := '{}'::jsonb; k text; a jsonb := to_jsonb(old); b jsonb := to_jsonb(new);
  v_de jsonb; v_a jsonb; v_g jsonb; v_gde jsonb; v_ga jsonb;
begin
  for k in select jsonb_object_keys(b) loop
    if k in ('actualizado_en', 'reportes_count', 'favoritos_count') or a -> k is not distinct from b -> k then continue; end if;
    if k in ('valores', 'fuentes') and jsonb_typeof(a -> k) = 'object' and jsonb_typeof(b -> k) = 'object' then
      -- Sólo los nodos que cambiaron (`-> clave` da el jsonb null de un valor nulo y el SQL null de una clave que no está).
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_de from jsonb_each(a -> k) e where (b -> k) -> e.key is distinct from e.value;
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_a from jsonb_each(b -> k) e where (a -> k) -> e.key is distinct from e.value;
      d := d || jsonb_build_object(k, jsonb_build_object('de', v_de, 'a', v_a));
    elsif k = 'totales' and jsonb_typeof(a -> k) = 'object' and jsonb_typeof(b -> k) = 'object' then
      -- Las claves de primer nivel que cambiaron (menos `grupos`), y de `grupos` cada grupo entero que cambió.
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_de from jsonb_each(a -> k) e where e.key <> 'grupos' and (b -> k) -> e.key is distinct from e.value;
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_a from jsonb_each(b -> k) e where e.key <> 'grupos' and (a -> k) -> e.key is distinct from e.value;
      if jsonb_typeof(a -> k -> 'grupos') = 'object' and jsonb_typeof(b -> k -> 'grupos') = 'object' then
        select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_gde from jsonb_each(a -> k -> 'grupos') e where (b -> k -> 'grupos') -> e.key is distinct from e.value;
        select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_ga from jsonb_each(b -> k -> 'grupos') e where (a -> k -> 'grupos') -> e.key is distinct from e.value;
        if v_gde <> '{}'::jsonb then v_de := v_de || jsonb_build_object('grupos', v_gde); end if;
        if v_ga <> '{}'::jsonb then v_a := v_a || jsonb_build_object('grupos', v_ga); end if;
      elsif (a -> k -> 'grupos') is distinct from (b -> k -> 'grupos') then
        -- `grupos` de un solo lado (o que no es un objeto): entero, del lado donde está.
        if (a -> k) ? 'grupos' then v_de := v_de || jsonb_build_object('grupos', a -> k -> 'grupos'); end if;
        if (b -> k) ? 'grupos' then v_a := v_a || jsonb_build_object('grupos', b -> k -> 'grupos'); end if;
      end if;
      d := d || jsonb_build_object(k, jsonb_build_object('de', v_de, 'a', v_a));
    elsif k = 'tarjeta_retoques' then
      -- Los retoques de la tarjeta no van enteros (hasta 24 KiB por lado, en cada revisión de la página): cuántas celdas y cuántas filas ocultas, o nulo.
      d := d || jsonb_build_object(k, jsonb_build_object('de', public._retoques_resumen(a -> k), 'a', public._retoques_resumen(b -> k)));
    else
      d := d || jsonb_build_object(k, jsonb_build_object('de', a -> k, 'a', b -> k));
    end if;
  end loop;
  if d <> '{}'::jsonb then
    -- Lo deja `cotizacion_guardar()`; un ajuste que alguna vez se fijó en la sesión vuelve como texto vacío, no como nulo.
    v_g := nullif(current_setting('importadora.guardado', true), '')::jsonb;
    insert into public.cotizaciones_revisiones (cotizacion_id, usuario_id, diff, intento, huella)
    values (new.id, (select auth.uid()), d, (v_g ->> 'intento')::uuid, v_g ->> 'huella');
  end if;
  return null;
end;
$$;

comment on function public.cotizacion_revision() is
  'Trigger de cotizaciones: una revisión por cambio, con el diff por columna ({de, a}; en valores y fuentes sólo los nodos que cambiaron; en totales, las claves y los grupos que cambiaron, cada grupo entero; en tarjeta_retoques, cuántas celdas y filas ocultas, _retoques_resumen) y el intento y la huella de cotizacion_guardar. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';
revoke all on function public.cotizacion_revision() from public, anon, authenticated;
grant execute on function public.cotizacion_revision() to service_role;

-- 7. Cotizar encima se lleva los retoques de la anterior, como el título y las notas (desde la definición vigente; sólo suma la columna).
CREATE OR REPLACE FUNCTION "public"."cotizacion_encima"("p_id" "uuid", "p_anterior" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_yo uuid := (select auth.uid());
  c public.cotizaciones; ant public.cotizaciones; a record;
  v_formula uuid; v_vuelta int := 0; v_enc uuid;
  v_lleva jsonb; v_modo_tc text; v_bs boolean; v_res jsonb; v_total_base numeric; v_constraint text; v_desc int;
  v_lead uuid; v_vehiculo uuid; v_tomas int := 0;
begin
  perform public.assert_activo();
  if p_id is null or p_anterior is null then
    raise exception 'Faltan el identificador y la cotización anterior.' using errcode = '22023';
  end if;
  -- La anterior, antes que todo lo demás: una que no existe, está en la papelera o no se ve da el mismo error, con o sin permiso de cotizar y vea o no su lead.
  if not public.puede_cotizacion(p_anterior, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into ant from public.cotizaciones x where x.id = p_anterior;
  perform public.assert_permiso('cotizaciones.crear', ant.origen_id);
  perform public.assert_permiso('cotizaciones.ver', ant.origen_id);
  -- Cotizar encima es crear: una anterior sin lead pide `cotizaciones.crear.sin_lead` de su origen.
  if ant.lead_id is null then
    if not public.tiene_permiso('cotizaciones.crear.sin_lead', ant.origen_id) then
      raise exception 'La cotización anterior no tiene lead: cotiza una nueva.' using errcode = '22023', hint = 'lead';
    end if;
  elsif not public.puede_lead(ant.lead_id, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;

  -- El intento, como en `cotizacion_crear` (el mismo candado): una mía viva con ese id es la de este intento si es de esta anterior.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.eliminado_en is null;
  if found then
    if c.cotizacion_padre_id is distinct from p_anterior then
      raise exception 'Ese intento ya se usó para otra cotización.' using errcode = '22023', detail = 'intento_reusado', hint = 'intento';
    end if;
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- El orden de candados (lead → vehículo → cotización): el lead y el vehículo de la anterior, leídos sin candado, antes que la anterior `for share` (choca con
  -- guardarla y con mandarla a la papelera). Al revés se cruza en un 40P01 con mandar su vehículo a la papelera, que toma el vehículo y después sus cotizaciones.
  -- Sólo se toma lo que se ve: lo demás falla abajo sin esperar. Con la anterior tomada, otra vez visible y se relee lo que quedó; si mientras se esperaba
  -- cambió su lead o su vehículo, los candados son de otros y se vuelve a tomar.
  loop
    v_tomas := v_tomas + 1;
    v_lead := ant.lead_id;
    v_vehiculo := ant.vehiculo_id;
    if v_lead is not null and public.puede_lead(v_lead, 'leads.ver') then
      perform 1 from public.leads l where l.id = v_lead for key share;
    end if;
    if v_vehiculo is not null and public.puede_vehiculo(v_vehiculo, 'vehiculos.ver') then
      perform 1 from public.vehiculos v where v.id = v_vehiculo for key share;
    end if;
    perform 1 from public.cotizaciones x where x.id = p_anterior and x.eliminado_en is null for share;
    if not found or not public.puede_cotizacion(p_anterior, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    select * into ant from public.cotizaciones x where x.id = p_anterior;
    exit when ant.lead_id is not distinct from v_lead and ant.vehiculo_id is not distinct from v_vehiculo;
    if v_tomas >= 3 then
      raise exception 'La cotización cambió mientras cotizabas encima. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;
  -- Una versión nueva viva por anterior (P3): de la que se ve, su id en el hint; de la que no, sólo que existe (P11).
  select x.id into v_enc from public.cotizaciones x where x.cotizacion_padre_id = p_anterior and x.eliminado_en is null limit 1;   -- cotizaciones_encima_unica
  if v_enc is not null and public.puede_cotizacion(v_enc, 'cotizaciones.ver') then
    raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima', hint = v_enc::text;
  elsif v_enc is not null then
    raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima';
  end if;

  -- El lead (ya tomado: volver a mirar) y el vehículo de la anterior.
  if ant.lead_id is not null then
    perform 1 from public.leads l where l.id = ant.lead_id and l.eliminado_en is null for key share;
    if not found or not public.puede_lead(ant.lead_id, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
  elsif not public.tiene_permiso('cotizaciones.crear.sin_lead', ant.origen_id) then
    raise exception 'La cotización anterior no tiene lead: cotiza una nueva.' using errcode = '22023', hint = 'lead';
  end if;
  if ant.vehiculo_id is not null then
    perform public._cotizacion_vehiculo(ant.vehiculo_id);
  elsif not public.tiene_permiso('cotizaciones.crear.sin_vehiculo', ant.origen_id) then
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- La publicada de hoy, `for share` (como en `cotizacion_crear`).
  loop
    v_vuelta := v_vuelta + 1;
    select f.id into v_formula from public.formulas f where f.origen_id = ant.origen_id and f.estado = 'publicada';
    if v_formula is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  -- La versión y las tarifas de hoy, con lo que se lleva de la anterior (P2: también lo que quien llama no ve); el modo de la anterior si sigue (si no, el primero de hoy) y
  -- «Ver total Bs» si hoy se ofrece. Un override llevado que el motor descarta no falla (nadie lo mandó): cuenta en `descartados`.
  select * into a from public._cotizacion_armar('{}'::jsonb, null, ant.origen_id, ant.vehiculo_id, v_formula);
  v_lleva := public._cotizacion_lo_que_se_lleva(a.definicion, a.entrada, ant.valores, ant.fuentes);
  select coalesce((select m ->> 'clave' from jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m where m ->> 'clave' = ant.modo_tc),
                  case when ant.modo_tc is not null then f.diseno -> 'cabecera' -> 'modos' -> 0 ->> 'clave' end),
         ant.ver_total_bs and coalesce((f.diseno -> 'cabecera' ->> 'ver_total_bs')::boolean, false)
    into v_modo_tc, v_bs from public.formulas f where f.id = v_formula;
  v_res := public.evaluar_formula(a.definicion, a.params, v_lleva, public._cotizacion_modo(v_formula, v_modo_tc));
  v_total_base := public._cotizacion_guardable(v_res, '{}'::jsonb);
  v_desc := public._cotizacion_descartados((select f.definicion from public.formulas f where f.id = ant.formula_id),
                                           coalesce(array(select n.nodo from public._nodos_visibles(ant.formula_id) n), '{}'), ant.valores, ant.fuentes, v_lleva, v_res);

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, ver_total_bs,
                                     titulo, titulo_manual, notas, tarjeta_retoques, cotizacion_padre_id, version)
    values (p_id, ant.origen_id, ant.lead_id, ant.vehiculo_id, v_yo, 'preventa', v_formula, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, v_modo_tc, v_bs, ant.titulo, ant.titulo_manual, ant.notas, ant.tarjeta_retoques, p_anterior, ant.version + 1)
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_encima_unica' then
      raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima';
    end if;
    raise;
  end;

  return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', false, 'descartados', v_desc);
end $$;

revoke all on function public.cotizacion_encima(uuid, uuid) from public, anon;
grant execute on function public.cotizacion_encima(uuid, uuid) to authenticated, service_role;
