-- Las operaciones de condición y de extremos en `evaluar_formula()` (docs/COTIZADOR.md › «El motor» › «La aritmética»): cada
-- comparador, la igualdad exacta en float8, Y y O, la rama que elige `elegir` (sólo su null pasa), MAX y MIN con un null en el medio
-- (null, no el extremo de los demás; nunca `greatest`) y `es_opcion` contra la variante por defecto y la elegida. Lo mismo, bit a bit
-- y con mezclas, lo cruza el corpus del motor (`corpus-del-motor.json`).

-- @test motor: los ayudantes de las funciones de Excel
-- `a`, `b`, `c`, `p` y `q` son campos del vehículo: el que no llega vale null (un input vacío vale 0).
create or replace function pg_temp.fx_def() returns jsonb language sql as $f$
  select jsonb_build_object(
    'buckets', '{"x": "tc"}'::jsonb,
    'nodos', jsonb_build_array(
      '{"id": "tc", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "TC", "formato": "raw"}'::jsonb,
      '{"id": "v", "tipo": "opcion", "etiqueta": "V", "por_defecto": "a", "opciones": [{"clave": "a", "etiqueta": "A", "titulo": "A"}, {"clave": "b", "etiqueta": "B", "titulo": "B"}]}'::jsonb,
      '{"id": "x", "tipo": "input", "etiqueta": "X"}'::jsonb,
      '{"id": "a", "tipo": "campo_vehiculo", "campo": "a", "etiqueta": "A", "formato": "raw"}'::jsonb,
      '{"id": "b", "tipo": "campo_vehiculo", "campo": "b", "etiqueta": "B", "formato": "raw"}'::jsonb,
      '{"id": "c", "tipo": "campo_vehiculo", "campo": "c", "etiqueta": "C", "formato": "raw"}'::jsonb,
      '{"id": "p", "tipo": "campo_vehiculo", "campo": "p", "etiqueta": "P", "formato": "raw"}'::jsonb,
      '{"id": "q", "tipo": "campo_vehiculo", "campo": "q", "etiqueta": "Q", "formato": "raw"}'::jsonb,
      '{"id": "pq", "tipo": "calculo", "op": "suma", "de": ["p", "q"], "etiqueta": "PQ"}'::jsonb,
      '{"id": "mayor", "tipo": "calculo", "op": "comparar", "de": ["a", "b"], "cmp": ">", "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "menor", "tipo": "calculo", "op": "comparar", "de": ["a", "b"], "cmp": "<", "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "mayor_igual", "tipo": "calculo", "op": "comparar", "de": ["a", "b"], "cmp": ">=", "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "menor_igual", "tipo": "calculo", "op": "comparar", "de": ["a", "b"], "cmp": "<=", "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "igual", "tipo": "calculo", "op": "comparar", "de": ["a", "b"], "cmp": "=", "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "distinto", "tipo": "calculo", "op": "comparar", "de": ["a", "b"], "cmp": "<>", "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "exacto", "tipo": "calculo", "op": "comparar", "de": ["pq", "c"], "cmp": "=", "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "es_a", "tipo": "calculo", "op": "es_opcion", "de": ["v"], "cmp": "=", "clave": "a", "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "no_es_a", "tipo": "calculo", "op": "es_opcion", "de": ["v"], "cmp": "<>", "clave": "a", "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "ambos", "tipo": "calculo", "op": "y", "de": ["mayor", "es_a"], "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "alguno", "tipo": "calculo", "op": "o", "de": ["igual", "no_es_a"], "etiqueta": "M", "formato": "raw"}'::jsonb,
      '{"id": "rama", "tipo": "calculo", "op": "elegir", "de": ["a", "b"], "prueba": "mayor", "etiqueta": "M"}'::jsonb,
      '{"id": "sin_otra", "tipo": "calculo", "op": "elegir", "de": ["c"], "prueba": "alguno", "etiqueta": "M"}'::jsonb,
      '{"id": "el_mayor", "tipo": "calculo", "op": "max", "de": ["a", "c", "b"], "etiqueta": "M"}'::jsonb,
      '{"id": "el_menor", "tipo": "calculo", "op": "min", "de": ["a", "c", "b"], "etiqueta": "M"}'::jsonb,
      '{"id": "total", "tipo": "calculo", "op": "suma", "de": ["x"], "etiqueta": "Total", "salida": "total", "bucket": "x"}'::jsonb))
$f$;

-- Los valores que da la fórmula con ese vehículo (y la variante, si se elige).
create or replace function pg_temp.fx_valores(p_vehiculo jsonb, p_variante text default null) returns jsonb language sql as $f$
  select public.evaluar_formula(pg_temp.fx_def(), '{}',
           jsonb_build_object('inputs', '{"x": 1}'::jsonb, 'banderas', '{}'::jsonb, 'tipos_cambio', '{"oficial": 1}'::jsonb,
                              'vehiculo', p_vehiculo, 'tablas', '{}'::jsonb, 'overrides', '{}'::jsonb)
           || case when p_variante is null then '{}'::jsonb else jsonb_build_object('variante', p_variante) end) -> 'valores'
