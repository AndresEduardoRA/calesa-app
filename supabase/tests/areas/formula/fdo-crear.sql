-- Crear una fórmula del origen (docs/COTIZADOR.md › «Fórmulas del origen»): en blanco, como copia de la publicada o del borrador de otra del mismo origen, o
-- como copia de otro origen (trae sus tablas o usa las del destino, y avisa los datos del vehículo que el destino no tiene, que publicar exige). Nace como
-- borradores, sin activar. Nombre de 1 a 60 y único, tope de 50 sin archivar, idempotente por nid, y la fuente de otro origen pide configurar allí. Corre en
-- PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

create or replace function pg_temp.fcr_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.fcr_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_h text; v_e text; v_m text;
begin
  perform pg_temp.fcr_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Una persona que configura en esos orígenes.
create or replace function pg_temp.fcr_persona(p_id uuid, p_origenes uuid[]) returns void language plpgsql as $f$
declare v_rol uuid; o uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Crear ' || right(p_id::text, 4), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('fcr_' || right(p_id::text, 4), 'Crear ' || right(p_id::text, 4)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach o in array p_origenes loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.configurar', o, 'todos');
  end loop;
end $f$;

create or replace function pg_temp.fcr_crear(p_quien uuid, p_id uuid, p_origen uuid, p_nombre text, p_copia uuid default null, p_pieza text default 'publicada')
  returns jsonb language sql as $f$
  select pg_temp.fcr_corre(p_quien, format('select public.formula_del_origen_crear(p_id => %L, p_origen => %L, p_nombre => %L, p_copia_de => %L, p_pieza => %L)',
                                           p_id, p_origen, p_nombre, p_copia, p_pieza))
$f$;

-- @test fórmulas del origen: crear en blanco deja los borradores que validan, sin activar; el nombre, el id y la idempotencia
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fc301';
  o uuid; nid uuid := gen_random_uuid(); r jsonb; d public.formulas_del_origen; f public.formulas; p public.plantillas_tarjeta; e jsonb := public._fdo_formula_en_blanco();
begin
  insert into public.origenes (clave, nombre) values ('fcr_uno', 'Crear uno') returning id into o;
  perform pg_temp.fcr_persona(q, array[o]);
  r := pg_temp.fcr_crear(q, nid, o, '  Planilla  ');
  if r ? 'error' or r -> 'id' is distinct from to_jsonb(nid) or r -> 'avisos' is distinct from '[]'::jsonb or not r ? 'actualizado_en' then raise exception 'crear en blanco dio %', r; end if;
  select * into d from public.formulas_del_origen where formulas_del_origen.id = nid;
  if d.nombre is distinct from 'Planilla' or d.activa or d.copiada_de_otro_origen or d.creado_por is distinct from q or d.origen_id is distinct from o then
    raise exception 'la fórmula del origen nació mal: %', to_jsonb(d);
  end if;
  select * into f from public.formulas where formula_del_origen_id = nid;
  if f.estado is distinct from 'borrador' or f.definicion is distinct from e -> 'definicion' or f.params is distinct from e -> 'params' or f.diseno is distinct from e -> 'diseno' or f.origen_id is distinct from o then
    raise exception 'el borrador en blanco no es el de omisión: %', to_jsonb(f);
  end if;
  select * into p from public.plantillas_tarjeta where formula_del_origen_id = nid;
  if p.estado is distinct from 'borrador' or p.definicion is distinct from public._fdo_tarjeta_en_blanco() then raise exception 'la tarjeta en blanco no es la de omisión: %', to_jsonb(p); end if;
  if not exists (select 1 from public.actividad a where a.accion = 'formula_del_origen.crear' and a.tabla = 'formulas_del_origen' and a.registro_id = nid::text) then
    raise exception 'crear no dejó su actividad';
  end if;
  -- Otra vez lo mismo: lo mismo, sin avisos; con otro nombre, PT409.
  r := pg_temp.fcr_crear(q, nid, o, 'Planilla');
  if r ? 'error' or r -> 'id' is distinct from to_jsonb(nid) or r -> 'avisos' is distinct from '[]'::jsonb then raise exception 'repetir crear dio %', r; end if;
  if (select count(*) from public.formulas_del_origen where origen_id = o) is distinct from 1 then raise exception 'repetir crear duplicó la fórmula'; end if;
  r := pg_temp.fcr_crear(q, nid, o, 'Otra');
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'Esa fórmula ya se creó con otros datos.' then raise exception 'el mismo id con otro nombre dio %', r; end if;
  -- El nombre: único sin distinguir mayúsculas, de 1 a 60.
  r := pg_temp.fcr_crear(q, gen_random_uuid(), o, 'PLANILLA');
  if r ->> 'error' is distinct from '23505' or r ->> 'hint' is distinct from 'nombre' or r ->> 'mensaje' is distinct from 'Ya hay una fórmula «PLANILLA» en este origen.' then raise exception 'el nombre repetido dio %', r; end if;
  r := pg_temp.fcr_crear(q, gen_random_uuid(), o, '   ');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'nombre' or r ->> 'mensaje' is distinct from 'El nombre lleva de 1 a 60 caracteres.' then raise exception 'el nombre vacío dio %', r; end if;
  r := pg_temp.fcr_crear(q, gen_random_uuid(), o, repeat('x', 61));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'nombre' then raise exception 'el nombre de 61 dio %', r; end if;
  r := pg_temp.fcr_crear(q, null, o, 'Sin id');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'id' then raise exception 'crear sin id dio %', r; end if;
  -- Publicar la fórmula en blanco funciona y, sin otra activa, la activa.
  r := pg_temp.fcr_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L, p_formula_del_origen => %L))', o, 'v1', nid));
  if r ? 'error' then raise exception 'publicar la fórmula en blanco dio %', r; end if;
  if not (select activa from public.formulas_del_origen where formulas_del_origen.id = nid) then raise exception 'la primera publicada no quedó activa'; end if;
  -- La tarjeta en blanco calza con la fórmula en blanco publicada.
  select * into f from public.formulas where formula_del_origen_id = nid and estado = 'publicada';
  perform public.validar_plantilla(p.definicion, f.definicion, f.diseno, f.visibilidad, null);
