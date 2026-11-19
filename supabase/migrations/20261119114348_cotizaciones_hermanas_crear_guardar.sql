-- Crear y guardar las cotizaciones hermanas (glosario: «Cotizaciones hermanas»; docs/COTIZADOR.md › «Quién escribe una cotización y cómo» y «Cómo se guarda»):
-- - `cotizacion_crear_en_par`: los dos ids del cliente como intento (candados en orden de id); `cotizacion_crear` una vez por opción, con la opción, la hermana y,
--   la segunda, la hora de la primera + 1 µs (así la de la primera opción nace aprobada si el vehículo no tenía y quedan juntas en toda lista por `creado_en`);
-- - `cotizacion_guardar_en_par`: las dos, cada una con su versión esperada; los vehículos y después las dos cotizaciones en orden de id; `cotizacion_guardar` para
--   cada una: si una cambió, PT409 (con su id en el hint) y no se guarda ninguna;
-- - `cotizacion_encima_en_par`: el par nuevo encima del de antes, cada una encima de su hermana y con la opción de su misma posición en el par de hoy.
-- Las tres llaman a las de siempre con `importadora.en_par` (un ajuste de la transacción que sólo ellas fijan y limpian, como `importadora.guardado`): con él,
-- `cotizacion_crear` y `cotizacion_encima` ponen la opción (la elige la base, no la persona: un nivel que esconde la variante cotiza igual), la hermana y la hora, y
-- `cotizacion_guardar` deja cambiar el vehículo de una hermana (sin él, `vehiculo_de_la_hermana`: las dos lo comparten). Sin él, una versión en par no se cotiza suelta
-- (`cotizar_en_par`). En toda versión en par el título lleva « · <etiqueta de su opción>» (la base lo compone; el manual tiene ese tope menor) y mandar la variante es
-- `variante_en_par`.

