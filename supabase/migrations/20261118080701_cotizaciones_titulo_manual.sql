-- El título de la cotización (T307): automático (el del vehículo) o manual, guardado en `cotizaciones.titulo` al crear y al guardar, obligatorio sin vehículo
-- y buscado por el listado. docs/COTIZADOR.md › «Lo que se guarda en una cotización» y «Cómo se guarda».

-- 1. Si el título lo escribió una persona (manual) o lo tomó del vehículo (automático). Se lee como `titulo` (viaja en `cotizacion_hoja_guardada` y entra al
--    diff de la revisión); nadie la escribe directo: sólo `cotizacion_crear`, `cotizacion_guardar` y `cotizacion_encima`.
alter table public.cotizaciones add column titulo_manual boolean not null default false;
comment on column public.cotizaciones.titulo_manual is 'El título lo escribió una persona (verdadero) o es el del vehículo, rehecho en cada guardado (falso). Lo escriben cotizacion_crear, cotizacion_guardar y cotizacion_encima.';
grant select (titulo_manual) on public.cotizaciones to authenticated;

-- 2. Las que ya tienen título: hasta hoy sólo lo escribía una persona, así que quedan manuales. Sin los triggers de la versión, la revisión y la actividad: la
--    versión de una hoja abierta no se mueve (nadie recibe un PT409 por esto) y no aparecen revisiones ni actividad que nadie hizo. Se vuelven a encender en la
--    misma transacción. (`session_replication_role` pide superusuario en la nube.)
alter table public.cotizaciones disable trigger trg_auditar, disable trigger trg_cotizacion_revision, disable trigger trg_cotizacion_version;
update public.cotizaciones set titulo_manual = true where titulo is not null;
alter table public.cotizaciones enable trigger trg_auditar, enable trigger trg_cotizacion_revision, enable trigger trg_cotizacion_version;

-- 3. Crear recibe el título al final (con default: hay llamadas posicionales). Cambiar argumentos es drop + create.
drop function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean);

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

  -- El modo de cambio: la clave de uno de los modos del diseño de esa versión, convertido a la forma del motor.
  v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);
  -- «Ver total Bs»: sólo si el diseño de esa versión lo ofrece (y nunca nulo).
  perform public._cotizacion_ver_total_bs(a.formula_id, p_ver_total_bs);

  -- Lo que se ve y lo que se edita (una sola lectura de los niveles) y la revisión de lo tipeado, la misma que hace `cotizacion_evaluar()`.
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb)
    into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  perform public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ctx -> 'ok');

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
  v_res := public.evaluar_formula(a.definicion, a.params, a.entrada, v_modo);
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
                                     titulo, titulo_manual)
    values (p_id, p_origen, p_lead, v_veh, v_yo, p_clase, a.formula_id, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, p_modo_tc, p_ver_total_bs, v_titulo, v_titulo_manual)
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
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


