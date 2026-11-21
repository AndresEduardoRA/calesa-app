-- Copiar las fases: el flujo de vehículos de un origen sin fases empieza como copia del de otro origen («Empezar con las fases de…»).
-- Sólo la función, su comentario y sus privilegios: ninguna tabla, índice ni policy nueva.

create or replace function public.flujo_copiar_fases(p_flujo uuid, p_actualizado_en_esperado timestamptz, p_desde uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_destino public.flujos;
  v_ambito_desde public.ambito_flujo;
  v_subasta boolean;
  v_esperas boolean;
  v_tope_saltado constant int := 50;
  v_tope_tipos constant int := public._tipos_documento_tope();
  v_fases jsonb;
  v_salidas jsonb;
  v_tipos jsonb := '{}'::jsonb;
  v_saltado jsonb := '[]'::jsonb;
  v_n_fases int := 0;
  v_n_salidas int := 0;
  v_n_req int := 0;
  v_n_tipos int := 0;
  v_n_existentes int;
  v_reusado uuid;
  v_nuevo uuid;
  v_tipo uuid;
  v_formatos text[];
  v_motivo text;
  v_version timestamptz;
  t record;
  r record;
begin
  -- Forma. Los textos los pone la app según código y hint (sólo el PT409 se muestra tal cual).
  if p_desde is null or p_desde = p_flujo then
    raise exception 'Elige otro flujo de donde copiar.' using errcode = '22023', hint = 'desde';
  end if;
  select fl.ambito into v_ambito_desde from public.flujos fl where fl.id = p_desde;
  if not found or v_ambito_desde <> 'vehiculos' then
    raise exception 'Ese flujo no se puede copiar.' using errcode = '22023', hint = 'desde';
  end if;
  if p_flujo is null or not exists (select 1 from public.flujos where id = p_flujo) then
    raise exception 'Este flujo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;

  -- Los dos permisos antes de todo candado: quien no puede no espera ni hace esperar.
  if not public.puede_configurar_flujo(p_flujo) then
    raise exception 'No tienes permiso para configurar este flujo.' using errcode = '42501';
  end if;
  if not public.puede_configurar_flujo(p_desde) then
    raise exception 'No tienes permiso para configurar el flujo de donde copias.' using errcode = '42501', hint = 'desde';
  end if;

  -- Candados en orden de id: dos copias cruzadas (A→B y B→A) no se bloquean entre sí. El de donde se copia, `for share`: frena a quien lo
  -- edita (`_flujo_para_editar` toma `for no key update`) mientras dura la copia; el destino, con el contrato de siempre.
  if p_desde < p_flujo then
    perform 1 from public.flujos where id = p_desde for share;
  end if;
  v_destino := public._flujo_para_editar(p_flujo, p_actualizado_en_esperado);
  if p_desde > p_flujo then
    perform 1 from public.flujos where id = p_desde for share;
  end if;

  -- Estado, ya con los candados.
  if v_destino.ambito <> 'vehiculos' then
    raise exception 'Sólo se copian fases entre flujos de vehículos.' using errcode = '22023', hint = 'destino';
  end if;
  -- fases_flujo_id_nombre_key (flujo_id primero). También las jubiladas: «sin fases» es ninguna fila.
  if exists (select 1 from public.fases where flujo_id = p_flujo) then
    raise exception 'Este flujo ya tiene fases.' using errcode = '23514', hint = 'destino';
  end if;
  if not exists (select 1 from public.fases where flujo_id = p_desde and activa) then
    raise exception 'Ese flujo no tiene fases para copiar.' using errcode = '22023', hint = 'desde';
  end if;
  v_subasta := public._flujo_de_subasta(p_flujo);
  v_esperas := public.flujo_regla_activa(p_desde, 'esperas');

  -- 1. Las reglas, antes que las fases (`fase_validar` y `fase_requisito_validar` las miran): el destino queda con exactamente las del origen.
  -- Apagar o borrar una regla del destino no choca con `flujo_regla_apagar_validar`: sin fases no hay uso.
  delete from public.flujos_reglas d
   where d.flujo_id = p_flujo
     and not exists (select 1 from public.flujos_reglas o where o.flujo_id = p_desde and o.regla = d.regla);
  insert into public.flujos_reglas (flujo_id, regla, activa)
  select p_flujo, o.regla, o.activa from public.flujos_reglas o where o.flujo_id = p_desde
  on conflict (flujo_id, regla) do update set activa = excluded.activa;

  -- 2. Los tipos «Sólo de este flujo», todos (activos o no) y en su orden. El candado y la regla del nombre, los de `tipo_documento_crear`
  -- (`_tipo_documento_nombre_libre`): un nombre que ya está en el destino, o en uno de la empresa activo si el tipo es activo, se reusa y se dice.
  lock table public.tipos_documento in share row exclusive mode;
  -- tipos_documento_flujo_id_nombre_key (flujo_id primero); a lo sumo el tope + 1.
  select count(*) into v_n_existentes
    from (select 1 from public.tipos_documento x where x.flujo_id = p_flujo limit v_tope_tipos + 1) q;
  for t in
    select x.* from public.tipos_documento x where x.flujo_id = p_desde order by x.orden, x.id limit v_tope_tipos + 1
  loop
    select x.id into v_reusado
      from public.tipos_documento x
     where (x.flujo_id = p_flujo or (t.activo and x.flujo_id is null and x.activo))
       and lower(btrim(x.nombre)) = lower(btrim(t.nombre))
     order by (x.flujo_id is null), x.id
     limit 1;
    if v_reusado is not null then
      v_tipos := v_tipos || jsonb_build_object(t.id::text, v_reusado);
      v_saltado := v_saltado || jsonb_build_array(jsonb_build_object('motivo', 'tipo_documento_reusado', 'nombre', t.nombre));
    else
      if v_n_existentes + v_n_tipos >= v_tope_tipos then
        raise exception 'No caben más tipos de documento en este flujo.' using errcode = '22023', hint = 'tipos_documento';
      end if;
      v_nuevo := gen_random_uuid();
      insert into public.tipos_documento (id, flujo_id, nombre, descripcion, activo, orden, visible_portal_permitido, proposito,
                                          modo_vencimiento, vigencia_dias, aviso_dias, formatos)
      values (v_nuevo, p_flujo, t.nombre, t.descripcion, t.activo, t.orden, t.visible_portal_permitido, null,
              t.modo_vencimiento, t.vigencia_dias, t.aviso_dias, t.formatos);
      v_tipos := v_tipos || jsonb_build_object(t.id::text, v_nuevo);
      v_n_tipos := v_n_tipos + 1;
    end if;
  end loop;

  -- 3. Las fases activas, con id nuevo y todas sus columnas. «Es la subasta» sólo si el destino es un origen de subasta; si no, se dice.
  select coalesce(jsonb_object_agg(f.id::text, gen_random_uuid()), '{}'::jsonb) into v_fases
    from public.fases f where f.flujo_id = p_desde and f.activa;
  if not v_subasta then
    v_saltado := v_saltado || coalesce((
      select jsonb_agg(jsonb_build_object('motivo', 'subasta', 'nombre', f.nombre) order by f.orden, f.id)
        from public.fases f where f.flujo_id = p_desde and f.activa and f.es_subasta), '[]'::jsonb);
  end if;
  insert into public.fases (id, flujo_id, nombre, descripcion, color, icono, orden, es_inicial, es_final, activa, es_logistica, demora_dias,
                            alerta_cada_horas, nota_obligatoria, permite_contenedor, permite_aduana, cuenta_llegada_repuestos, publica_web,
                            visible_portal, alias_portal, descripcion_portal, es_subasta)
  select (v_fases ->> f.id::text)::uuid, p_flujo, f.nombre, f.descripcion, f.color, f.icono, f.orden, f.es_inicial, f.es_final, true,
         f.es_logistica, f.demora_dias, f.alerta_cada_horas, f.nota_obligatoria, f.permite_contenedor, f.permite_aduana,
         f.cuenta_llegada_repuestos, f.publica_web, f.visible_portal, f.alias_portal, f.descripcion_portal, f.es_subasta and v_subasta
    from public.fases f
   where f.flujo_id = p_desde and f.activa
   order by f.orden, f.id;
  get diagnostics v_n_fases = row_count;

  -- 4. Los roles de cada fase (fases_roles_pkey, fase_id primero).
  insert into public.fases_roles (fase_id, rol_id)
  select (v_fases ->> fr.fase_id::text)::uuid, fr.rol_id
    from public.fases_roles fr join public.fases f on f.id = fr.fase_id
   where f.flujo_id = p_desde and f.activa;

  -- 5. Las salidas entre fases activas (fases_transiciones_flujo_id_idx) y sus roles. Las que van a una jubilada no se copian.
  select coalesce(jsonb_object_agg(s.id::text, gen_random_uuid()), '{}'::jsonb) into v_salidas
    from public.fases_transiciones s
   where s.flujo_id = p_desde and v_fases ? s.de_fase_id::text and v_fases ? s.a_fase_id::text;
  insert into public.fases_transiciones (id, flujo_id, de_fase_id, a_fase_id, accion, nota_obligatoria)
  select (v_salidas ->> s.id::text)::uuid, p_flujo, (v_fases ->> s.de_fase_id::text)::uuid, (v_fases ->> s.a_fase_id::text)::uuid,
         s.accion, s.nota_obligatoria
    from public.fases_transiciones s
   where s.flujo_id = p_desde and v_salidas ? s.id::text;
  get diagnostics v_n_salidas = row_count;
  insert into public.fases_transiciones_roles (transicion_id, rol_id)
  select (v_salidas ->> sr.transicion_id::text)::uuid, sr.rol_id
    from public.fases_transiciones_roles sr join public.fases_transiciones s on s.id = sr.transicion_id
   where s.flujo_id = p_desde and v_salidas ? s.id::text;

  -- 6. Los requisitos de las fases activas (fases_requisitos_fase_id_idx), en su orden. Un documento del flujo apunta al tipo copiado (o al
  -- reusado: si sus formatos no caben, el requisito queda sin acotar); uno de la empresa, al mismo. Una espera que el destino no aceptaría
  -- se filtra antes del insert y se dice: así no sale un 23514 crudo a mitad de la copia.
  for r in
    select q.*, f.nombre as fase_nombre, fe.activa as esperada_activa, fle.ambito as esperada_ambito
      from public.fases f
      join public.fases_requisitos q on q.fase_id = f.id
      left join public.fases fe on fe.id = q.espera_fase_id
      left join public.flujos fle on fle.id = fe.flujo_id
     where f.flujo_id = p_desde and f.activa
     order by f.orden, f.id, q.orden, q.id
  loop
    v_motivo := null;
    v_tipo := r.tipo_documento_id;
    v_formatos := r.formatos;
    if r.tipo = 'espera' then
      v_motivo := case
        when not v_esperas then 'espera_apagada'
        when r.esperada_ambito is distinct from 'repuestos' then 'espera_otro_flujo'
        when not r.esperada_activa then 'espera_jubilada'
      end;
    elsif r.tipo = 'documento' then
      v_tipo := coalesce((v_tipos ->> r.tipo_documento_id::text)::uuid, r.tipo_documento_id);
      if v_formatos is not null
         and not (v_formatos <@ (select x.formatos from public.tipos_documento x where x.id = v_tipo)) then
        v_formatos := null;
      end if;
    end if;
    if v_motivo is not null then
      v_saltado := v_saltado || jsonb_build_array(jsonb_build_object('motivo', v_motivo, 'nombre', r.fase_nombre));
      continue;
    end if;
    insert into public.fases_requisitos (fase_id, tipo, bloqueante, orden, notas, tipo_documento_id, min_archivos, max_archivos, formatos,
                                         clave_dato, config, espera_fase_id, espera_ambito)
    values ((v_fases ->> r.fase_id::text)::uuid, r.tipo, r.bloqueante, r.orden, r.notas, v_tipo, r.min_archivos, r.max_archivos, v_formatos,
            r.clave_dato, r.config, r.espera_fase_id, r.espera_ambito);
    v_n_req := v_n_req + 1;
  end loop;

  -- 7. La actividad y la versión.
  perform public.registrar_actividad('flujo.copiado', 'flujos', p_flujo::text, null, null,
    jsonb_build_object('desde', p_desde, 'fases', v_n_fases, 'saltados', jsonb_array_length(v_saltado)));
  v_version := public._flujo_tocar(p_flujo);
  return jsonb_build_object(
    'version', v_version,
    'copiado', jsonb_build_object('fases', v_n_fases, 'salidas', v_n_salidas, 'requisitos', v_n_req, 'tipos_documento', v_n_tipos),
    'saltado', coalesce((select jsonb_agg(e.valor order by e.i)
                           from jsonb_array_elements(v_saltado) with ordinality as e(valor, i)
                          where e.i <= v_tope_saltado), '[]'::jsonb),
    'saltado_hay_mas', jsonb_array_length(v_saltado) > v_tope_saltado);
end $$;

revoke all on function public.flujo_copiar_fases(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.flujo_copiar_fases(uuid, timestamptz, uuid) to authenticated, service_role;

comment on function public.flujo_copiar_fases(uuid, timestamptz, uuid) is
  'Copia a un flujo de vehículos SIN fases (ninguna fila, tampoco jubiladas) las fases activas de otro flujo de vehículos: reglas, fases, roles, '
  'salidas entre activas con sus roles, requisitos y los tipos «Sólo de este flujo». Rechazos en orden: forma (22023 hint desde) → destino '
  'inexistente (PT409) → permiso en el destino y en el origen (42501, antes de todo candado) → candados en orden de id (el origen for share, '
  'el destino con _flujo_para_editar: versión → PT409) → destino de repuestos (22023 hint destino) → destino con fases (23514 hint destino) → '
  'origen sin fases activas (22023 hint desde) → tope de tipos (22023 hint tipos_documento). Devuelve {version, copiado, saltado[≤50] '
  '{motivo, nombre}, saltado_hay_mas}; motivos: subasta, espera_apagada, espera_otro_flujo, espera_jubilada, tipo_documento_reusado.';