CREATE OR REPLACE FUNCTION "public"."cotizacion_crear"("p_id" "uuid", "p_origen" "uuid", "p_lead" "uuid", "p_entradas" "jsonb", "p_abierta" "text", "p_vehiculo" "uuid" DEFAULT NULL::"uuid", "p_vehiculo_nuevo" "jsonb" DEFAULT NULL::"jsonb", "p_modo_tc" "text" DEFAULT NULL::"text", "p_clase" "public"."clase_cotizacion" DEFAULT 'preventa'::"public"."clase_cotizacion", "p_con_la_abierta" boolean DEFAULT false, "p_ver_total_bs" boolean DEFAULT false, "p_titulo" "text" DEFAULT NULL::"text", "p_titulo_manual" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_yo uuid := (select auth.uid());
  c public.cotizaciones;
  a record;
  v_formula uuid; v_uso uuid; v_vuelta int := 0; v_version int;
  v_ab_formula uuid; v_ab_en timestamptz; v_ab_huella text;
  v_veh uuid := p_vehiculo;
  v_modo jsonb;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb;
  v_k text; v_opc text;
  v_res jsonb;
  v_total_base numeric;
  v_constraint text;
  v_ids uuid[]; v_tomadas uuid[];
  v_titulo text := nullif(btrim(p_titulo), '');
  v_titulo_manual boolean;
  -- Lo fija `cotizacion_crear_en_par` (la opción por su posición, la hermana y la hora); nulo fuera de ella.
  v_par jsonb := nullif(current_setting('importadora.en_par', true), '')::jsonb;
  v_par_nodo text; v_par_clave text; v_par_etiqueta text; v_tope int;
begin
  perform public.assert_activo();
  if p_id is null or p_origen is null then
    raise exception 'Faltan el identificador y el origen de la cotización.' using errcode = '22023';
  end if;
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  -- Cotizar pide también ver: con sólo `crear` la hoja no tiene nada que mostrar (4-32). Después de `crear`: quien no cotiza ahí sigue recibiendo ese permiso en el error.
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  -- D2: la hoja que se abrió. La firma la base (`cotizacion_hoja()`): trae la versión de la fórmula y la hora de la apertura, y no se puede inventar (4-27).
  if p_abierta is null then
    raise exception 'Falta la hoja que abriste: ábrela de nuevo.' using errcode = '22023', hint = 'abierta';
  end if;
  if p_clase = 'final' then
    perform public.assert_permiso('cotizaciones.final.gestionar', p_origen);
  end if;

  -- El intento: dos llamadas con el mismo id se ordenan acá (la segunda espera a que la primera confirme). Sólo una cotización MÍA, de este origen y viva se devuelve; un id ajeno
  -- no se mira (sería una sonda barata de ids): sigue y choca con la clave en el `insert`.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.origen_id = p_origen and x.eliminado_en is null;
  if found then
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- La hoja abierta: su firma, su versión, su hora y la huella de las tarifas que vio. Después del intento: un reintento vuelve lo guardado aunque la clave haya rotado o la hoja sea vieja.
  select l.formula_id, l.abierta_en, l.huella into v_ab_formula, v_ab_en, v_ab_huella from public._cotizacion_abierta_leer(p_abierta, p_origen) l;

  -- 4.25-1b, C1.1: una final sin vehículo, antes de mirar el lead (el mismo error que abajo).
  if p_clase = 'final' and p_vehiculo is null and p_vehiculo_nuevo is null then
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- El lead (comprobar, bloquear y volver a comprobar: nadie bloquea un lead que no ve).
  -- Sin lead sólo con `cotizaciones.crear.sin_lead` de ese origen, y nunca una final.
  if p_lead is null then
    if p_clase = 'final' or not public.tiene_permiso('cotizaciones.crear.sin_lead', p_origen) then
      raise exception 'Elige el lead de la cotización.' using errcode = '22023', hint = 'lead';
    end if;
  else
    if not public.puede_lead(p_lead, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    if p_clase = 'final' then
      -- 4.25-1b, una final mira sin candado lo que mira marcar (C1): el lead en la cartera con leads.editar (P2 a) y, con un vehículo del inventario, que lo
      -- vea (antes que nada que delate su final, su vínculo o sus preventas) y, en la ayudante, otra final activa (P7 a), las preventas que no puede mandar a la
      -- papelera (P3 a) y el vínculo de otro lead (P4 a). Después toma el lead como marcar (no key update); una preventa, como siempre (key share).
      if not public.puede_actuar_lead(p_lead, 'leads.editar') then
        raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
      end if;
      if p_vehiculo is not null and p_vehiculo_nuevo is null then
        if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
          raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
        end if;
        v_ids := array(select z.id from public.cotizaciones z where z.vehiculo_id = p_vehiculo and z.eliminado_en is null order by z.id);
        perform public._final_crear_mirar(p_vehiculo, p_lead, v_ids);
      end if;
      perform 1 from public.leads l where l.id = p_lead and l.eliminado_en is null for no key update;
    else
      perform 1 from public.leads l where l.id = p_lead and l.eliminado_en is null for key share;
    end if;
    if not found or not public.puede_lead(p_lead, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
  end if;

  -- El vehículo.
  if p_vehiculo is not null and p_vehiculo_nuevo is not null then
    raise exception 'Elige un vehículo del inventario o carga uno a mano, no los dos.' using errcode = '22023', hint = 'vehiculo';
  end if;
  if p_vehiculo_nuevo is not null then
    if jsonb_typeof(p_vehiculo_nuevo) <> 'object' or (p_vehiculo_nuevo - array['id', 'datos', 'consulta']) <> '{}'::jsonb
       or coalesce(p_vehiculo_nuevo ->> 'id', '') !~ c_uuid
       or (p_vehiculo_nuevo ? 'consulta' and coalesce(p_vehiculo_nuevo ->> 'consulta', '') !~ c_uuid)
       or (p_vehiculo_nuevo ? 'datos' and jsonb_typeof(p_vehiculo_nuevo -> 'datos') <> 'object') then
      raise exception 'El vehículo a mano lleva su identificador y sus datos.' using errcode = '22023', hint = 'vehiculo';
    end if;
    v_veh := (p_vehiculo_nuevo ->> 'id')::uuid;
    -- En su propia sentencia y antes de armar: `_cotizacion_armar()` es STABLE y ve lo que esta transacción ya escribió.
    perform public.vehiculo_crear(v_veh, p_origen, coalesce(p_vehiculo_nuevo -> 'datos', '{}'::jsonb), (p_vehiculo_nuevo ->> 'consulta')::uuid, 'cotizar');
  elsif p_vehiculo is not null then
    perform public._cotizacion_vehiculo(p_vehiculo);
  elsif p_clase = 'final' or not public.tiene_permiso('cotizaciones.crear.sin_vehiculo', p_origen) then
    -- Sin la clave de ese origen el vehículo es obligatorio; una final lo pide siempre.
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- El título, después del lead y del vehículo (T307): manual si trae texto y lo pide (sin vehículo no hay automático: el texto que llega es manual); si no, el del
  -- vehículo cortado a 120 puntos de código (`tituloAutomatico()` es su espejo). Sin vehículo y sin título, no se guarda.
  v_titulo_manual := v_titulo is not null and (coalesce(p_titulo_manual, false) or v_veh is null);
  if v_titulo_manual then
    if char_length(v_titulo) > 120 then
      raise exception 'El título tiene como máximo 120 caracteres.' using errcode = '22023', detail = 'titulo_largo', hint = 'titulo';
    end if;
  else
    v_titulo := null;
    if v_veh is not null then
      select nullif(btrim(left(btrim(v.titulo), 120)), '') into v_titulo from public.vehiculos v where v.id = v_veh;
    end if;
  end if;
  if v_titulo is null and v_veh is null then
    raise exception 'Escribe el título de la cotización.' using errcode = '22023', hint = 'titulo';
  end if;

  -- La fórmula publicada, `for share` por su id: si publicaron mientras esperábamos, READ COMMITTED descarta la fila que ya se archivó y se vuelve a leer la nueva.
  loop
    v_vuelta := v_vuelta + 1;
    select f.id into v_formula from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';
    if v_formula is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  -- D2: la hoja se abrió sobre otra versión que la publicada. Sin «Guardar con la N», se avisa y no se guarda; con ella, se usa esa versión (publicada o archivada de este origen, y reciente).
  -- «Con la abierta» vale siempre dentro de las 24 h de la apertura (4-27): con la versión vigente sólo cambia algo si una tarifa cambió desde entonces, y la hora ya no la elige el cliente.
  v_uso := v_formula;
  if v_ab_formula is distinct from v_formula then
    select f.version into v_version from public.formulas f where f.id = v_formula;
    if not p_con_la_abierta then
      raise exception 'Se publicó la versión % de la hoja mientras cotizabas.', v_version using errcode = 'PT409', detail = 'desactualizada', hint = 'formula';
    end if;
    perform public._cotizacion_abierta(p_origen, v_ab_formula, v_ab_en);
    -- `for share`, como la publicada: archivada ya no cambia, pero el candado ordena esta alta con quien la borre (un origen que se elimina).
    perform 1 from public.formulas f where f.id = v_ab_formula and f.estado in ('publicada', 'archivada') for share;
    if not found then
      raise exception 'La versión de la hoja que abriste ya no está disponible: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_no_disponible', hint = 'abierta';
    end if;
    v_uso := v_ab_formula;
  elsif p_con_la_abierta then
    perform public._cotizacion_abierta(p_origen, v_ab_formula, v_ab_en);
  end if;

  select * into a from public._cotizacion_armar(p_entradas, null, p_origen, v_veh, v_uso, v_ab_en, p_con_la_abierta);
  if a.formula_id is distinct from v_uso then
    raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
  end if;
  -- D2 (4-33): las tarifas de la apertura que ARMAR reconstruyó del historial son las que la hoja vio. Un cambio que confirmó después de abrirla con un
  -- `cambiado_en` anterior (una transacción larga) entra en la reconstrucción sin haberse visto: la huella firmada no coincide. Va en una sentencia posterior a ARMAR,
  -- con una foto igual o más nueva: lo que ARMAR vio, la huella lo ve. Con «Guardar con la N», lo que la hoja vio ya no se puede reproducir: recargar.
  if public._cotizacion_huella_tarifas(v_ab_formula, v_ab_en) is distinct from v_ab_huella then
    if p_con_la_abierta then
      raise exception 'Cambió un tipo de cambio mientras abrías la hoja: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_tarifas', hint = 'abierta';
    end if;
    raise exception 'Cambió un tipo de cambio de la hoja mientras cotizabas.' using errcode = 'PT409', detail = 'desactualizada', hint = 'tipo_cambio';
  end if;
  -- D2: algún tipo de cambio que la hoja usa cambió desde que se abrió (ARMAR lo lee en una sola foto con los de hoy).
  if a.tc_cambiado and not p_con_la_abierta then
    raise exception 'Cambió un tipo de cambio de la hoja mientras cotizabas.' using errcode = 'PT409', detail = 'desactualizada', hint = 'tipo_cambio';
  end if;

  -- La variante en par (glosario: «Variante en par»): una versión en par se cotiza sólo en par (`cotizacion_crear_en_par`). La opción la pone la base y el título
  -- lleva su etiqueta: el manual entra si cabe con « · <etiqueta>»; el automático es el del vehículo cortado para que quepa.
  v_par_nodo := public._variante_en_par(a.definicion);
  if v_par is null and v_par_nodo is not null then
    raise exception 'Esta hoja cotiza dos opciones a la vez: ábrela de nuevo.' using errcode = '22023', detail = 'cotizar_en_par', hint = 'variante';
  end if;
  if v_par is not null and v_par_nodo is null then
    raise exception 'Esta hoja ya no cotiza dos opciones a la vez: ábrela de nuevo.' using errcode = '22023', detail = 'sin_par', hint = 'variante';
  end if;
  if v_par_nodo is not null then
    if a.entrada ? 'variante' then
      raise exception 'En esta hoja las dos opciones se cotizan a la vez: la opción no se elige.' using errcode = '22023', detail = 'variante_en_par', hint = 'variante';
    end if;
    select x.o ->> 'clave', x.o ->> 'etiqueta' into v_par_clave, v_par_etiqueta
      from jsonb_array_elements(a.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') with ordinality x (o, k)
     where n ->> 'id' = v_par_nodo and x.k = (v_par ->> 'opcion')::int;
    v_tope := 120 - char_length(' · ' || v_par_etiqueta);
    if v_titulo_manual then
      if char_length(v_titulo) > v_tope then
        raise exception 'El título tiene como máximo % caracteres.', v_tope using errcode = '22023', detail = 'titulo_largo', hint = 'titulo';
      end if;
    elsif v_veh is not null then
      select nullif(btrim(left(btrim(v.titulo), v_tope)), '') into v_titulo from public.vehiculos v where v.id = v_veh;
    end if;
    v_titulo := v_titulo || ' · ' || v_par_etiqueta;
  end if;

  -- El modo de cambio: la clave de uno de los modos del diseño de esa versión, convertido a la forma del motor.
  v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);
  -- «Ver total Bs»: sólo si el diseño de esa versión lo ofrece (y nunca nulo).
  perform public._cotizacion_ver_total_bs(a.formula_id, p_ver_total_bs);

  -- Lo que se ve y lo que se edita (una sola lectura de los niveles) y la revisión de lo tipeado, la misma que hace `cotizacion_evaluar()`.
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb)
    into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  perform public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ctx -> 'ok', v_par_nodo is not null);

  -- Un override de un nodo que no se ve y uno de un nodo que no existe: el mismo error (el primero por id, en bytes).
  select min(k collate "C") into v_k from jsonb_object_keys(a.entrada -> 'overrides') k where not (v_ctx -> 'ok') ? k;
  if v_k is not null then
    raise exception 'La hoja no tiene un nodo «%».', v_k using errcode = '22023', detail = 'nodo_inexistente', hint = v_k;
  end if;
  -- Un valor para un nodo que se ve y no se edita.
  select min(t.k collate "C") into v_k
    from (select jsonb_object_keys(a.entrada -> 'inputs') as k
          union all select jsonb_object_keys(a.entrada -> 'banderas')
          union all select jsonb_object_keys(a.entrada -> 'overrides')) t
   where not v_editables ? t.k;
  if v_k is null and a.entrada ? 'variante' then
    select n ->> 'id' into v_opc from jsonb_array_elements(a.definicion -> 'nodos') n where n ->> 'tipo' = 'opcion' limit 1;
    if v_opc is not null and not v_editables ? v_opc then v_k := v_opc; end if;
  end if;
  if v_k is not null then
    raise exception 'No puedes cambiar «%» en esta hoja.', v_k using errcode = '42501', detail = 'nodo_no_editable', hint = v_k;
  end if;

  -- El cálculo, entero (los nodos que quien llama no ve toman el valor de la fórmula y se guardan igual).
  v_res := public.evaluar_formula(a.definicion, a.params,
                                  case when v_par_clave is null then a.entrada else a.entrada || jsonb_build_object('variante', v_par_clave) end, v_modo);
  -- Lo que el motor descarta de un nodo visible no se guarda en silencio; el total tiene que tener valor, caber y estar en la moneda base: `_cotizacion_guardable()`.
  v_total_base := public._cotizacion_guardable(v_res, a.entrada -> 'overrides');

  -- 4.25-1b, una final (C2.4 y C3): después del cálculo, las vivas del vehículo en una pasada por id (el orden de marcar y de la papelera de cotizaciones);
  -- con todo tomado, otra vez la cartera y la ayudante, que relee el vínculo en una sentencia nueva (otro pudo escribirlo mientras se esperaba).
  if p_clase = 'final' then
    v_tomadas := array(select z.id from public.cotizaciones z where z.vehiculo_id = v_veh and z.eliminado_en is null order by z.id for no key update);
    if not public.puede_actuar_lead(p_lead, 'leads.editar') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    perform public._final_crear_mirar(v_veh, p_lead, v_tomadas);
  end if;

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, ver_total_bs,
                                     titulo, titulo_manual, hermana_id, creado_en)
    values (p_id, p_origen, p_lead, v_veh, v_yo, p_clase, a.formula_id, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, p_modo_tc, p_ver_total_bs, v_titulo, v_titulo_manual, (v_par ->> 'hermana')::uuid,
            coalesce((v_par ->> 'creado_en')::timestamptz, now()))
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_hermana_unica' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_final_por_vehiculo' then
      raise exception 'Este vehículo ya tiene una cotización final activa.' using errcode = '23505', hint = 'vehiculo';
    end if;
    raise;
  end;
  -- 4.25-1b, C4: los efectos de marcar, con todo tomado (la cotización ya es final: el paso 2 no la toca). La respuesta no cambia.
  if p_clase = 'final' then
    perform public._final_aplicar(c, v_tomadas);
  end if;

  return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
