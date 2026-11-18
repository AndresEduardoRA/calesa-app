-- El ⚙ de la cabecera (`formula_cambiar_cabecera`, docs/COTIZADOR.md › «Versiones»): publica la N+1 desde la publicada con el modo por defecto, «Ver
-- total» por defecto y los modos visibles, sin tocar el borrador; el permiso antes que todo, PT409 con quién y cuándo, 22023 con los mismos valores
-- (los efectivos) o sin modos, el diseño resultante validado entero y `formula.publicada` en la actividad.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

create or replace function pg_temp.cc_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado como texto, o `sqlstate:detalle@hint mensaje` si falla.
create or replace function pg_temp.cc_corre(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v text; v_d text; v_h text; v_m text; v_e text;
begin
  perform pg_temp.cc_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return v_e || ':' || coalesce(nullif(v_d, ''), '-') || '@' || coalesce(v_h, '') || ' ' || v_m;
  end;
  reset role;
  return v;
end $f$;

-- Una persona con un rol propio y esas claves en ese origen.
create or replace function pg_temp.cc_persona(p_id uuid, p_origen uuid, p_claves text[]) returns void language plpgsql as $f$
declare v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Cabecera ' || right(p_id::text, 4), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('cc_' || right(p_id::text, 4), 'Cabecera ' || right(p_id::text, 4)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c, case when c like 'cotizaciones.nivel.%' then null else p_origen end, 'todos');
  end loop;
end $f$;

-- Un origen nuevo con la fórmula publicada de la semilla `p_semilla` (con `p_cabecera` mezclado en su cabecera) como su v1: devuelve la v1.
create or replace function pg_temp.cc_origen(p_quien uuid, p_clave text, p_semilla text, p_cabecera jsonb default '{}') returns uuid language plpgsql as $f$
declare o uuid; s public.formulas; r text;
begin
  insert into public.origenes (clave, nombre) values (p_clave, 'Cabecera ' || p_clave) returning id into o;
  perform pg_temp.cc_persona(p_quien, o, array['cotizaciones.configurar', 'cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.nivel.costos.ver']);
  select f.* into s from public.formulas f join public.origenes x on x.id = f.origen_id where x.clave = p_semilla and f.estado = 'publicada';
  r := pg_temp.cc_corre(p_quien, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)',
                                        o, s.definicion, s.params, jsonb_set(s.diseno, '{cabecera}', (s.diseno -> 'cabecera') || p_cabecera)));
  if r ~ '^[0-9A-Z]{5}:' then raise exception 'guardar el borrador: %', r; end if;
  r := pg_temp.cc_corre(p_quien, format('select public.formula_publicar(p_origen => %L, p_nota => %L)', o, 'v1'));
  if r ~ '^[0-9A-Z]{5}:' then raise exception 'publicar: %', r; end if;
  return (select id from public.formulas where origen_id = o and estado = 'publicada');
end $f$;

create or replace function pg_temp.cc_origen_de(p_formula uuid) returns uuid language sql as $f$
  select origen_id from public.formulas where id = p_formula
$f$;

-- La llamada al ⚙ de la cabecera.
create or replace function pg_temp.cc_sql(p_origen uuid, p_modo text, p_ver boolean, p_visibles text[], p_esperada uuid) returns text language sql as $f$
  select format('select public.formula_cambiar_cabecera(%L, %L, %L, %L, %L)::text', p_origen, p_modo, p_ver, p_visibles, p_esperada)
$f$;

-- @test cambiar cabecera: sin `cotizaciones.configurar` da 42501, también con un origen que no existe, y el permiso es lo primero que mira
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000cc01';
  a constant uuid := '00000000-0000-4000-8000-00000000cc02';
  v1 uuid := pg_temp.cc_origen(q, 'cc_permiso', 'subasta_usa');
  o uuid := pg_temp.cc_origen_de(v1);
  r text;
  v_def text := pg_get_functiondef('public.formula_cambiar_cabecera(uuid,text,boolean,text[],uuid)'::regprocedure);
begin
  perform pg_temp.cc_persona(a, o, array['cotizaciones.ver', 'cotizaciones.crear']);
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(o, 'unificado', false, array['paralelo', 'unificado'], v1));
  if r not like '42501:%' then raise exception 'sin configurar dio «%»', r; end if;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), 'unificado', false, array['paralelo', 'unificado'], v1));
  if r not like '42501:%' then raise exception 'con un origen que no existe dio «%»', r; end if;
  -- Nulos y todo lo demás van después del permiso: quien no configura no sabe nada más.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(o, null, null, null, gen_random_uuid()));
  if r not like '42501:%' then raise exception 'sin configurar y con nulos dio «%»', r; end if;
  if position('assert_permiso' in v_def) = 0 or position('assert_permiso' in v_def) > position('select * into v_pub' in v_def) then
    raise exception 'el permiso no es lo primero';
  end if;
  if (select count(*) from public.formulas where origen_id = o) <> 1 then raise exception 'sin permiso se publicó algo'; end if;