end $$;
rollback;

-- @test fórmulas del origen: copiar en el mismo origen la publicada o el borrador trae su definición, sus parámetros, su diseño, su nota y su tarjeta
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fc302';
  o uuid; a uuid := gen_random_uuid(); sb uuid := gen_random_uuid(); c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); r jsonb;
  e jsonb := public._fdo_formula_en_blanco(); def_b jsonb; pub public.formulas; bor public.formulas; tpub jsonb; tbor jsonb; f public.formulas;
begin
  insert into public.origenes (clave, nombre) values ('fcr_dos', 'Crear dos') returning id into o;
  perform pg_temp.fcr_persona(q, array[o]);
  r := pg_temp.fcr_crear(q, a, o, 'Fuente');
  if r ? 'error' then raise exception 'crear la fuente: %', r; end if;
  r := pg_temp.fcr_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L, p_formula_del_origen => %L))', o, 'la publicada', a));
  if r ? 'error' then raise exception 'publicar la fuente: %', r; end if;
  -- Un borrador distinto de la publicada, y una tarjeta publicada distinta de la del borrador.
  def_b := jsonb_set(e -> 'definicion', '{nodos,1,etiqueta}', '"Total del borrador"');
  r := pg_temp.fcr_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_nota => %L, p_formula_del_origen => %L)',
                                   o, def_b, e -> 'params', e -> 'diseno', 'el borrador', a));
  if r ? 'error' then raise exception 'guardar el borrador de la fuente: %', r; end if;
  tpub := jsonb_set(public._fdo_tarjeta_en_blanco(), '{filas,0,alto}', '31');
  insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, version, estado, definicion, publicado_en) values (o, a, 1, 'publicada', tpub, now());
  select * into pub from public.formulas where formula_del_origen_id = a and estado = 'publicada';
  select * into bor from public.formulas where formula_del_origen_id = a and estado = 'borrador';
  select definicion into tbor from public.plantillas_tarjeta where formula_del_origen_id = a and estado = 'borrador';
  -- De la publicada.
  r := pg_temp.fcr_crear(q, c1, o, 'Copia de la publicada', a, 'publicada');
  if r ? 'error' or r -> 'avisos' is distinct from '[]'::jsonb then raise exception 'copiar la publicada dio %', r; end if;
  select * into f from public.formulas where formula_del_origen_id = c1;
  if f.estado is distinct from 'borrador' or f.definicion is distinct from pub.definicion or f.params is distinct from pub.params or f.diseno is distinct from pub.diseno or f.nota is distinct from 'la publicada' then
    raise exception 'la copia de la publicada no la trajo: %', to_jsonb(f);
  end if;
  if (select definicion from public.plantillas_tarjeta where formula_del_origen_id = c1) is distinct from tpub then raise exception 'la copia de la publicada no trajo su tarjeta publicada'; end if;
  if (select copiada_de_otro_origen or activa from public.formulas_del_origen where id = c1) then raise exception 'la copia del mismo origen quedó marcada o activa'; end if;
  -- Del borrador.
  r := pg_temp.fcr_crear(q, c2, o, 'Copia del borrador', a, 'borrador');
  if r ? 'error' then raise exception 'copiar el borrador dio %', r; end if;
  select * into f from public.formulas where formula_del_origen_id = c2;
  if f.definicion is distinct from def_b or f.params is distinct from bor.params or f.nota is distinct from 'el borrador' then raise exception 'la copia del borrador no lo trajo: %', to_jsonb(f); end if;
  if (select definicion from public.plantillas_tarjeta where formula_del_origen_id = c2) is distinct from tbor then raise exception 'la copia del borrador no trajo su tarjeta borrador'; end if;
  -- La fuente no cambió.
  if (select count(*) from public.formulas where formula_del_origen_id = a) is distinct from 2 or (select definicion from public.formulas where id = bor.id) is distinct from def_b then
    raise exception 'copiar tocó la fuente';
  end if;
  -- Una pieza que no existe o que no es una pieza.
  r := pg_temp.fcr_crear(q, sb, o, 'Sin borrador', c1, 'publicada');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'pieza' or r ->> 'mensaje' is distinct from 'Esa fórmula no tiene versión publicada.' then raise exception 'copiar una publicada que no hay dio %', r; end if;
  r := pg_temp.fcr_crear(q, sb, o, 'Pieza rara', a, 'archivada');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'pieza' then raise exception 'una pieza que no es pieza dio %', r; end if;
  if exists (select 1 from public.formulas_del_origen where id = sb) then raise exception 'un rechazo dejó la fórmula'; end if;