end $_$;

revoke all on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean, text, boolean) from public, anon;
grant execute on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean, text, boolean) to authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."cotizacion_guardar"("p_id" "uuid", "p_intento" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_entradas" "jsonb", "p_modo_tc" "text", "p_titulo" "text", "p_notas" "text", "p_vehiculo" "uuid", "p_ver_total_bs" boolean, "p_titulo_manual" boolean DEFAULT NULL::boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_yo uuid := (select auth.uid());
  c0 record;
  c public.cotizaciones;
  r public.cotizaciones_revisiones;
  a record;
  v_ids uuid[]; v_v uuid;
  v_huella text;
  v_titulo text := nullif(btrim(p_titulo), '');
  v_manual boolean;
  v_notas text := nullif(btrim(p_notas), '');
  v_nuevo_veh uuid;
  v_modo jsonb;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb;
  v_k text; v_ent jsonb; v_res jsonb; v_total_base numeric;
  -- Lo fija `cotizacion_guardar_en_par`: con él, el vehículo de una hermana cambia (cambia el de las dos en la misma transacción).
  v_par jsonb := nullif(current_setting('importadora.en_par', true), '')::jsonb;
  v_def jsonb; v_par_nodo text; v_par_etiqueta text; v_tope int;
begin
  perform public.assert_activo();
  if p_id is null or p_intento is null then
    raise exception 'Faltan el identificador de la cotización y el del guardado.' using errcode = '22023';
  end if;

  -- Sin candado: sólo para saber qué vehículo hay que tomar antes que la cotización.
  select x.origen_id, x.clase, x.vehiculo_id, x.hermana_id into c0 from public.cotizaciones x where x.id = p_id and x.eliminado_en is null;
  if not found then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- Quien no la ve recibe lo mismo que si no existiera, antes del vehículo, del candado, del intento, de la versión y del título (4-34).
  if not public._cotizacion_puede_guardar(p_id, c0.clase, c0.origen_id) then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;

  -- El vehículo: sólo cambia el de una preventa y nunca se quita. Lo que se pide se valida antes de tomar nada.
  if p_vehiculo is distinct from c0.vehiculo_id then
    if c0.clase = 'final' then
      raise exception 'Una cotización final no cambia de vehículo.' using errcode = '22023', hint = 'vehiculo';
    end if;
    -- Las hermanas comparten el vehículo: el de una se cambia con el de la otra (`cotizacion_guardar_en_par`).
    if c0.hermana_id is not null and v_par is null then
      raise exception 'El vehículo de una cotización en par se cambia con su hermana.' using errcode = '22023', detail = 'vehiculo_de_la_hermana', hint = 'vehiculo';
    end if;
    if p_vehiculo is null then
      raise exception 'No se quita el vehículo de una cotización: elige otro.' using errcode = '22023', hint = 'vehiculo';
    end if;
    if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
      raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
    end if;
    -- El actual y el nuevo, en orden de id (como la papelera por lotes), antes que la cotización.
    v_ids := array(select distinct x from unnest(array[c0.vehiculo_id, p_vehiculo]) x where x is not null order by 1);
    foreach v_v in array v_ids loop
      perform 1 from public.vehiculos v where v.id = v_v for key share;
    end loop;
    perform 1 from public.vehiculos v where v.id = p_vehiculo and v.eliminado_en is null;
    if not found or not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
      raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
    end if;
  end if;

  select * into c from public.cotizaciones x where x.id = p_id and x.eliminado_en is null for no key update;
  if not found then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- Si mientras esperaba le cambiaron el vehículo, los candados de arriba son de otro vehículo. No hace falta una comprobación aparte: cualquier cambio de la fila mueve su versión
  -- (`cotizacion_version()`), así que quien la tenía en pantalla recibe el conflicto de la versión más abajo, y el repetido de un intento ya guardado no mira candados.

  -- El permiso con la fila tomada (la clase o el alcance pudieron cambiar mientras esperaba).
  if not public._cotizacion_puede_guardar(p_id, c.clase, c.origen_id) then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;

  -- El intento: la misma persona con los mismos datos recibe lo guardado; otros datos, un error claro.
  v_huella := md5(jsonb_build_object('version', to_char(p_actualizado_en_esperado at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), 'entradas', p_entradas, 'modo', p_modo_tc,
                                     'titulo', p_titulo, 'notas', p_notas, 'vehiculo', p_vehiculo, 'ver_total_bs', p_ver_total_bs,
                                     'titulo_manual', p_titulo_manual)::text);
  select * into r from public.cotizaciones_revisiones x where x.cotizacion_id = p_id and x.intento = p_intento;
  if found then
    if r.usuario_id is distinct from v_yo or r.huella is distinct from v_huella then
      raise exception 'Ese guardado ya se hizo con otros datos. Recarga la cotización.' using errcode = '22023', detail = 'intento_reusado', hint = 'intento';
    end if;
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- La versión.
  if p_actualizado_en_esperado is null then
    perform public._exigir_version(c.actualizado_en, null, '');
  elsif c.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('cotizaciones', c.id, c.actualizado_en, 'esta cotización');
  end if;

  -- Título y notas. El título (T307): manual si trae texto (`p_titulo_manual` nulo = manual si trae texto; sin vehículo no hay automático: el texto que llega es
  -- manual); si no, el del vehículo que queda (el pedido es el de la cotización o el nuevo: no se quita), cortado a 120 puntos de código y leído con la fila tomada
  -- (quien no ve ese vehículo no llega a guardar: `_cotizacion_armar` lo rechaza con 42501 y la transacción se deshace). Sin vehículo y sin título, no se guarda.
  v_manual := v_titulo is not null and (coalesce(p_titulo_manual, true) or p_vehiculo is null);
  if v_manual then
    if char_length(v_titulo) > 120 then
      raise exception 'El título tiene como máximo 120 caracteres.' using errcode = '22023', detail = 'titulo_largo', hint = 'titulo';
    end if;
  elsif p_vehiculo is null then
    raise exception 'Escribe el título de la cotización.' using errcode = '22023', hint = 'titulo';
  else
    select nullif(btrim(left(btrim(v.titulo), 120)), '') into v_titulo from public.vehiculos v where v.id = p_vehiculo;
  end if;
  -- La variante en par: la opción es la guardada (mandarla es `variante_en_par`) y el título lleva su etiqueta, como al crear.
  select f.definicion into v_def from public.formulas f where f.id = c.formula_id;
  v_par_nodo := public._variante_en_par(v_def);
  if v_par_nodo is not null then
    if coalesce(p_entradas ? 'variante', false) then
      raise exception 'En esta hoja las dos opciones se cotizan a la vez: la opción no se elige.' using errcode = '22023', detail = 'variante_en_par', hint = 'variante';
    end if;
    select o ->> 'etiqueta' into v_par_etiqueta
      from jsonb_array_elements(v_def -> 'nodos') n, jsonb_array_elements(n -> 'opciones') o
     where n ->> 'id' = v_par_nodo and o ->> 'clave' = c.valores ->> v_par_nodo;
    if v_par_etiqueta is not null then
      v_tope := 120 - char_length(' · ' || v_par_etiqueta);
      if v_manual then
        if char_length(v_titulo) > v_tope then
          raise exception 'El título tiene como máximo % caracteres.', v_tope using errcode = '22023', detail = 'titulo_largo', hint = 'titulo';
        end if;
      elsif p_vehiculo is not null then
        select nullif(btrim(left(btrim(v.titulo), v_tope)), '') into v_titulo from public.vehiculos v where v.id = p_vehiculo;
      end if;
      v_titulo := v_titulo || ' · ' || v_par_etiqueta;
    end if;
  end if;
  if char_length(v_notas) > 2000 then
    raise exception 'Las notas tienen como máximo 2.000 caracteres.' using errcode = '22023', hint = 'notas';
  end if;

  -- SU versión de la fórmula, SUS tipos de cambio y (si cambia) el vehículo nuevo; el modo de esa versión.
  v_nuevo_veh := case when p_vehiculo is distinct from c.vehiculo_id then p_vehiculo end;
  select * into a from public._cotizacion_armar(p_entradas, p_id, null, v_nuevo_veh);
  v_modo := public._cotizacion_modo(c.formula_id, p_modo_tc);
  -- «Ver total Bs»: contra el diseño de SU versión, como el modo (una final también lo cambia).
  perform public._cotizacion_ver_total_bs(c.formula_id, p_ver_total_bs);

  -- Lo que se ve y lo que se edita, y la revisión de lo tipeado (la misma de `cotizacion_evaluar()` y `cotizacion_crear()`).
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  perform public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ctx -> 'ok', true);
  -- Un override de un nodo que no se ve y uno de un nodo que no existe: el mismo error (el primero por id, en bytes).
  select min(k collate "C") into v_k from jsonb_object_keys(a.entrada -> 'overrides') k where not (v_ctx -> 'ok') ? k;
  if v_k is not null then
    raise exception 'La hoja no tiene un nodo «%».', v_k using errcode = '22023', detail = 'nodo_inexistente', hint = v_k;
  end if;

  -- Lo que no se edita sale de lo guardado; el motor; y lo guardable.
  v_ent := public._cotizacion_conservar(a.definicion, a.entrada, v_editables, a.guardado);
  v_res := public.evaluar_formula(a.definicion, a.params, v_ent, v_modo);
  v_total_base := public._cotizacion_guardable(v_res, a.entrada -> 'overrides');

  -- Nada cambió: no se escribe (ni la versión ni la revisión).
  if c.valores is not distinct from (v_res -> 'valores') and c.fuentes is not distinct from coalesce(v_res -> 'fuentes', '{}'::jsonb) and c.totales is not distinct from (v_res -> 'totales')
     and c.total_base = v_total_base and c.modo_tc is not distinct from p_modo_tc and c.titulo is not distinct from v_titulo and c.titulo_manual = v_manual and c.notas is not distinct from v_notas
     and c.vehiculo_id is not distinct from p_vehiculo and c.ver_total_bs is not distinct from p_ver_total_bs then
    return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
  end if;

  perform set_config('importadora.guardado', jsonb_build_object('intento', p_intento, 'huella', v_huella)::text, true);
  update public.cotizaciones x
     set valores = v_res -> 'valores', fuentes = coalesce(v_res -> 'fuentes', '{}'::jsonb), totales = v_res -> 'totales', total_base = v_total_base,
         modo_tc = p_modo_tc, titulo = v_titulo, titulo_manual = v_manual, notas = v_notas, vehiculo_id = p_vehiculo, ver_total_bs = p_ver_total_bs
   where x.id = p_id
   returning * into c;
  perform set_config('importadora.guardado', '', true);

  return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