end $$;
rollback;

-- @test cambiar cabecera: un parámetro nulo da 22023 con su hint
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000cc03';
  v1 uuid := pg_temp.cc_origen(q, 'cc_nulos', 'subasta_usa');
  o uuid := pg_temp.cc_origen_de(v1);
  r text;
begin
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, null, false, array['paralelo'], v1));
  if r not like '22023:-@modo_por_defecto %' then raise exception 'sin modo dio «%»', r; end if;
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'paralelo', null, array['paralelo'], v1));
  if r not like '22023:-@ver_total_bs_por_defecto %' then raise exception 'sin «Ver total» dio «%»', r; end if;
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'paralelo', false, null, v1));
  if r not like '22023:-@modos_visibles %' then raise exception 'sin visibles dio «%»', r; end if;
end $$;
rollback;

-- @test cambiar cabecera: con la esperada vieja da PT409 con quién y cuándo, sin «Recarga», y no publica
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000cc04';
  v1 uuid := pg_temp.cc_origen(q, 'cc_esperada', 'subasta_usa');
  o uuid := pg_temp.cc_origen_de(v1);
  r text;
begin
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'unificado', true, array['paralelo', 'unificado'], gen_random_uuid()));
  if r not like 'PT409:-@ Publicaste la versión 1 hace %' or r like '%Recarga%' then raise exception 'la esperada vieja dio «%»', r; end if;
  if (select count(*) from public.formulas where origen_id = o) <> 1 then raise exception 'con la esperada vieja se publicó algo'; end if;
end $$;
rollback;

-- @test cambiar cabecera: publica la N+1 con la misma definición, los mismos params y la cabecera nueva; el borrador queda intacto; registra formula.publicada
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000cc05';
  v1 uuid := pg_temp.cc_origen(q, 'cc_publica', 'subasta_usa');
  o uuid := pg_temp.cc_origen_de(v1);
  v_pub public.formulas := (select f from public.formulas f where f.id = v1);
  v_borr public.formulas;
  v_desp public.formulas;
  v2 uuid;
  r text;
begin
  -- Un borrador en curso, con otro valor.
  r := pg_temp.cc_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)',
                                  o, v_pub.definicion, jsonb_set(v_pub.params, '{flete}', '1234'), v_pub.diseno));
  if r ~ '^[0-9A-Z]{5}:' then raise exception 'el borrador: %', r; end if;
  select * into v_borr from public.formulas where origen_id = o and estado = 'borrador';

  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'unificado', true, array['unificado'], v1));
  if r ~ '^[0-9A-Z]{5}:' then raise exception 'el ⚙ de la cabecera dio «%»', r; end if;
  v2 := r::uuid;
  select * into v_desp from public.formulas where id = v2;
  if v_desp.estado::text || v_desp.version is distinct from 'publicada2' then raise exception 'no publicó la v2: %', v_desp.estado; end if;
  if v_desp.definicion is distinct from v_pub.definicion or v_desp.params is distinct from v_pub.params then raise exception 'la v2 cambió la fórmula'; end if;
  if v_desp.diseno - 'cabecera' is distinct from v_pub.diseno - 'cabecera' then raise exception 'la v2 cambió algo más que la cabecera'; end if;
  if (v_desp.diseno -> 'cabecera') - 'modo_por_defecto' - 'ver_total_bs_por_defecto' - 'modos_visibles' is distinct from v_pub.diseno -> 'cabecera' then
    raise exception 'la v2 cambió otra clave de la cabecera';
  end if;
  if jsonb_path_query_first(v_desp.diseno, '$.cabecera.modo_por_defecto') is distinct from '"unificado"'::jsonb
     or jsonb_path_query_first(v_desp.diseno, '$.cabecera.ver_total_bs_por_defecto') is distinct from 'true'::jsonb
     or jsonb_path_query_first(v_desp.diseno, '$.cabecera.modos_visibles') is distinct from '["unificado"]'::jsonb then
    raise exception 'la cabecera de la v2: %', v_desp.diseno -> 'cabecera';
  end if;
  if (select estado::text from public.formulas where id = v1) is distinct from 'archivada' then raise exception 'la v1 no quedó archivada'; end if;
  -- El borrador, intacto.
  if not exists (select 1 from public.formulas b where b.id = v_borr.id and b.estado = 'borrador' and b.actualizado_en = v_borr.actualizado_en
                    and b.diseno = v_borr.diseno and b.params = v_borr.params and b.definicion = v_borr.definicion) then
    raise exception 'el ⚙ de la cabecera tocó el borrador';
  end if;
  -- La actividad.
  if not exists (select 1 from public.actividad where accion = 'formula.publicada' and registro_id = v2::text
                    and despues -> 'cabecera' = '{"modo_por_defecto": "unificado", "ver_total_bs_por_defecto": true, "modos_visibles": ["unificado"]}'::jsonb
                    and (despues ->> 'version')::int = 2 and antes ->> 'anterior' = v1::text) then
    raise exception 'no registró formula.publicada con la cabecera';
  end if;
  -- La hoja abre con eso.
  r := pg_temp.cc_corre(q, format('select (public.cotizacion_hoja(%L) -> ''cabecera'' ->> ''modo_por_defecto'')', o));
  if r is distinct from 'unificado' then raise exception 'la hoja no trae el modo por defecto: %', r; end if;
