-- Lo que la cabecera del diseño trae por defecto y los enlaces de la ayuda de una celda (docs/COTIZADOR.md › «El diseño de la hoja (D7)»):
-- - `diseno.cabecera` suma tres claves opcionales: `modo_por_defecto` (la clave de un modo), `ver_total_bs_por_defecto` (booleano) y
--   `modos_visibles` (claves de modos). Sin ellas, todo como antes: el primer modo, «Ver total» apagado y todos los modos a la vista.
-- - La ayuda de texto suma `enlaces`: de 1 a 5, cada uno `{titulo, url}` (título de 1 a 60 caracteres, URL de 1 a 2000).
-- La forma va en `_diseno_forma()` (D77–D80) y `_diseno_forma_item()` (D81–D85); las reglas que cruzan, en `_diseno_cabecera()` (§1b, tras los
-- modos) y `_diseno_enlaces()` (§7, al final). El espejo TS es `diseno.ts`, `validar-diseno-cabecera.ts` y `validar-diseno-enlaces.ts`.

CREATE OR REPLACE FUNCTION "public"."_diseno_forma"("p_diseno" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_forma constant text := 'El diseño no tiene la forma esperada en «%s».';
  v_cab jsonb;
  v_modos jsonb;
  v_m jsonb;
  v_bs jsonb;
  v_vis jsonb;
  v_b jsonb;
  v_secs jsonb;
  v_s jsonb;
  v_its jsonb;
  v_t jsonb;
  v_donde text;
  v_clave text;
  v_max int;
  v_num numeric;
  v_f float8;
begin
  if jsonb_typeof(p_diseno) is distinct from 'object' then
    /*D01*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno'));
  end if;

  -- La cabecera: los modos, si se ofrece «Ver total Bs», su aspecto (sin ancho ni alto: va sola en su fila) y lo que trae por defecto.
  v_cab := p_diseno -> 'cabecera';
  if jsonb_typeof(v_cab) is distinct from 'object' then
    /*D02*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera'));
  end if;
  if (v_cab - array['modos', 'ver_total_bs', 'tono', 'relleno', 'letra', 'enfasis', 'modo_por_defecto',
                   'ver_total_bs_por_defecto', 'modos_visibles']) <> '{}'::jsonb then
    /*D03*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera'));
  end if;
  if jsonb_typeof(v_cab -> 'ver_total_bs') is distinct from 'boolean' then
    /*D04*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.ver_total_bs'));
  end if;
  v_modos := v_cab -> 'modos';
  if jsonb_typeof(v_modos) is distinct from 'array' then
    /*D05*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos'));
  end if;
  for i in 0 .. jsonb_array_length(v_modos) - 1 loop
    v_m := v_modos -> i;
    if jsonb_typeof(v_m) is distinct from 'object' then
      /*D06*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i));
    end if;
    if (v_m - array['clave', 'nombre', 'buckets', 'total_en']) <> '{}'::jsonb then
      /*D07*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i));
    end if;
    if (jsonb_typeof(v_m -> 'clave') = 'string' and (v_m ->> 'clave') ~ c_id) is not true then
      /*D08*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.clave'));
    end if;
    if (jsonb_typeof(v_m -> 'nombre') = 'string' and char_length(v_m ->> 'nombre') between 1 and 40) is not true then
      /*D09*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.nombre'));
    end if;
    if (jsonb_typeof(v_m -> 'total_en') = 'string' and (v_m ->> 'total_en') ~ c_id) is not true then
      /*D10*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.total_en'));
    end if;
    v_bs := v_m -> 'buckets';
    if jsonb_typeof(v_bs) is distinct from 'array' then
      /*D11*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets'));
    end if;
    if jsonb_array_length(v_bs) < 1 then
      /*D32*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets'));
    end if;
    for k in 0 .. jsonb_array_length(v_bs) - 1 loop
      v_b := v_bs -> k;
      if jsonb_typeof(v_b) is distinct from 'object' then
        /*D12*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k));
      end if;
      if (v_b - array['bucket', 'nodo']) <> '{}'::jsonb then
        /*D13*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k));
      end if;
      if (jsonb_typeof(v_b -> 'bucket') = 'string' and (v_b ->> 'bucket') ~ c_id) is not true then
        /*D14*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k || '.bucket'));
      end if;
      if (jsonb_typeof(v_b -> 'nodo') = 'string' and (v_b ->> 'nodo') ~ c_id) is not true then
        /*D15*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k || '.nodo'));
      end if;
    end loop;
  end loop;
  if v_cab ? 'tono' and (jsonb_typeof(v_cab -> 'tono') = 'string' and (v_cab ->> 'tono') ~ c_id) is not true then
    /*D35*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.tono'));
  end if;
  if v_cab ? 'relleno' and (jsonb_typeof(v_cab -> 'relleno') = 'string' and (v_cab ->> 'relleno') in ('chico', 'medio', 'grande')) is not true then
    /*D36*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.relleno'));
  end if;
  if v_cab ? 'letra' and (jsonb_typeof(v_cab -> 'letra') = 'string' and (v_cab ->> 'letra') in ('chica', 'normal', 'grande')) is not true then
    /*D37*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.letra'));
  end if;
  if v_cab ? 'enfasis' and (jsonb_typeof(v_cab -> 'enfasis') = 'string' and (v_cab ->> 'enfasis') in ('normal', 'fuerte')) is not true then
    /*D38*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.enfasis'));
  end if;
  -- Lo que trae la cabecera por defecto (docs/GLOSARIO.md › «Modo por defecto», «Modos visibles»): cada clave es opcional; las reglas que la cruzan con
  -- los modos van en `_diseno_cabecera()`.
  if v_cab ? 'modo_por_defecto' and (jsonb_typeof(v_cab -> 'modo_por_defecto') = 'string' and (v_cab ->> 'modo_por_defecto') ~ c_id) is not true then
    /*D77*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modo_por_defecto'));
  end if;
  if v_cab ? 'ver_total_bs_por_defecto' and jsonb_typeof(v_cab -> 'ver_total_bs_por_defecto') is distinct from 'boolean' then
    /*D78*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.ver_total_bs_por_defecto'));
  end if;
  if v_cab ? 'modos_visibles' then
    v_vis := v_cab -> 'modos_visibles';
    if jsonb_typeof(v_vis) is distinct from 'array' then
      /*D79*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos_visibles'));
    end if;
    for i in 0 .. jsonb_array_length(v_vis) - 1 loop
      if (jsonb_typeof(v_vis -> i) = 'string' and (v_vis ->> i) ~ c_id) is not true then
        /*D80*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos_visibles.' || i));
      end if;
    end loop;
  end if;

  -- Las secciones, en orden. Cualquier problema bajo una sección se nombra con su id.
  v_secs := p_diseno -> 'secciones';
  if jsonb_typeof(v_secs) is distinct from 'array' then
    /*D16*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.secciones'));
  end if;
  if jsonb_array_length(v_secs) < 1 then
    /*D33*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.secciones'));
  end if;
  for i in 0 .. jsonb_array_length(v_secs) - 1 loop
    v_s := v_secs -> i;
    v_donde := case when jsonb_typeof(v_s -> 'id') = 'string' then v_s ->> 'id' end;
    if jsonb_typeof(v_s) is distinct from 'object' then
      /*D17*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i));
    end if;
    if (v_s - array['id', 'titulo', 'presentacion', 'nivel_ver', 'nivel_editar', 'ancho', 'alto', 'relleno', 'separacion', 'densidad',
                    'letra', 'enfasis', 'tono', 'items']) <> '{}'::jsonb then
      /*D18*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i));
    end if;
    if (jsonb_typeof(v_s -> 'id') = 'string' and (v_s ->> 'id') ~ c_id) is not true then
      /*D19*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.id'));
    end if;
    if v_s ? 'titulo' and (jsonb_typeof(v_s -> 'titulo') = 'string' and char_length(v_s ->> 'titulo') between 1 and 80) is not true then
      /*D20*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.titulo'));
    end if;
    if (jsonb_typeof(v_s -> 'presentacion') = 'string' and (v_s ->> 'presentacion') in ('principal', 'avanzado')) is not true then
      /*D21*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.presentacion'));
    end if;
    if v_s ? 'nivel_ver' and (jsonb_typeof(v_s -> 'nivel_ver') = 'string' and (v_s ->> 'nivel_ver') ~ c_id) is not true then
      /*D22*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.nivel_ver'));
    end if;
    if v_s ? 'nivel_editar' and (jsonb_typeof(v_s -> 'nivel_editar') = 'string' and (v_s ->> 'nivel_editar') ~ c_id) is not true then
      /*D23*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.nivel_editar'));
    end if;
    -- Las columnas y las filas de la rejilla de las secciones: enteros como los lee JS (`z.int().min(1).max(n)`, la plantilla de D55–D58), en
    -- línea y sin llamar a otra función.
    foreach v_clave in array array['ancho', 'alto'] loop
      continue when not (v_s ? v_clave);
      v_max := case v_clave when 'ancho' then 12 else 4 end;
      if jsonb_typeof(v_s -> v_clave) is distinct from 'number' then
        /*D60*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.' || v_clave));
      end if;
      v_num := (v_s -> v_clave)::numeric;
      if abs(v_num) < 1e-300 then
        /*D61*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.' || v_clave));
      elsif abs(v_num) >= v_max + 1 then
        /*D62*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.' || v_clave));
      else
        v_f := v_num::float8;
        if v_f <> trunc(v_f) or v_f < 1 or v_f > v_max then
          /*D63*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.' || v_clave));
        end if;
      end if;
    end loop;
    if v_s ? 'relleno' and (jsonb_typeof(v_s -> 'relleno') = 'string' and (v_s ->> 'relleno') in ('chico', 'medio', 'grande')) is not true then
      /*D64*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.relleno'));
    end if;
    if v_s ? 'separacion' and (jsonb_typeof(v_s -> 'separacion') = 'string' and (v_s ->> 'separacion') in ('chica', 'media', 'grande')) is not true then
      /*D65*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.separacion'));
    end if;
    if v_s ? 'densidad' and (jsonb_typeof(v_s -> 'densidad') = 'string' and (v_s ->> 'densidad') in ('compacta', 'comoda')) is not true then
      /*D66*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.densidad'));
    end if;
    if v_s ? 'letra' and (jsonb_typeof(v_s -> 'letra') = 'string' and (v_s ->> 'letra') in ('chica', 'normal', 'grande')) is not true then
      /*D67*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.letra'));
    end if;
    if v_s ? 'enfasis' and (jsonb_typeof(v_s -> 'enfasis') = 'string' and (v_s ->> 'enfasis') in ('normal', 'fuerte')) is not true then
      /*D68*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.enfasis'));
    end if;
    if v_s ? 'tono' and (jsonb_typeof(v_s -> 'tono') = 'string' and (v_s ->> 'tono') ~ c_id) is not true then
      /*D69*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.tono'));
    end if;
    v_its := v_s -> 'items';
    if jsonb_typeof(v_its) is distinct from 'array' then
      /*D24*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.items'));
    end if;
    if jsonb_array_length(v_its) < 1 then
      /*D34*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.items'));
    end if;
    for k in 0 .. jsonb_array_length(v_its) - 1 loop
      if not public._diseno_forma_item(v_its -> k) then
        /*D25*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.items.' || k));
      end if;
    end loop;
  end loop;

  -- La tarjeta del total: el nodo y sus secundarios.
  v_t := p_diseno -> 'tarjeta_total';
  if jsonb_typeof(v_t) is distinct from 'object' then
    /*D26*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total'));
  end if;
  if (v_t - array['nodo', 'secundarios']) <> '{}'::jsonb then
    /*D27*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total'));
  end if;
  if (jsonb_typeof(v_t -> 'nodo') = 'string' and (v_t ->> 'nodo') ~ c_id) is not true then
    /*D28*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total.nodo'));
  end if;
  v_its := v_t -> 'secundarios';
  if jsonb_typeof(v_its) is distinct from 'array' then
    /*D29*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total.secundarios'));
  end if;
  for k in 0 .. jsonb_array_length(v_its) - 1 loop
    if (jsonb_typeof(v_its -> k) = 'string' and (v_its ->> k) ~ c_id) is not true then
      /*D30*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total.secundarios.' || k));
    end if;
  end loop;

  if (p_diseno - array['cabecera', 'secciones', 'tarjeta_total']) <> '{}'::jsonb then
    /*D31*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno'));
  end if;
end;
$_$;

revoke all on function public._diseno_forma(jsonb) from public, anon;
grant execute on function public._diseno_forma(jsonb) to authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."_diseno_forma_item"("p_i" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  v_tipo text;
  v_permitidas text[];
  v_a jsonb;
  v_es jsonb;
  v_e jsonb;
  v_num numeric;
  v_f float8;
  v_clave text;
  v_max int;
begin
  if jsonb_typeof(p_i) is distinct from 'object' then /*D40*/ return false; end if;
  v_tipo := case when jsonb_typeof(p_i -> 'tipo') = 'string' then p_i ->> 'tipo' end;
  v_permitidas := case v_tipo
    when 'celda' then array['tipo', 'nodo', 'ancho', 'secundario', 'ayuda', 'nivel_ver', 'nivel_editar', 'alto', 'letra', 'enfasis']
    when 'atajos' then array['tipo', 'nodo', 'columna', 'filas', 'ancho', 'alto', 'letra', 'enfasis']
    when 'variante' then array['tipo', 'nodo', 'ancho', 'alto', 'letra', 'enfasis']
    when 'interruptor' then array['tipo', 'nodo', 'efecto', 'ancho', 'alto', 'letra', 'enfasis']
    when 'subtotal' then array['tipo', 'nodo', 'ancho', 'alto', 'letra', 'enfasis']
  end;
  if v_permitidas is null then /*D41*/ return false; end if;
  -- Una clave que el tipo no lleva (también «__proto__», «clase» o «color») es un error, no se ignora.
  if (p_i - v_permitidas) <> '{}'::jsonb then /*D42*/ return false; end if;
  if (jsonb_typeof(p_i -> 'nodo') = 'string' and (p_i ->> 'nodo') ~ c_id) is not true then /*D43*/ return false; end if;

  if v_tipo = 'celda' then
    -- El ancho de una celda es obligatorio: uno con nombre de los diseños guardados (12, 6 y 4 columnas) o un número de columnas (abajo).
    if not (p_i ? 'ancho') then /*D70*/ return false; end if;
    if jsonb_typeof(p_i -> 'ancho') = 'string' and (p_i ->> 'ancho') not in ('completo', 'mitad', 'tercio') then
      /*D44*/ return false;
    end if;
    if p_i ? 'secundario'
       and (jsonb_typeof(p_i -> 'secundario') = 'string' and (p_i ->> 'secundario') in ('porcentaje', 'monto')) is not true then
      /*D45*/ return false;
    end if;
    if p_i ? 'nivel_ver' and (jsonb_typeof(p_i -> 'nivel_ver') = 'string' and (p_i ->> 'nivel_ver') ~ c_id) is not true then
      /*D46*/ return false;
    end if;
    if p_i ? 'nivel_editar' and (jsonb_typeof(p_i -> 'nivel_editar') = 'string' and (p_i ->> 'nivel_editar') ~ c_id) is not true then
      /*D47*/ return false;
    end if;
    -- La ayuda es la tabla que se abre o un texto (con hasta 5 enlaces, cada uno con su título y su URL), no las dos. Que la URL sea `https://` es la
    -- regla `ayuda_enlace_no_https` (`_diseno_enlaces()`), no la forma.
    if p_i ? 'ayuda' then
      v_a := p_i -> 'ayuda';
      if jsonb_typeof(v_a) is distinct from 'object' then /*D48*/ return false; end if;
      if v_a ? 'tabla' then
        if (v_a - 'tabla') <> '{}'::jsonb then /*D49*/ return false; end if;
        if (jsonb_typeof(v_a -> 'tabla') = 'string' and (v_a ->> 'tabla') ~ c_id) is not true then /*D50*/ return false; end if;
      elsif v_a ? 'texto' then
        if (v_a - array['texto', 'enlaces']) <> '{}'::jsonb then /*D51*/ return false; end if;
        if (jsonb_typeof(v_a -> 'texto') = 'string' and char_length(v_a ->> 'texto') between 1 and 300) is not true then
          /*D52*/ return false;
        end if;
        if v_a ? 'enlaces' then
          v_es := v_a -> 'enlaces';
          if jsonb_typeof(v_es) is distinct from 'array' then /*D81*/ return false; end if;
          if jsonb_array_length(v_es) not between 1 and 5 then /*D82*/ return false; end if;
          for j in 0 .. jsonb_array_length(v_es) - 1 loop
            v_e := v_es -> j;
            if jsonb_typeof(v_e) is distinct from 'object' or (v_e - array['titulo', 'url']) <> '{}'::jsonb then /*D83*/ return false; end if;
            if (jsonb_typeof(v_e -> 'titulo') = 'string' and char_length(v_e ->> 'titulo') between 1 and 60) is not true then /*D84*/ return false; end if;
            if (jsonb_typeof(v_e -> 'url') = 'string' and char_length(v_e ->> 'url') between 1 and 2000) is not true then /*D85*/ return false; end if;
          end loop;
        end if;
      else
        /*D53*/ return false;
      end if;
    end if;
  elsif v_tipo = 'atajos' then
    if (jsonb_typeof(p_i -> 'columna') = 'string' and (p_i ->> 'columna') ~ c_id) is not true then /*D54*/ return false; end if;
    -- `z.int().min(1).max(12)` sobre el número como lo lee JS: 1.0 y 0.99999999999999999 valen 1; lo que JS redondea a 0, no. Lo que JS
    -- lee como 0 lo corta D56 y lo de 13 o más, D57; queda lo que no es entero, lo negativo y lo que el doble redondea a 13.
    if jsonb_typeof(p_i -> 'filas') is distinct from 'number' then /*D55*/ return false; end if;
    v_num := (p_i -> 'filas')::numeric;
    if abs(v_num) < 1e-300 then
      /*D56*/ return false;
    elsif abs(v_num) >= 13 then
      /*D57*/ return false;
    else
      v_f := v_num::float8;
      if v_f <> trunc(v_f) or v_f < 1 or v_f > 12 then /*D58*/ return false; end if;
    end if;
  elsif v_tipo = 'interruptor' then
    if (jsonb_typeof(p_i -> 'efecto') = 'string' and (p_i ->> 'efecto') in ('habilita', 'muestra')) is not true then
      /*D59*/ return false;
    end if;
  end if;

  -- El aspecto, en todo tipo: columnas y filas de la rejilla de su sección como enteros de JS (la plantilla de D55–D58; el ancho con nombre
  -- de una celda ya pasó arriba), la letra y el énfasis.
  foreach v_clave in array array['ancho', 'alto'] loop
    continue when not (p_i ? v_clave) or (v_clave = 'ancho' and v_tipo = 'celda' and jsonb_typeof(p_i -> 'ancho') = 'string');
    v_max := case v_clave when 'ancho' then 12 else 4 end;
    if jsonb_typeof(p_i -> v_clave) is distinct from 'number' then /*D71*/ return false; end if;
    v_num := (p_i -> v_clave)::numeric;
    if abs(v_num) < 1e-300 then
      /*D72*/ return false;
    elsif abs(v_num) >= v_max + 1 then
      /*D73*/ return false;
    else
      v_f := v_num::float8;
      if v_f <> trunc(v_f) or v_f < 1 or v_f > v_max then /*D74*/ return false; end if;
    end if;
  end loop;
  if p_i ? 'letra' and (jsonb_typeof(p_i -> 'letra') = 'string' and (p_i ->> 'letra') in ('chica', 'normal', 'grande')) is not true then
    /*D75*/ return false;
  end if;
  if p_i ? 'enfasis' and (jsonb_typeof(p_i -> 'enfasis') = 'string' and (p_i ->> 'enfasis') in ('normal', 'fuerte')) is not true then
    /*D76*/ return false;
  end if;
  return true;
end;
$_$;

revoke all on function public._diseno_forma_item(jsonb) from public, anon;
grant execute on function public._diseno_forma_item(jsonb) to authenticated, service_role;

-- §1b de `validar_diseno()`: lo que la cabecera trae por defecto, cruzado con sus modos (los de §1, ya sin claves repetidas). El espejo es
-- `revisarCabecera()` (`validar-diseno-cabecera.ts`), con los mismos textos y en el mismo orden: el modo por defecto existe; cada modo visible, en
-- orden, existe y no se repite; el modo por defecto efectivo (el escrito o, sin él, el primero) está entre los visibles si la lista existe; «Ver
-- total» por defecto sólo si la cabecera lo ofrece. Todo rechazo lleva `donde` = `cabecera`.
create or replace function public._diseno_cabecera(p_cab jsonb) returns void
language plpgsql stable set search_path = '' as $$
declare
  v_modos jsonb := coalesce(p_cab -> 'modos', '[]'::jsonb);
  v_vis jsonb := p_cab -> 'modos_visibles';
  v_claves jsonb;
  v_pd text := p_cab ->> 'modo_por_defecto';
  v_regla text;
  v_ref text;
begin
  select coalesce(jsonb_object_agg(m.value ->> 'clave', true), '{}'::jsonb) into v_claves from jsonb_array_elements(v_modos) m;
  if v_pd is not null and not v_claves ? v_pd then
    perform public._formula_rechazar('modo_por_defecto_inexistente', 'cabecera',
      format('El modo por defecto «%s» no es un modo de la cabecera.', v_pd));
  end if;
  if v_vis is not null then
    -- La primera opción visible que falla, y qué le pasa: no es un modo, o repite una anterior.
    select q.regla, q.c
      into v_regla, v_ref
      from (select x.ord, x.c,
                   case when not v_claves ? x.c then 'modo_visible_inexistente'
                        when row_number() over (partition by x.c order by x.ord) > 1 then 'modo_visible_repetido'
                   end as regla
              from jsonb_array_elements_text(v_vis) with ordinality as x(c, ord)) q
     where q.regla is not null
     order by q.ord
     limit 1;
    if v_regla = 'modo_visible_inexistente' then
      perform public._formula_rechazar('modo_visible_inexistente', 'cabecera',
        format('Las opciones visibles nombran «%s», que no es un modo de la cabecera.', v_ref));
    elsif v_regla = 'modo_visible_repetido' then
      perform public._formula_rechazar('modo_visible_repetido', 'cabecera',
        format('Las opciones visibles nombran dos veces «%s».', v_ref));
    end if;
    v_pd := coalesce(v_pd, v_modos -> 0 ->> 'clave');
    if v_pd is not null and not v_vis ? v_pd then
      perform public._formula_rechazar('modo_por_defecto_oculto', 'cabecera',
        format('El modo por defecto «%s» tiene que quedar entre las opciones visibles.', v_pd));
    end if;
  end if;
  if p_cab -> 'ver_total_bs_por_defecto' = 'true'::jsonb and p_cab -> 'ver_total_bs' is distinct from 'true'::jsonb then
    perform public._formula_rechazar('ver_total_bs_por_defecto_no_ofrecido', 'cabecera',
      '«Ver total» no puede salir encendido por defecto si la cabecera no lo ofrece.');
  end if;
end;
$$;

revoke all on function public._diseno_cabecera(jsonb) from public, anon;
grant execute on function public._diseno_cabecera(jsonb) to authenticated, service_role;

-- §7 de `validar_diseno()`: la URL de cada enlace de la ayuda de una celda empieza con `https://` y sigue con ASCII imprimible sin espacios
-- (`[!-~]`: la misma clase en JS y en Postgres; `\S` no lo es con Unicode). El primero que falla, en el orden del diseño; `donde` es el nodo de la celda.
-- El espejo es `revisarEnlaces()` (`validar-diseno-enlaces.ts`). Una sola consulta: los enlaces ya pasaron la forma (de 1 a 5 por ayuda).
create or replace function public._diseno_enlaces(p_secs jsonb) returns void
language plpgsql stable set search_path = '' as $$
declare
  v_secs jsonb := p_secs;
  v_nodo text;
begin
  select it.value ->> 'nodo'
    into v_nodo
    from jsonb_array_elements(v_secs) with ordinality as s(value, so)
   cross join lateral jsonb_array_elements(s.value -> 'items') with ordinality as it(value, io)
   cross join lateral jsonb_array_elements(coalesce(it.value -> 'ayuda' -> 'enlaces', '[]'::jsonb)) with ordinality as e(value, eo)
   where (e.value ->> 'url') !~ '^https://[!-~]+$'
   order by s.so, it.io, e.eo
   limit 1;
  if v_nodo is not null then
    perform public._formula_rechazar('ayuda_enlace_no_https', v_nodo,
      format('Un enlace de la ayuda de «%s» tiene que empezar con https:// y no llevar espacios.', v_nodo));
  end if;
end;
$$;

revoke all on function public._diseno_enlaces(jsonb) from public, anon;
grant execute on function public._diseno_enlaces(jsonb) to authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."validar_diseno"("p_def" "jsonb", "p_diseno" "jsonb", "p_niveles" "text"[], "p_retirados" "text"[], "p_tonos" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  v_nodos jsonb;
  v_buckets jsonb;
  v_total_en text;
  v_grupos jsonb;
  v_pos jsonb;
  v_ids text[];
  v_tipos text[];
  v_ops text[];
  v_salidas text[];
  v_sobres boolean[];
  v_pcts text[];
  v_cond jsonb;
  v_req jsonb;
  v_niv jsonb;
  v_ret jsonb;
  v_ton jsonb;
  v_g jsonb;
  v_s jsonb;
  v_secs jsonb;
  v_cab jsonb;
  v_modos jsonb;
  v_max integer;
  v_items integer := 0;
  v_aux jsonb;
  v_tipos_hoja text[];
begin
  -- §0 la forma.
  perform public._diseno_forma(p_diseno);
  -- `p_diseno` puede llegar sin desarmar (TOAST) y cada `->` sobre él lo vuelve a leer entero: la cabecera y las secciones van a una variable una vez.
  v_cab := p_diseno -> 'cabecera';
  v_secs := p_diseno -> 'secciones';

  -- §0b el tamaño (4-30): sólo contar, antes que todo lo demás. `donde` es la sección en la que la suma pasa del tope.
  v_max := public._diseno_maximo_de_items();
  for i in 0 .. jsonb_array_length(v_secs) - 1 loop
    v_items := v_items + jsonb_array_length(v_secs -> i -> 'items');
    if v_items > v_max then
      perform public._formula_rechazar('demasiados_items', v_secs -> i ->> 'id',
        format('La hoja admite hasta %s ítems y el diseño pasa de ese tope en «%s»: quita alguno.', v_max,
               v_secs -> i ->> 'id'));
    end if;
  end loop;

  -- La fórmula, desarmada una vez: un id, una posición.
  v_nodos := p_def -> 'nodos';
  v_buckets := p_def -> 'buckets';
  v_total_en := p_def ->> 'total_en';
  v_grupos := coalesce(p_def -> 'grupos', '[]'::jsonb);
  select coalesce(jsonb_object_agg(x.value ->> 'id', x.pos), '{}'::jsonb),
         array_agg(x.value ->> 'id' order by x.pos),
         array_agg(x.value ->> 'tipo' order by x.pos),
         array_agg(x.value ->> 'op' order by x.pos),
         array_agg(x.value ->> 'salida' order by x.pos),
         array_agg(coalesce(x.value -> 'sobrescribible' = 'true'::jsonb, false) order by x.pos),
         array_agg(x.value ->> 'pct' order by x.pos),
         coalesce(jsonb_object_agg(x.value ->> 'condicion', true) filter (where x.value ->> 'condicion' is not null), '{}'::jsonb),
         coalesce(jsonb_object_agg(x.value ->> 'requerido_si', true) filter (where x.value ->> 'requerido_si' is not null), '{}'::jsonb)
    into v_pos, v_ids, v_tipos, v_ops, v_salidas, v_sobres, v_pcts, v_cond, v_req
    from jsonb_array_elements(v_nodos) with ordinality as x(value, pos);

  -- Las auxiliares de los textos (4.21-3b-2): una constante auxiliar no pide celda en §5.
  v_aux := public._diseno_auxiliares(p_def);
  v_tipos_hoja := array(select case when t.tipo = 'constante' and v_aux ? t.id then 'constante_auxiliar' else t.tipo end
                          from unnest(v_ids, v_tipos) with ordinality as t(id, tipo, ord)
                         order by t.ord);

  -- El contexto, como conjuntos.
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_niv from unnest(p_niveles) x where x is not null;
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ret from unnest(p_retirados) x where x is not null;
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ton from unnest(p_tonos) x where x is not null;

  -- §1 los modos.
  v_modos := v_cab -> 'modos';
  perform public._diseno_modos(v_modos, v_buckets, coalesce(cardinality(array(select jsonb_object_keys(v_buckets))), 0),
                               v_total_en, v_pos, v_tipos);

  -- §1b lo que la cabecera trae por defecto: el modo por defecto, los modos visibles y «Ver total» por defecto.
  perform public._diseno_cabecera(v_cab);

  -- §2 a §5 las secciones, la tarjeta, los atajos y la cobertura.
  perform public._diseno_secciones(v_secs, p_diseno -> 'tarjeta_total', v_ids, v_tipos_hoja, v_ops, v_salidas, v_sobres, v_pcts,
                                   v_pos, v_cond, v_req, v_niv, v_ret);

  -- §6 los tonos están en el catálogo de la empresa: el de cada grupo de la fórmula, el de la cabecera y el de cada sección, en ese orden.
  for i in 0 .. jsonb_array_length(v_grupos) - 1 loop
    v_g := v_grupos -> i;
    if not coalesce(v_ton ? (v_g ->> 'tono'), false) then
      perform public._formula_rechazar('tono_inexistente', v_g ->> 'id',
        format('El grupo «%s» usa un tono que no está en el catálogo.', v_g ->> 'id'));
    end if;
  end loop;
  if v_cab ? 'tono' and not coalesce(v_ton ? (v_cab ->> 'tono'), false) then
    perform public._formula_rechazar('tono_inexistente', 'cabecera', 'La cabecera usa un tono que no está en el catálogo.');
  end if;
  for i in 0 .. jsonb_array_length(v_secs) - 1 loop
    v_s := v_secs -> i;
    if v_s ? 'tono' and not coalesce(v_ton ? (v_s ->> 'tono'), false) then
      perform public._formula_rechazar('tono_inexistente', v_s ->> 'id',
        format('La sección «%s» usa un tono que no está en el catálogo.', v_s ->> 'id'));
    end if;
  end loop;

  -- §7 los enlaces de la ayuda de cada celda son `https://`.
  perform public._diseno_enlaces(v_secs);
end;
$$;

revoke all on function public.validar_diseno(jsonb, jsonb, text[], text[], text[]) from public, anon;
grant execute on function public.validar_diseno(jsonb, jsonb, text[], text[], text[]) to authenticated, service_role;