end $$;

revoke all on function public.cotizacion_guardar(uuid, uuid, timestamptz, jsonb, text, text, text, uuid, boolean, boolean) from public, anon;
grant execute on function public.cotizacion_guardar(uuid, uuid, timestamptz, jsonb, text, text, text, uuid, boolean, boolean) to authenticated, service_role;

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
  -- Lo fija `cotizacion_encima_en_par` (la posición de la opción, la hermana nueva y la hora); nulo fuera de ella.
  v_par jsonb := nullif(current_setting('importadora.en_par', true), '')::jsonb;
  v_par_nodo text; v_par_clave text; v_par_etiqueta text; v_ant_etiqueta text; v_titulo text; v_tope int;
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
  v_titulo := ant.titulo;
  -- En par: la opción de su misma posición en el par de hoy, y el título otra vez con la etiqueta de esa opción sobre el de la anterior sin la suya.
  if v_par is not null then
    v_par_nodo := public._variante_en_par(a.definicion);
    if v_par_nodo is null then
      raise exception 'La hoja de hoy no cotiza dos opciones a la vez.' using errcode = '22023', detail = 'sin_par', hint = 'variante';
    end if;
    select x.o ->> 'clave', x.o ->> 'etiqueta' into v_par_clave, v_par_etiqueta
      from jsonb_array_elements(a.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') with ordinality x (o, k)
     where n ->> 'id' = v_par_nodo and x.k = (v_par ->> 'opcion')::int;
    v_lleva := v_lleva || jsonb_build_object('variante', v_par_clave);
    select (select o ->> 'etiqueta' from jsonb_array_elements(f.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') o
             where n ->> 'id' = public._variante_en_par(f.definicion) and o ->> 'clave' = ant.valores ->> (n ->> 'id'))
      into v_ant_etiqueta from public.formulas f where f.id = ant.formula_id;
    if v_ant_etiqueta is not null and right(v_titulo, char_length(' · ' || v_ant_etiqueta)) = ' · ' || v_ant_etiqueta then
      v_titulo := left(v_titulo, char_length(v_titulo) - char_length(' · ' || v_ant_etiqueta));
    end if;
    v_tope := 120 - char_length(' · ' || v_par_etiqueta);
    v_titulo := nullif(btrim(left(v_titulo, v_tope)), '') || ' · ' || v_par_etiqueta;
  end if;
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
                                     titulo, titulo_manual, notas, tarjeta_retoques, cotizacion_padre_id, version, hermana_id, creado_en)
    values (p_id, ant.origen_id, ant.lead_id, ant.vehiculo_id, v_yo, 'preventa', v_formula, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, v_modo_tc, v_bs, v_titulo, ant.titulo_manual, ant.notas, ant.tarjeta_retoques, p_anterior, ant.version + 1,
            (v_par ->> 'hermana')::uuid, coalesce((v_par ->> 'creado_en')::timestamptz, now()))
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_hermana_unica' then
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

-- Lo tipeado de las dos opciones: un arreglo de dos objetos sin la variante (la pone la base).
create or replace function public._entradas_en_par(p_entradas jsonb) returns void
    language plpgsql stable
    set search_path to ''
    as $$
declare v_ok boolean;
begin
  v_ok := jsonb_typeof(p_entradas) = 'array' and jsonb_array_length(p_entradas) = 2
          and jsonb_typeof(p_entradas -> 0) = 'object' and jsonb_typeof(p_entradas -> 1) = 'object'
          and not (p_entradas -> 0) ? 'variante' and not (p_entradas -> 1) ? 'variante';
  if v_ok is not true then
    raise exception 'Una cotización en par lleva lo tipeado de cada opción, sin la variante.' using errcode = '22023', detail = 'entradas_invalidas', hint = 'entradas';
  end if;
end $$;
revoke all on function public._entradas_en_par(jsonb) from public, anon, authenticated;
grant execute on function public._entradas_en_par(jsonb) to service_role;

create or replace function public.cotizacion_crear_en_par(p_ids uuid[], p_origen uuid, p_lead uuid, p_entradas jsonb, p_abierta text,
                                                          p_vehiculo uuid default null, p_modo_tc text default null, p_con_la_abierta boolean default false,
                                                          p_ver_total_bs boolean default false, p_titulo text default null, p_titulo_manual boolean default false)
    returns jsonb
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  v_yo uuid := (select auth.uid());
  v_a uuid := p_ids[1]; v_b uuid := p_ids[2];
  v_ok boolean; ca public.cotizaciones; cb public.cotizaciones; v_mias int;
  r1 jsonb; r2 jsonb; v_creado timestamptz;
begin
  perform public.assert_activo();
  if p_origen is null then
    raise exception 'Faltan el identificador y el origen de la cotización.' using errcode = '22023';
  end if;
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  v_ok := coalesce(array_length(p_ids, 1), 0) = 2 and v_a is not null and v_b is not null and v_a <> v_b;
  if v_ok is not true then
    raise exception 'Una cotización en par lleva dos identificadores distintos.' using errcode = '22023', hint = 'ids';
  end if;
  perform public._entradas_en_par(p_entradas);

  -- El intento: los dos ids, en orden de id (el candado de `cotizacion_crear` para cada uno). Dos MÍAS, vivas, de este origen y hermanas entre sí son las de este
  -- intento; una sola, o dos que no son hermanas, un intento que ya se usó. Un id ajeno no se mira: choca con la clave al insertar.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || least(v_a, v_b)::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || greatest(v_a, v_b)::text, 0));
  select * into ca from public.cotizaciones x where x.id = v_a and x.creado_por = v_yo and x.origen_id = p_origen and x.eliminado_en is null;
  select * into cb from public.cotizaciones x where x.id = v_b and x.creado_por = v_yo and x.origen_id = p_origen and x.eliminado_en is null;
  v_mias := (case when ca.id is null then 0 else 1 end) + (case when cb.id is null then 0 else 1 end);
  if v_mias = 2 and ca.hermana_id = v_b and cb.hermana_id = v_a then
    return jsonb_build_object('cotizaciones', jsonb_build_array(public._cotizacion_respuesta(ca), public._cotizacion_respuesta(cb)), 'repetido', true);
  end if;
  if v_mias > 0 then
    raise exception 'Ese intento ya se usó para otra cotización.' using errcode = '22023', detail = 'intento_reusado', hint = 'intento';
  end if;

  -- Una por opción: los pasos y candados de `cotizacion_crear` (lead, vehículo y fórmula: la segunda vez no esperan). «Desactualizada», «Guardar con la N» y las
  -- tarifas fallan en la primera, para las dos; cualquier error deshace las dos.
  perform set_config('importadora.en_par', jsonb_build_object('opcion', 1, 'hermana', v_b)::text, true);
  r1 := public.cotizacion_crear(v_a, p_origen, p_lead, p_entradas -> 0, p_abierta, p_vehiculo, null, p_modo_tc, 'preventa', p_con_la_abierta, p_ver_total_bs,
                                p_titulo, p_titulo_manual);
  select x.creado_en into v_creado from public.cotizaciones x where x.id = v_a;
  perform set_config('importadora.en_par', jsonb_build_object('opcion', 2, 'hermana', v_a, 'creado_en', v_creado + interval '1 microsecond')::text, true);
  r2 := public.cotizacion_crear(v_b, p_origen, p_lead, p_entradas -> 1, p_abierta, p_vehiculo, null, p_modo_tc, 'preventa', p_con_la_abierta, p_ver_total_bs,
                                p_titulo, p_titulo_manual);
  perform set_config('importadora.en_par', '', true);
  return jsonb_build_object('cotizaciones', jsonb_build_array(r1 - 'repetido', r2 - 'repetido'), 'repetido', false);
