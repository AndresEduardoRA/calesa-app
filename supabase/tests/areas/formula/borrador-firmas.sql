-- Las firmas de la versión esperada del borrador de la fórmula (4.21-2): una por función, de authenticated y no de anon, definer con search_path vacío y
-- con el candado del origen; `_publicar_formula` y los ayudantes, sólo de service_role. Corre en PGlite (`pnpm db:probar`); no escribe nada.

-- @test fórmula: F1 una firma de guardar, de descartar y de publicar, de authenticated y no de anon, definer con search_path vacío, devuelve jsonb y toma el candado; sus ayudantes no son de nadie
do $$
declare v_p regprocedure; f text;
begin
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'formula_guardar_borrador') <> 1 then
    raise exception 'formula_guardar_borrador tiene más de una firma (o ninguna)'; end if;
  v_p := to_regprocedure('public.formula_guardar_borrador(uuid,jsonb,jsonb,jsonb,text,uuid,timestamptz,uuid)');
  if v_p is null then raise exception 'no existe formula_guardar_borrador(uuid,jsonb,jsonb,jsonb,text,uuid,timestamptz,uuid)'; end if;
  if not has_function_privilege('authenticated', v_p, 'execute') or has_function_privilege('anon', v_p, 'execute') then
    raise exception 'los grants de formula_guardar_borrador'; end if;
  if (select p.prosecdef and p.proconfig = array['search_path=""'] and p.prorettype = 'jsonb'::regtype from pg_proc p where p.oid = v_p) is not true then
    raise exception 'formula_guardar_borrador no es definer con search_path vacío que devuelve jsonb'; end if;
  if position($c$pg_advisory_xact_lock(hashtextextended('formulas:'$c$ in pg_get_functiondef(v_p)) = 0 then
    raise exception 'formula_guardar_borrador no toma el candado del origen'; end if;
  -- Descartar.
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'formula_descartar_borrador') <> 1 then
    raise exception 'formula_descartar_borrador tiene más de una firma (o ninguna)'; end if;
  v_p := to_regprocedure('public.formula_descartar_borrador(uuid,timestamptz,uuid)');
  if v_p is null then raise exception 'no existe formula_descartar_borrador(uuid,timestamptz,uuid)'; end if;
  if not has_function_privilege('authenticated', v_p, 'execute') or has_function_privilege('anon', v_p, 'execute') then
    raise exception 'los grants de formula_descartar_borrador'; end if;
  if (select p.prosecdef and p.proconfig = array['search_path=""'] from pg_proc p where p.oid = v_p) is not true then
    raise exception 'formula_descartar_borrador no es definer con search_path vacío'; end if;
  if position($c$pg_advisory_xact_lock(hashtextextended('formulas:'$c$ in pg_get_functiondef(v_p)) = 0 then
    raise exception 'formula_descartar_borrador no toma el candado del origen'; end if;
  -- Publicar, y `_publicar_formula`, que sigue siendo sólo de service_role.
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'formula_publicar') <> 1 then
    raise exception 'formula_publicar tiene más de una firma (o ninguna)'; end if;
  v_p := to_regprocedure('public.formula_publicar(uuid,text,uuid,timestamptz,uuid)');
  if v_p is null then raise exception 'no existe formula_publicar(uuid,text,uuid,timestamptz,uuid)'; end if;
  if not has_function_privilege('authenticated', v_p, 'execute') or has_function_privilege('anon', v_p, 'execute') then
    raise exception 'los grants de formula_publicar'; end if;
  if (select p.prosecdef and p.proconfig = array['search_path=""'] from pg_proc p where p.oid = v_p) is not true then
    raise exception 'formula_publicar no es definer con search_path vacío'; end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = '_publicar_formula') <> 1 then
    raise exception '_publicar_formula tiene más de una firma (o ninguna)'; end if;
  v_p := to_regprocedure('public._publicar_formula(uuid,text,uuid,boolean,timestamptz,uuid)');
  if v_p is null then raise exception 'no existe _publicar_formula(uuid,text,uuid,boolean,timestamptz,uuid)'; end if;
  if has_function_privilege('authenticated', v_p, 'execute') or has_function_privilege('anon', v_p, 'execute')
     or not has_function_privilege('service_role', v_p, 'execute') then
    raise exception 'los grants de _publicar_formula'; end if;
  if (select p.prosecdef and p.proconfig = array['search_path=""'] from pg_proc p where p.oid = v_p) is not true then
    raise exception '_publicar_formula no es definer con search_path vacío'; end if;
  if position($c$pg_advisory_xact_lock(hashtextextended('formulas:'$c$ in pg_get_functiondef(v_p)) = 0 then
    raise exception '_publicar_formula no toma el candado del origen'; end if;
  foreach f in array array['public._borrador_formula_empezado_por(uuid)', 'public._exigir_borrador_formula(public.formulas,timestamptz)'] loop
    v_p := to_regprocedure(f);
    if v_p is null then raise exception 'no existe %', f; end if;
    if has_function_privilege('authenticated', v_p, 'execute') or has_function_privilege('anon', v_p, 'execute')
       or not has_function_privilege('service_role', v_p, 'execute') then
      raise exception 'los grants de %', f; end if;
    if (select p.proconfig = array['search_path=""'] from pg_proc p where p.oid = v_p) is not true then raise exception '% no lleva search_path vacío', f; end if;
  end loop;
end $$;

-- @test fórmulas del origen: una firma de crear, renombrar, archivar, eliminar y activar, de authenticated y no de anon, definer con search_path vacío y con los candados del origen (docs/COTIZADOR.md › «Fórmulas del origen»); sus ayudantes, sólo de service_role
do $$
declare v_p regprocedure; f text; n text;
begin
  foreach f in array array[
    'public.formula_del_origen_crear(uuid,uuid,text,uuid,text)',
    'public.formula_del_origen_renombrar(uuid,timestamptz,text)',
    'public.formula_del_origen_archivar(uuid,timestamptz)',
    'public.formula_del_origen_eliminar(uuid,timestamptz)',
    'public.formula_del_origen_activar(uuid,timestamptz,text,uuid,timestamptz,uuid,timestamptz,uuid)'] loop
    n := split_part(substr(f, 8), '(', 1);
    if (select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = n) <> 1 then
      raise exception '% tiene más de una firma (o ninguna)', n; end if;
    v_p := to_regprocedure(f);
    if v_p is null then raise exception 'no existe %', f; end if;
    if not has_function_privilege('authenticated', v_p, 'execute') or has_function_privilege('anon', v_p, 'execute') then raise exception 'los grants de %', n; end if;
    if (select p.prosecdef and p.proconfig = array['search_path=""'] from pg_proc p where p.oid = v_p) is not true then
      raise exception '% no es definer con search_path vacío', n; end if;
    -- Crear toma los candados él mismo; las demás, con `_fdo_tomar`.
    if n = 'formula_del_origen_crear' then
      if position($c$pg_advisory_xact_lock(hashtextextended('formulas:'$c$ in pg_get_functiondef(v_p)) = 0
         or position($c$pg_advisory_xact_lock(hashtextextended('plantillas:'$c$ in pg_get_functiondef(v_p)) = 0 then
        raise exception '% no toma los candados del origen', n; end if;
    elsif position('public._fdo_tomar(' in pg_get_functiondef(v_p)) = 0 then
      raise exception '% no toma la fórmula con _fdo_tomar', n;
    end if;
  end loop;
  v_p := to_regprocedure('public._fdo_tomar(uuid,uuid,timestamptz)');
  if position($c$pg_advisory_xact_lock(hashtextextended('formulas:'$c$ in pg_get_functiondef(v_p)) = 0
     or position($c$pg_advisory_xact_lock(hashtextextended('plantillas:'$c$ in pg_get_functiondef(v_p)) = 0
     or position($c$pg_advisory_xact_lock(hashtextextended('formulas:'$c$ in pg_get_functiondef(v_p))
        > position($c$pg_advisory_xact_lock(hashtextextended('plantillas:'$c$ in pg_get_functiondef(v_p)) then
    raise exception '_fdo_tomar no toma formulas: y después plantillas:'; end if;
  foreach f in array array['public._fdo_origen_con_permiso(uuid)', 'public._fdo_tomar(uuid,uuid,timestamptz)', 'public._fdo_nombre(text)',
                           'public._fdo_activada_por(uuid)'] loop
    v_p := to_regprocedure(f);
    if v_p is null then raise exception 'no existe %', f; end if;
    if has_function_privilege('authenticated', v_p, 'execute') or has_function_privilege('anon', v_p, 'execute')
       or not has_function_privilege('service_role', v_p, 'execute') then
      raise exception 'los grants de %', f; end if;
    if (select p.proconfig = array['search_path=""'] from pg_proc p where p.oid = v_p) is not true then raise exception '% no lleva search_path vacío', f; end if;
  end loop;
end $$;