end $$;
rollback;

-- @test fórmulas del origen: copiar de otro origen trae sus tablas (o usa las del destino), avisa los datos que faltan y publicar los exige; la fuente pide configurar
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fc303';
  q2 constant uuid := '00000000-0000-4000-8000-0000000fc304';
  s uuid; s_nombre text; d uuid; fuente uuid; nid uuid := gen_random_uuid(); r jsonb; r2 jsonb; sp public.formulas; def jsonb; f public.formulas; t public.tablas_referencia;
  esperados jsonb;
begin
  select o.id, o.nombre into s, s_nombre from public.origenes o where o.clave = 'subasta_usa';
  select * into sp from public.formulas where origen_id = s and estado = 'publicada';
  insert into public.origenes (clave, nombre) values ('fcr_tres', 'Crear tres') returning id into d;
  perform pg_temp.fcr_persona(q, array[s, d]);
  perform pg_temp.fcr_persona(q2, array[d]);
  -- El destino ya tiene su «depreciacion».
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) select d, t2.clave, t2.nombre, t2.columnas from public.tablas_referencia t2 where t2.origen_id = s and t2.clave = 'depreciacion';
  -- La fuente: la de subasta_usa más un nodo con las «odometro_millas» del vehículo, que el destino no tiene.
  def := jsonb_set(sp.definicion, '{nodos}', (sp.definicion -> 'nodos') || '[{"id": "col", "tipo": "campo_vehiculo", "campo": "odometro_millas", "formato": "raw", "etiqueta": "Millas"}]');
  insert into public.formulas_del_origen (origen_id, nombre) values (s, 'Fuente con millas') returning id into fuente;
  insert into public.formulas (origen_id, formula_del_origen_id, estado, definicion, params, diseno, nota) values (s, fuente, 'borrador', def, sp.params, sp.diseno, 'con millas');
  -- Sin configurar en el origen de la fuente, lo mismo que una fuente que no existe.
  r := pg_temp.fcr_crear(q2, gen_random_uuid(), d, 'Traída', fuente, 'borrador');
  r2 := pg_temp.fcr_crear(q2, gen_random_uuid(), d, 'Traída', gen_random_uuid(), 'borrador');
  if r ->> 'error' is distinct from '42501' or coalesce(r ->> 'mensaje', '') not like '%cotizaciones.configurar%' or r is distinct from r2 then raise exception 'la fuente ajena dio % y una que no existe %', r, r2; end if;
  -- Con permiso en los dos.
  r := pg_temp.fcr_crear(q, nid, d, 'Traída', fuente, 'borrador');
  if r ? 'error' then raise exception 'copiar de otro origen dio %', r; end if;
  esperados := '[{"tipo": "tabla_creada", "clave": "comision_por_variante"}, {"tipo": "tabla_del_destino", "clave": "depreciacion"},
                 {"tipo": "tabla_creada", "clave": "transporte_usa_bolivia"}, {"tipo": "tabla_creada", "clave": "transporte_usa_chile"},
                 {"tipo": "campo", "nodo": "col", "campo": "odometro_millas"}]';
  if r -> 'avisos' is distinct from esperados then raise exception 'los avisos de la copia: %', r -> 'avisos'; end if;
  if not (select copiada_de_otro_origen from public.formulas_del_origen where formulas_del_origen.id = nid) then raise exception 'la copia de otro origen no quedó marcada'; end if;
  select * into f from public.formulas where formula_del_origen_id = nid;
  if f.origen_id is distinct from d or f.definicion is distinct from def or f.params -> 'tablas' ? 'depreciacion' or f.params - 'tablas' is distinct from sp.params - 'tablas'
     or f.params -> 'tablas' -> 'comision_por_variante' is distinct from sp.params -> 'tablas' -> 'comision_por_variante' then
    raise exception 'el borrador copiado: %', to_jsonb(f);
  end if;
  -- Las tablas creadas en el destino, con las filas congeladas de la fuente en su orden.
  select * into t from public.tablas_referencia where origen_id = d and clave = 'transporte_usa_chile';
  if t.version is distinct from 1 or t.nota is distinct from 'Copiada de ' || s_nombre or t.publicado_por is distinct from q
     or t.columnas is distinct from (select columnas from public.tablas_referencia where origen_id = s and clave = 'transporte_usa_chile') then
    raise exception 'la tabla creada: %', to_jsonb(t);
  end if;
  if (select jsonb_agg(valores order by orden) from public.tablas_referencia_filas where tabla_id = t.id) is distinct from sp.params -> 'tablas' -> 'transporte_usa_chile' then
    raise exception 'la tabla creada no trajo las filas congeladas en su orden';
  end if;
  if (select count(*) from public.tablas_referencia where origen_id = d) is distinct from 4 then raise exception 'la copia no dejó cuatro tablas en el destino'; end if;
  if exists (select 1 from public.tablas_referencia_filas where tabla_id = (select id from public.tablas_referencia where origen_id = d and clave = 'depreciacion')) then
    raise exception 'la copia tocó la tabla del destino';
  end if;
  -- Guardar el borrador funciona; publicarlo exige el dato que falta.
  r := pg_temp.fcr_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => %L, p_formula_del_origen => %L)',
                                   d, f.definicion, f.params, f.diseno, f.actualizado_en, nid));
  if r ? 'error' then raise exception 'guardar la copia dio %', r; end if;
  r := pg_temp.fcr_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L, p_formula_del_origen => %L))', d, 'v1', nid));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'nodos.col' or r ->> 'mensaje' is distinct from 'El dato «odometro_millas» no existe en este origen: elige otro o créalo en el origen.' then
    raise exception 'publicar la copia con un dato que falta dio %', r;
  end if;
  -- Una copia de esa copia en el destino sigue marcada.
  r := pg_temp.fcr_crear(q, gen_random_uuid(), d, 'Copia de la traída', nid, 'borrador');
  if r ? 'error' or r -> 'avisos' is distinct from '[{"tipo": "campo", "nodo": "col", "campo": "odometro_millas"}]'::jsonb then raise exception 'la copia de la copia dio %', r; end if;
  if not (select copiada_de_otro_origen from public.formulas_del_origen where formulas_del_origen.id = (r ->> 'id')::uuid) then raise exception 'la copia de la copia no quedó marcada'; end if;
