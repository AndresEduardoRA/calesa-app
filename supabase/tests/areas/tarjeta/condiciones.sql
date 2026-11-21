-- Las condiciones de la tarjeta (glosario: «Lista de respaldo», «Condiciones de la tarjeta») por el camino de guardar y publicar la plantilla, y lo que
-- `cotizacion_tarjeta()` entrega de ellas. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)». El juego entero de la forma y de las reglas va en plantilla-validar.sql
-- (T1, casos-de-plantilla.json); lo oculto por nivel, en K4 de cotizacion-tarjeta.sql.
-- No depende de otro archivo (`SOLO=areas/tarjeta/condiciones.sql`): la fórmula es una copia de la v1 sembrada de subasta_usa en un origen propio. Cada bloque abre
-- su transacción y la revierte.
--
-- Qué asegura:
--   C1. Guardar el borrador mira la forma y las reglas de la grilla: una lista de respaldo con un dato es `respaldo_vacio` (22023, la regla en DETAIL y la celda en
--       HINT) y no se guarda; un nodo de un nivel en una condición se guarda (guardar no mira la fórmula).
--   C2. Publicar la cruza con la versión: un nodo de un nivel en una condición de una celda o de una fila es `nodo_restringido` (con su mensaje, que nombra la celda
--       o la fila y nunca el nodo), una opción que la variante no tiene es `condicion_invalida`, y la publicada no se mueve; la buena se publica.
--   C3. `cotizacion_tarjeta()` entrega los nodos que nombran las listas, las ramas, el «si no» y las condiciones (de una celda y de una fila, sobre un nodo o sobre un
--       dato), los grupos de un `tc_*` o un `plazo` anidado y la variante con `titulo_opcion` en una lista; nada más.

-- Una persona activa con un rol propio y estas concesiones (alcance «todos», todos los orígenes).
create or replace function pg_temp.cn_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cn_' || substr(v_id::text, 1, 8), 'CN ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated): {ok: su resultado como jsonb}, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.cn_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_d text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_d = pg_exception_detail, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', v_d, 'hint', v_h);
  end;
  reset role;
  return jsonb_build_object('ok', v);
end $f$;

-- Un origen propio con la v1 sembrada de subasta_usa publicada (su variante `variante`, sus banderas y sus nodos de costos): {o, f}.
create or replace function pg_temp.cn_origen(p_clave text) returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values (p_clave, 'CN ' || p_clave) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  select o, 1, 'publicada', x.definicion, x.params, x.diseno, x.visibilidad, now()
    from public.formulas x join public.origenes s on s.id = x.origen_id
   where s.clave = 'subasta_usa' and x.version = 1
  returning id into f;
  if f is null then raise exception 'no está la v1 de subasta_usa'; end if;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una cuadrícula de dos columnas sobre esa fórmula: el título con su lista de respaldo, el monto según condiciones y una fila que se oculta según las suyas.
create or replace function pg_temp.cn_cuadricula() returns jsonb language sql as $f$
  select '{"forma": 2, "columnas": [{"id": "concepto", "ancho": 200}, {"id": "monto", "ancho": 120}],
           "filas": [{"id": "cabeza", "alto": 30, "ocultar_si": "nunca"},
                     {"id": "aviso", "alto": 20, "ocultar_si": "condiciones", "si": [{"es": "apagado", "nodo": "mostrar_garantia"}]},
                     {"id": "total", "alto": 32, "ocultar_si": "nunca"}],
           "celdas": [{"id": "titulo", "fila": "cabeza", "columna": "concepto",
                       "contenido": {"tipo": "respaldo", "datos": [{"tipo": "dato", "variable": "titulo"}, {"tipo": "dato", "variable": "vehiculo_titulo"}]}},
                      {"id": "seguro", "fila": "cabeza", "columna": "monto",
                       "contenido": {"tipo": "condiciones", "ramas": [{"si": [{"es": "opcion", "nodo": "variante", "opcion": "gasolina"}],
                                                                       "contenido": {"tipo": "texto", "texto": "Gasolina"}}],
                                     "si_no": {"tipo": "vacio"}}},
                      {"id": "aviso", "fila": "aviso", "columna": "concepto", "abarca_columnas": 2, "contenido": {"tipo": "dato", "nodo": "garantia", "mostrar": "monto"}},
                      {"id": "c_total", "fila": "total", "columna": "concepto", "contenido": {"tipo": "texto", "texto": "Total"}},
                      {"id": "m_total", "fila": "total", "columna": "monto",
                       "contenido": {"tipo": "condiciones", "ramas": [{"si": [{"es": "mayor", "nodo": "total", "a": 1000}], "contenido": {"tipo": "dato", "nodo": "total", "mostrar": "monto"}}],
                                     "si_no": {"tipo": "texto", "texto": "A consultar"}}}]}'::jsonb
