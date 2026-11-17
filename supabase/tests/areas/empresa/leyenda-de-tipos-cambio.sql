-- La leyenda de los tipos de cambio compartidos (`ajustes_empresa.leyenda_tipos_cambio`, escrita por `empresa_guardar_leyenda_de_tipos_cambio()`).
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y revierte.

-- @test empresa: la leyenda pide el permiso y la versión, y vacía la quita
begin;
reset role;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000cc001';
  s constant uuid := '00000000-0000-4000-8000-0000000cc002';
  v_rol uuid; v_version timestamptz; v_nueva timestamptz; v_estado text; v_hint text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (g, g || '@ejemplo.com', '{"invitado": true}'), (s, s || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set invitacion_aceptada_en = now() where id in (g, s);
  delete from public.usuarios_roles where usuario_id in (g, s);
  insert into public.roles (clave, nombre) values ('tcl_gestiona', 'TCL gestiona') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (g, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'empresa.tipos_cambio.gestionar', 'todos');
  insert into public.roles (clave, nombre) values ('tcl_sin', 'TCL sin') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (s, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'leads.ver', 'todos');

  select actualizado_en into v_version from public.ajustes_empresa where id = 1;

  -- Sin el permiso: 42501.
  perform set_config('request.jwt.claim.sub', s::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.empresa_guardar_leyenda_de_tipos_cambio('Valores referenciales', v_version);
    raise exception 'sin el permiso guardó';
  exception when others then
    get stacked diagnostics v_estado = returned_sqlstate;
    if v_estado <> '42501' then raise exception 'sin el permiso esperaba 42501, dio %', v_estado; end if;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', g::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Versión vieja: PT409.
  begin
    perform public.empresa_guardar_leyenda_de_tipos_cambio('Valores referenciales', v_version - interval '1 microsecond');
    raise exception 'con una versión vieja guardó';
  exception when others then
    get stacked diagnostics v_estado = returned_sqlstate;
    if v_estado <> 'PT409' then raise exception 'con una versión vieja esperaba PT409, dio %', v_estado; end if;
  end;

  -- Con permiso y versión: guarda recortada y devuelve la versión nueva.
  v_nueva := public.empresa_guardar_leyenda_de_tipos_cambio('  Valores referenciales  ', v_version);
  if (select leyenda_tipos_cambio from public.ajustes_empresa where id = 1) is distinct from 'Valores referenciales' then
    raise exception 'no quedó la leyenda recortada';
  end if;
  if v_nueva is distinct from (select actualizado_en from public.ajustes_empresa where id = 1) then
    raise exception 'no devolvió la versión de la fila';
  end if;

  -- Largo: 120 pasa, 121 da 22023 con hint; con salto de línea también.
  v_nueva := public.empresa_guardar_leyenda_de_tipos_cambio(repeat('a', 120), v_nueva);
  begin
    perform public.empresa_guardar_leyenda_de_tipos_cambio(repeat('a', 121), v_nueva);
    raise exception 'guardó 121 caracteres';
  exception when others then
    get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
    if v_estado <> '22023' or v_hint <> 'leyenda' then raise exception 'con 121 esperaba 22023/leyenda, dio %/%', v_estado, v_hint; end if;
  end;
  begin
    perform public.empresa_guardar_leyenda_de_tipos_cambio(E'uno\ndos', v_nueva);
    raise exception 'guardó un salto de línea';
  exception when others then
    get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
    if v_estado <> '22023' or v_hint <> 'leyenda' then raise exception 'con salto esperaba 22023/leyenda, dio %/%', v_estado, v_hint; end if;
  end;

  -- Vacía (o sólo espacios) la quita.
  perform public.empresa_guardar_leyenda_de_tipos_cambio('   ', v_nueva);
  if (select leyenda_tipos_cambio from public.ajustes_empresa where id = 1) is not null then raise exception 'vacía no la quitó'; end if;
  reset role;

  -- Cualquiera con sesión la lee (select de tabla); anon no ejecuta la RPC.
  if has_function_privilege('anon', 'public.empresa_guardar_leyenda_de_tipos_cambio(text, timestamptz)', 'execute') then
    raise exception 'anon puede guardar la leyenda';
  end if;
end $$;
rollback;
