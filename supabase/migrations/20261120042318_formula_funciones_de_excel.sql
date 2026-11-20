-- Las funciones de Excel de la fórmula (docs/COTIZADOR.md › «Los nodos» y «Fórmulas como texto»): siete operaciones nuevas de
-- `calculo` —`comparar`, `es_opcion`, `y`, `o`, `elegir`, `max` y `min`— en la forma, la validación y el motor, espejo de
-- `nodos.ts`, `validar*.ts` y `motor-condiciones.ts`. Sin tablas, columnas, índices, policies ni grants nuevos: sólo
-- `create or replace` de funciones que ya existen (conservan su dueño y sus privilegios).

CREATE OR REPLACE FUNCTION "public"."_formula_forma_nodo"("p_n" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_campo constant text := '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$';
  c_base constant text[] := array['id', 'etiqueta', 'formato', 'descripcion', 'seccion', 'color', 'salida', 'bucket', 'grupo', 'tipo'];
  v_tipo text;
  v_op text;
  v_permitidas text[];
  v_cmps text[];          -- los comparadores que admite `comparar` o `es_opcion`
  v_x jsonb;
  v_o jsonb;
  v_min int;
  v_max int;
  v_num numeric;
  v_f float8;
  k int;
begin
  if jsonb_typeof(p_n) is distinct from 'object' then /*F01*/ return ''; end if;
  v_tipo := case when jsonb_typeof(p_n -> 'tipo') = 'string' then p_n ->> 'tipo' end;
  v_permitidas := case v_tipo
    when 'input' then c_base || array['solo_en', 'condicion', 'sugerido_de', 'requerido_si']
    when 'constante' then c_base || array['solo_en', 'condicion', 'texto']
    when 'tipo_cambio' then c_base || array['clave']
    when 'campo_vehiculo' then c_base || array['solo_en', 'campo']
    when 'bandera' then c_base || array['solo_en']
    when 'opcion' then c_base || array['opciones', 'por_defecto', 'en_par']
    when 'tabla' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'tabla', 'match', 'columna']
    when 'tramo' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'tabla', 'sobre', 'columna']
    when 'calculo' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'texto', 'op', 'de']
  end;
  if v_permitidas is null then /*F02*/ return '.tipo'; end if;
  if v_tipo = 'calculo' then
    v_op := case when jsonb_typeof(p_n -> 'op') = 'string' then p_n ->> 'op' end;
    if (v_op in ('suma', 'porcentaje_de', 'multiplicar', 'restar', 'dividir', 'si', 'depreciar', 'redondear',
                 'comparar', 'es_opcion', 'y', 'o', 'elegir', 'max', 'min')) is not true then
      /*F03*/ return '.op';
    end if;
    v_permitidas := v_permitidas || case v_op
      when 'porcentaje_de' then array['pct']
      when 'depreciar' then array['tabla', 'sobre', 'columna']
      when 'redondear' then array['n']
      when 'comparar' then array['cmp']
      when 'es_opcion' then array['cmp', 'clave']
      when 'elegir' then array['prueba']
      else '{}'::text[]
    end;
  end if;
  -- Una clave que el tipo no lleva (también una mal escrita) es un error, no se ignora.
  if (p_n - v_permitidas) <> '{}'::jsonb then /*F04*/ return ''; end if;

  -- Lo común a todo nodo.
  if (jsonb_typeof(p_n -> 'id') = 'string' and (p_n ->> 'id') ~ c_id) is not true then /*F05*/ return '.id'; end if;
  -- `tablas` es la clave de params donde van las filas congeladas (D5): ninguna constante se llama así.
  if v_tipo = 'constante' and p_n ->> 'id' = 'tablas' then /*F06*/ return '.id'; end if;
  if (jsonb_typeof(p_n -> 'etiqueta') = 'string' and char_length(p_n ->> 'etiqueta') between 1 and 80) is not true then
    /*F07*/ return '.etiqueta';
  end if;
  if p_n ? 'formato' and (jsonb_typeof(p_n -> 'formato') = 'string' and (p_n ->> 'formato') in ('usd', 'pct', 'raw', 'moneda')) is not true then
    /*F08*/ return '.formato';
  end if;
  if p_n ? 'descripcion' and (jsonb_typeof(p_n -> 'descripcion') = 'string' and char_length(p_n ->> 'descripcion') <= 300) is not true then
    /*F09*/ return '.descripcion';
  end if;
  if p_n ? 'seccion' and (jsonb_typeof(p_n -> 'seccion') = 'string' and char_length(p_n ->> 'seccion') between 1 and 60) is not true then
    /*F10*/ return '.seccion';
  end if;
  if p_n ? 'color' and (jsonb_typeof(p_n -> 'color') = 'string' and (p_n ->> 'color') in ('amarillo', 'verde', 'naranja')) is not true then
    /*F11*/ return '.color';
  end if;
  if p_n ? 'salida' and (jsonb_typeof(p_n -> 'salida') = 'string' and (p_n ->> 'salida') in ('total', 'base_imponible', 'aparte')) is not true then
    /*F12*/ return '.salida';
  end if;
  if p_n ? 'bucket' and (jsonb_typeof(p_n -> 'bucket') = 'string' and (p_n ->> 'bucket') ~ c_id) is not true then /*F13*/ return '.bucket'; end if;
  if p_n ? 'grupo' and (jsonb_typeof(p_n -> 'grupo') = 'string' and (p_n ->> 'grupo') ~ c_id) is not true then /*F14*/ return '.grupo'; end if;
  -- Lo que un nodo de valor suma (el tipo ya dijo si lo admite).
  if p_n ? 'solo_en' then
    v_x := p_n -> 'solo_en';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= 1) is not true then /*F15*/ return '.solo_en'; end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      if (jsonb_typeof(v_x -> k) = 'string' and (v_x ->> k) ~ c_id) is not true then /*F16*/ return '.solo_en.' || k; end if;
    end loop;
  end if;
  if (p_n ? 'condicion' or v_op = 'si')
     and (jsonb_typeof(p_n -> 'condicion') = 'string' and (p_n ->> 'condicion') ~ c_id) is not true then
    /*F17*/ return '.condicion';
  end if;
  if p_n ? 'sobrescribible' and jsonb_typeof(p_n -> 'sobrescribible') is distinct from 'boolean' then /*F18*/ return '.sobrescribible'; end if;
  -- El texto con que se escribió la fila (la raíz de `compilarExpresion()`): una `constante` o un `calculo`, de 1 a 2.000 caracteres.
  if p_n ? 'texto' and (jsonb_typeof(p_n -> 'texto') = 'string' and char_length(p_n ->> 'texto') between 1 and 2000) is not true then
    /*F70*/ return '.texto';
  end if;

  -- Lo propio de cada tipo.
  if v_tipo = 'input' then
    if p_n ? 'sugerido_de' and (jsonb_typeof(p_n -> 'sugerido_de') = 'string' and (p_n ->> 'sugerido_de') ~ c_id) is not true then
      /*F19*/ return '.sugerido_de';
    end if;
    if p_n ? 'requerido_si' and (jsonb_typeof(p_n -> 'requerido_si') = 'string' and (p_n ->> 'requerido_si') ~ c_id) is not true then
      /*F20*/ return '.requerido_si';
    end if;
  elsif v_tipo = 'tipo_cambio' then
    if (jsonb_typeof(p_n -> 'clave') = 'string' and (p_n ->> 'clave') ~ c_id) is not true then /*F21*/ return '.clave'; end if;
  elsif v_tipo = 'campo_vehiculo' then
    if (jsonb_typeof(p_n -> 'campo') = 'string' and char_length(p_n ->> 'campo') <= 80 and (p_n ->> 'campo') ~ c_campo) is not true then
      /*F22*/ return '.campo';
    end if;
  elsif v_tipo = 'opcion' then
    v_x := p_n -> 'opciones';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= 2) is not true then /*F23*/ return '.opciones'; end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      v_o := v_x -> k;
      if (jsonb_typeof(v_o) = 'object' and (v_o - array['clave', 'etiqueta', 'titulo']) = '{}'::jsonb
          and jsonb_typeof(v_o -> 'clave') = 'string' and (v_o ->> 'clave') ~ c_id
          and jsonb_typeof(v_o -> 'etiqueta') = 'string' and char_length(v_o ->> 'etiqueta') between 1 and 60
          and jsonb_typeof(v_o -> 'titulo') = 'string' and char_length(v_o ->> 'titulo') between 1 and 120) is not true then
        /*F24*/ return '.opciones.' || k;
      end if;
    end loop;
    if p_n ? 'por_defecto' and (jsonb_typeof(p_n -> 'por_defecto') = 'string' and (p_n ->> 'por_defecto') ~ c_id) is not true then
      /*F25*/ return '.por_defecto';
    end if;
    if p_n ? 'en_par' and jsonb_typeof(p_n -> 'en_par') is distinct from 'boolean' then /*F43*/ return '.en_par'; end if;
  elsif v_tipo = 'tabla' then
    if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F26*/ return '.tabla'; end if;
    if jsonb_typeof(p_n -> 'match') is distinct from 'object' then /*F27*/ return '.match'; end if;
    -- columna de la tabla → un nodo anterior o un campo del vehículo.
    if exists (
      select 1 from jsonb_each(p_n -> 'match') m
       where (m.key ~ c_id and jsonb_typeof(m.value) = 'string' and char_length(m.value #>> '{}') <= 80
              and (m.value #>> '{}') ~ c_campo) is not true
    ) then
      /*F28*/ return '.match';
    end if;
    if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F29*/ return '.columna'; end if;
  elsif v_tipo = 'tramo' then
    if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F30*/ return '.tabla'; end if;
    if (jsonb_typeof(p_n -> 'sobre') = 'string' and (p_n ->> 'sobre') ~ c_id) is not true then /*F31*/ return '.sobre'; end if;
    if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F32*/ return '.columna'; end if;
  elsif v_tipo = 'calculo' then
    -- La aridad de cada operación, cerrada.
    v_min := case v_op when 'multiplicar' then 2 when 'restar' then 2 when 'dividir' then 2
                       when 'si' then 1 when 'depreciar' then 1 when 'redondear' then 1
                       when 'comparar' then 2 when 'es_opcion' then 1 when 'y' then 2 when 'o' then 2
                       when 'elegir' then 1 else 1 end;
    v_max := case v_op when 'dividir' then 2 when 'si' then 1 when 'depreciar' then 1 when 'redondear' then 1
                       when 'comparar' then 2 when 'es_opcion' then 1 when 'elegir' then 2 end;
    v_x := p_n -> 'de';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= v_min
        and (v_max is null or jsonb_array_length(v_x) <= v_max)) is not true then
      /*F33*/ return '.de';
    end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      if (jsonb_typeof(v_x -> k) = 'string' and (v_x ->> k) ~ c_id) is not true then /*F34*/ return '.de.' || k; end if;
    end loop;
    if v_op = 'porcentaje_de' and (jsonb_typeof(p_n -> 'pct') = 'string' and (p_n ->> 'pct') ~ c_id) is not true then
      /*F35*/ return '.pct';
    end if;
    if v_op = 'depreciar' then
      if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F36*/ return '.tabla'; end if;
      if (jsonb_typeof(p_n -> 'sobre') = 'string' and (p_n ->> 'sobre') ~ c_id) is not true then /*F37*/ return '.sobre'; end if;
      if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F38*/ return '.columna'; end if;
    end if;
    if v_op = 'redondear' then
      -- `z.int().min(0).max(6)` sobre el número como lo lee JS: 2.0 y 6.0000000000000001 valen; lo que JS redondea a 0, también.
      if jsonb_typeof(p_n -> 'n') is distinct from 'number' then /*F39*/ return '.n'; end if;
      v_num := (p_n -> 'n')::numeric;
      if abs(v_num) < 1e-300 then
        if abs(v_num) > 2.4703282292062327e-324 then /*F40*/ return '.n'; end if;
      elsif abs(v_num) >= 7 then
        /*F41*/ return '.n';
      else
        v_f := v_num::float8;
        if v_f <> trunc(v_f) or v_f < 0 or v_f > 6 then /*F42*/ return '.n'; end if;
      end if;
    end if;
    -- Las claves propias de las operaciones de condición, después de `de` (como en el Zod): el comparador, la opción y la prueba.
    if v_op in ('comparar', 'es_opcion') then
      v_cmps := case v_op when 'comparar' then array['>', '<', '>=', '<=', '=', '<>'] else array['=', '<>'] end;
      if (jsonb_typeof(p_n -> 'cmp') = 'string' and (p_n ->> 'cmp') = any (v_cmps)) is not true then /*F71*/ return '.cmp'; end if;
    end if;
    if v_op = 'es_opcion' and (jsonb_typeof(p_n -> 'clave') = 'string' and (p_n ->> 'clave') ~ c_id) is not true then
      /*F72*/ return '.clave';
    end if;
    if v_op = 'elegir' and (jsonb_typeof(p_n -> 'prueba') = 'string' and (p_n ->> 'prueba') ~ c_id) is not true then
      /*F73*/ return '.prueba';
    end if;
  end if;
  return null;
end;
$_$;

CREATE OR REPLACE FUNCTION "public"."validar_formula"("p_def" "jsonb", "p_params" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  v_nodos jsonb;
  v_n int;
  v_pos jsonb;            -- id → posición (1..n); con un id repetido, la última, como el `pos.set` de TS
  v_ids text[];
  v_tipos text[];
  v_formatos text[];      -- `formato`, o `usd` si no lo trae
  v_sobres boolean[];     -- `sobrescribible: true`
  v_constantes jsonb;     -- el conjunto de ids de los nodos `constante`
  v_total int;            -- el primer nodo con `salida: total`
  v_totales int;
  v_nodo jsonb;
  v_x jsonb;
  v_id text;
  v_tipo text;
  v_ref text;
  v_papel text;
  v_op text;
  v_otro text;
  v_refs text[];
  v_papeles text[];
  v_lectores_ref text[] := '{}';   -- cada arista (quien lee → qué lee), en el orden de los nodos y de sus referencias
  v_lectores_de text[] := '{}';
  v_lectores jsonb;                -- id leído → [primer lector, otro lector distinto]
  v_mal boolean;
  i int;
  j int;
  k int;
begin
  -- §0 la forma.
  perform public._formula_forma(p_def, p_params);
  v_nodos := p_def -> 'nodos';
  v_n := jsonb_array_length(v_nodos);

  -- §1 el índice (indexar): un id, un solo nodo.
  select coalesce(jsonb_object_agg(x.value ->> 'id', x.pos order by x.pos), '{}'::jsonb),
         array_agg(x.value ->> 'id' order by x.pos),
         array_agg(x.value ->> 'tipo' order by x.pos),
         array_agg(coalesce(x.value ->> 'formato', 'usd') order by x.pos),
         array_agg(coalesce(x.value -> 'sobrescribible' = 'true'::jsonb, false) order by x.pos),
         coalesce(jsonb_object_agg(x.value ->> 'id', true) filter (where x.value ->> 'tipo' = 'constante'), '{}'::jsonb),
         coalesce(sum(case when x.value ->> 'salida' = 'total' then 1 else 0 end), 0),
         min(x.pos) filter (where x.value ->> 'salida' = 'total')
    into v_pos, v_ids, v_tipos, v_formatos, v_sobres, v_constantes, v_totales, v_total
    from jsonb_array_elements(v_nodos) with ordinality as x(value, pos);
  select d.id into v_id
    from (select x.value ->> 'id' as id, x.pos, min(x.pos) over (partition by x.value ->> 'id') as primera
            from jsonb_array_elements(v_nodos) with ordinality as x(value, pos)) d
   where d.pos > d.primera
   order by d.pos
   limit 1;
  if v_id is not null then
    perform public._formula_rechazar('nodo_duplicado', v_id, format('Hay dos nodos con el id «%s».', v_id));
  end if;

  -- §2 las referencias (revisarReferencias): existen, van hacia atrás y nombran el tipo que corresponde. En el orden de
  -- `referenciasDe()`. De paso se anotan las aristas, que §5 usa para saber quién lee cada nodo.
  for i in 1 .. v_n loop
    v_nodo := v_nodos -> (i - 1);
    v_id := v_ids[i];
    v_tipo := v_tipos[i];
    v_refs := '{}';
    v_papeles := '{}';
    if v_tipo = 'input' then
      if v_nodo ? 'sugerido_de' then v_refs := array_append(v_refs, v_nodo ->> 'sugerido_de'); v_papeles := array_append(v_papeles, 'sugerido_de'); end if;
      if v_nodo ? 'requerido_si' then v_refs := array_append(v_refs, v_nodo ->> 'requerido_si'); v_papeles := array_append(v_papeles, 'requerido_si'); end if;
    elsif v_tipo = 'tabla' then
      -- Los valores de `match`, en el orden de sus claves en jsonb.
      for v_ref in select m.value from jsonb_each_text(v_nodo -> 'match') m loop
        v_refs := array_append(v_refs, v_ref);
        v_papeles := array_append(v_papeles, 'match');
      end loop;
    elsif v_tipo = 'tramo' then
      v_refs := array_append(v_refs, v_nodo ->> 'sobre');
      v_papeles := array_append(v_papeles, 'sobre');
    elsif v_tipo = 'calculo' then
      -- `elegir` nombra primero su `prueba`; los términos de `y` y `o` son pruebas y el de `es_opcion`, la variante.
      v_op := v_nodo ->> 'op';
      if v_op = 'elegir' then v_refs := array_append(v_refs, v_nodo ->> 'prueba'); v_papeles := array_append(v_papeles, 'prueba'); end if;
      v_papel := case v_op when 'y' then 'prueba' when 'o' then 'prueba' when 'es_opcion' then 'variante' else 'de' end;
      v_x := v_nodo -> 'de';
      for k in 0 .. jsonb_array_length(v_x) - 1 loop
        v_refs := array_append(v_refs, v_x ->> k);
        v_papeles := array_append(v_papeles, v_papel);
      end loop;
      if v_nodo ->> 'op' = 'porcentaje_de' then v_refs := array_append(v_refs, v_nodo ->> 'pct'); v_papeles := array_append(v_papeles, 'pct'); end if;
      if v_nodo ->> 'op' = 'depreciar' then v_refs := array_append(v_refs, v_nodo ->> 'sobre'); v_papeles := array_append(v_papeles, 'sobre'); end if;
    end if;
    -- `condicion` va al final en los tipos que la admiten (la forma ya sacó a los demás).
    if v_tipo in ('input', 'constante', 'tabla', 'tramo', 'calculo') and v_nodo ? 'condicion' then
      v_refs := array_append(v_refs, v_nodo ->> 'condicion');
      v_papeles := array_append(v_papeles, 'condicion');
    end if;

    for k in 1 .. coalesce(array_length(v_refs, 1), 0) loop
      v_ref := v_refs[k];
      v_papel := v_papeles[k];
      v_lectores_ref := array_append(v_lectores_ref, v_ref);
      v_lectores_de := array_append(v_lectores_de, v_id);
      j := (v_pos ->> v_ref)::int;
      if j is null then
        -- Un `match` que no nombra un nodo nombra un campo del vehículo.
        continue when v_papel = 'match';
        perform public._formula_rechazar('referencia_inexistente', v_id,
          format('«%s» usa «%s», que no es un nodo de la fórmula.', v_id, v_ref));
        continue;
      end if;
      if j = i then
        perform public._formula_rechazar('ciclo', v_id, format('«%s» se usa a sí mismo: sería un ciclo.', v_id));
      end if;
      if j > i then
        perform public._formula_rechazar('referencia_hacia_adelante', v_id,
          format('«%s» usa «%s», que está después en la lista: el orden de la lista es el de evaluación y sólo se usa lo anterior.', v_id, v_ref));
      end if;
      if v_papel in ('condicion', 'requerido_si') and v_tipos[j] <> 'bandera' then
        perform public._formula_rechazar('referencia_de_tipo', v_id,
          format('«%s» usa «%s» como %s, y tiene que ser %s.', v_id, v_ref, v_papel, 'una bandera'));
      end if;
      -- La prueba vale 1 o 0: una bandera o una operación de condición (`esCondicion`).
      v_mal := v_papel = 'prueba'
               and not (v_tipos[j] = 'bandera'
                        or (v_tipos[j] = 'calculo' and (v_nodos -> (j - 1) ->> 'op') in ('comparar', 'es_opcion', 'y', 'o')));
      if v_mal then
        perform public._formula_rechazar('referencia_de_tipo', v_id,
          format('«%s» usa «%s» como %s, y tiene que ser %s.', v_id, v_ref, v_papel,
                 'una condición (una bandera, una comparación, Y u O)'));
      end if;
      if v_papel = 'variante' and v_tipos[j] <> 'opcion' then
        perform public._formula_rechazar('referencia_de_tipo', v_id,
          format('«%s» usa «%s» como %s, y tiene que ser %s.', v_id, v_ref, v_papel, 'la variante'));
      end if;
      if v_tipos[j] = 'opcion' and v_papel not in ('match', 'variante') then
        perform public._formula_rechazar('referencia_de_tipo', v_id,
          format('«%s» usa «%s» como %s, y tiene que ser %s.', v_id, v_ref, v_papel,
                 'un número (la variante se nombra en «solo_en» o en un «match»)'));
      end if;
    end loop;
  end loop;

  -- §3 el total (revisarTotal).
  if v_totales <> 1 then
    perform public._formula_rechazar('total_unico', null,
      format('La fórmula necesita exactamente un nodo con salida «total» (hay %s).', v_totales));
  end if;
  if v_total is not null then
    v_nodo := v_nodos -> (v_total - 1);
    v_tipo := v_tipos[v_total];
    -- soloEnDe, condicionDe y sobrescribibleDe: cada uno sólo en los tipos que lo admiten.
    if (v_tipo not in ('tipo_cambio', 'opcion') and v_nodo ? 'solo_en')
       or (v_tipo in ('input', 'constante', 'tabla', 'tramo', 'calculo') and v_nodo ? 'condicion')
       or (v_tipo in ('tabla', 'tramo', 'calculo') and v_sobres[v_total]) then
      perform public._formula_rechazar('total_fijo', v_ids[v_total],
        format('El total «%s» no puede depender de una variante ni de un interruptor, ni sobrescribirse.', v_ids[v_total]));
    end if;
    -- El total es lo que se paga: un tipo de cambio, un campo, una bandera o la variante no lo son.
    if v_tipos[v_total] in ('tipo_cambio', 'campo_vehiculo', 'bandera', 'opcion') then
      perform public._formula_rechazar('total_no_es_monto', v_ids[v_total],
        format('El total «%s» tiene que dar un monto: un input, una constante, una tabla, un tramo o un cálculo.', v_ids[v_total]));
    end if;
  end if;

  -- §4 params (revisarParams): cada constante tiene su valor, y cada clave es una constante.
  for i in 1 .. v_n loop
    if v_tipos[i] = 'constante' and (v_ids[i] = 'tablas' or not p_params ? v_ids[i]) then
      perform public._formula_rechazar('constante_sin_valor', v_ids[i], format('La constante «%s» no tiene valor en params.', v_ids[i]));
    end if;
  end loop;
  for v_ref in select p.key from jsonb_each(p_params) p loop
    continue when v_ref = 'tablas';
    if not v_constantes ? v_ref then
      perform public._formula_rechazar('param_sin_constante', v_ref, format('params.%s no corresponde a ninguna constante.', v_ref));
    end if;
  end loop;

  -- §5 el par porcentaje-monto (revisarPares, decisión d). Quién lee cada nodo: el primero y, si hay, otro distinto.
  select coalesce(jsonb_object_agg(l.ref, jsonb_build_array(l.primero, l.otro)), '{}'::jsonb) into v_lectores
    from (select a.ref, a.primero, (array_agg(a.lector order by a.k) filter (where a.lector <> a.primero))[1] as otro
            from (select u.ref, u.lector, u.k, first_value(u.lector) over (partition by u.ref order by u.k) as primero
                    from unnest(v_lectores_ref, v_lectores_de) with ordinality as u(ref, lector, k)) a
           group by a.ref, a.primero) l;
  for i in 1 .. v_n loop
    continue when v_tipos[i] <> 'calculo';
    v_nodo := v_nodos -> (i - 1);
    continue when v_nodo ->> 'op' <> 'porcentaje_de';
    v_ref := v_nodo ->> 'pct';
    j := (v_pos ->> v_ref)::int;
    -- Un `porcentaje_de` es un monto y su porcentaje tiene formato pct; si se sobrescribe, su porcentaje da un monto y acepta un valor.
    v_mal := v_formatos[i] not in ('usd', 'moneda')
             or (j is not null and (v_formatos[j] <> 'pct'
                                    or (v_sobres[i] and not (v_tipos[j] in ('input', 'constante', 'tabla', 'tramo', 'calculo')
                                                             and (v_tipos[j] in ('input', 'constante', 'tipo_cambio') or v_sobres[j])))));
    if v_mal then
      perform public._formula_rechazar('par_mal_tipado', v_ids[i],
        format('«%s» es un porcentaje de otro monto: tiene que ser un monto y su porcentaje «%s», tener formato pct.', v_ids[i], v_ref));
    end if;
    if v_sobres[i] then
      v_x := v_lectores -> v_ref;
      v_otro := case when v_x ->> 0 = v_ids[i] then v_x ->> 1 else v_x ->> 0 end;
      if v_otro is not null then
        perform public._formula_rechazar('pct_compartido', v_ids[i],
          format('«%s» es el porcentaje de «%s», que se puede sobrescribir: ningún otro nodo lo puede leer (lo lee «%s»).', v_ref, v_ids[i], v_otro));
      end if;
    end if;
  end loop;

  -- §6 los tipos de cambio, los buckets y los grupos; §7 la variante.
  perform public._formula_cambio_y_grupos(v_nodos, v_pos, v_ids, v_tipos, v_formatos, v_total,
                                          p_def -> 'buckets', p_def -> 'total_en', p_def -> 'grupos');
  perform public._formula_variante(v_nodos, v_ids, v_tipos);
  perform public._formula_campos(v_nodos, v_tipos);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."_formula_cambio_y_grupos"("p_nodos" "jsonb", "p_pos" "jsonb", "p_ids" "text"[], "p_tipos" "text"[], "p_formatos" "text"[], "p_total" integer, "p_buckets" "jsonb", "p_total_en" "jsonb", "p_grupos" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  v_n int := jsonb_array_length(p_nodos);
  v_nodo jsonb;
  v_x jsonb;
  v_id text;
  v_otro text;
  v_clave text;
  v_bucket text;
  v_ref text;
  v_grupo text;
  v_leido text;
  v_reparte boolean;
  v_lugar jsonb;            -- id de grupo → su lugar (1..g): uno por id, en el orden de su primera aparición (el Map de TS)
  v_grupo_ids text[];
  v_visto boolean[] := '{}';
  v_miembros int[];
  v_marcado boolean[] := '{}';  -- por la posición canónica de cada id (la de `p_pos`): un conjunto de ids, como el Set de TS
  i int;
  j int;
  k int;
  g int;
begin
  -- Una clave de tipo de cambio, un solo nodo.
  select t.id, t.primero, t.clave into v_id, v_otro, v_clave
    from (select x.value ->> 'id' as id, x.value ->> 'clave' as clave, x.pos,
                 first_value(x.value ->> 'id') over (partition by x.value ->> 'clave' order by x.pos) as primero,
                 min(x.pos) over (partition by x.value ->> 'clave') as primera
            from jsonb_array_elements(p_nodos) with ordinality as x(value, pos)
           where x.value ->> 'tipo' = 'tipo_cambio') t
   where t.pos > t.primera
   order by t.pos
   limit 1;
  if v_id is not null then
    perform public._formula_rechazar('tipo_de_cambio_repetido', v_id,
      format('«%s» y «%s» son el mismo tipo de cambio («%s»).', v_otro, v_id, v_clave));
  end if;
  -- `buckets` (en el orden de jsonb) y `total_en` nombran nodos `tipo_cambio`.
  for v_bucket, v_ref in select b.key, b.value from jsonb_each_text(coalesce(p_buckets, '{}'::jsonb)) b loop
    j := (p_pos ->> v_ref)::int;
    if j is null or p_tipos[j] <> 'tipo_cambio' then
      perform public._formula_rechazar('tipo_de_cambio_inexistente', 'buckets.' || v_bucket,
        format('%s nombra «%s», que no es un tipo de cambio de la fórmula.', 'buckets.' || v_bucket, v_ref));
    end if;
  end loop;
  if p_total_en is not null then
    v_ref := p_total_en #>> '{}';
    j := (p_pos ->> v_ref)::int;
    if j is null or p_tipos[j] <> 'tipo_cambio' then
      perform public._formula_rechazar('tipo_de_cambio_inexistente', 'total_en',
        format('%s nombra «%s», que no es un tipo de cambio de la fórmula.', 'total_en', v_ref));
    end if;
  end if;

  if jsonb_array_length(coalesce(p_grupos, '[]'::jsonb)) > 0 then
    -- Con grupos (revisarGrupos).
    if p_total_en is null then
      perform public._formula_rechazar('grupos_sin_total_en', null,
        'Con grupos, la fórmula necesita «total_en»: el tipo de cambio que divide el total en Bs.');
    end if;
    select coalesce(jsonb_object_agg(u.id, u.lugar), '{}'::jsonb), array_agg(u.id order by u.lugar)
      into v_lugar, v_grupo_ids
      from (select f.id, row_number() over (order by f.primera) as lugar
              from (select x.value ->> 'id' as id, min(x.pos) as primera
                      from jsonb_array_elements(p_grupos) with ordinality as x(value, pos)
                     group by x.value ->> 'id') f) u;
    v_miembros := array_fill(0, array[coalesce(array_length(v_grupo_ids, 1), 0)]);
    for k in 0 .. jsonb_array_length(p_grupos) - 1 loop
      v_x := p_grupos -> k;
      v_grupo := v_x ->> 'id';
      g := (v_lugar ->> v_grupo)::int;
      if v_visto[g] then
        perform public._formula_rechazar('grupo_duplicado', v_grupo, format('Hay dos grupos con el id «%s».', v_grupo));
      end if;
      v_visto[g] := true;
      if not coalesce(p_buckets ? (v_x ->> 'bucket'), false) then
        perform public._formula_rechazar('bucket_inexistente', v_grupo,
          format('«%s» usa el bucket «%s», que no está en buckets.', v_grupo, v_x ->> 'bucket'));
      end if;
    end loop;
    -- Los miembros (revisarMiembros).
    for i in 1 .. v_n loop
      v_nodo := p_nodos -> (i - 1);
      v_bucket := v_nodo ->> 'bucket';
      if v_bucket is not null and v_bucket <> 'ninguno' then
        perform public._formula_rechazar('bucket_con_grupos', p_ids[i],
          format('«%s» declara su bucket, y con grupos el tipo de cambio es del grupo.', p_ids[i]));
      end if;
      continue when not v_nodo ? 'grupo';
      v_grupo := v_nodo ->> 'grupo';
      g := (v_lugar ->> v_grupo)::int;
      if g is null then
        perform public._formula_rechazar('grupo_inexistente', p_ids[i],
          format('«%s» está en el grupo «%s», que no existe.', p_ids[i], v_grupo));
      else
        v_miembros[g] := v_miembros[g] + 1;
      end if;
      -- Sólo lo que da un monto, con formato usd o moneda, es miembro de un grupo.
      if p_tipos[i] not in ('input', 'constante', 'tabla', 'tramo', 'calculo') or p_formatos[i] not in ('usd', 'moneda') then
        perform public._formula_rechazar('miembro_no_es_monto', p_ids[i],
          format('«%s» está en el grupo «%s» y no es un monto: un miembro es un input, una constante, una tabla, un tramo o un cálculo, con formato usd o moneda.', p_ids[i], v_grupo));
      end if;
      if v_nodo ? 'salida' then
        perform public._formula_rechazar('miembro_con_salida', p_ids[i],
          format('«%s» es una salida y no puede sumar al grupo «%s».', p_ids[i], v_grupo));
      end if;
    end loop;
    -- Doble conteo (revisarDobleConteo): una pasada hacia adelante marca lo que acumula un miembro (el miembro, un cálculo que
    -- acumula su `de` y lee algo marcado, un `sugerido_de` de algo marcado). No acumulan su `de` un `porcentaje_de` (su base) ni las
    -- operaciones de condición, que valen 1 o 0; `elegir` acumula sus ramas (`de`) y no su `prueba` (acumulaDe de TS).
    for i in 1 .. v_n loop
      v_nodo := p_nodos -> (i - 1);
      v_leido := null;
      if p_tipos[i] = 'calculo' and v_nodo ->> 'op' not in ('porcentaje_de', 'comparar', 'es_opcion', 'y', 'o') then
        v_x := v_nodo -> 'de';
        for k in 0 .. jsonb_array_length(v_x) - 1 loop
          j := (p_pos ->> (v_x ->> k))::int;
          if j is not null and v_marcado[j] then
            v_leido := v_x ->> k;
            exit;
          end if;
        end loop;
      elsif p_tipos[i] = 'input' and v_nodo ? 'sugerido_de' then
        j := (p_pos ->> (v_nodo ->> 'sugerido_de'))::int;
        if j is not null and v_marcado[j] then
          v_leido := v_nodo ->> 'sugerido_de';
        end if;
      end if;
      if v_nodo ? 'grupo' and v_leido is not null then
        perform public._formula_rechazar('doble_conteo', p_ids[i],
          format('«%s» está en el grupo «%s» y suma «%s», que ya cuenta en un grupo: se contaría dos veces.', p_ids[i], v_nodo ->> 'grupo', v_leido));
      end if;
      if v_nodo ? 'grupo' or v_leido is not null then
        v_marcado[(p_pos ->> p_ids[i])::int] := true;
      end if;
    end loop;
    for g in 1 .. coalesce(array_length(v_grupo_ids, 1), 0) loop
      if v_miembros[g] = 0 then
        perform public._formula_rechazar('grupo_vacio', v_grupo_ids[g], format('El grupo «%s» no tiene nodos.', v_grupo_ids[g]));
      end if;
    end loop;
  else
    -- La forma de la Fase 0 (revisarSinGrupos): el bucket va en el nodo y el total se reparte.
    for i in 1 .. v_n loop
      v_bucket := p_nodos -> (i - 1) ->> 'bucket';
      if v_bucket is not null and v_bucket <> 'ninguno' and not coalesce(p_buckets ? v_bucket, false) then
        perform public._formula_rechazar('bucket_inexistente', p_ids[i],
          format('«%s» usa el bucket «%s», que no está en buckets.', p_ids[i], v_bucket));
      end if;
    end loop;
    -- El total tiene bucket, o es una suma y cada término directo tiene el suyo.
    if p_total is not null then
      v_nodo := p_nodos -> (p_total - 1);
      v_bucket := v_nodo ->> 'bucket';
      if v_bucket is null or v_bucket = 'ninguno' then
        v_reparte := p_tipos[p_total] = 'calculo' and v_nodo ->> 'op' = 'suma';
        if v_reparte then
          v_x := v_nodo -> 'de';
          for k in 0 .. jsonb_array_length(v_x) - 1 loop
            j := (p_pos ->> (v_x ->> k))::int;
            v_bucket := case when j is not null then p_nodos -> (j - 1) ->> 'bucket' end;
            if v_bucket is null or v_bucket = 'ninguno' then
              v_reparte := false;
              exit;
            end if;
          end loop;
        end if;
        if not v_reparte then
          perform public._formula_rechazar('total_sin_tipo_de_cambio', p_ids[p_total],
            format('Sin grupos, el total «%s» necesita un bucket, o ser una suma de nodos que lo tengan.', p_ids[p_total]));
        end if;
      end if;
    end if;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."_formula_variante"("p_nodos" "jsonb", "p_ids" "text"[], "p_tipos" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  v_n int := jsonb_array_length(p_nodos);
  v_variante int;       -- la posición de la variante (la última `opcion` vista, como TS)
  v_variante_id text;
  v_claves jsonb;       -- sus claves → true
  v_nodo jsonb;
  v_x jsonb;
  v_clave text;
  v_par_roto boolean;
  v_mal boolean;
  i int;
  k int;
begin
  for i in 1 .. v_n loop
    continue when p_tipos[i] <> 'opcion';
    if v_variante is not null then
      perform public._formula_rechazar('opcion_repetida', p_ids[i],
        format('La fórmula tiene dos variantes («%s» y «%s»): va una sola.', v_variante_id, p_ids[i]));
    end if;
    v_nodo := p_nodos -> (i - 1);
    select o.clave into v_clave
      from (select x.value ->> 'clave' as clave, x.pos, min(x.pos) over (partition by x.value ->> 'clave') as primera
              from jsonb_array_elements(v_nodo -> 'opciones') with ordinality as x(value, pos)) o
     where o.pos > o.primera
     order by o.pos
     limit 1;
    if v_clave is not null then
      perform public._formula_rechazar('opcion_clave_repetida', p_ids[i],
        format('La variante «%s» repite la opción «%s».', p_ids[i], v_clave));
    end if;
    select coalesce(jsonb_object_agg(x.value ->> 'clave', true), '{}'::jsonb) into v_claves
      from jsonb_array_elements(v_nodo -> 'opciones') as x(value);
    if v_nodo ? 'por_defecto' and not v_claves ? (v_nodo ->> 'por_defecto') then
      perform public._formula_rechazar('opcion_por_defecto_inexistente', p_ids[i],
        format('La opción por defecto «%s» no es una opción de «%s».', v_nodo ->> 'por_defecto', p_ids[i]));
    end if;
    -- «Se cotiza en par» (glosario: «Variante en par»): exactamente dos opciones, una por columna de la hoja y por cotización hermana.
    v_par_roto := coalesce(v_nodo -> 'en_par' = 'true'::jsonb, false) and jsonb_array_length(v_nodo -> 'opciones') <> 2;
    if v_par_roto then
      perform public._formula_rechazar('par_sin_dos_opciones', p_ids[i],
        'Una variante que se cotiza en par tiene exactamente dos opciones.');
    end if;
    v_variante := i;
    v_variante_id := p_ids[i];
  end loop;
  -- `solo_en` lee la variante: va después de ella, como toda referencia, y nombra opciones que tiene. En la misma pasada, un
  -- `es_opcion` compara con una opción que la variante tiene (que nombra la variante ya lo dijo `referencia_de_tipo`).
  for i in 1 .. v_n loop
    v_nodo := p_nodos -> (i - 1);
    v_x := case when p_tipos[i] in ('tipo_cambio', 'opcion') then null else v_nodo -> 'solo_en' end;
    if v_x is not null then
      if v_variante is null then
        perform public._formula_rechazar('solo_en_sin_opcion', p_ids[i],
          format('«%s» dice en qué variantes vale, y la fórmula no tiene variante.', p_ids[i]));
      end if;
      if v_variante > i then
        perform public._formula_rechazar('referencia_hacia_adelante', p_ids[i],
          format('«%s» usa «%s», que está después en la lista: el orden de la lista es el de evaluación y sólo se usa lo anterior.', p_ids[i], v_variante_id));
      end if;
      for k in 0 .. jsonb_array_length(v_x) - 1 loop
        if not coalesce(v_claves ? (v_x ->> k), false) then
          perform public._formula_rechazar('solo_en_opcion_inexistente', p_ids[i],
            format('«%s» nombra la opción «%s», que la variante no tiene.', p_ids[i], v_x ->> k));
        end if;
      end loop;
    end if;
    v_mal := p_tipos[i] = 'calculo' and v_nodo ->> 'op' = 'es_opcion' and v_variante is not null
             and not v_claves ? (v_nodo ->> 'clave');
    if v_mal then
      perform public._formula_rechazar('clave_de_opcion_inexistente', p_ids[i],
        format('«%s» compara con la opción «%s», que la variante no tiene.', p_ids[i], v_nodo ->> 'clave'));
    end if;
  end loop;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."evaluar_formula"("p_def" "jsonb", "p_params" "jsonb", "p_entrada" "jsonb", "p_modo" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    SET "extra_float_digits" TO '3'
    AS $$
declare
  v_hint text;
  -- La fórmula y la entrada, desarmadas una vez.
  v_nodos jsonb;
  v_n int;
  v_grupos jsonb;
  v_ng int;
  v_constantes jsonb;
  v_congeladas jsonb;
  v_vivas jsonb;
  v_inputs jsonb;
  v_banderas jsonb;
  v_tc jsonb;
  v_veh jsonb;
  v_ov jsonb;
  v_ids text[];
  v_tipos text[];
  v_pos jsonb;                -- id → posición (1..n); con un id repetido, la última, como el `nodos.set` de TS
  v_opc int;                  -- el nodo `opcion`
  v_segunda text;
  v_total int;                -- el nodo `salida: total`
  v_variante text;
  -- El cambio que se usa (cambioDe).
  v_cb jsonb;
  v_total_en text;
  v_cod text;
  v_rep_id text[] := '{}';
  v_rep_bucket text[] := '{}';
  -- El estado de cada nodo y de cada grupo.
  v_estado text[];
  v_enc boolean[];
  v_pisado boolean[];
  v_lugar jsonb;              -- id de grupo → su lugar (1..g)
  v_grupo_ids text[];
  v_dib boolean[];
  v_sub float8[];             -- el USD de cada grupo mientras se suma
  v_sub_set boolean[];
  v_g_usd float8[];
  v_g_bs float8[];
  -- Lo ya evaluado, en el orden de la lista.
  v_val float8[];
  v_hecho boolean[];          -- está en `valores` (el `opcion` también)
  v_leible boolean[];         -- está en `valores` y es un número (no la variante)
  v_fuente text[];
  v_falt text[] := '{}';      -- 'codigo|donde|ref', en el orden en que nacen
  v_desc text[] := '{}';      -- 'id|motivo'
  -- Por nodo.
  v_nodo jsonb;
  v_id text;
  v_tipo text;
  v_op text;
  v_est text;
  v_x float8;
  v_y float8;
  v_z float8;
  v_xov float8;
  v_t float8;
  v_tiene_ov boolean;
  v_acepta boolean;
  v_resuelto boolean;
  v_leer_de boolean;
  v_de jsonb;
  v_base float8;
  v_nulo boolean;
  v_sug text;
  v_req text;
  v_tabla text;
  v_columna text;
  v_campo text;
  v_filas jsonb;
  v_cols text[];
  v_kinds text[];
  v_nums float8[];
  v_txts text[];
  v_col text;
  v_falta text;
  v_f jsonb;
  v_celda jsonb;
  v_hay boolean;
  v_todos boolean;
  v_alguno boolean;
  v_sobre float8;
  v_bs float8;
  v_suma_usd float8;
  v_usd float8;
  v_tcv float8;
  v_b text;
  v_k text;
  v_r text;
  v_s text;
  r text;
  g int;
  i int;
  j int;
  k int;
  jp int;
begin
  -- §0 la forma de lo que llega: la entrada y el modo, como los Zod de TS.
  v_hint := public._motor_forma_entrada(p_entrada);
  if v_hint is not null then
    perform public._motor_fallar('entrada_invalida', nullif(v_hint, ''),
      case when v_hint = '' then 'La entrada no tiene la forma esperada.' else format('La entrada no tiene la forma esperada en «%s».', v_hint) end);
  end if;
  if p_modo is not null then
    v_hint := public._motor_forma_modo(p_modo);
    if v_hint is not null then
      perform public._motor_fallar('modo_invalido', nullif(v_hint, ''),
        case when v_hint = '' then 'El modo no tiene la forma esperada.' else format('El modo no tiene la forma esperada en «%s».', v_hint) end);
    end if;
  end if;
  if jsonb_typeof(p_def -> 'nodos') is distinct from 'array' then
    perform public._motor_sin_validar(null, 'la definición no tiene la lista de nodos');
  end if;

  -- Los argumentos, una sola vez.
  v_nodos := p_def -> 'nodos';
  v_n := jsonb_array_length(v_nodos);
  v_grupos := coalesce(p_def -> 'grupos', '[]'::jsonb);
  v_ng := jsonb_array_length(v_grupos);
  v_constantes := coalesce(p_params, '{}'::jsonb) - 'tablas';
  v_congeladas := coalesce(p_params -> 'tablas', '{}'::jsonb);
  v_vivas := p_entrada -> 'tablas';
  v_inputs := p_entrada -> 'inputs';
  v_banderas := p_entrada -> 'banderas';
  v_tc := p_entrada -> 'tipos_cambio';
  v_veh := p_entrada -> 'vehiculo';
  v_ov := p_entrada -> 'overrides';

  -- prepararEvaluacion: el índice de nodos, a lo sumo un `opcion` y exactamente un total (el primero con `salida: total`).
  select coalesce(array_agg(x.value ->> 'id' order by x.pos), '{}'::text[]),
         coalesce(array_agg(x.value ->> 'tipo' order by x.pos), '{}'::text[]),
         coalesce(jsonb_object_agg(x.value ->> 'id', x.pos order by x.pos), '{}'::jsonb),
         min(x.pos) filter (where x.value ->> 'tipo' = 'opcion'),
         (array_agg(x.value ->> 'id' order by x.pos) filter (where x.value ->> 'tipo' = 'opcion'))[2],
         min(x.pos) filter (where x.value ->> 'salida' = 'total')
    into v_ids, v_tipos, v_pos, v_opc, v_segunda, v_total
    from jsonb_array_elements(v_nodos) with ordinality as x(value, pos);
  if v_segunda is not null then
    perform public._motor_sin_validar(v_segunda, 'tiene dos variantes');
  end if;
  if v_total is null then
    perform public._motor_sin_validar(null, 'no tiene un nodo con salida «total»');
  end if;

  -- revisarEntrada: lo tipeado sólo nombra inputs, y las banderas sólo banderas.
  for v_k in select jsonb_object_keys(v_inputs) loop
    if v_tipos[(v_pos ->> v_k)::int] is distinct from 'input' then
      perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un input de la fórmula.', v_k));
    end if;
  end loop;
  for v_k in select jsonb_object_keys(v_banderas) loop
    if v_tipos[(v_pos ->> v_k)::int] is distinct from 'bandera' then
      perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un bandera de la fórmula.', v_k));
    end if;
  end loop;

  -- P6 resolverVariante: la de la entrada o, sin clave, la `por_defecto`; elegir otra cosa es un error de llamada.
  if v_opc is null then
    if p_entrada ? 'variante' then
      perform public._motor_fallar('entrada_invalida', null,
        format('La entrada elige la variante «%s», y la fórmula no tiene variante.', p_entrada ->> 'variante'));
    end if;
  else
    v_nodo := v_nodos -> (v_opc - 1);
    v_variante := coalesce(p_entrada ->> 'variante', v_nodo ->> 'por_defecto');
    if v_variante is null then
      perform public._motor_fallar('entrada_invalida', v_ids[v_opc],
        format('La variante «%s» no tiene opción por defecto, y la entrada no elige una.', v_ids[v_opc]));
    end if;
    if not exists (select 1 from jsonb_array_elements(v_nodo -> 'opciones') o where o ->> 'clave' = v_variante) then
      perform public._motor_fallar('entrada_invalida', v_ids[v_opc],
        format('«%s» no es una opción de la variante «%s».', v_variante, v_ids[v_opc]));
    end if;
  end if;

  -- P6 decidirEstados: una pasada previa y lineal. Primero la variante, después la condición (la bandera de otra variante está
  -- apagada); de paso, los grupos que se dibujan y el pct de cada par cuyo monto trae override.
  select coalesce(jsonb_object_agg(u.id, u.lugar), '{}'::jsonb), coalesce(array_agg(u.id order by u.lugar), '{}'::text[])
    into v_lugar, v_grupo_ids
    from (select f.id, row_number() over (order by f.primera) as lugar
            from (select x.value ->> 'id' as id, min(x.pos) as primera
                    from jsonb_array_elements(v_grupos) with ordinality as x(value, pos)
                   group by x.value ->> 'id') f) u;
  v_estado := array_fill(null::text, array[v_n]);
  v_enc := array_fill(false, array[v_n]);
  v_pisado := array_fill(false, array[v_n]);
  v_dib := array_fill(false, array[v_ng]);
  for i in 1 .. v_n loop
    v_nodo := v_nodos -> (i - 1);
    v_tipo := v_tipos[i];
    v_est := 'activo';
    if v_tipo not in ('tipo_cambio', 'opcion') and v_nodo ? 'solo_en' then
      if v_variante is null then
        perform public._motor_sin_validar(v_ids[i], 'un nodo dice en qué variantes vale y no hay variante');
      end if;
      if not (v_nodo -> 'solo_en') ? v_variante then
        /*P6a*/ v_est := 'fuera_de_variante';
      end if;
    end if;
    if v_est = 'activo' and v_tipo in ('input', 'constante', 'tabla', 'tramo', 'calculo') and v_nodo ? 'condicion' then
      if v_enc[(v_pos ->> (v_nodo ->> 'condicion'))::int] is not true then
        /*P6b*/ v_est := 'condicion_apagada';
      end if;
    end if;
    v_estado[i] := v_est;
    if v_tipo = 'bandera' and v_est = 'activo' and (v_banderas -> v_ids[i]) = 'true'::jsonb then
      v_enc[i] := true;
    end if;
    if v_nodo ? 'grupo' and v_est <> 'fuera_de_variante' then
      g := (v_lugar ->> (v_nodo ->> 'grupo'))::int;
      if g is not null then /*P6c*/ v_dib[g] := true; end if;
    end if;
    if v_est = 'activo' and v_tipo = 'calculo' and v_nodo ->> 'op' = 'porcentaje_de'
       and (v_nodo -> 'sobrescribible') = 'true'::jsonb and v_ov ? v_ids[i] then
      j := (v_pos ->> (v_nodo ->> 'pct'))::int;
      if v_estado[j] = 'activo' then /*P6d*/ v_pisado[j] := true; end if;
    end if;
  end loop;

  -- cambioDe: el modo, si llega, reemplaza `buckets` y `total_en` completos. Tiene que nombrar tipos de cambio de la fórmula y
  -- cubrir cada bucket que se usa. Sin modo, un fallo es de la fórmula.
  if p_modo is null then
    v_cb := coalesce(p_def -> 'buckets', '{}'::jsonb);
    v_total_en := p_def ->> 'total_en';
    v_cod := 'formula_sin_validar';
  else
    v_cb := p_modo -> 'buckets';
    v_total_en := p_modo ->> 'total_en';
    v_cod := 'modo_invalido';
  end if;
  for v_b, v_r in select b.key, b.value #>> '{}' from jsonb_each(v_cb) b loop
    if v_tipos[(v_pos ->> v_r)::int] is distinct from 'tipo_cambio' then
      perform public._motor_fallar(v_cod, 'buckets.' || v_b,
        format('%s nombra «%s», que no es un tipo de cambio de la fórmula.', 'buckets.' || v_b, v_r));
    end if;
  end loop;
  if v_total_en is not null and v_tipos[(v_pos ->> v_total_en)::int] is distinct from 'tipo_cambio' then
    perform public._motor_fallar(v_cod, 'total_en', format('%s nombra «%s», que no es un tipo de cambio de la fórmula.', 'total_en', v_total_en));
  end if;
  v_nodo := v_nodos -> (v_total - 1);
  if v_ng = 0 then
    -- Sin grupos, el total se reparte: tiene bucket o es una suma de nodos que lo tienen (`ninguno` es «sin bucket»).
    v_b := v_nodo ->> 'bucket';
    if v_b is not null and v_b <> 'ninguno' then
      v_rep_id := array[v_ids[v_total]];
      v_rep_bucket := array[v_b];
    else
      if v_tipos[v_total] <> 'calculo' or v_nodo ->> 'op' <> 'suma' then
        perform public._motor_sin_validar(v_ids[v_total], 'sin grupos, el total no tiene bucket ni es una suma');
      end if;
      v_de := v_nodo -> 'de';
      for k in 0 .. jsonb_array_length(v_de) - 1 loop
        r := v_de ->> k;
        j := (v_pos ->> r)::int;
        v_b := case when j is not null then v_nodos -> (j - 1) ->> 'bucket' end;
        if v_b is null or v_b = 'ninguno' then
          perform public._motor_sin_validar(v_ids[v_total], format('sin grupos, «%s» suma al total sin bucket', r));
        end if;
        v_rep_id := array_append(v_rep_id, r);
        v_rep_bucket := array_append(v_rep_bucket, v_b);
      end loop;
    end if;
    for k in 1 .. cardinality(v_rep_bucket) loop
      if not v_cb ? v_rep_bucket[k] then
        perform public._motor_fallar(v_cod, v_rep_bucket[k], format('no dice qué tipo de cambio usa el bucket «%s»', v_rep_bucket[k]));
      end if;
    end loop;
  else
    for g in 1 .. v_ng loop
      v_b := v_grupos -> (g - 1) ->> 'bucket';
      if not v_cb ? v_b then
        perform public._motor_fallar(v_cod, v_b, format('no dice qué tipo de cambio usa el bucket «%s»', v_b));
      end if;
    end loop;
  end if;

  -- La pasada: un nodo por vez, en el orden de la lista, sólo mirando hacia atrás.
  v_val := array_fill(null::float8, array[v_n]);
  v_hecho := array_fill(false, array[v_n]);
  v_leible := array_fill(false, array[v_n]);
  v_fuente := array_fill(null::text, array[v_n]);
  v_sub := array_fill(null::float8, array[v_ng]);
  v_sub_set := array_fill(false, array[v_ng]);
  for i in 1 .. v_n loop
    v_nodo := v_nodos -> (i - 1);
    v_id := v_ids[i];
    v_tipo := v_tipos[i];
    v_tiene_ov := v_ov ? v_id;
    if v_tipo = 'opcion' then
      -- La variante vale su clave, no se sobrescribe, no tiene fuente y no suma a ningún grupo.
      if v_tiene_ov then v_desc := array_append(v_desc, v_id || '|no_sobrescribible'); end if;
      v_hecho[i] := true;
      continue;
    end if;
    v_est := v_estado[i];
    v_op := case when v_tipo = 'calculo' then v_nodo ->> 'op' end;
    v_x := null;
    v_resuelto := false;
    v_leer_de := false;
    v_xov := null;
    if v_est <> 'activo' then
      -- P7: un nodo inactivo vale 0 sin leer nada, y su override se descarta con su estado.
      v_x := 0;
      v_resuelto := true;
      if v_tiene_ov then v_desc := array_append(v_desc, v_id || '|' || v_est); end if;
    else
      -- P8 sobrescrito: el override antes del cálculo, por tipo. P10: la fuente, sólo de los activos que aceptan un valor.
      v_acepta := v_tipo in ('input', 'constante', 'tipo_cambio')
                  or (v_tipo in ('tabla', 'tramo', 'calculo') and coalesce((v_nodo -> 'sobrescribible') = 'true'::jsonb, false));
      if v_pisado[i] then
        -- El pct de un par cuyo monto manda no se calcula: vale null hasta que llega el par.
        /*P8a*/ v_fuente[i] := 'override';
        v_x := null;
        v_resuelto := true;
      elsif v_tipo = 'input' or not v_acepta then
        if v_tiene_ov then v_desc := array_append(v_desc, v_id || '|no_sobrescribible'); end if;
      else
        /*P10*/ v_fuente[i] := case when v_tiene_ov then 'override'
                                    when v_tipo in ('constante', 'tipo_cambio') then 'default'
                                    else 'sugerido' end;
        if v_tiene_ov then
          v_xov := public._motor_numero(v_ov -> v_id);
          v_resuelto := true;
          if v_op = 'porcentaje_de' then
            -- Si manda el monto y el pct está pisado, el par lo reescribe más abajo (monto ÷ base).
            v_leer_de := v_pisado[(v_pos ->> (v_nodo ->> 'pct'))::int] is true;
          end if;
          if v_tipo = 'tipo_cambio' and not (v_xov > 0) then
            -- Un tipo de cambio de la persona pasa la misma revisión que el de la empresa.
            v_falt := array_append(v_falt, 'tipo_de_cambio_sin_valor|' || v_id || '|' || (v_nodo ->> 'clave'));
          else
            v_x := v_xov;
          end if;
        end if;
      end if;
    end if;

    -- P1 sumar: ((d0 + d1) + d2)… en el orden de `de`; se leen todos los términos aunque uno sea null. Lo piden `suma`,
    -- `porcentaje_de` y el par cuyo monto manda (que lee su base sólo si su pct está pisado).
    if v_leer_de or (not v_resuelto and v_op in ('suma', 'porcentaje_de')) then
      v_de := v_nodo -> 'de';
      v_base := 0;
      v_nulo := false;
      for k in 0 .. jsonb_array_length(v_de) - 1 loop
        r := v_de ->> k;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        if v_t is null then v_nulo := true;
        else /*P1*/ v_base := public._motor_mas(v_base, v_t); end if;
      end loop;
    end if;

    -- El par: si manda el monto, el pct vale monto ÷ base (null si la base es 0, con su faltante en el pct, o si es null).
    if v_leer_de then
      jp := (v_pos ->> (v_nodo ->> 'pct'))::int;
      v_y := null;
      if not v_nulo then
        if v_base = 0 then
          /*P8b*/ v_falt := array_append(v_falt, 'division_por_cero|' || v_ids[jp] || '|');
        else
          v_y := public._motor_entre(v_xov, v_base);
        end if;
      end if;
      if v_y is not null and not (abs(v_y) < 'Infinity'::float8) then
        v_falt := array_append(v_falt, 'fuera_de_rango|' || v_ids[jp] || '|');
        v_y := null;
      end if;
      v_val[jp] := case when v_y = 0 then 0::float8 else v_y end;
      v_hecho[jp] := true;
      v_leible[jp] := true;
    end if;

    if not v_resuelto then
      -- valorCalculado: el default, lo tipeado o el sugerido.
      if v_tipo = 'input' then
        v_sug := v_nodo ->> 'sugerido_de';
        v_req := v_nodo ->> 'requerido_si';
        if v_inputs ? v_id then
          -- «Tipeado» es que la clave está, aunque valga 0: había un sugerido si el nodo lo nombra, y ↺ vuelve a él.
          v_fuente[i] := case when v_sug is null then 'input' else 'override' end;
          v_x := public._motor_numero(v_inputs -> v_id);
        else
          v_nulo := false;
          if v_req is not null then
            j := (v_pos ->> v_req)::int;
            if v_leible[j] is not true then perform public._motor_sin_leer(v_id, v_req); end if;
            v_nulo := v_val[j] = 1;
          end if;
          v_fuente[i] := case when v_sug is null or v_nulo then 'input' else 'sugerido' end;
          if v_nulo then
            -- «Requerido» es que la persona lo escriba: un sugerido no lo cumple.
            v_falt := array_append(v_falt, 'requerido_sin_valor|' || v_id || '|' || v_req);
          elsif v_sug is null then
            v_x := 0;
          else
            j := (v_pos ->> v_sug)::int;
            if v_leible[j] is not true then perform public._motor_sin_leer(v_id, v_sug); end if;
            v_x := v_val[j];
          end if;
        end if;

      elsif v_tipo = 'constante' then
        v_f := v_constantes -> v_id;
        if v_f is null then
          perform public._motor_sin_validar(v_id, format('la constante «%s» no tiene valor en params', v_id));
        end if;
        v_x := public._motor_numero(v_f);

      elsif v_tipo = 'tipo_cambio' then
        -- Un tipo de cambio que no llega, o que no es mayor que 0, no tiene valor.
        v_campo := v_nodo ->> 'clave';
        v_f := v_tc -> v_campo;
        if v_f is not null then v_t := public._motor_numero(v_f); end if;
        if v_f is not null and v_t > 0 then
          v_x := v_t;
        else
          v_falt := array_append(v_falt, 'tipo_de_cambio_sin_valor|' || v_id || '|' || v_campo);
        end if;

      elsif v_tipo = 'campo_vehiculo' then
        v_campo := v_nodo ->> 'campo';
        v_f := v_veh -> v_campo;
        if jsonb_typeof(v_f) = 'number' then
          v_x := public._motor_numero(v_f);
        else
          v_falt := array_append(v_falt, 'campo_sin_valor|' || v_id || '|' || v_campo);
        end if;

      elsif v_tipo = 'bandera' then
        v_x := case when (v_banderas -> v_id) = 'true'::jsonb then 1 else 0 end;

      elsif v_tipo = 'tabla' then
        -- Cada nodo anota a lo sumo un faltante, el primero: tabla sin filas, campo sin valor, fila sin coincidencia, celda sin
        -- valor. P3: gana la PRIMERA fila (en el orden de la tabla) cuyo `match` coincide; la congelada manda, aunque esté vacía.
        v_tabla := v_nodo ->> 'tabla';
        v_columna := v_nodo ->> 'columna';
        v_filas := v_congeladas -> v_tabla;
        if v_filas is null then v_filas := v_vivas -> v_tabla; end if;
        if v_filas is null or jsonb_array_length(v_filas) = 0 then
          v_falt := array_append(v_falt, 'tabla_sin_filas|' || v_id || '|' || v_tabla);
        else
          v_cols := '{}'; v_kinds := '{}'; v_nums := '{}'; v_txts := '{}';
          v_nulo := false;
          v_falta := null;
          for v_col, v_r in select m.key, m.value #>> '{}' from jsonb_each(v_nodo -> 'match') m loop
            j := (v_pos ->> v_r)::int;
            if j is not null then
              -- Un nodo anterior (la variante, su clave; un null no coincide con nada).
              if v_hecho[j] is not true then perform public._motor_sin_leer(v_id, v_r); end if;
              if v_tipos[j] = 'opcion' then
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 's');
                v_nums := array_append(v_nums, null::float8); v_txts := array_append(v_txts, v_variante);
              elsif v_val[j] is null then
                v_nulo := true;
              else
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 'n');
                v_nums := array_append(v_nums, v_val[j]); v_txts := array_append(v_txts, null::text);
              end if;
            else
              -- Un campo del vehículo. Si faltan varios, el faltante nombra el menor en orden de código: no depende del orden de
              -- las claves, que jsonb no guarda.
              v_f := v_veh -> v_r;
              if v_f is null or jsonb_typeof(v_f) = 'null' then
                v_nulo := true;
                /*P4*/ if v_falta is null or (v_r collate "C") < (v_falta collate "C") then v_falta := v_r; end if;
              elsif jsonb_typeof(v_f) = 'number' then
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 'n');
                v_nums := array_append(v_nums, public._motor_numero(v_f)); v_txts := array_append(v_txts, null::text);
              else
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 's');
                v_nums := array_append(v_nums, null::float8); v_txts := array_append(v_txts, v_f #>> '{}');
              end if;
            end if;
          end loop;
          if v_falta is not null then
            v_falt := array_append(v_falt, 'campo_sin_valor|' || v_id || '|' || v_falta);
          end if;
          if not v_nulo then
            -- La igualdad es estricta y sin conversión: un número con un número (como dobles), un texto con un texto.
            v_hay := null;
            select true, f.fila -> v_columna into v_hay, v_celda
              from jsonb_array_elements(v_filas) with ordinality as f(fila, orden)
             where not exists (
                     select 1 from unnest(v_cols, v_kinds, v_nums, v_txts) as m(col, kind, num, txt)
                      where case when m.kind = 'n'
                                 then case when jsonb_typeof(f.fila -> m.col) = 'number' then public._motor_numero(f.fila -> m.col) <> m.num else true end
                                 else case when jsonb_typeof(f.fila -> m.col) = 'string' then (f.fila ->> m.col) <> m.txt else true end
                            end)
             order by f.orden
             limit 1;
            if v_hay is not true then
              v_falt := array_append(v_falt, 'fila_sin_coincidencia|' || v_id || '|' || v_tabla);
            elsif jsonb_typeof(v_celda) = 'number' then
              v_x := public._motor_numero(v_celda);
            else
              v_falt := array_append(v_falt, 'celda_sin_valor|' || v_id || '|' || v_tabla);
            end if;
          end if;
        end if;

      elsif v_tipo = 'tramo' or v_op = 'depreciar' then
        -- La primera fila con desde ≤ sobre ≤ hasta, los dos extremos incluidos. Una fila sin `desde` o sin `hasta` numérico no
        -- coincide nunca. `depreciar` es d0 × el tramo de esa tabla, y lo busca aunque d0 sea null.
        v_tabla := v_nodo ->> 'tabla';
        v_columna := v_nodo ->> 'columna';
        r := v_nodo ->> 'sobre';
        j := (v_pos ->> r)::int;
        if v_op = 'depreciar' then
          v_s := (v_nodo -> 'de') ->> 0;
          jp := (v_pos ->> v_s)::int;
          if v_leible[jp] is not true then perform public._motor_sin_leer(v_id, v_s); end if;
        end if;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_sobre := v_val[j];
        v_t := null;
        v_filas := v_congeladas -> v_tabla;
        if v_filas is null then v_filas := v_vivas -> v_tabla; end if;
        if v_filas is null or jsonb_array_length(v_filas) = 0 then
          v_falt := array_append(v_falt, 'tabla_sin_filas|' || v_id || '|' || v_tabla);
        elsif v_sobre is not null then
          v_hay := null;
          select true, f.fila -> v_columna into v_hay, v_celda
            from jsonb_array_elements(v_filas) with ordinality as f(fila, orden)
           where jsonb_typeof(f.fila -> 'desde') = 'number' and jsonb_typeof(f.fila -> 'hasta') = 'number'
             and public._motor_numero(f.fila -> 'desde') <= v_sobre and v_sobre <= public._motor_numero(f.fila -> 'hasta')
           order by f.orden
           limit 1;
          if v_hay is not true then
            v_falt := array_append(v_falt, 'fila_sin_coincidencia|' || v_id || '|' || v_tabla);
          elsif jsonb_typeof(v_celda) = 'number' then
            v_t := public._motor_numero(v_celda);
          else
            v_falt := array_append(v_falt, 'celda_sin_valor|' || v_id || '|' || v_tabla);
          end if;
        end if;
        if v_op = 'depreciar' then
          v_x := case when v_val[jp] is null or v_t is null then null else public._motor_por(v_val[jp], v_t) end;
        else
          v_x := v_t;
        end if;

      elsif v_op = 'suma' then
        v_x := case when v_nulo then null else v_base end;

      elsif v_op = 'porcentaje_de' then
        r := v_nodo ->> 'pct';
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        v_x := case when v_nulo or v_t is null then null else public._motor_por(v_base, v_t) end;

      elsif v_op in ('multiplicar', 'restar') then
        -- ((d0 × d1) × d2)… y ((d0 − d1) − d2)…, nunca d0 − (d1 + d2): en dobles no es lo mismo. Se leen todos los términos.
        v_de := v_nodo -> 'de';
        v_base := case v_op when 'multiplicar' then 1 else 0 end;
        v_nulo := false;
        for k in 0 .. jsonb_array_length(v_de) - 1 loop
          r := v_de ->> k;
          j := (v_pos ->> r)::int;
          if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
          v_t := v_val[j];
          if v_t is null then v_nulo := true;
          elsif v_op = 'multiplicar' then v_base := public._motor_por(v_base, v_t);
          elsif k = 0 then v_base := v_t;
          else v_base := public._motor_menos(v_base, v_t); end if;
        end loop;
        v_x := case when v_nulo then null else v_base end;

      elsif v_op = 'dividir' then
        v_de := v_nodo -> 'de';
        r := v_de ->> 0;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_y := v_val[j];
        r := v_de ->> 1;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_z := v_val[j];
        if v_y is null or v_z is null then
          v_x := null;
        elsif v_z = 0 then
          v_falt := array_append(v_falt, 'division_por_cero|' || v_id || '|');
        else
          v_x := public._motor_entre(v_y, v_z);
        end if;

      elsif v_op = 'si' or v_op = 'redondear' then
        -- La condición apagada ya la resolvió el estado: acá llega encendida.
        r := (v_nodo -> 'de') ->> 0;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        if v_op = 'si' then v_x := v_t;
        elsif v_t is not null then v_x := public._motor_redondear(v_t, ((v_nodo -> 'n')::numeric)::int); end if;

      elsif v_op = 'comparar' then
        -- 1 o 0; un operando null da null. La igualdad es exacta, como `===` de JS entre dobles.
        v_de := v_nodo -> 'de';
        r := v_de ->> 0;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_y := v_val[j];
        r := v_de ->> 1;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_z := v_val[j];
        if v_y is not null and v_z is not null then
          v_hay := case v_nodo ->> 'cmp'
                     when '>' then v_y > v_z when '<' then v_y < v_z when '>=' then v_y >= v_z
                     when '<=' then v_y <= v_z when '=' then v_y = v_z else v_y <> v_z end;
          v_x := case when v_hay then 1 else 0 end;
        end if;

      elsif v_op = 'es_opcion' then
        -- La variante vale su clave (un texto): se compara como texto, sin conversión.
        r := (v_nodo -> 'de') ->> 0;
        j := (v_pos ->> r)::int;
        if v_hecho[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        if v_tipos[j] <> 'opcion' then
          perform public._motor_sin_validar(v_id, format('«%s» compara «%s», que no es la variante', v_id, r));
        end if;
        v_hay := (v_variante = (v_nodo ->> 'clave')) = ((v_nodo ->> 'cmp') = '=');
        v_x := case when v_hay then 1 else 0 end;

      elsif v_op in ('y', 'o') then
        -- Se leen todos los términos; null si alguno lo es. `y`: todos distintos de 0; `o`: alguno distinto de 0.
        v_de := v_nodo -> 'de';
        v_nulo := false;
        v_todos := true;
        v_alguno := false;
        for k in 0 .. jsonb_array_length(v_de) - 1 loop
          r := v_de ->> k;
          j := (v_pos ->> r)::int;
          if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
          v_t := v_val[j];
          if v_t is null then v_nulo := true;
          elsif v_t = 0 then v_todos := false;
          else v_alguno := true; end if;
        end loop;
        v_hay := (v_op = 'y' and v_todos) or (v_op = 'o' and v_alguno);
        v_x := case when v_nulo then null when v_hay then 1 else 0 end;

      elsif v_op = 'elegir' then
        -- Se leen la prueba y las dos ramas (la que falta vale 0); vale la rama que elige la prueba, y sólo su null pasa.
        r := v_nodo ->> 'prueba';
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        v_de := v_nodo -> 'de';
        r := v_de ->> 0;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_y := v_val[j];
        v_z := 0;
        if jsonb_array_length(v_de) > 1 then
          r := v_de ->> 1;
          j := (v_pos ->> r)::int;
          if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
          v_z := v_val[j];
        end if;
        v_x := case when v_t is null then null when v_t <> 0 then v_y else v_z end;

      elsif v_op in ('max', 'min') then
        -- De izquierda a derecha: el primero y cada término que lo supera estrictamente; null si alguno lo es. Nunca `greatest` ni
        -- `least`: ignoran los null.
        v_de := v_nodo -> 'de';
        v_nulo := false;
        v_base := null;
        for k in 0 .. jsonb_array_length(v_de) - 1 loop
          r := v_de ->> k;
          j := (v_pos ->> r)::int;
          if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
          v_t := v_val[j];
          if v_t is null then v_nulo := true;
          elsif v_base is null or (v_op = 'max' and v_t > v_base) or (v_op = 'min' and v_t < v_base) then v_base := v_t; end if;
        end loop;
        v_x := case when v_nulo then null else v_base end;
      end if;
    end if;

    -- asentar: lo que no es finito queda null con `fuera_de_rango`, y −0 vale 0 (JSON y jsonb no lo distinguen).
    if v_x is not null and not (abs(v_x) < 'Infinity'::float8) then
      v_falt := array_append(v_falt, 'fuera_de_rango|' || v_id || '|');
      v_x := null;
    end if;
    /*P5*/ v_val[i] := case when v_x = 0 then 0::float8 else v_x end;
    v_hecho[i] := true;
    v_leible[i] := true;
    -- acumular: el USD de un grupo es la suma de sus miembros en el orden de la lista; un miembro null lo deja null.
    if v_nodo ? 'grupo' then
      g := (v_lugar ->> (v_nodo ->> 'grupo'))::int;
      if g is not null then
        if not v_sub_set[g] then
          v_sub[g] := v_val[i];
          v_sub_set[g] := true;
        elsif v_sub[g] is not null and v_val[i] is not null then
          /*P1b*/ v_sub[g] := public._motor_mas(v_sub[g], v_val[i]);
        else
          v_sub[g] := null;
        end if;
      end if;
    end if;
  end loop;

  -- P9 descartarInexistentes: al final, los overrides de ids que no son nodos, ordenados por id (bytes, como `collate "C"`).
  for v_k in select o.id from (select jsonb_object_keys(v_ov) as id) o where not v_pos ? o.id order by o.id collate "C" loop
    v_desc := array_append(v_desc, v_k || '|nodo_inexistente');
  end loop;

  -- totalesDe.
  if v_leible[v_total] is not true then perform public._motor_sin_leer(v_ids[v_total], v_ids[v_total]); end if;
  v_suma_usd := v_val[v_total];
  v_g_usd := array_fill(null::float8, array[v_ng]);
  v_g_bs := array_fill(null::float8, array[v_ng]);
  v_bs := 0;
  if v_ng > 0 then
    for g in 1 .. v_ng loop
      -- P11: el USD de un grupo es null si lo es un miembro; uno sin miembros vale 0.
      v_y := case when v_sub_set[g] then v_sub[g] else 0 end;
      if v_y is not null and not (abs(v_y) < 'Infinity'::float8) then
        v_falt := array_append(v_falt, 'fuera_de_rango|' || v_grupo_ids[g] || '|');
        v_y := null;
      end if;
      v_g_usd[g] := case when v_y = 0 then 0::float8 else v_y end;
      -- P7: un grupo que no se dibuja vale 0 y no lee su tipo de cambio.
      if v_dib[g] then
        v_t := v_val[(v_pos ->> (v_cb ->> (v_grupos -> (g - 1) ->> 'bucket')))::int];
        v_z := case when v_y is null or v_t is null then null else public._motor_por(v_y, v_t) end;
        if v_z is not null and not (abs(v_z) < 'Infinity'::float8) then
          v_falt := array_append(v_falt, 'fuera_de_rango|' || v_grupo_ids[g] || '|');
          v_z := null;
        end if;
      else
        v_z := 0;
      end if;
      v_g_bs[g] := case when v_z = 0 then 0::float8 else v_z end;
      v_bs := case when v_bs is null or v_z is null then null else public._motor_mas(v_bs, v_z) end;
    end loop;
  else
    -- Sin grupos: Bs = Σ término × tc(su bucket), en el orden de `total.de` (o el total por el tc de su bucket).
    for k in 1 .. cardinality(v_rep_id) loop
      j := (v_pos ->> v_rep_id[k])::int;
      -- Un término fuera de la variante aporta 0 sin leer su tipo de cambio; uno apagado aporta 0 × tc. No hay un `leer` que pueda
      -- fallar acá: el total ya se leyó arriba, y los demás términos son los `de` del total, que su suma ya leyó.
      continue when v_estado[j] = 'fuera_de_variante';
      v_t := v_val[j];
      v_tcv := v_val[(v_pos ->> (v_cb ->> v_rep_bucket[k]))::int];
      v_z := case when v_t is null or v_tcv is null then null else public._motor_por(v_t, v_tcv) end;
      v_bs := case when v_bs is null or v_z is null then null else public._motor_mas(v_bs, v_z) end;
    end loop;
  end if;
  if v_bs is not null and not (abs(v_bs) < 'Infinity'::float8) then
    v_falt := array_append(v_falt, 'fuera_de_rango|total|');
    v_bs := null;
  end if;
  v_bs := case when v_bs = 0 then 0::float8 else v_bs end;
  -- El «TOTAL DÓLARES»: Bs ÷ tc(`total_en`). Sin `total_en` (y sin modo), la suma de los dólares.
  if v_total_en is null then
    v_usd := v_suma_usd;
  else
    v_tcv := v_val[(v_pos ->> v_total_en)::int];
    if v_bs is null or v_tcv is null then
      v_usd := null;
    else
      v_usd := public._motor_entre(v_bs, v_tcv);
      if not (abs(v_usd) < 'Infinity'::float8) then
        v_falt := array_append(v_falt, 'fuera_de_rango|total|');
        v_usd := null;
      end if;
      v_usd := case when v_usd = 0 then 0::float8 else v_usd end;
    end if;
  end if;

  return jsonb_build_object(
    'valores', (select coalesce(jsonb_object_agg(u.id, case when u.tipo = 'opcion' then to_jsonb(v_variante) else coalesce(to_jsonb(u.val), 'null'::jsonb) end), '{}'::jsonb)
                  from unnest(v_ids, v_tipos, v_val) as u(id, tipo, val)),
    'estados', (select coalesce(jsonb_object_agg(u.id, coalesce(u.estado, 'activo')), '{}'::jsonb)
                  from unnest(v_ids, v_estado) as u(id, estado)),
    'fuentes', (select coalesce(jsonb_object_agg(u.id, u.fuente), '{}'::jsonb)
                  from unnest(v_ids, v_fuente) as u(id, fuente) where u.fuente is not null),
    'totales', jsonb_build_object(
      'grupos', (select coalesce(jsonb_object_agg(u.id, jsonb_build_object('usd', coalesce(to_jsonb(u.usd), 'null'::jsonb),
                                                                           'bs', coalesce(to_jsonb(u.bs), 'null'::jsonb),
                                                                           'se_dibuja', u.dib)), '{}'::jsonb)
                   from unnest(v_grupo_ids, v_g_usd, v_g_bs, v_dib) as u(id, usd, bs, dib)),
      'bs', coalesce(to_jsonb(v_bs), 'null'::jsonb),
      'usd', coalesce(to_jsonb(v_usd), 'null'::jsonb),
      'suma_usd', coalesce(to_jsonb(v_suma_usd), 'null'::jsonb)),
    'faltantes', (select coalesce(jsonb_agg(case when split_part(f.dato, '|', 3) = ''
                                                 then jsonb_build_object('codigo', split_part(f.dato, '|', 1), 'donde', split_part(f.dato, '|', 2))
                                                 else jsonb_build_object('codigo', split_part(f.dato, '|', 1), 'donde', split_part(f.dato, '|', 2),
                                                                         'ref', split_part(f.dato, '|', 3)) end
                                                 order by f.orden), '[]'::jsonb)
                    from unnest(v_falt) with ordinality as f(dato, orden)),
    'overrides_descartados', (select coalesce(jsonb_agg(jsonb_build_object('id', split_part(d.dato, '|', 1), 'motivo', split_part(d.dato, '|', 2))
                                                        order by d.orden), '[]'::jsonb)
                                from unnest(v_desc) with ordinality as d(dato, orden)));
end;
$$;