end $$;
comment on function public.cotizacion_crear_en_par(uuid[], uuid, uuid, jsonb, text, uuid, text, boolean, boolean, text, boolean) is 'Crea las dos cotizaciones hermanas de una versión con su variante en par, en una transacción (glosario: «Cotizaciones hermanas»): p_ids, los dos ids del cliente (el intento: dos mías, vivas, hermanas, se devuelven con repetido); p_entradas, un arreglo con lo tipeado de cada opción, sin la variante (entradas_invalidas). Llama a cotizacion_crear una vez por opción con importadora.en_par (la opción por su posición, la hermana y, la segunda, la hora de la primera + 1 µs). Siempre preventa. Devuelve {cotizaciones: [la de la primera opción, la de la segunda], repetido}. docs/COTIZADOR.md › «Quién escribe una cotización y cómo».';
revoke all on function public.cotizacion_crear_en_par(uuid[], uuid, uuid, jsonb, text, uuid, text, boolean, boolean, text, boolean) from public, anon;
grant execute on function public.cotizacion_crear_en_par(uuid[], uuid, uuid, jsonb, text, uuid, text, boolean, boolean, text, boolean) to authenticated, service_role;

create or replace function public.cotizacion_guardar_en_par(p_ids uuid[], p_intentos uuid[], p_actualizados_en_esperados timestamptz[], p_entradas jsonb,
                                                            p_modo_tc text, p_titulo text, p_notas text[], p_vehiculo uuid, p_ver_total_bs boolean,
                                                            p_titulo_manual boolean default null)
    returns jsonb
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  v_a uuid := p_ids[1]; v_b uuid := p_ids[2];
  v_ok boolean; a0 record; b0 record; v_vehiculos uuid[]; v_v uuid; v_primera int; v_i int; v_id uuid;
  r jsonb[] := array[null, null]::jsonb[]; v_m text;
