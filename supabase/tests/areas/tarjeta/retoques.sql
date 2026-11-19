-- Los retoques de la tarjeta (`docs/COTIZADOR.md` › «Retoques de la tarjeta»): `validar_retoques()`, `cotizacion_retocar_tarjeta()`, lo que deja en la revisión
-- y en la actividad, y que cotizar encima y la hoja de una guardada los llevan. No depende de otro archivo (`SOLO=areas/tarjeta/retoques.sql`). Cada bloque abre
-- su transacción y la revierte. Compara claves y hojas, nunca texto suelto.
--
-- Qué asegura:
--   R1. El juego común `casos-de-retoques.json` (tabla `_juego_de_retoques`, el mismo de `validarRetoques()`): cada caso da «válida» o «regla@donde», el juego
--       cubre las siete reglas y los `octetos` son los del texto jsonb.
--   R2. La preventa: quien ve y edita la retoca; quien sólo ve, 42501.
--   R3. La final: quien ve y gestiona finales la retoca; quien edita sin `cotizaciones.final.gestionar`, 42501.
--   R4. La papelera, lo que no existe y lo que no se ve: el mismo 42501; sin la versión, el error de `_exigir_version()`.
--   R5. El PT409 con nombre: A retoca y B retoca o guarda con la versión vieja (nombra a A y nada cambia); B cambia la cotización y A retoca con la vieja.
--   R6. Contra lo que se dibuja: con una cuadrícula publicada, una celda que no está o que no es de texto se rechaza; con una forma 1, un id de la conversión
--       pasa; sin plantilla, toda celda es inexistente.
--   R7. Nulo, `{}` y `{celdas: {}}` dejan la columna nula; los mismos retoques otra vez no mueven la versión ni dejan revisión.
--   R8. La revisión: de quien retoca y con cantidades, nunca los textos; `cotizacion_revisiones()` la da a quien sólo ve; la actividad nombra a quien retocó.
--   R9. Cotizar encima se lleva los retoques.
--   R10. `cotizacion_hoja_guardada()` los trae en `cotizacion`.
--   R11. La RPC es definer con search_path vacío y toma la fila `for no key update`; anon y PUBLIC no tienen nada; los ayudantes son de nadie.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'. `p_nombre`, el de su perfil.
create or replace function pg_temp.rt_persona(p_concesiones text[], p_nombre text default null) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rt_' || substr(v_id::text, 1, 8), 'RT ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  if p_nombre is not null then update public.perfiles set nombre = p_nombre where id = v_id; end if;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.rt_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', nullif(v_d, ''), 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