$f$;

-- La actualizado_en del borrador de la plantilla del origen.
create or replace function pg_temp.cn_borrador(o uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.plantillas_tarjeta where origen_id = o and estado = 'borrador'
$f$;

-- @test condiciones C1: guardar el borrador rechaza una lista de respaldo con un dato (respaldo_vacio, en su celda) y guarda un nodo de un nivel en una condición
begin;
do $$
declare quien uuid; e jsonb; r jsonb;
begin
  quien := pg_temp.cn_persona(array['cotizaciones.ver', 'cotizaciones.configurar']);
  e := pg_temp.cn_origen('cn_c1');
  r := pg_temp.cn_corre(quien, format('select to_jsonb(public.plantilla_guardar_borrador(%L, null::timestamptz, %L))', e ->> 'o',
                                      jsonb_set(pg_temp.cn_cuadricula(), '{celdas,0,contenido,datos}', '[{"tipo": "dato", "variable": "titulo"}]')));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'respaldo_vacio' or r ->> 'hint' is distinct from 'celdas.titulo'
     or r ->> 'mensaje' is distinct from 'La celda «titulo» necesita al menos dos datos para mostrar el primero con valor.' then
    raise exception 'guarda una lista de un dato: %', r;
  end if;
  if pg_temp.cn_borrador((e ->> 'o')::uuid) is not null then raise exception 'el rechazo dejó un borrador'; end if;
  -- `cif` es de costos: guardar mira sólo la forma.
  r := pg_temp.cn_corre(quien, format('select to_jsonb(public.plantilla_guardar_borrador(%L, null::timestamptz, %L))', e ->> 'o',
                                      jsonb_set(pg_temp.cn_cuadricula(), '{filas,1,si,0}', '{"es": "cero", "nodo": "cif"}')));
  if r ? 'error' then raise exception 'no guarda un nodo de un nivel en una condición: %', r; end if;
end $$;
rollback;

-- @test condiciones C2: publicar rechaza un nodo de un nivel en una condición (de una celda y de una fila) y una opción que la variante no tiene, sin mover la publicada; la buena se publica
begin;
do $$
declare quien uuid; e jsonb; o uuid; r jsonb; v_caso jsonb;
begin
  quien := pg_temp.cn_persona(array['cotizaciones.ver', 'cotizaciones.configurar']);
  e := pg_temp.cn_origen('cn_c2');
  o := (e ->> 'o')::uuid;
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion, publicado_en)
  values (o, 1, 'publicada', jsonb_set(pg_temp.cn_cuadricula(), '{celdas,1,contenido,si_no}', '{"tipo": "texto", "texto": "v1"}'), now());
  for v_caso in select * from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('ruta', '{celdas,1,contenido,ramas,0,si,0}', 'valor', '{"es": "no_cero", "nodo": "cif"}'::jsonb, 'regla', 'nodo_restringido', 'donde', 'celdas.seguro',
                       'mensaje', 'La tarjeta no puede mostrar lo que nombra la celda «seguro»: no es del nivel «todos».'),
    jsonb_build_object('ruta', '{filas,1,si,0}', 'valor', '{"es": "vacio", "dato": {"tipo": "dato", "nodo": "seguro", "mostrar": "monto"}}'::jsonb, 'regla', 'nodo_restringido',
                       'donde', 'filas.aviso', 'mensaje', 'La tarjeta no puede mostrar lo que nombra la fila «aviso»: no es del nivel «todos».'),
    jsonb_build_object('ruta', '{celdas,1,contenido,ramas,0,si,0,opcion}', 'valor', '"diesel"'::jsonb, 'regla', 'condicion_invalida', 'donde', 'celdas.seguro',
                       'mensaje', 'La celda «seguro» tiene una condición que esta fórmula no puede responder.'))) loop
    r := pg_temp.cn_corre(quien, format('select to_jsonb(public.plantilla_guardar_borrador(%L, %L::timestamptz, %L))', o, pg_temp.cn_borrador(o),
                                        jsonb_set(pg_temp.cn_cuadricula(), (v_caso ->> 'ruta')::text[], v_caso -> 'valor')));
    if r ? 'error' then raise exception 'no guarda «%»: %', v_caso ->> 'donde', r; end if;
    r := pg_temp.cn_corre(quien, format('select to_jsonb(public.plantilla_publicar(%L, %L::timestamptz, %L))', o, pg_temp.cn_borrador(o), 'v2'));
    if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from v_caso ->> 'regla' or r ->> 'hint' is distinct from v_caso ->> 'donde'
       or r ->> 'mensaje' is distinct from v_caso ->> 'mensaje' then
      raise exception 'publica %: %', v_caso, r;
    end if;
    if (select version from public.plantillas_tarjeta where origen_id = o and estado = 'publicada') <> 1 then raise exception 'un rechazo movió la publicada'; end if;
  end loop;
  r := pg_temp.cn_corre(quien, format('select to_jsonb(public.plantilla_guardar_borrador(%L, %L::timestamptz, %L))', o, pg_temp.cn_borrador(o), pg_temp.cn_cuadricula()));
  if r ? 'error' then raise exception 'no guarda la buena: %', r; end if;
  r := pg_temp.cn_corre(quien, format('select to_jsonb(public.plantilla_publicar(%L, %L::timestamptz, %L))', o, pg_temp.cn_borrador(o), 'v2'));
  if r ? 'error' then raise exception 'no publica la buena: %', r; end if;
  if (select definicion from public.plantillas_tarjeta where origen_id = o and estado = 'publicada' and version = 2) is distinct from pg_temp.cn_cuadricula() then
    raise exception 'la publicada no es la cuadrícula con condiciones';
  end if;