begin
  perform public.assert_activo();
  v_ok := coalesce(array_length(p_ids, 1), 0) = 2 and v_a is not null and v_b is not null and v_a <> v_b
          and coalesce(array_length(p_intentos, 1), 0) = 2 and p_intentos[1] is not null and p_intentos[2] is not null
          and coalesce(array_length(p_actualizados_en_esperados, 1), 0) = 2 and coalesce(array_length(p_notas, 1), 0) = 2;
  if v_ok is not true then
    raise exception 'Guardar en par lleva las dos cotizaciones, con su guardado, su versión y sus notas.' using errcode = '22023';
  end if;
  perform public._entradas_en_par(p_entradas);

  -- Sin candado, quién guarda (quien no la ve recibe lo mismo que si no existiera) y que sean hermanas entre sí; antes de cualquier candado.
  select x.origen_id, x.clase, x.vehiculo_id, x.hermana_id into a0 from public.cotizaciones x where x.id = v_a and x.eliminado_en is null;
  v_ok := found and public._cotizacion_puede_guardar(v_a, a0.clase, a0.origen_id);
  if v_ok is not true then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select x.origen_id, x.clase, x.vehiculo_id, x.hermana_id into b0 from public.cotizaciones x where x.id = v_b and x.eliminado_en is null;
  v_ok := found and public._cotizacion_puede_guardar(v_b, b0.clase, b0.origen_id);
  if v_ok is not true then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  v_ok := a0.hermana_id = v_b and b0.hermana_id = v_a;
  if v_ok is not true then
    raise exception 'Esas cotizaciones no son hermanas.' using errcode = '22023', detail = 'no_son_hermanas', hint = 'ids';
  end if;

  -- El orden de candados: los vehículos (el actual y el nuevo) en orden de id, después las dos cotizaciones en orden de id. `cotizacion_guardar` los vuelve a tomar
  -- sin esperar.
  if p_vehiculo is distinct from a0.vehiculo_id and p_vehiculo is not null and public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    v_vehiculos := array(select distinct x from unnest(array[a0.vehiculo_id, p_vehiculo]) x where x is not null order by 1);
    foreach v_v in array v_vehiculos loop
      perform 1 from public.vehiculos v where v.id = v_v for key share;
    end loop;
  end if;
  perform 1 from public.cotizaciones x where x.id = least(v_a, v_b) for no key update;
  perform 1 from public.cotizaciones x where x.id = greatest(v_a, v_b) for no key update;
  -- Con las dos tomadas: otra vez quién guarda y que sigan siendo hermanas.
  select x.origen_id, x.clase, x.hermana_id into a0 from public.cotizaciones x where x.id = v_a and x.eliminado_en is null;
  select x.origen_id, x.clase, x.hermana_id into b0 from public.cotizaciones x where x.id = v_b and x.eliminado_en is null;
  v_ok := public._cotizacion_puede_guardar(v_a, a0.clase, a0.origen_id) and public._cotizacion_puede_guardar(v_b, b0.clase, b0.origen_id);
  if v_ok is not true then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  v_ok := a0.hermana_id = v_b and b0.hermana_id = v_a;
  if v_ok is not true then
    raise exception 'Esas cotizaciones no son hermanas.' using errcode = '22023', detail = 'no_son_hermanas', hint = 'ids';
  end if;

  -- Cada una con `cotizacion_guardar`, en orden de id: un error de la segunda deshace la primera. Un PT409 lleva en el hint la que cambió.
  v_primera := case when v_a < v_b then 1 else 2 end;
  perform set_config('importadora.en_par', '{"en_par": true}', true);
  foreach v_i in array array[v_primera, 3 - v_primera] loop
    v_id := p_ids[v_i];
    begin
      r[v_i] := public.cotizacion_guardar(v_id, p_intentos[v_i], p_actualizados_en_esperados[v_i], p_entradas -> (v_i - 1), p_modo_tc, p_titulo, p_notas[v_i],
                                          p_vehiculo, p_ver_total_bs, p_titulo_manual);
    exception when sqlstate 'PT409' then
      get stacked diagnostics v_m = message_text;
      raise exception using errcode = 'PT409', message = v_m, hint = v_id::text;
    end;
  end loop;
  perform set_config('importadora.en_par', '', true);
  return jsonb_build_object('cotizaciones', jsonb_build_array(r[1] - 'repetido', r[2] - 'repetido'),
                            'repetido', coalesce((r[1] ->> 'repetido')::boolean, false) and coalesce((r[2] ->> 'repetido')::boolean, false));