-- Un origen con una fórmula publicada mínima: un input del grupo g1 y el total, los dos del nivel «todos».
create or replace function pg_temp.rt_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('rt_' || substr(gen_random_uuid()::text, 1, 8), 'RT origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object(
    'nodos', jsonb_build_array(
      jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen', 'grupo', 'g1'),
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'grupos', jsonb_build_array(jsonb_build_object('id', 'g1', 'etiqueta', 'Grupo')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- La cuadrícula de prueba: dos celdas de texto (c_saludo, c_nota), una de dato (c_monto) y tres filas.
create or replace function pg_temp.rt_cuadricula() returns jsonb language sql as $f$
  select '{"forma": 2, "columnas": [{"id": "a", "ancho": 200}, {"id": "b", "ancho": 200}],
           "filas": [{"id": "f_titulo", "alto": 40, "ocultar_si": "nunca"}, {"id": "f_monto", "alto": 24, "ocultar_si": "nunca"}, {"id": "f_nota", "alto": 24, "ocultar_si": "nunca"}],
           "celdas": [{"id": "c_saludo", "fila": "f_titulo", "columna": "a", "contenido": {"tipo": "texto", "texto": "Hola"}},
                      {"id": "c_monto", "fila": "f_monto", "columna": "b", "contenido": {"tipo": "dato", "nodo": "visible", "mostrar": "monto"}},
                      {"id": "c_nota", "fila": "f_nota", "columna": "a", "contenido": {"tipo": "texto", "texto": "Nota"}}]}'::jsonb
$f$;

-- Pone una plantilla publicada en el origen (archiva la que había); nula, ninguna.
create or replace function pg_temp.rt_publicar(e jsonb, p_def jsonb) returns void language plpgsql as $f$
begin
  update public.plantillas_tarjeta set estado = 'archivada' where origen_id = (e ->> 'o')::uuid and estado = 'publicada';
  if p_def is null then return; end if;
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion, publicado_en)
  values ((e ->> 'o')::uuid, (select coalesce(max(version), 0) + 1 from public.plantillas_tarjeta where origen_id = (e ->> 'o')::uuid), 'publicada', p_def, now());
end $f$;

-- Una cotización viva de esa persona; una final lleva un vehículo.
create or replace function pg_temp.rt_cot(p_quien uuid, e jsonb, p_clase text default 'preventa') returns uuid language plpgsql as $f$
declare v_c uuid; v_v uuid;
begin
  if p_clase = 'final' then
    insert into public.vehiculos (origen_id, titulo, marca, creado_por) values ((e ->> 'o')::uuid, 'RT vehículo', 'toyota', p_quien) returning id into v_v;
  end if;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, clase, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_clase::public.clase_cotizacion, v_v, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

create or replace function pg_temp.rt_version(p_c uuid) returns timestamptz language sql as $f$ select actualizado_en from public.cotizaciones where id = p_c $f$;

-- Retocar como esa persona con la versión que se dé (por omisión, la vigente).
create or replace function pg_temp.rt_retocar(p_quien uuid, p_c uuid, p_retoques jsonb, p_version timestamptz default 'infinity') returns jsonb language sql as $f$
  select pg_temp.rt_corre(p_quien, format('select public.cotizacion_retocar_tarjeta(%L, %L::timestamptz, %L::jsonb)', p_c,
                                          case when p_version = 'infinity' then pg_temp.rt_version(p_c) else p_version end, p_retoques));
$f$;

-- Lo que dice `validar_retoques`: «válida» o «regla@donde» (un error que no es 22023 sube tal cual).
create or replace function pg_temp.rt_veredicto(p_retoques jsonb, p_plantilla jsonb) returns text language plpgsql as $f$
declare v_d text; v_h text;
begin
  perform public.validar_retoques(p_retoques, p_plantilla);
  return 'válida';
exception when sqlstate '22023' then
  get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint;
  return v_d || '@' || coalesce(v_h, '');
end $f$;

-- @test retoques R1: el juego común casos-de-retoques.json
do $$
declare j jsonb; c jsonb; v_esperado text; v_dio text; v_malos text[] := '{}'; v_n int := 0; v_reglas text[];
begin
  select doc into j from pg_temp._juego_de_retoques;
  if j is null then raise exception 'no se cargó casos-de-retoques.json'; end if;
  for c in select * from jsonb_array_elements(j -> 'casos') loop
    v_n := v_n + 1;
    if jsonb_typeof(c -> 'plantilla') = 'string' and not (j -> 'plantillas') ? (c ->> 'plantilla') then
      raise exception 'el caso «%» nombra una plantilla que no está', c ->> 'nombre';
    end if;
    v_esperado := case when c ? 'valida' then 'válida' else (c -> 'motivo' ->> 'regla') || '@' || (c -> 'motivo' ->> 'donde') end;
    v_dio := pg_temp.rt_veredicto(c -> 'retoques', j -> 'plantillas' -> (c ->> 'plantilla'));
    if v_dio is distinct from v_esperado then v_malos := v_malos || format('«%s»: esperaba %s y dio %s', c ->> 'nombre', v_esperado, v_dio); end if;
  end loop;
  if cardinality(v_malos) > 0 then raise exception '% de % casos no dan lo esperado: %', cardinality(v_malos), v_n, array_to_string(v_malos, ' | '); end if;
  v_reglas := array(select distinct x -> 'motivo' ->> 'regla' from jsonb_array_elements(j -> 'casos') x where x ? 'motivo' order by 1);
  if v_reglas is distinct from array['celda_inexistente', 'celda_no_es_texto', 'demasiado_grande', 'fila_inexistente', 'fila_repetida', 'forma', 'texto_largo'] then
    raise exception 'el juego no cubre todas las reglas: %', v_reglas;
  end if;
  if not exists (select 1 from jsonb_array_elements(j -> 'casos') x where x ? 'valida') then raise exception 'el juego no tiene un caso válido'; end if;
  if jsonb_typeof(j -> 'octetos') is distinct from 'array' or jsonb_array_length(j -> 'octetos') = 0 then raise exception 'el juego no trae octetos'; end if;
  for c in select * from jsonb_array_elements(j -> 'octetos') loop
    if octet_length((c -> 'valor')::text) is distinct from (c ->> 'bytes')::int then
      v_malos := v_malos || format('%s: esperaba %s bytes y son %s', (c -> 'valor')::text, c ->> 'bytes', octet_length((c -> 'valor')::text));
    end if;
  end loop;
  if cardinality(v_malos) > 0 then raise exception 'octetos que no dan lo esperado: %', array_to_string(v_malos, ' | '); end if;
  -- SQL nulo: lo que la RPC no manda al validador; si llega, es `forma`.
  if pg_temp.rt_veredicto(null, null) is distinct from 'forma@retoques' then raise exception 'nulo no es forma: %', pg_temp.rt_veredicto(null, null); end if;
end $$;

-- @test retoques R2: la preventa la retoca quien ve y edita; quien sólo ve, no
begin;
do $$
declare
  e jsonb := pg_temp.rt_origen(); asesora uuid; solo_ve uuid; c uuid; r jsonb; v0 timestamptz;
begin
  asesora := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  solo_ve := pg_temp.rt_persona(array['cotizaciones.ver']);
  perform pg_temp.rt_publicar(e, pg_temp.rt_cuadricula());
  c := pg_temp.rt_cot(asesora, e);
  v0 := pg_temp.rt_version(c);

  r := pg_temp.rt_retocar(solo_ve, c, '{"celdas": {"c_saludo": "Para Juan"}}');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien sólo ve retocó: %', r; end if;
  if (select tarjeta_retoques from public.cotizaciones where id = c) is not null then raise exception 'un rechazo dejó retoques'; end if;

  r := pg_temp.rt_retocar(asesora, c, '{"celdas": {"c_saludo": "Para Juan"}, "filas_ocultas": ["f_nota"]}');
  if r ? 'error' then raise exception 'la asesora no retocó su preventa: %', r; end if;
  if array(select k from jsonb_object_keys(r) k order by k) is distinct from array['actualizado_en', 'repetido', 'retoques'] then raise exception 'la respuesta no trae sus claves: %', r; end if;
  if (r ->> 'repetido')::boolean or r -> 'retoques' is distinct from '{"celdas": {"c_saludo": "Para Juan"}, "filas_ocultas": ["f_nota"]}'::jsonb then raise exception 'la respuesta no trae lo guardado: %', r; end if;
  if (r ->> 'actualizado_en')::timestamptz is distinct from pg_temp.rt_version(c) or pg_temp.rt_version(c) <= v0 then raise exception 'la versión no se movió o no es la devuelta: %', r; end if;
  if (select tarjeta_retoques from public.cotizaciones where id = c) is distinct from r -> 'retoques' then raise exception 'la columna no quedó con los retoques'; end if;
end $$;
rollback;

-- @test retoques R3: la final la retoca quien gestiona finales; quien sólo edita, no
begin;
do $$
declare
  e jsonb := pg_temp.rt_origen(); duena uuid; editor uuid; c uuid; r jsonb;
begin
  duena := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.final.gestionar']);
  editor := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  perform pg_temp.rt_publicar(e, pg_temp.rt_cuadricula());
  c := pg_temp.rt_cot(editor, e, 'final');

  r := pg_temp.rt_retocar(editor, c, '{"celdas": {"c_saludo": "Para Juan"}}');
  if r ->> 'error' is distinct from '42501' then raise exception 'quien edita sin gestionar finales retocó una final: %', r; end if;
  r := pg_temp.rt_retocar(duena, c, '{"celdas": {"c_saludo": "Para Juan"}}');
  if r ? 'error' then raise exception 'quien gestiona finales no retocó la final: %', r; end if;
end $$;
rollback;

-- @test retoques R4: la papelera, lo que no existe y lo que no se ve dan el mismo 42501; sin la versión, el error de siempre
begin;
do $$
declare
  e jsonb := pg_temp.rt_origen(); duena uuid; propios uuid; c uuid; c_ajena uuid; r jsonb;
begin
  duena := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  propios := pg_temp.rt_persona(array['cotizaciones.ver:propios', 'cotizaciones.editar:propios']);
  perform pg_temp.rt_publicar(e, pg_temp.rt_cuadricula());
  c := pg_temp.rt_cot(duena, e);
  c_ajena := pg_temp.rt_cot(duena, e);

  r := pg_temp.rt_retocar(propios, c_ajena, '{}');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'la que no se ve: %', r; end if;
  r := pg_temp.rt_retocar(duena, gen_random_uuid(), '{}', now());
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'la que no existe: %', r; end if;
  r := pg_temp.rt_corre(duena, format('select public.cotizacion_retocar_tarjeta(%L, null::timestamptz, ''{}''::jsonb)', c));
  if r ->> 'mensaje' is distinct from 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' then raise exception 'sin la versión: %', r; end if;
  r := pg_temp.rt_corre(duena, 'select public.cotizacion_retocar_tarjeta(null, now(), ''{}''::jsonb)');
  if r ->> 'error' is distinct from '22023' then raise exception 'sin el id: %', r; end if;
  update public.cotizaciones set eliminado_en = now() where id = c;
  r := pg_temp.rt_retocar(duena, c, '{"celdas": {"c_saludo": "x"}}');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'la de la papelera: %', r; end if;
end $$;
rollback;

-- @test retoques R5: el PT409 nombra a quien cambió la cotización, retocando o guardando, y nada cambia
begin;
do $$
declare
  e jsonb := pg_temp.rt_origen(); a uuid; b uuid; c uuid; r jsonb; v0 timestamptz; v1 timestamptz;
begin
  a := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.editar'], 'Ana Retoques');
  b := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.editar'], 'Beto Guarda');
  perform pg_temp.rt_publicar(e, pg_temp.rt_cuadricula());
  c := pg_temp.rt_cot(a, e);
  v0 := pg_temp.rt_version(c);

  r := pg_temp.rt_retocar(a, c, '{"celdas": {"c_saludo": "De Ana"}}', v0);
  if r ? 'error' then raise exception 'A no retocó: %', r; end if;
  v1 := pg_temp.rt_version(c);
  -- B retoca con la vieja.
  r := pg_temp.rt_retocar(b, c, '{"celdas": {"c_saludo": "De Beto"}}', v0);
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' not like 'Ana Retoques cambió esta cotización %' then raise exception 'B retocó con la vieja sin el PT409 que nombra a A: %', r; end if;
  if (select tarjeta_retoques -> 'celdas' ->> 'c_saludo' from public.cotizaciones where id = c) is distinct from 'De Ana' or pg_temp.rt_version(c) <> v1 then raise exception 'el PT409 cambió la fila'; end if;
  -- B guarda con la vieja: el mismo PT409 (la versión se mira antes que las entradas).
  r := pg_temp.rt_corre(b, format('select public.cotizacion_guardar(%L, %L, %L::timestamptz, ''{}''::jsonb, null, null, null, null, false)', c, gen_random_uuid(), v0));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' not like 'Ana Retoques cambió esta cotización %' then raise exception 'B guardó con la vieja sin el PT409 que nombra a A: %', r; end if;
  -- Quien retocó, con su versión vieja: «desde otra ventana».
  r := pg_temp.rt_retocar(a, c, '{}', v0);
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' not like 'Cambiaste esta cotización %' then raise exception 'A con la vieja no dio «desde otra ventana»: %', r; end if;

  -- Al revés: B cambia la cotización (lo que deja guardar en la actividad) y A retoca con la que tenía.
  perform set_config('request.jwt.claim.sub', b::text, true);
  update public.cotizaciones set notas = 'De Beto' where id = c;
  r := pg_temp.rt_retocar(a, c, '{"celdas": {"c_saludo": "Otra de Ana"}}', v1);
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' not like 'Beto Guarda cambió esta cotización %' then raise exception 'A retocó con la vieja sin el PT409 que nombra a B: %', r; end if;
  if (select tarjeta_retoques -> 'celdas' ->> 'c_saludo' from public.cotizaciones where id = c) is distinct from 'De Ana' then raise exception 'el PT409 pisó los retoques'; end if;
end $$;
rollback;

-- @test retoques R6: valida contra lo que se dibuja: la cuadrícula publicada, la forma 1 convertida o ninguna
begin;
do $$
declare
  e jsonb := pg_temp.rt_origen(); a uuid; c uuid; r jsonb; t jsonb; v_id text;
begin
  a := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  c := pg_temp.rt_cot(a, e);

  perform pg_temp.rt_publicar(e, pg_temp.rt_cuadricula());
  r := pg_temp.rt_retocar(a, c, '{"celdas": {"c_otra": "x"}}');
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'celda_inexistente' or r ->> 'hint' is distinct from 'celdas.c_otra'
     or r ->> 'mensaje' is distinct from 'La celda «c_otra» ya no está en la plantilla.' then raise exception 'una celda que no está: %', r; end if;
  r := pg_temp.rt_retocar(a, c, '{"celdas": {"c_monto": "x"}}');
  if r ->> 'detail' is distinct from 'celda_no_es_texto' or r ->> 'hint' is distinct from 'celdas.c_monto' then raise exception 'una celda de dato: %', r; end if;
  r := pg_temp.rt_retocar(a, c, '{"filas_ocultas": ["f_nota", "f_nota"]}');
  if r ->> 'detail' is distinct from 'fila_repetida' or r ->> 'hint' is distinct from 'filas_ocultas.f_nota' then raise exception 'una fila repetida: %', r; end if;
  r := pg_temp.rt_retocar(a, c, '{"celdas": {"c_nota": "Gracias"}, "filas_ocultas": ["f_titulo"]}');
  if r ? 'error' then raise exception 'unos retoques buenos contra la cuadrícula: %', r; end if;

  -- Una forma 1: vale lo que da su conversión (el texto de una celda de texto que `cotizacion_tarjeta` dibuja).
  perform pg_temp.rt_publicar(e, '{"grupos": [{"grupo": "g1"}], "total": {"etiqueta": "Total"}, "logo": false, "columnas": {"leyenda": false, "tipo_cambio": false, "plazo": false}}');
  t := pg_temp.rt_corre(a, format('select public.cotizacion_tarjeta(%L)', e ->> 'f'));
  if t ->> 'estado' is distinct from 'lista' then raise exception 'la forma 1 no se dibuja: %', t; end if;
  select x ->> 'id' into v_id from jsonb_array_elements(t -> 'definicion' -> 'celdas') x where x -> 'contenido' ->> 'tipo' = 'texto' limit 1;
  if v_id is null then raise exception 'la conversión no tiene una celda de texto: %', t -> 'definicion'; end if;
  r := pg_temp.rt_retocar(a, c, jsonb_build_object('celdas', jsonb_build_object(v_id, 'De la conversión')));
  if r ? 'error' then raise exception 'un id de la conversión no pasa: %', r; end if;
  r := pg_temp.rt_retocar(a, c, '{"celdas": {"c_saludo": "x"}}');
  if r ->> 'detail' is distinct from 'celda_inexistente' then raise exception 'la celda de la cuadrícula archivada pasa contra la forma 1: %', r; end if;

  -- Sin plantilla publicada: la tarjeta por omisión no tiene textos.
  perform pg_temp.rt_publicar(e, null);
  r := pg_temp.rt_retocar(a, c, jsonb_build_object('celdas', jsonb_build_object(v_id, 'x')));
  if r ->> 'detail' is distinct from 'celda_inexistente' then raise exception 'sin plantilla, una celda pasa: %', r; end if;
  r := pg_temp.rt_retocar(a, c, null);
  if r ? 'error' or r -> 'retoques' <> 'null'::jsonb then raise exception 'sin plantilla no se vuelve a la plantilla: %', r; end if;
end $$;
rollback;

-- @test retoques R7: nulo, vacío y celdas vacías dejan la columna nula; lo mismo otra vez no escribe
begin;
do $$
declare
  e jsonb := pg_temp.rt_origen(); a uuid; c uuid; r jsonb; v timestamptz; n bigint;
  bueno constant jsonb := '{"celdas": {"c_saludo": "Para Juan"}, "filas_ocultas": ["f_nota"]}';
begin
  a := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  perform pg_temp.rt_publicar(e, pg_temp.rt_cuadricula());
  c := pg_temp.rt_cot(a, e);

  perform pg_temp.rt_retocar(a, c, bueno);
  r := pg_temp.rt_retocar(a, c, null);
  if r ? 'error' or (r ->> 'repetido')::boolean or (select tarjeta_retoques from public.cotizaciones where id = c) is not null then raise exception 'nulo no vuelve a la plantilla: %', r; end if;
  perform pg_temp.rt_retocar(a, c, bueno);
  r := pg_temp.rt_retocar(a, c, '{}');
  if r ? 'error' or (select tarjeta_retoques from public.cotizaciones where id = c) is not null then raise exception '{} no vuelve a la plantilla: %', r; end if;
  perform pg_temp.rt_retocar(a, c, bueno);
  r := pg_temp.rt_retocar(a, c, '{"celdas": {}, "filas_ocultas": []}');
  if r ? 'error' or (select tarjeta_retoques from public.cotizaciones where id = c) is not null then raise exception 'celdas y filas vacías no vuelven a la plantilla: %', r; end if;
  -- Sólo lo que no está vacío se guarda.
  r := pg_temp.rt_retocar(a, c, '{"celdas": {}, "filas_ocultas": ["f_nota"]}');
  if (select tarjeta_retoques from public.cotizaciones where id = c) is distinct from '{"filas_ocultas": ["f_nota"]}'::jsonb then raise exception 'las celdas vacías se guardaron: %', r; end if;

  -- Lo mismo otra vez: ni versión, ni revisión, ni actividad.
  perform pg_temp.rt_retocar(a, c, bueno);
  v := pg_temp.rt_version(c);
  n := (select max(id) from public.cotizaciones_revisiones where cotizacion_id = c);
  r := pg_temp.rt_retocar(a, c, bueno);
  if r ? 'error' or not (r ->> 'repetido')::boolean or (r ->> 'actualizado_en')::timestamptz <> v then raise exception 'lo mismo otra vez no es repetido: %', r; end if;
  if pg_temp.rt_version(c) <> v or (select max(id) from public.cotizaciones_revisiones where cotizacion_id = c) <> n then raise exception 'lo mismo otra vez movió la versión o dejó una revisión'; end if;
  perform pg_temp.rt_retocar(a, c, null);
  v := pg_temp.rt_version(c);
  r := pg_temp.rt_retocar(a, c, '{}');
  if not (r ->> 'repetido')::boolean or pg_temp.rt_version(c) <> v then raise exception '{} sobre nada no es repetido: %', r; end if;
end $$;
rollback;

-- @test retoques R8: la revisión guarda cantidades de quien retoca; quien sólo ve la lee; la actividad nombra a quien retocó
begin;
do $$
declare
  e jsonb := pg_temp.rt_origen(); a uuid; solo_ve uuid; c uuid; r jsonb; rv record;
begin
  a := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  solo_ve := pg_temp.rt_persona(array['cotizaciones.ver']);
  perform pg_temp.rt_publicar(e, pg_temp.rt_cuadricula());
  c := pg_temp.rt_cot(a, e);

  perform pg_temp.rt_retocar(a, c, '{"celdas": {"c_saludo": "Para Juan"}, "filas_ocultas": ["f_nota"]}');
  select * into rv from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if rv.usuario_id is distinct from a then raise exception 'la revisión no es de quien retocó'; end if;
  if array(select k from jsonb_object_keys(rv.diff) k order by k) is distinct from array['tarjeta_retoques'] then raise exception 'la revisión trae otras columnas: %', rv.diff; end if;
  if rv.diff -> 'tarjeta_retoques' is distinct from '{"de": null, "a": {"celdas": 1, "filas_ocultas": 1}}'::jsonb then raise exception 'la revisión no trae cantidades: %', rv.diff; end if;
  if jsonb_path_exists(rv.diff, '$.** ? (@ == "Para Juan")') or jsonb_path_exists(rv.diff, '$.** ? (@ == "f_nota")') then raise exception 'la revisión guardó los textos'; end if;

  perform pg_temp.rt_retocar(a, c, null);
  select * into rv from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if rv.diff -> 'tarjeta_retoques' is distinct from '{"de": {"celdas": 1, "filas_ocultas": 1}, "a": null}'::jsonb then raise exception 'volver a la plantilla no deja su revisión: %', rv.diff; end if;

  r := pg_temp.rt_corre(solo_ve, format('select public.cotizacion_revisiones(%L)', c));
  if jsonb_path_query_first(r, '$.revisiones[0].diff.tarjeta_retoques') is distinct from '{"de": {"celdas": 1, "filas_ocultas": 1}, "a": null}'::jsonb then
    raise exception 'quien sólo ve no lee la revisión de los retoques: %', r;
  end if;
  if (select x.actor_id from public.actividad x where x.tabla = 'cotizaciones' and x.registro_id = c::text order by x.id desc limit 1) is distinct from a then
    raise exception 'la actividad no nombra a quien retocó';
  end if;
end $$;
rollback;

-- @test retoques R9: cotizar encima se lleva los retoques
begin;
do $$
declare
  e jsonb := pg_temp.rt_origen(); a uuid; c uuid; n uuid := gen_random_uuid(); r jsonb;
  bueno constant jsonb := '{"celdas": {"c_saludo": "Para Juan"}, "filas_ocultas": ["f_nota"]}';
begin
  a := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.crear', 'cotizaciones.crear.sin_lead', 'cotizaciones.crear.sin_vehiculo']);
  perform pg_temp.rt_publicar(e, pg_temp.rt_cuadricula());
  c := pg_temp.rt_cot(a, e);
  perform pg_temp.rt_retocar(a, c, bueno);
  r := pg_temp.rt_corre(a, format('select public.cotizacion_encima(%L, %L)', n, c));
  if r ? 'error' then raise exception 'no se cotizó encima: %', r; end if;
  if (select tarjeta_retoques from public.cotizaciones where id = n) is distinct from bueno then raise exception 'la versión nueva no se llevó los retoques'; end if;
  if r -> 'cotizacion' -> 'tarjeta_retoques' is distinct from bueno then raise exception 'la respuesta de encima no trae los retoques: %', r -> 'cotizacion'; end if;
end $$;
rollback;

-- @test retoques R10: la hoja de una guardada trae los retoques en la cotización
begin;
do $$
declare
  e jsonb := pg_temp.rt_origen(); a uuid; c uuid; r jsonb;
begin
  a := pg_temp.rt_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  perform pg_temp.rt_publicar(e, pg_temp.rt_cuadricula());
  c := pg_temp.rt_cot(a, e);
  r := pg_temp.rt_corre(a, format('select public.cotizacion_hoja_guardada(%L)', c));
  if r ? 'error' or not (r -> 'cotizacion') ? 'tarjeta_retoques' or r -> 'cotizacion' -> 'tarjeta_retoques' <> 'null'::jsonb then raise exception 'sin retoques, la hoja no trae la columna nula: %', r -> 'cotizacion'; end if;
  perform pg_temp.rt_retocar(a, c, '{"filas_ocultas": ["f_nota"]}');
  r := pg_temp.rt_corre(a, format('select public.cotizacion_hoja_guardada(%L)', c));
  if r -> 'cotizacion' -> 'tarjeta_retoques' is distinct from '{"filas_ocultas": ["f_nota"]}'::jsonb then raise exception 'la hoja no trae los retoques: %', r -> 'cotizacion'; end if;
end $$;
rollback;

-- @test retoques R11: la RPC es definer con search_path vacío y el candado de guardar; anon y PUBLIC no tienen nada; los ayudantes son de nadie
do $$
declare v_def text; v_f text;
begin
  select pg_get_functiondef(p.oid) into v_def from pg_proc p where p.oid = 'public.cotizacion_retocar_tarjeta(uuid, timestamptz, jsonb)'::regprocedure;
  if not (select p.prosecdef from pg_proc p where p.oid = 'public.cotizacion_retocar_tarjeta(uuid, timestamptz, jsonb)'::regprocedure) then raise exception 'la RPC no es definer'; end if;
  if v_def not like '%SET search_path TO ''''%' then raise exception 'la RPC no fija search_path vacío'; end if;
  if v_def not like '%for no key update%' then raise exception 'la RPC no toma la fila con el candado de guardar'; end if;
  foreach v_f in array array['public.cotizacion_retocar_tarjeta(uuid, timestamptz, jsonb)', 'public.validar_retoques(jsonb, jsonb)'] loop
    if has_function_privilege('anon', v_f, 'execute') or has_function_privilege('public', v_f, 'execute') then raise exception '% la ejecuta anon o PUBLIC', v_f; end if;
    if not has_function_privilege('authenticated', v_f, 'execute') then raise exception '% no la ejecuta authenticated', v_f; end if;
  end loop;
  foreach v_f in array array['public._retoques_normalizados(jsonb)', 'public._retoques_resumen(jsonb)'] loop
    if has_function_privilege('anon', v_f, 'execute') or has_function_privilege('authenticated', v_f, 'execute') or has_function_privilege('public', v_f, 'execute') then
      raise exception '% la ejecuta alguien de la app', v_f;
    end if;
  end loop;
  if not has_column_privilege('authenticated', 'public.cotizaciones', 'tarjeta_retoques', 'select') then raise exception 'authenticated no lee tarjeta_retoques'; end if;
  if has_column_privilege('authenticated', 'public.cotizaciones', 'tarjeta_retoques', 'update') or has_column_privilege('authenticated', 'public.cotizaciones', 'tarjeta_retoques', 'insert') then
    raise exception 'authenticated escribe tarjeta_retoques directo';
  end if;
end $$;