end $$;
rollback;

-- @test condiciones C3: cotizacion_tarjeta entrega los nodos de las listas, las ramas, el «si no» y las condiciones (sobre un nodo y sobre un dato, de una celda y de una fila), los grupos de lo anidado y la variante por titulo_opcion en una lista
begin;
do $$
declare quien uuid; e jsonb; o uuid; r jsonb; v_pla jsonb;
begin
  quien := pg_temp.cn_persona(array['cotizaciones.ver']);
  e := pg_temp.cn_origen('cn_c3');
  o := (e ->> 'o')::uuid;
  v_pla := pg_temp.cn_cuadricula();
  -- La lista nombra `titulo_opcion` y el plazo de `remate`; la rama, la etiqueta de `fees` y una condición sobre el monto de `grua`; el «si no», el tipo de cambio de
  -- `remate`; la fila, `cuenta_especial_usa`.
  v_pla := jsonb_set(v_pla, '{celdas,0,contenido,datos}', '[{"tipo": "dato", "variable": "titulo_opcion"}, {"tipo": "dato", "nodo": "remate", "mostrar": "plazo"}]');
  v_pla := jsonb_set(v_pla, '{celdas,1,contenido,ramas,0}', '{"si": [{"es": "opcion", "nodo": "variante", "opcion": "gasolina"}, {"es": "no_vacio", "dato": {"tipo": "dato", "nodo": "grua", "mostrar": "monto"}}],
                                                             "contenido": {"tipo": "dato", "nodo": "fees", "mostrar": "etiqueta"}}');
  v_pla := jsonb_set(v_pla, '{celdas,1,contenido,si_no}', '{"tipo": "dato", "nodo": "remate", "mostrar": "tc_nombre"}');
  v_pla := jsonb_set(v_pla, '{filas,1,si}', '[{"es": "encendido", "nodo": "cuenta_especial_usa"}]');
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion, publicado_en) values (o, 1, 'publicada', v_pla, now());
  r := pg_temp.cn_corre(quien, format('select public.cotizacion_tarjeta(%L)', e ->> 'f')) -> 'ok';
  if r ->> 'estado' is distinct from 'lista' then raise exception 'no está lista: %', r; end if;
  if (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(r -> 'nodos') x)
     is distinct from array['cuenta_especial_usa', 'fees', 'garantia', 'grua', 'remate', 'total', 'variante'] then
    raise exception 'los nodos: %', r -> 'nodos';
  end if;
  if (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(r -> 'grupos') x) is distinct from array['compra']
     or r #>> '{grupos,0,bucket}' is null or jsonb_typeof(r #> '{tipos_de_cambio,buckets}') is distinct from 'object'
     or (select count(*) from jsonb_object_keys(r #> '{tipos_de_cambio,buckets}')) <> 1 then
    raise exception 'los grupos o los tipos de cambio: %', jsonb_build_object('grupos', r -> 'grupos', 'tipos_de_cambio', r -> 'tipos_de_cambio');
  end if;
  if r #>> '{variante,nodo}' is distinct from 'variante' or r -> 'modos' <> '[]' then raise exception 'la variante o los modos: %', r; end if;
  if r -> 'definicion' is distinct from v_pla then raise exception 'la cuadrícula no viaja tal cual'; end if;
end $$;
rollback;