end $$;
rollback;

-- @test fórmulas del origen: el tope es de 50 sin archivar; archivar una libera el lugar
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-0000000fc305';
  o uuid; r jsonb;
begin
  insert into public.origenes (clave, nombre) values ('fcr_cuatro', 'Crear cuatro') returning id into o;
  perform pg_temp.fcr_persona(q, array[o]);
  insert into public.formulas_del_origen (origen_id, nombre) select o, 'Tope ' || n from generate_series(1, 49) n;
  insert into public.formulas_del_origen (origen_id, nombre, archivada_en) values (o, 'Archivada vieja', now());
  r := pg_temp.fcr_crear(q, gen_random_uuid(), o, 'La 50');
  if r ? 'error' then raise exception 'la 50 dio %', r; end if;
  r := pg_temp.fcr_crear(q, gen_random_uuid(), o, 'La 51');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'formulas' or r ->> 'mensaje' is distinct from 'Este origen ya tiene 50 fórmulas: archiva o elimina alguna.' then raise exception 'la 51 dio %', r; end if;
  update public.formulas_del_origen set archivada_en = now() where origen_id = o and nombre = 'Tope 1';
  r := pg_temp.fcr_crear(q, gen_random_uuid(), o, 'La 51');
  if r ? 'error' then raise exception 'la 51 tras archivar una dio %', r; end if;
end $$;
rollback;