end $$;
rollback;

-- @test cambiar cabecera: los mismos valores (efectivos) dan 22023 con hint cabecera y no publican
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000cc06';
  v1 uuid := pg_temp.cc_origen(q, 'cc_mismos', 'subasta_usa');
  o uuid := pg_temp.cc_origen_de(v1);
  r text;
  v2 uuid;
begin
  -- Un diseño sin las claves: lo efectivo es el primer modo, falso y todos.
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'paralelo', false, array['paralelo', 'unificado'], v1));
  if r is distinct from '22023:-@cabecera La cabecera ya tiene esos valores.' then raise exception 'los mismos efectivos dieron «%»', r; end if;
  if (select count(*) from public.formulas where origen_id = o) <> 1 then raise exception 'con los mismos valores se publicó algo'; end if;
  -- Con las claves escritas, los mismos.
  v2 := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'paralelo', true, array['paralelo', 'unificado'], v1))::uuid;
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'paralelo', true, array['paralelo', 'unificado'], v2));
  if r is distinct from '22023:-@cabecera La cabecera ya tiene esos valores.' then raise exception 'los mismos escritos dieron «%»', r; end if;
end $$;
rollback;

-- @test cambiar cabecera: un diseño resultante inválido da su regla (modo inexistente, por defecto oculto, «Ver total» sin ofrecer) y no publica
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000cc07';
  v1 uuid := pg_temp.cc_origen(q, 'cc_invalido', 'subasta_usa', '{"ver_total_bs": false}');
  o uuid := pg_temp.cc_origen_de(v1);
  r text;
begin
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'aduana', false, array['paralelo', 'unificado'], v1));
  if r not like '22023:modo_por_defecto_inexistente@cabecera %' then raise exception 'un modo inexistente dio «%»', r; end if;
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'unificado', false, array['paralelo'], v1));
  if r not like '22023:modo_por_defecto_oculto@cabecera %' then raise exception 'el modo por defecto oculto dio «%»', r; end if;
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'paralelo', false, array['paralelo', 'aduana'], v1));
  if r not like '22023:modo_visible_inexistente@cabecera %' then raise exception 'un visible inexistente dio «%»', r; end if;
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'paralelo', true, array['paralelo', 'unificado'], v1));
  if r not like '22023:ver_total_bs_por_defecto_no_ofrecido@cabecera %' then raise exception '«Ver total» sin ofrecer dio «%»', r; end if;
  if (select count(*) from public.formulas where origen_id = o) <> 1 then raise exception 'un diseño inválido publicó algo'; end if;
end $$;
rollback;

-- @test cambiar cabecera: una publicada sin modos (oficina) da 22023 con hint cabecera
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000cc08';
  v1 uuid := pg_temp.cc_origen(q, 'cc_sin_modos', 'oficina');
  o uuid := pg_temp.cc_origen_de(v1);
  r text;
begin
  r := pg_temp.cc_corre(q, pg_temp.cc_sql(o, 'paralelo', false, array['paralelo'], v1));
  if r is distinct from '22023:-@cabecera Esta fórmula no tiene modos de tipo de cambio.' then raise exception 'sin modos dio «%»', r; end if;
end $$;
rollback;

-- @test cambiar cabecera: una sola firma, definer con search_path vacío, de authenticated y no de anon ni de PUBLIC
do $$
declare v_p regprocedure := to_regprocedure('public.formula_cambiar_cabecera(uuid,text,boolean,text[],uuid)');
begin
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'formula_cambiar_cabecera') <> 1 then
    raise exception 'formula_cambiar_cabecera tiene más de una firma (o ninguna)';
  end if;
  if v_p is null then raise exception 'no existe formula_cambiar_cabecera(uuid,text,boolean,text[],uuid)'; end if;
  if (select p.prosecdef and p.proconfig = array['search_path=""'] from pg_proc p where p.oid = v_p) is not true then
    raise exception 'formula_cambiar_cabecera no es definer con search_path vacío';
  end if;
  if not has_function_privilege('authenticated', v_p, 'execute') or has_function_privilege('anon', v_p, 'execute')
     or has_function_privilege('public', v_p, 'execute') then
    raise exception 'los grants de formula_cambiar_cabecera';
  end if;
end $$;
