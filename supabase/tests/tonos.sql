-- El catálogo de colores de la empresa (nombre técnico heredado: `tonos`): la semilla, el contraste AA contra `color.ts`, crear y guardar por hex
-- (la hoja se deriva en la base: `_color_derivar`, probado contra TS en `areas/diseno/colores.sql`), eliminar por RPC, y que un color que una versión de
-- una fórmula nombra no se elimine. Corre después de `humo.sql`: la dueña es
-- `…0001`; `…00b1` es una persona sin `cotizaciones.configurar`.
-- `scripts/probar-schema.mjs` carga antes `supabase/tests/corpus-de-contraste.json` en `_corpus_de_contraste` (lo genera TS con `contraste()`).
-- Cada bloque deja la base como la encontró.

create or replace function pg_temp.falla(p_sql text, p_estado text, p_texto text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'no falló: %', p_sql;
exception when others then
  if sqlstate <> p_estado or position(p_texto in sqlerrm) = 0 then
    raise exception '% debía fallar con % y «%», falló con % y «%»', p_sql, p_estado, p_texto, sqlstate, sqlerrm;
  end if;
end $$;

-- @test tonos: la semilla es la del corpus (calculada con los tokens), su hex es su fondo claro y pasa AA en claro y en oscuro
do $$
declare t jsonb; r record;
begin
  for t in select x from _corpus_de_contraste c, jsonb_array_elements(c.doc -> 'tonos') x loop
    select * into r from public.tonos where clave = t ->> 'clave';
    if not found then raise exception 'falta el tono de fábrica «%»', t ->> 'clave'; end if;
    if (r.nombre, r.claro_fondo, r.claro_borde, r.claro_tinta, r.oscuro_fondo, r.oscuro_borde, r.oscuro_tinta) is distinct from
       (t ->> 'nombre', t -> 'claro' ->> 'fondo', t -> 'claro' ->> 'borde', t -> 'claro' ->> 'tinta',
        t -> 'oscuro' ->> 'fondo', t -> 'oscuro' ->> 'borde', t -> 'oscuro' ->> 'tinta') then
      raise exception 'el tono «%» no es el del corpus: %', r.clave, to_jsonb(r);
    end if;
    if r.hex is distinct from t -> 'claro' ->> 'fondo' then raise exception 'el hex de «%» no es su fondo claro: %', r.clave, r.hex; end if;
    if public._color_contraste(r.claro_tinta, r.claro_fondo) < 4.5 or public._color_contraste(r.oscuro_tinta, r.oscuro_fondo) < 4.5 then
      raise exception 'el tono «%» no pasa AA', r.clave; end if;
  end loop;
  if (select count(*) from public.tonos where clave in ('amarillo', 'verde', 'naranja')) <> 3 then raise exception 'faltan tonos de fábrica'; end if;
  if public._tonos_tope() <> 48 then raise exception 'el tope: %', public._tonos_tope(); end if;
end $$;

-- @test tonos: _color_contraste da lo mismo que contraste() de color.ts en los 360 pares del corpus, y decide igual el umbral
do $$
declare p jsonb; v_n int := 0; v_raz float8;
begin
  for p in select x from _corpus_de_contraste c, jsonb_array_elements(c.doc -> 'pares') x loop
    v_raz := public._color_contraste(p ->> 'a', p ->> 'b');
    if abs(v_raz - (p ->> 'razon')::float8) > 1e-9 then raise exception 'el par % / %: base % contra TS %', p ->> 'a', p ->> 'b', v_raz, p ->> 'razon'; end if;
    if (v_raz >= 4.5) is distinct from (p ->> 'aa')::boolean then raise exception 'el par % / % decide distinto', p ->> 'a', p ->> 'b'; end if;
    if abs(public._color_contraste(p ->> 'b', p ->> 'a') - v_raz) > 1e-12 then raise exception 'el orden de los colores importa'; end if;
    v_n := v_n + 1;
  end loop;
  if v_n < 300 then raise exception 'el corpus trae % pares', v_n; end if;
  -- El umbral es «mayor o igual a 4,5»: exacto, un poco menos y un poco más.
  if not public._contraste_aa(4.5) or public._contraste_aa(4.5 - 1e-12) or not public._contraste_aa(4.5 + 1e-12) or public._contraste_aa(1) or not public._contraste_aa(21) then
    raise exception 'el umbral del AA no es 4,5 inclusive'; end if;
  if abs(public._color_contraste('#000000', '#ffffff') - 21) > 1e-9 or public._color_contraste('#3b5bdb', '#3b5bdb') <> 1 then raise exception 'los extremos'; end if;
end $$;

-- @test tonos: la dueña crea por hex, el reintento no duplica, la clave sale del nombre (con tildes), el nombre no se repite, el hex se valida y la hoja es la derivada
do $$
declare r jsonb; v_id uuid := gen_random_uuid(); v_otro uuid := gen_random_uuid(); v_h text; t public.tonos;
  v_teal jsonb := public._color_derivar('#31869b');   -- el ayudante no es de authenticated: se calcula antes de tomar su rol
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  r := public.tono_crear(v_id, '   Logística   y  más ', '#31869b');
  if (select clave || '|' || nombre || '|' || hex from public.tonos where id = v_id) <> 'logistica_y_mas|Logística y más|#31869b' then
    raise exception 'la clave, el nombre o el hex: %', (select clave || '|' || nombre || '|' || hex from public.tonos where id = v_id); end if;
  if (r ->> 'repetido')::boolean then raise exception 'la primera vez no es un reintento'; end if;
  -- La hoja guardada es la derivada del hex, en las seis columnas.
  select * into t from public.tonos where id = v_id;
  if jsonb_build_object('claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                        'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) <> v_teal then
    raise exception 'la hoja no es la derivada: %', to_jsonb(t); end if;
  r := public.tono_crear(v_id, 'Logística y más', '#000000');
  if not (r ->> 'repetido')::boolean or (select count(*) from public.tonos where id = v_id) <> 1 then raise exception 'el reintento duplicó'; end if;
  if (r -> 'lista' ->> 'tope')::int <> 48 then raise exception 'la lista de vuelta: %', r; end if;
  if (select x ->> 'hex' from jsonb_array_elements(r -> 'lista' -> 'tonos') x where x ->> 'id' = v_id::text) is distinct from '#31869b' then
    raise exception 'la lista de vuelta no trae el hex: %', r; end if;

  perform pg_temp.falla(format($f$select public.tono_crear(%L, '  LOGÍSTICA Y MÁS ', '#31869b')$f$, v_otro), '23505', 'Ya hay un color «LOGÍSTICA Y MÁS»');
  perform pg_temp.falla($f$select public.tono_crear(gen_random_uuid(), '', '#31869b')$f$, '22023', 'Escribe el nombre del color.');
  perform pg_temp.falla(format($f$select public.tono_crear(gen_random_uuid(), %L, '#31869b')$f$, repeat('x', 41)), '22023', 'El nombre del color admite hasta 40 caracteres.');
  perform pg_temp.falla($f$select public.tono_crear(null, 'Otro', '#31869b')$f$, '22023', 'identificador');
  -- Hex mal escrito: tres cifras, un nombre de color, una letra que no es hexadecimal, nulo.
  perform pg_temp.falla($f$select public.tono_crear(gen_random_uuid(), 'Otro', '#fff')$f$, '22023', 'Escríbelo como #rrggbb, por ejemplo #31869b.');
  perform pg_temp.falla($f$select public.tono_crear(gen_random_uuid(), 'Otro', 'rojo')$f$, '22023', 'Escríbelo como #rrggbb');
  perform pg_temp.falla($f$select public.tono_crear(gen_random_uuid(), 'Otro', '#12345g')$f$, '22023', 'Escríbelo como #rrggbb');
  perform pg_temp.falla($f$select public.tono_crear(gen_random_uuid(), 'Otro', null)$f$, '22023', 'Escríbelo como #rrggbb');
  begin
    perform public.tono_crear(gen_random_uuid(), 'Otro', '#fff');
  exception when others then
    get stacked diagnostics v_h = pg_exception_hint;
  end;
  if v_h is distinct from 'hex' then raise exception 'el hint del hex: %', v_h; end if;
  begin
    perform public.tono_crear(gen_random_uuid(), 'Logística y más', '#31869b');
  exception when others then
    get stacked diagnostics v_h = pg_exception_hint;
  end;
  if v_h is distinct from 'nombre' then raise exception 'el hint del nombre repetido: %', v_h; end if;
  -- Mayúsculas y espacios: se normalizan.
  perform public.tono_crear(v_otro, 'Mayúsculas', '  #FFF7D6 ');
  if (select hex || claro_fondo from public.tonos where id = v_otro) <> '#fff7d6#fff7d6' then raise exception 'no normalizó el hex'; end if;
  reset role;
  delete from public.tonos where id in (v_id, v_otro);
end $$;

-- @test tonos: el tope de 48 (se llena con los de prueba y se revierte)
do $$
declare v_n int; i int;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  select count(*) into v_n from public.tonos;
  for i in 1 .. 48 - v_n loop
    perform public.tono_crear(gen_random_uuid(), 'Relleno ' || i, '#31869b');
  end loop;
  if (select count(*) from public.tonos) <> 48 then raise exception 'no llegó a 48'; end if;
  perform pg_temp.falla($f$select public.tono_crear(gen_random_uuid(), 'Uno de más', '#31869b')$f$, '22023', 'Ya hay 48 colores, que es el máximo. Elimina uno que ningún grupo use.');
  reset role;
  delete from public.tonos where nombre like 'Relleno %';
end $$;

-- @test tonos: guardar renombra sin cambiar la clave; un hex distinto deriva de nuevo la hoja y mueve la versión; el mismo hex no deriva; colores y clave se rechazan; una versión vieja es PT409
do $$
declare r jsonb; v_id uuid := gen_random_uuid(); v_ver timestamptz; v_h text; t public.tonos;
  v_teal jsonb := public._color_derivar('#31869b'); v_violeta jsonb := public._color_derivar('#7048e8');   -- antes de tomar el rol de authenticated
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  r := public.tono_crear(v_id, 'Marrón', '#31869b');
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  perform pg_temp.falla(format($f$select public.tono_guardar(%L, null, '{"nombre": "X"}')$f$, v_id), 'P0001', 'Falta la versión');
  -- El nombre conserva el hex y la hoja.
  r := public.tono_guardar(v_id, v_ver, '{"nombre": "Café"}');
  select * into t from public.tonos where id = v_id;
  if t.clave || '|' || t.nombre || '|' || t.hex <> 'marron|Café|#31869b' then raise exception 'la clave cambió, no se renombró o cambió el hex: %', to_jsonb(t); end if;
  if t.claro_fondo <> v_teal -> 'claro' ->> 'fondo' then raise exception 'renombrar tocó la hoja'; end if;
  if (r ->> 'actualizado_en')::timestamptz = v_ver then raise exception 'no movió la versión'; end if;
  perform pg_temp.falla(format($f$select public.tono_guardar(%L, %L, '{"nombre": "Otra vez"}')$f$, v_id, v_ver), 'PT409', 'Otra persona cambió este color mientras lo editabas.');
  -- Un hex distinto deriva de nuevo las seis columnas y mueve la versión.
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  r := public.tono_guardar(v_id, v_ver, '{"hex": "#7048E8"}');
  select * into t from public.tonos where id = v_id;
  if t.hex <> '#7048e8' or jsonb_build_object('claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                        'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) <> v_violeta then
    raise exception 'el hex nuevo no derivó la hoja: %', to_jsonb(t); end if;
  if (r ->> 'actualizado_en')::timestamptz = v_ver then raise exception 'cambiar el hex no movió la versión'; end if;
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  perform pg_temp.falla(format($f$select public.tono_guardar(%L, %L, '{"hex": "#fff"}')$f$, v_id, v_ver), '22023', 'Escríbelo como #rrggbb, por ejemplo #31869b.');
  perform pg_temp.falla(format($f$select public.tono_guardar(%L, %L, '{"hex": 12}')$f$, v_id, v_ver), '22023', 'Escríbelo como #rrggbb');
  perform pg_temp.falla(format($f$select public.tono_guardar(%L, %L, '{"clave": "otra"}')$f$, v_id, v_ver), '22023', 'no se cambia');
  perform pg_temp.falla(format($f$select public.tono_guardar(%L, %L, '{"colores": {}}')$f$, v_id, v_ver), '22023', 'El dato «colores» de un color no se cambia.');
  begin
    perform public.tono_guardar(v_id, v_ver, '{"colores": {}}');
  exception when others then
    get stacked diagnostics v_h = pg_exception_hint;
  end;
  if v_h is distinct from 'colores' then raise exception 'el hint de colores: %', v_h; end if;
  perform pg_temp.falla(format($f$select public.tono_guardar(%L, %L, '{"nombre": "verde"}')$f$, v_id, v_ver), '23505', 'Ya hay un color «verde».');
  -- El mismo hex no vuelve a derivar: unos colores de hoja que no son los derivados (como los de un color migrado) se conservan.
  reset role;
  update public.tonos set claro_borde = '#e9d27a' where id = v_id returning actualizado_en into v_ver;
  set local role authenticated;
  r := public.tono_guardar(v_id, v_ver, '{"hex": "#7048e8", "nombre": "Café oscuro"}');
  if (select claro_borde from public.tonos where id = v_id) <> '#e9d27a' then raise exception 'el mismo hex volvió a derivar'; end if;
  reset role;
  delete from public.tonos where id = v_id;
end $$;

-- @test tonos: un tono que una versión de una fórmula nombra no se elimina (archivada, borrador o publicada); uno libre sí; la sonda mira todas
do $$
declare v_o uuid := (select id from public.origenes where clave = 'subasta_usa'); v_id uuid := gen_random_uuid(); v_ver timestamptz; r jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  v_ver := (public.tono_crear(v_id, 'Prueba de uso', '#31869b') ->> 'actualizado_en')::timestamptz;
  reset role;
  if public._tono_en_uso('prueba_de_uso') is not null then raise exception 'libre figura en uso'; end if;
  -- Una versión archivada, otra borrador: cada una por su lado.
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (v_o, 9001, 'archivada', '{"nodos": [], "grupos": [{"id": "g", "etiqueta": "G", "tono": "prueba_de_uso", "bucket": "b"}]}', '{}', '{}', '{}');
  if public._tono_en_uso('prueba_de_uso') is null then raise exception 'la archivada no cuenta'; end if;
  set local role authenticated;
  perform pg_temp.falla(format($f$select public.tono_eliminar(%L, %L)$f$, v_id, v_ver), '23503', '«Prueba de uso» lo usa la fórmula de «Subasta EE. UU.» (alguna de sus versiones): no se elimina. Cambia su nombre o su color.');
  reset role;
  delete from public.formulas where version = 9001 and origen_id = v_o;
  insert into public.formulas (origen_id, estado, definicion, params)
  values ((select id from public.origenes where clave <> 'subasta_usa' and not exists (select 1 from public.formulas f where f.origen_id = origenes.id and f.estado = 'borrador') limit 1),
          'borrador', '{"nodos": [], "grupos": [{"id": "g", "etiqueta": "G", "tono": "prueba_de_uso", "bucket": "b"}]}', '{}');
  if public._tono_en_uso('prueba_de_uso') is null then raise exception 'el borrador no cuenta'; end if;
  set local role authenticated;
  perform pg_temp.falla(format($f$select public.tono_eliminar(%L, %L)$f$, v_id, v_ver), '23503', 'no se elimina');
  reset role;
  delete from public.formulas where estado = 'borrador' and definicion::text like '%prueba_de_uso%';
  if public._tono_en_uso('prueba_de_uso') is not null then raise exception 'sigue en uso'; end if;
  set local role authenticated;
  perform pg_temp.falla(format($f$select public.tono_eliminar(%L, now() - interval '1 day')$f$, v_id), 'PT409', 'Otra persona');
  r := public.tono_eliminar(v_id, v_ver);
  reset role;
  if exists (select 1 from public.tonos where id = v_id) then raise exception 'no se eliminó'; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'lista' -> 'tonos') x where x ->> 'id' = v_id::text) then raise exception 'la lista de vuelta lo trae'; end if;
  perform pg_temp.falla(format($f$select public.tono_eliminar(%L, now() - interval '1 day')$f$, v_id), 'PT409', 'Ese color ya no existe.');