end $$;
comment on function public.cotizacion_guardar_en_par(uuid[], uuid[], timestamptz[], jsonb, text, text, text[], uuid, boolean, boolean) is 'Guarda las dos cotizaciones hermanas en una transacción (glosario: «Cotizaciones hermanas»): cada una con su intento, su versión esperada (sin default: una edición por elemento), lo tipeado de su opción (p_entradas, un arreglo de dos sin la variante) y sus notas; el título (sin la opción: la base pone la etiqueta de cada una), el modo, «Ver total Bs» y el vehículo son comunes (cambiarlo cambia el de las dos). Pide poder guardar las dos y que sean hermanas (no_son_hermanas) antes de los candados: vehículos y después las dos cotizaciones en orden de id. Llama a cotizacion_guardar para cada una, en orden de id: si una cambió, PT409 con su id en el hint y no se guarda ninguna. Devuelve {cotizaciones: [en el orden de p_ids], repetido}. docs/COTIZADOR.md › «Cómo se guarda».';
revoke all on function public.cotizacion_guardar_en_par(uuid[], uuid[], timestamptz[], jsonb, text, text, text[], uuid, boolean, boolean) from public, anon;
grant execute on function public.cotizacion_guardar_en_par(uuid[], uuid[], timestamptz[], jsonb, text, text, text[], uuid, boolean, boolean) to authenticated, service_role;