COMMENT ON FUNCTION "public"."cotizacion_crear"("p_id" "uuid", "p_origen" "uuid", "p_lead" "uuid", "p_entradas" "jsonb", "p_abierta" "text", "p_vehiculo" "uuid", "p_vehiculo_nuevo" "jsonb", "p_modo_tc" "text", "p_clase" "public"."clase_cotizacion", "p_con_la_abierta" boolean, "p_ver_total_bs" boolean, "p_titulo" "text", "p_titulo_manual" boolean) IS 'Crea una cotización calculada en la base (evaluar_formula sobre la fórmula publicada del origen, o sobre la abierta con p_con_la_abierta) y devuelve lo que quien llama ve (_cotizacion_respuesta). Pide cotizaciones.crear y cotizaciones.ver. El lead y el vehículo son obligatorios salvo con cotizaciones.crear.sin_lead y cotizaciones.crear.sin_vehiculo del origen (22023 con hint lead o vehiculo, el lead primero); una final siempre pide los dos. El título (T307): manual con p_titulo_manual y texto (sin vehículo, el texto que llega es manual; más de 120: 22023 detail titulo_largo); si no, el del vehículo cortado a 120; sin vehículo y sin título, 22023 hint titulo (después del lead y del vehículo). Idempotente por el id del intento. D2: PT409 desactualizada si la hoja que se abrió (p_abierta, la de cotizacion_hoja) ya no es la vigente o si las tarifas de la apertura que reconstruye del historial no son las que vio (su huella, _cotizacion_huella_tarifas; con p_con_la_abierta, 22023 abierta_tarifas). «Ver total Bs» (p_ver_total_bs, falso por omisión) sólo vale si el diseño de la versión que se usa lo ofrece (_cotizacion_ver_total_bs). Una final (4.25-1b) deja el estado de marcarla: mira sin candado (el lead en la cartera con leads.editar, ver el vehículo y, en _final_crear_mirar, otra final activa, las preventas que no puede mandar a la papelera y el vínculo de otro lead), toma lead (no key update) → vehículo → fórmula → las vivas del vehículo, vuelve a mirar y aplica _final_aplicar. docs/COTIZADOR.md › «Quién escribe una cotización y cómo (4.10-2)», «Cómo se guarda (4.10-3)» y «La hoja abierta (4.13-3a)».';

revoke all on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean, text, boolean) from public, anon;
grant execute on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean, text, boolean) to authenticated, service_role;

-- 4. Guardar recibe si el título es manual, al final y con default nulo («manual si trae texto»: las llamadas posicionales conservan su sentido).
drop function public.cotizacion_guardar(uuid, uuid, timestamptz, jsonb, text, text, text, uuid, boolean);

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
begin
  perform public.assert_activo();
  if p_id is null or p_intento is null then
    raise exception 'Faltan el identificador de la cotización y el del guardado.' using errcode = '22023';
  end if;

  -- Sin candado: sólo para saber qué vehículo hay que tomar antes que la cotización.
  select x.origen_id, x.clase, x.vehiculo_id into c0 from public.cotizaciones x where x.id = p_id and x.eliminado_en is null;
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


COMMENT ON FUNCTION "public"."cotizacion_guardar"("p_id" "uuid", "p_intento" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_entradas" "jsonb", "p_modo_tc" "text", "p_titulo" "text", "p_notas" "text", "p_vehiculo" "uuid", "p_ver_total_bs" boolean, "p_titulo_manual" boolean) IS 'Guarda una cotización calculada en la base con SU versión de la fórmula y SUS tipos de cambio; lo que quien guarda no ve ni edita se conserva de lo guardado. Versión esperada (PT409), intento idempotente y devuelve lo que quien llama ve (_cotizacion_respuesta) con repetido. «Ver total Bs» (p_ver_total_bs, sin valor por omisión: el estado entero de lo que se edita) se valida contra el diseño de SU versión (_cotizacion_ver_total_bs). El título (T307): manual si trae texto y p_titulo_manual no es falso (nulo = manual si trae texto; sin vehículo, el texto es manual; más de 120: 22023 detail titulo_largo); si no, el del vehículo que queda, cortado a 120; sin vehículo y sin título, 22023 hint titulo. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';

revoke all on function public.cotizacion_guardar(uuid, uuid, timestamptz, jsonb, text, text, text, uuid, boolean, boolean) from public, anon;
grant execute on function public.cotizacion_guardar(uuid, uuid, timestamptz, jsonb, text, text, text, uuid, boolean, boolean) to authenticated, service_role;

-- 5. Cotizar encima lleva el título y si es manual.
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
                                     titulo, titulo_manual, notas, cotizacion_padre_id, version)
    values (p_id, ant.origen_id, ant.lead_id, ant.vehiculo_id, v_yo, 'preventa', v_formula, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, v_modo_tc, v_bs, ant.titulo, ant.titulo_manual, ant.notas, p_anterior, ant.version + 1)
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
