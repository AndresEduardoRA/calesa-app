-- Las referencias, la variante y el doble conteo de las operaciones de condición en `validar_formula()` (docs/COTIZADOR.md › «Las
-- reglas»): la `prueba` de un `elegir` y los términos de `y`/`o` son una condición, el término de `es_opcion` es la variante y su
-- clave existe, y un miembro de grupo puede leer otro en una condición sin contarlo dos veces. Cada esperado es lo que dice
-- `validarFormula()` de TS para la misma fórmula (el corpus diferencial, `corpus-de-formula.json`, lo cruza con mezclas).

-- @test fórmula: los ayudantes de las funciones de Excel en validar_formula
create or replace function pg_temp.fx_base() returns jsonb language sql as $f$
  select '{"nodos":[{"id":"variante","tipo":"opcion","etiqueta":"Variante","opciones":[{"clave":"moto","etiqueta":"Moto","titulo":"Moto"},{"clave":"auto","etiqueta":"Auto","titulo":"Auto"}],"por_defecto":"auto"},{"id":"tc","tipo":"tipo_cambio","clave":"oficial","etiqueta":"TC","formato":"raw"},{"id":"nuevo","tipo":"bandera","etiqueta":"Nuevo","formato":"raw"},{"id":"remate","tipo":"input","etiqueta":"Remate","grupo":"compra"},{"id":"umbral","tipo":"constante","etiqueta":"Umbral"},{"id":"extra","tipo":"constante","etiqueta":"Extra"},{"id":"caro","tipo":"calculo","op":"comparar","de":["remate","umbral"],"cmp":">","etiqueta":"Caro","formato":"raw"},{"id":"es_moto","tipo":"calculo","op":"es_opcion","de":["variante"],"cmp":"=","clave":"moto","etiqueta":"Es moto","formato":"raw"},{"id":"ambos","tipo":"calculo","op":"y","de":["caro","es_moto"],"etiqueta":"Ambos","formato":"raw"},{"id":"recargo","tipo":"calculo","op":"elegir","de":["extra"],"prueba":"caro","etiqueta":"Recargo","grupo":"compra"},{"id":"total","tipo":"calculo","op":"suma","de":["remate","recargo"],"etiqueta":"Total","salida":"total"}],"buckets":{"exterior":"tc"},"total_en":"tc","grupos":[{"id":"compra","etiqueta":"Compra","plazo":"2 días","tono":"compra","bucket":"exterior"}]}'::jsonb
$f$;

-- 'válida', o 'regla@donde' y el mensaje de la base.
create or replace function pg_temp.fx_validar(p_def jsonb, p_params jsonb default '{"umbral": 1000, "extra": 50}')
returns text language plpgsql as $f$
declare v_regla text; v_donde text; v_mensaje text;
begin
  perform public.validar_formula(p_def, p_params);
  return 'válida';
exception when invalid_parameter_value then
  get stacked diagnostics v_regla = pg_exception_detail, v_donde = pg_exception_hint, v_mensaje = message_text;
  return v_regla || '@' || coalesce(v_donde, '') || ' ' || v_mensaje;
end $f$;

-- La base con un nodo más, justo antes del total.
create or replace function pg_temp.fx_con(p_nodo jsonb) returns jsonb language sql as $f$
  select jsonb_insert(pg_temp.fx_base(), '{nodos,10}', p_nodo)
$f$;

-- La base con una clave de un nodo cambiada (por su posición).
create or replace function pg_temp.fx_cambiar(p_i int, p_clave text, p_valor jsonb) returns jsonb language sql as $f$
  select jsonb_set(pg_temp.fx_base(), array['nodos', p_i::text, p_clave], p_valor)
$f$;

-- @test fórmula: una fila de grupo con SI(remate>1000; 50; 0) es válida, y la prueba también puede ser una bandera
do $$
declare v text;
begin
  v := pg_temp.fx_validar(pg_temp.fx_base());
  if v <> 'válida' then raise exception 'la base: %', v; end if;
  v := pg_temp.fx_validar(pg_temp.fx_cambiar(9, 'prueba', '"nuevo"'));
  if v <> 'válida' then raise exception 'la prueba bandera: %', v; end if;
end $$;

-- @test fórmula: la prueba de elegir y los términos de Y son una condición, con el texto de TS
do $$
declare v text;
begin
  v := pg_temp.fx_validar(pg_temp.fx_cambiar(9, 'prueba', '"remate"'));
  if v <> 'referencia_de_tipo@recargo «recargo» usa «remate» como prueba, y tiene que ser una condición (una bandera, una comparación, Y u O).' then
    raise exception 'la prueba que es un número: %', v;
  end if;
  v := pg_temp.fx_validar(pg_temp.fx_cambiar(8, 'de', '["caro", "umbral"]'));
  if v not like 'referencia_de_tipo@ambos «ambos» usa «umbral» como prueba,%' then raise exception 'el término de Y: %', v; end if;
  -- Un elegir no sirve de condición: SI(SI(…); …).
  v := pg_temp.fx_validar(pg_temp.fx_con('{"id": "ajuste", "tipo": "calculo", "op": "elegir", "de": ["extra"], "prueba": "recargo", "etiqueta": "Ajuste"}'));
  if v not like 'referencia_de_tipo@ajuste «ajuste» usa «recargo» como prueba,%' then raise exception 'la prueba que es un elegir: %', v; end if;
  -- La prueba va antes que las ramas: con una prueba posterior y una rama que no existe, gana la prueba.
  v := pg_temp.fx_validar(pg_temp.fx_con('{"id": "r2", "tipo": "calculo", "op": "elegir", "de": ["no_existe"], "prueba": "total", "etiqueta": "R2"}'));
  if v not like 'referencia_hacia_adelante@r2 %' then raise exception 'el orden de las referencias: %', v; end if;
end $$;

-- @test fórmula: es_opcion nombra la variante y una opción que tiene; la variante no es un término de MAX ni una rama
do $$
declare v text;
begin
  v := pg_temp.fx_validar(pg_temp.fx_cambiar(7, 'de', '["remate"]'));
  if v <> 'referencia_de_tipo@es_moto «es_moto» usa «remate» como variante, y tiene que ser la variante.' then
    raise exception 'la variante que es un número: %', v;
  end if;
  v := pg_temp.fx_validar(pg_temp.fx_cambiar(7, 'clave', '"camion"'));
  if v <> 'clave_de_opcion_inexistente@es_moto «es_moto» compara con la opción «camion», que la variante no tiene.' then
    raise exception 'la opción que no existe: %', v;
  end if;
  v := pg_temp.fx_validar(pg_temp.fx_con('{"id": "piso", "tipo": "calculo", "op": "max", "de": ["variante", "extra"], "etiqueta": "Piso"}'));
  if v not like 'referencia_de_tipo@piso «piso» usa «variante» como de,%' then raise exception 'MAX de la variante: %', v; end if;
  v := pg_temp.fx_validar(pg_temp.fx_cambiar(9, 'de', '["extra", "variante"]'));
  if v not like 'referencia_de_tipo@recargo «recargo» usa «variante» como de,%' then raise exception 'la variante como rama: %', v; end if;
end $$;

-- @test fórmula: un miembro MAX(remate; 50) del grupo cuenta dos veces el remate
do $$
declare v text;
begin
  v := pg_temp.fx_validar(pg_temp.fx_con('{"id": "piso", "tipo": "calculo", "op": "max", "de": ["remate", "extra"], "etiqueta": "Piso", "grupo": "compra"}'));
  if v not like 'doble_conteo@piso %' then raise exception 'MAX de un miembro: %', v; end if;
end $$;