create or replace function public.cotizacion_encima_en_par(p_ids uuid[], p_anteriores uuid[])
    returns jsonb
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  v_ok boolean; ant1 public.cotizaciones; ant2 public.cotizaciones; v_def_hoy jsonb; v_def_ant jsonb; v_par_ant text;
  v_pos int[] := array[null, null]::int[]; v_p1 int; v_orden int[]; v_i int; v_otra int; v_creado timestamptz;
  r jsonb[] := array[null, null]::jsonb[];
begin
  perform public.assert_activo();
  v_ok := coalesce(array_length(p_ids, 1), 0) = 2 and p_ids[1] is not null and p_ids[2] is not null and p_ids[1] <> p_ids[2]
          and coalesce(array_length(p_anteriores, 1), 0) = 2 and p_anteriores[1] is not null and p_anteriores[2] is not null;
  if v_ok is not true then
    raise exception 'Cotizar encima en par lleva las dos cotizaciones anteriores y los dos ids nuevos.' using errcode = '22023';
  end if;
  -- Las anteriores, antes que todo: que se vean (si no, el 42501 de lo que no existe) y que sean hermanas entre sí.
  v_ok := public.puede_cotizacion(p_anteriores[1], 'cotizaciones.ver') and public.puede_cotizacion(p_anteriores[2], 'cotizaciones.ver');
  if v_ok is not true then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into ant1 from public.cotizaciones x where x.id = p_anteriores[1];
  select * into ant2 from public.cotizaciones x where x.id = p_anteriores[2];
  v_ok := ant1.hermana_id = ant2.id and ant2.hermana_id = ant1.id;
  if v_ok is not true then
    raise exception 'Esas cotizaciones no son hermanas.' using errcode = '22023', detail = 'no_son_hermanas', hint = 'anteriores';
  end if;
  perform public.assert_permiso('cotizaciones.crear', ant1.origen_id);
  perform public.assert_permiso('cotizaciones.ver', ant1.origen_id);
  select f.definicion into v_def_hoy from public.formulas f where f.origen_id = ant1.origen_id and f.estado = 'publicada';   -- formulas_publicada_unica
  if public._variante_en_par(v_def_hoy) is null then
    raise exception 'La hoja de hoy no cotiza dos opciones a la vez.' using errcode = '22023', detail = 'sin_par', hint = 'variante';
  end if;
  -- La posición de cada anterior en su par (la de la opción que tiene); la nueva toma la opción de esa misma posición en el par de hoy.
  select f.definicion into v_def_ant from public.formulas f where f.id = ant1.formula_id;
  v_par_ant := public._variante_en_par(v_def_ant);
  select x.k into v_p1 from jsonb_array_elements(v_def_ant -> 'nodos') n, jsonb_array_elements(n -> 'opciones') with ordinality x (o, k)
   where n ->> 'id' = v_par_ant and x.o ->> 'clave' = ant1.valores ->> v_par_ant;
  v_pos[1] := coalesce(v_p1, 1);
  v_pos[2] := 3 - v_pos[1];

  -- El orden de candados de `cotizacion_encima` (lead → vehículo → las anteriores `for share`, en orden de id) para las dos de una vez; los intentos en orden de id.
  if ant1.lead_id is not null and public.puede_lead(ant1.lead_id, 'leads.ver') then
    perform 1 from public.leads l where l.id = ant1.lead_id for key share;
  end if;
  if ant1.vehiculo_id is not null and public.puede_vehiculo(ant1.vehiculo_id, 'vehiculos.ver') then
    perform 1 from public.vehiculos v where v.id = ant1.vehiculo_id for key share;
  end if;
  perform 1 from public.cotizaciones x where x.id = least(ant1.id, ant2.id) for share;
  perform 1 from public.cotizaciones x where x.id = greatest(ant1.id, ant2.id) for share;
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || least(p_ids[1], p_ids[2])::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || greatest(p_ids[1], p_ids[2])::text, 0));

  -- Primero la de la primera opción; la segunda, con su hora + 1 µs (la aprobada y el orden de las listas, como al crear el par).
  v_orden := case when v_pos[1] = 1 then array[1, 2] else array[2, 1] end;
  perform set_config('importadora.en_par', '', true);
  foreach v_i in array v_orden loop
    v_otra := 3 - v_i;
    perform set_config('importadora.en_par', (jsonb_build_object('opcion', v_pos[v_i], 'hermana', p_ids[v_otra])
                                              || case when v_creado is null then '{}'::jsonb else jsonb_build_object('creado_en', v_creado + interval '1 microsecond') end)::text, true);
    r[v_i] := public.cotizacion_encima(p_ids[v_i], p_anteriores[v_i]);
    select x.creado_en into v_creado from public.cotizaciones x where x.id = p_ids[v_i];
  end loop;
  perform set_config('importadora.en_par', '', true);
  return jsonb_build_object('cotizaciones', jsonb_build_array(r[1] - 'repetido', r[2] - 'repetido'),
                            'repetido', coalesce((r[1] ->> 'repetido')::boolean, false) and coalesce((r[2] ->> 'repetido')::boolean, false));
end $$;
comment on function public.cotizacion_encima_en_par(uuid[], uuid[]) is 'Cotizar encima de dos hermanas (glosario: «Cotizaciones hermanas»): crea en el acto el par nuevo con la publicada de hoy (que tiene que tener su variante en par: sin_par), cada una encima de su hermana de antes (p_ids[i] encima de p_anteriores[i]) y con la opción de su misma posición en el par de hoy. Pide ver las dos y que sean hermanas (no_son_hermanas); toma lead, vehículo y las anteriores en orden de id, y los intentos en orden de id. Llama a cotizacion_encima para cada una con importadora.en_par. Devuelve {cotizaciones: [en el orden de p_ids], repetido}. docs/COTIZADOR.md › «La hoja de una guardada y cotizar encima».';
revoke all on function public.cotizacion_encima_en_par(uuid[], uuid[]) from public, anon;
grant execute on function public.cotizacion_encima_en_par(uuid[], uuid[]) to authenticated, service_role;