$f$;

-- Compara las claves de `p_esperado` con los valores; el texto de lo que difiere, o null.
create or replace function pg_temp.fx_difiere(p_valores jsonb, p_esperado jsonb) returns text language sql as $f$
  select string_agg(format('%s = %s (se esperaba %s)', e.key, coalesce((p_valores -> e.key)::text, 'nada'), e.value), '; ' order by e.key)
    from jsonb_each(p_esperado) e
   where p_valores -> e.key is distinct from e.value
$f$;

-- @test motor: cada comparador, Y, O, la rama elegida, MAX y MIN con a > b y la variante por defecto
do $$
declare v text;
begin
  v := pg_temp.fx_difiere(pg_temp.fx_valores('{"a": 3, "b": 2, "c": 1, "p": 1, "q": 1}'),
    '{"mayor": 1, "menor": 0, "mayor_igual": 1, "menor_igual": 0, "igual": 0, "distinto": 1, "es_a": 1, "no_es_a": 0,
      "ambos": 1, "alguno": 0, "rama": 3, "sin_otra": 0, "el_mayor": 3, "el_menor": 1}');
  if v is not null then raise exception '%', v; end if;
end $$;

-- @test motor: con a = b y la otra opción elegida, elegir toma la segunda rama y O se cumple
do $$
declare v text;
begin
  v := pg_temp.fx_difiere(pg_temp.fx_valores('{"a": 2, "b": 2, "c": 5, "p": 1, "q": 1}', 'b'),
    '{"mayor": 0, "menor": 0, "mayor_igual": 1, "menor_igual": 1, "igual": 1, "distinto": 0, "es_a": 0, "no_es_a": 1,
      "ambos": 0, "alguno": 1, "rama": 2, "sin_otra": 5, "el_mayor": 5, "el_menor": 2}');
  if v is not null then raise exception '%', v; end if;
end $$;

-- @test motor: la igualdad es exacta en float8: 0,1 + 0,2 no es 0,3, y el cero negativo es igual a cero
do $$
declare v text;
begin
  v := pg_temp.fx_difiere(pg_temp.fx_valores('{"a": -0.0, "b": 0, "c": 0.3, "p": 0.1, "q": 0.2}'),
    '{"exacto": 0, "igual": 1, "mayor": 0, "distinto": 0}');
  if v is not null then raise exception '%', v; end if;
  v := pg_temp.fx_difiere(pg_temp.fx_valores('{"a": 1, "b": 1, "c": 0.30000000000000004, "p": 0.1, "q": 0.2}'), '{"exacto": 1}');
  if v is not null then raise exception '%', v; end if;
end $$;

-- @test motor: un null en un operando vuelve null lo que lo lee; MAX y MIN con un null en el medio dan null
do $$
declare v text;
begin
  -- Sin `a`: las comparaciones, Y, O que la leen, la rama (su prueba es null) y los extremos son null; es_opcion no la lee.
  v := pg_temp.fx_difiere(pg_temp.fx_valores('{"b": 2, "c": 1, "p": 1, "q": 1}'),
    '{"mayor": null, "igual": null, "distinto": null, "es_a": 1, "ambos": null, "alguno": null, "rama": null, "sin_otra": null,
      "el_mayor": null, "el_menor": null}');
  if v is not null then raise exception 'sin a: %', v; end if;
  -- Sin `c` (en el medio de MAX y MIN): null, no el mayor o el menor de los demás.
  v := pg_temp.fx_difiere(pg_temp.fx_valores('{"a": 1, "b": 2, "p": 1, "q": 1}'), '{"el_mayor": null, "el_menor": null, "exacto": null}');
  if v is not null then raise exception 'sin c: %', v; end if;
end $$;

-- @test motor: elegir sólo deja pasar el null de la rama que elige
do $$
declare v text;
begin
  -- a > b: la rama elegida es `a`; sin `c`, `sin_otra` (que elige 0 porque O no se cumple) no es null.
  v := pg_temp.fx_difiere(pg_temp.fx_valores('{"a": 3, "b": 2, "p": 1, "q": 1}'), '{"rama": 3, "alguno": 0, "sin_otra": 0}');
  if v is not null then raise exception 'la rama no elegida: %', v; end if;
  -- a = b con la otra opción: O se cumple y `sin_otra` elige `c`, que no llega.
  v := pg_temp.fx_difiere(pg_temp.fx_valores('{"a": 2, "b": 2, "p": 1, "q": 1}', 'b'), '{"alguno": 1, "sin_otra": null}');
  if v is not null then raise exception 'la rama elegida: %', v; end if;
end $$;
