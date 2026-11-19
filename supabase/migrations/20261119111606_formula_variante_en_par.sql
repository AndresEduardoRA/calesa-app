-- La variante que se cotiza en par (glosario: «Variante en par»; docs/COTIZADOR.md › «Los nodos» y «Las reglas»): el nodo `opcion` admite
-- `en_par` (sí o no; sin la clave, la fórmula de siempre) y, con `en_par` verdadero, tiene exactamente dos opciones (`par_sin_dos_opciones`,
-- después de `opcion_por_defecto_inexistente` y antes de las de `solo_en`, como `revisarVariante()`). Espejo: `entities/nodos.ts` y
-- `entities/validar-variante.ts`, con sus casos en `casos-de-formula.json`.

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
    if (v_op in ('suma', 'porcentaje_de', 'multiplicar', 'restar', 'dividir', 'si', 'depreciar', 'redondear')) is not true then
      /*F03*/ return '.op';
    end if;
    v_permitidas := v_permitidas || case v_op
      when 'porcentaje_de' then array['pct']
      when 'depreciar' then array['tabla', 'sobre', 'columna']
      when 'redondear' then array['n']
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
                       when 'si' then 1 when 'depreciar' then 1 when 'redondear' then 1 else 1 end;
    v_max := case v_op when 'dividir' then 2 when 'si' then 1 when 'depreciar' then 1 when 'redondear' then 1 end;
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
  end if;
  return null;
end;
$_$;

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
  -- `solo_en` lee la variante: va después de ella, como toda referencia, y nombra opciones que tiene.
  for i in 1 .. v_n loop
    continue when p_tipos[i] in ('tipo_cambio', 'opcion');
    v_x := p_nodos -> (i - 1) -> 'solo_en';
    continue when v_x is null;
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
  end loop;
end;
$$;

revoke all on function public._formula_forma_nodo(jsonb) from public, anon;
grant execute on function public._formula_forma_nodo(jsonb) to authenticated, service_role;
revoke all on function public._formula_variante(jsonb, text[], text[]) from public, anon;
grant execute on function public._formula_variante(jsonb, text[], text[]) to authenticated, service_role;
