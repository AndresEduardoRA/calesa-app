-- La forma de las operaciones de condición en `_formula_forma_nodo()` (el Zod de `nodos.ts`): las 7 operaciones nuevas, su aridad
-- (F33), sus claves propias después de `de` (F71 el comparador, F72 la opción, F73 la prueba) y las claves que una operación no lleva
-- (F04). Cada caso devuelve el campo del primer defecto, como la ruta del primer issue de Zod; null si la forma está bien.

-- @test fórmula: la forma de comparar, es_opcion, Y, O, elegir, MAX y MIN
do $$
declare
  v_caso record;
  v_visto text;
  v_malos text[] := '{}';
begin
  for v_caso in
    select c.nombre, c.resto, c.esperado
      from (values
        ('comparar con cada comparador', '{"op": "comparar", "de": ["a", "b"], "cmp": ">"}'::jsonb, null::text),
        ('comparar <', '{"op": "comparar", "de": ["a", "b"], "cmp": "<"}', null),
        ('comparar >=', '{"op": "comparar", "de": ["a", "b"], "cmp": ">="}', null),
        ('comparar <=', '{"op": "comparar", "de": ["a", "b"], "cmp": "<="}', null),
        ('comparar =', '{"op": "comparar", "de": ["a", "b"], "cmp": "="}', null),
        ('comparar <>', '{"op": "comparar", "de": ["a", "b"], "cmp": "<>"}', null),
        ('comparar ==', '{"op": "comparar", "de": ["a", "b"], "cmp": "=="}', '.cmp'),
        ('comparar sin comparador', '{"op": "comparar", "de": ["a", "b"]}', '.cmp'),
        ('comparar con un comparador número', '{"op": "comparar", "de": ["a", "b"], "cmp": 1}', '.cmp'),
        ('comparar de uno', '{"op": "comparar", "de": ["a"], "cmp": ">"}', '.de'),
        ('comparar de tres, con el comparador malo: va primero de', '{"op": "comparar", "de": ["a", "b", "c"], "cmp": "!"}', '.de'),
        ('comparar con un término malo', '{"op": "comparar", "de": ["a", "B"], "cmp": ">"}', '.de.1'),
        ('es_opcion =', '{"op": "es_opcion", "de": ["v"], "cmp": "=", "clave": "moto"}', null),
        ('es_opcion <>', '{"op": "es_opcion", "de": ["v"], "cmp": "<>", "clave": "moto"}', null),
        ('es_opcion con un comparador de números', '{"op": "es_opcion", "de": ["v"], "cmp": ">", "clave": "moto"}', '.cmp'),
        ('es_opcion con el comparador y la clave malos: va primero cmp', '{"op": "es_opcion", "de": ["v"], "cmp": "<", "clave": "Moto"}', '.cmp'),
        ('es_opcion con una clave mala', '{"op": "es_opcion", "de": ["v"], "cmp": "=", "clave": "Moto"}', '.clave'),
        ('es_opcion sin clave', '{"op": "es_opcion", "de": ["v"], "cmp": "="}', '.clave'),
        ('es_opcion de dos', '{"op": "es_opcion", "de": ["v", "w"], "cmp": "=", "clave": "moto"}', '.de'),
        ('es_opcion de ninguno', '{"op": "es_opcion", "de": [], "cmp": "=", "clave": "moto"}', '.de'),
        ('Y de dos', '{"op": "y", "de": ["a", "b"]}', null),
        ('Y de cinco', '{"op": "y", "de": ["a", "b", "c", "d", "e"]}', null),
        ('Y de uno', '{"op": "y", "de": ["a"]}', '.de'),
        ('O de uno', '{"op": "o", "de": ["a"]}', '.de'),
        ('O con un comparador', '{"op": "o", "de": ["a", "b"], "cmp": ">"}', ''),
        ('elegir de uno', '{"op": "elegir", "de": ["a"], "prueba": "p"}', null),
        ('elegir de dos', '{"op": "elegir", "de": ["a", "b"], "prueba": "p"}', null),
        ('elegir de tres', '{"op": "elegir", "de": ["a", "b", "c"], "prueba": "p"}', '.de'),
        ('elegir de ninguno', '{"op": "elegir", "de": [], "prueba": "p"}', '.de'),
        ('elegir con una prueba mala', '{"op": "elegir", "de": ["a"], "prueba": "P"}', '.prueba'),
        ('elegir sin prueba', '{"op": "elegir", "de": ["a", "b"]}', '.prueba'),
        ('elegir no pide condicion (el si viejo sí)', '{"op": "elegir", "de": ["a"], "prueba": "p", "condicion": "b"}', null),
        ('si sin condicion sigue siendo un error', '{"op": "si", "de": ["a"]}', '.condicion'),
        ('MAX de uno', '{"op": "max", "de": ["a"]}', null),
        ('MAX de ninguno', '{"op": "max", "de": []}', '.de'),
        ('MIN de ninguno', '{"op": "min", "de": []}', '.de'),
        ('MIN con un término malo', '{"op": "min", "de": ["a", "B"]}', '.de.1'),
        ('MAX con una clave', '{"op": "max", "de": ["a"], "clave": "a"}', ''),
        ('comparar con una prueba', '{"op": "comparar", "de": ["a", "b"], "cmp": ">", "prueba": "p"}', ''),
        ('suma con un comparador', '{"op": "suma", "de": ["a"], "cmp": ">"}', ''),
        ('una operación que no existe', '{"op": "potencia", "de": ["a"]}', '.op')
      ) as c(nombre, resto, esperado)
  loop
    v_visto := public._formula_forma_nodo('{"id": "n", "tipo": "calculo", "etiqueta": "N"}'::jsonb || v_caso.resto);
    if v_visto is distinct from v_caso.esperado then
      v_malos := array_append(v_malos, format('%s: %s en vez de %s', v_caso.nombre, coalesce(v_visto, 'null'), coalesce(v_caso.esperado, 'null')));
    end if;
  end loop;
  if cardinality(v_malos) > 0 then raise exception E'la forma no es la de nodos.ts:\n  %', array_to_string(v_malos, E'\n  '); end if;
end $$;

-- @test fórmula: validar_formula nombra la ruta del comparador malo en su mensaje
do $$
declare v_mensaje text; v_donde text;
begin
  perform public.validar_formula(
    '{"nodos": [{"id": "a", "tipo": "input", "etiqueta": "A"}, {"id": "c", "tipo": "calculo", "op": "comparar", "de": ["a", "a"], "cmp": "=>", "etiqueta": "C"}]}',
    '{}');
  raise exception 'se aceptó un comparador «=>»';
exception when invalid_parameter_value then
  get stacked diagnostics v_mensaje = message_text, v_donde = pg_exception_hint;
  if v_mensaje is distinct from 'La fórmula no tiene la forma esperada en «definicion.nodos.1.cmp».' or v_donde is distinct from 'c' then
    raise exception 'el mensaje es «%» y el donde «%»', v_mensaje, v_donde;
  end if;
end $$;