end $$;

-- @test tonos: sin cotizaciones.configurar no se crea, guarda ni elimina; nadie escribe directo; todos leen; los ayudantes no son de nadie
do $$
declare v_id uuid := (select id from public.tonos where clave = 'verde');
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  if (select count(*) from public.tonos) < 3 then raise exception 'la asesora no lee los tonos'; end if;
  perform pg_temp.falla($f$select public.tono_crear(gen_random_uuid(), 'Mío', '#31869b')$f$, '42501', 'cotizaciones.configurar');
  perform pg_temp.falla(format($f$select public.tono_guardar(%L, now() - interval '1 day', '{"nombre": "X"}')$f$, v_id), '42501', 'cotizaciones.configurar');
  perform pg_temp.falla(format($f$select public.tono_eliminar(%L, now() - interval '1 day')$f$, v_id), '42501', 'cotizaciones.configurar');
  perform pg_temp.falla($f$insert into public.tonos (clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
    values ('x', 'X', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000')$f$, '42501', 'tonos');
  perform pg_temp.falla(format($f$update public.tonos set hex = '#000000' where id = %L$f$, v_id), '42501', 'tonos');
  perform pg_temp.falla(format($f$update public.tonos set nombre = 'X' where id = %L$f$, v_id), '42501', 'tonos');
  reset role;
  -- Los ayudantes (los que no son RPC) no los ejecuta PUBLIC, anon ni authenticated.
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname in ('_color_luminancia', '_color_contraste', '_tonos_tope', '_tono_nombre', '_tono_clave', '_tono_colores',
                                                            '_tonos_de_grupos', '_tonos_del_diseno', '_tono_en_uso', '_tonos_lista', '_contraste_aa', 'tono_version',
                                                            '_color_mezclar', '_color_derivar', '_color_tinta_de_la_tarjeta', '_tono_hex')
                and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) then
    raise exception 'un ayudante de los tonos se puede ejecutar: %', (select string_agg(p.proname, ',') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('_color_luminancia', '_color_contraste', '_tono_en_uso', '_color_mezclar', '_color_derivar', '_color_tinta_de_la_tarjeta', '_tono_hex') and has_function_privilege('authenticated', p.oid, 'execute'));
  end if;
end $$;

-- @test tonos: _tono_colores decide el AA como el corpus en los dos temas (también pegado al umbral) y trunca la razón del mensaje a un decimal
do $$
declare
  p jsonb; t text; v_ok boolean; v_msg text; v_esp text; v_n int := 0; v_h text; v_rechazados int := 0;
begin
  for p in select x from _corpus_de_contraste c, jsonb_array_elements(c.doc -> 'pares') x where abs((x ->> 'razon')::float8 - 4.5) < 0.2 loop
    foreach t in array array['claro', 'oscuro'] loop
      v_ok := true; v_msg := null; v_h := null;
      begin
        perform public._tono_colores(case t
          when 'claro' then jsonb_build_object('claro', jsonb_build_object('fondo', p ->> 'b', 'borde', '#e9d27a', 'tinta', p ->> 'a'),
                                               'oscuro', jsonb_build_object('fondo', '#3e3f3c', 'borde', '#797251', 'tinta', '#f2f4f8'))
          else jsonb_build_object('claro', jsonb_build_object('fondo', '#fff7d6', 'borde', '#e9d27a', 'tinta', '#1b2130'),
                                  'oscuro', jsonb_build_object('fondo', p ->> 'b', 'borde', '#797251', 'tinta', p ->> 'a')) end);
      exception when others then
        v_ok := false;
        get stacked diagnostics v_msg = message_text, v_h = pg_exception_hint;
      end;
      if v_ok is distinct from (p ->> 'aa')::boolean then
        raise exception 'el par % / % en el tema %: la base % y color.ts %', p ->> 'a', p ->> 'b', t, v_ok, p ->> 'aa'; end if;
      if not v_ok then
        v_esp := replace(to_char(floor((p ->> 'razon')::numeric * 10) / 10, 'FM0.0'), '.', ',');
        if position('da ' || v_esp || ':1 y hace falta 4,5:1' in v_msg) = 0 or v_h is distinct from t then
          raise exception 'el mensaje del par % / % (%): % / %', p ->> 'a', p ->> 'b', t, v_msg, v_h; end if;
        v_rechazados := v_rechazados + 1;
      end if;
      v_n := v_n + 1;
    end loop;
  end loop;
  if v_n < 40 or v_rechazados < 10 or v_rechazados = v_n then raise exception 'el corpus no toca el umbral por los dos lados: % pares, % rechazados', v_n, v_rechazados; end if;
end $$;

-- @test tonos: guardar sin cambiar nada no mueve la versión
do $$
declare r jsonb; v_id uuid := gen_random_uuid(); v_ver timestamptz;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  v_ver := (public.tono_crear(v_id, 'Quieto', '#31869b') ->> 'actualizado_en')::timestamptz;
  r := public.tono_guardar(v_id, v_ver, '{"nombre": "Quieto"}');
  if (r ->> 'actualizado_en')::timestamptz <> v_ver then raise exception 'guardar lo mismo movió la versión'; end if;
  r := public.tono_guardar(v_id, v_ver, '{"hex": "#31869B"}');
  if (r ->> 'actualizado_en')::timestamptz <> v_ver then raise exception 'guardar el mismo hex movió la versión'; end if;
  reset role;
  delete from public.tonos where id = v_id;
end $$;
