-- El aspecto del diseño de la hoja (docs/COTIZADOR.md › «El diseño de la hoja»; docs/GLOSARIO.md › «Aspecto»): cómo se ve cada pieza en la
-- rejilla de 12 columnas. Claves planas y opcionales junto a las de siempre, con escalas cerradas (nada de px, CSS ni hex):
--   ítem:     ancho (la celda: completo|mitad|tercio o 1–12; los demás: 1–12, opcional), alto 1–4, letra, enfasis;
--   sección:  ancho 1–12, alto 1–4, relleno, separacion, densidad, letra, enfasis, tono (una clave del catálogo de tonos);
--   cabecera: tono, relleno, letra, enfasis.
-- Un diseño sin esas claves es el de siempre y se dibuja igual. El espejo en TS es `entities/diseno.ts` y `validar-diseno*.ts`, con su juego
-- `casos-de-diseno.json` y el corpus de `supabase/tests/corpus-de-diseno.json`.
--
-- Un tono que nombra el diseño de alguna versión (en su cabecera o en una sección) tampoco se elimina: `_tono_en_uso()` lo busca también por
-- `_tonos_del_diseno(diseno)` con su GIN, y publicar toma esos tonos `for key share`. `_cotizacion_hoja()` copia el aspecto que ya tiene en
-- memoria (ninguna lectura nueva) y suma a `tonos` los de las secciones que dibuja y el de la cabecera.
--
-- De paso, D58 rechaza unas `filas` negativas de unos atajos, como `z.int().min(1)` de TS (antes la base las dejaba pasar), y la hoja lee esas
-- `filas` como número (`1.0` y `0.99999999999999999` valen, como en JS: con `->> … ::int` el texto `1.0` rompía la lectura de la hoja).

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La forma
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public._diseno_forma(p_diseno jsonb) returns void
language plpgsql stable
set search_path = ''
as $_$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_forma constant text := 'El diseño no tiene la forma esperada en «%s».';
  v_cab jsonb;
  v_modos jsonb;
  v_m jsonb;
  v_bs jsonb;
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

  -- La cabecera: los modos, si se ofrece «Ver total Bs» y su aspecto (sin ancho ni alto: va sola en su fila).
  v_cab := p_diseno -> 'cabecera';
  if jsonb_typeof(v_cab) is distinct from 'object' then
    /*D02*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera'));
  end if;
  if (v_cab - array['modos', 'ver_total_bs', 'tono', 'relleno', 'letra', 'enfasis']) <> '{}'::jsonb then
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

create or replace function public._diseno_forma_item(p_i jsonb) returns boolean
language plpgsql stable
set search_path = ''
as $_$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  v_tipo text;
  v_permitidas text[];
  v_a jsonb;
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
    -- La ayuda es la tabla que se abre o un texto, no las dos.
    if p_i ? 'ayuda' then
      v_a := p_i -> 'ayuda';
      if jsonb_typeof(v_a) is distinct from 'object' then /*D48*/ return false; end if;
      if v_a ? 'tabla' then
        if (v_a - 'tabla') <> '{}'::jsonb then /*D49*/ return false; end if;
        if (jsonb_typeof(v_a -> 'tabla') = 'string' and (v_a ->> 'tabla') ~ c_id) is not true then /*D50*/ return false; end if;
      elsif v_a ? 'texto' then
        if (v_a - 'texto') <> '{}'::jsonb then /*D51*/ return false; end if;
        if (jsonb_typeof(v_a -> 'texto') = 'string' and char_length(v_a ->> 'texto') between 1 and 300) is not true then
          /*D52*/ return false;
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

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Los tonos que nombra el diseño (cabecera y secciones), con su GIN
-- ---------------------------------------------------------------------------------------------------------------------------------
create function public._tonos_del_diseno(p_diseno jsonb) returns jsonb
language sql immutable
set search_path = ''
as $_$
  select coalesce(jsonb_path_query_array(p_diseno, '$.cabecera.tono'), '[]'::jsonb)
      || coalesce(jsonb_path_query_array(p_diseno, '$.secciones[*].tono'), '[]'::jsonb);
$_$;

comment on function public._tonos_del_diseno(jsonb) is
  'Las claves de tono que nombra un diseño de la hoja: el de su cabecera y el de cada sección (los de las celdas salen de los grupos de la fórmula, _tonos_de_grupos). Inmutable: la indexa formulas_tonos_del_diseno_idx. De nadie; la llaman _tono_en_uso y _preparar_publicacion.';

revoke all on function public._tonos_del_diseno(jsonb) from public, anon, authenticated;
grant execute on function public._tonos_del_diseno(jsonb) to service_role;

-- `formulas` es de configuración (decenas de versiones por origen): se arma sin `concurrently`.
create index formulas_tonos_del_diseno_idx on public.formulas using gin (public._tonos_del_diseno(diseno) jsonb_path_ops);

create or replace function public._tono_en_uso(p_clave text) returns text
language sql stable security definer
set search_path = ''
as $$
  -- Materializada: los índices conducen. Sin ella el planificador puede recorrer los orígenes por nombre y probar cada versión, y una clave que
  -- nadie usa no tiene coincidencia que lo corte (cuesta lo que crece la tabla). Un tono se usa por un grupo de la fórmula o por el diseño.
  with u as materialized (
    select f.origen_id from public.formulas f
     where public._tonos_de_grupos(f.definicion) @> jsonb_build_array(p_clave)  -- formulas_tonos_idx
    union
    select f.origen_id from public.formulas f
     where public._tonos_del_diseno(f.diseno) @> jsonb_build_array(p_clave)  -- formulas_tonos_del_diseno_idx
  )
  select o.nombre from u join public.origenes o on o.id = u.origen_id order by o.nombre limit 1;
$$;

revoke all on function public._tono_en_uso(text) from public, anon, authenticated;
grant execute on function public._tono_en_uso(text) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Publicar: los tonos del diseño también se toman, y validar_diseno() revisa el de la cabecera y el de cada sección
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public._preparar_publicacion(p_def jsonb, p_params jsonb, p_diseno jsonb, p_ignorar_retirados boolean) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_niv text[]; v_ret text[]; v_tonos text[];
begin
  if p_diseno is null then
    perform public._formula_rechazar('diseno_faltante', 'diseno', 'Publicar pide el diseño de la hoja.');
  end if;
  -- Los tonos de los grupos y del diseño (cabecera y secciones) y los niveles del diseño, `for key share`: o se publica y no se eliminan, o se
  -- eliminan y publicar da `tono_inexistente` o `nivel_inexistente`. Sólo los que se nombran, no toda la lista.
  perform 1 from public.tonos t
   where t.clave in (select jsonb_array_elements_text(public._tonos_de_grupos(p_def) || public._tonos_del_diseno(p_diseno))) for key share;
  perform 1 from public.cotizaciones_niveles n where n.clave in (select jsonb_array_elements_text(public._niveles_del_diseno(p_diseno))) for key share;
  select coalesce(array_agg(t.clave), '{}') into v_tonos from public.tonos t;
  select n.niveles, case when p_ignorar_retirados then '{}'::text[] else n.retirados end into v_niv, v_ret from public._niveles_de_cotizacion() n;
  perform public.validar_formula(p_def, p_params);
  perform public.validar_diseno(p_def, p_diseno, v_niv, v_ret, v_tonos);
  return public._compilar_visibilidad(p_def, p_diseno);
end; $$;

revoke all on function public._preparar_publicacion(jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public._preparar_publicacion(jsonb, jsonb, jsonb, boolean) to service_role;

create or replace function public.validar_diseno(p_def jsonb, p_diseno jsonb, p_niveles text[], p_retirados text[], p_tonos text[]) returns void
language plpgsql stable
set search_path = ''
as $$
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
end;
$$;

revoke all on function public.validar_diseno(jsonb, jsonb, text[], text[], text[]) from public, anon;
grant execute on function public.validar_diseno(jsonb, jsonb, text[], text[], text[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La hoja: el aspecto viaja con el diseño ya leído
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public._cotizacion_hoja(p_formula uuid, p_origen uuid, p_edita boolean default true) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  fo public.formulas;
  v_cfg boolean; v_tc boolean; v_arr text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_nodos jsonb; v_grupos jsonb; v_niveles jsonb; v_visib jsonb; v_lee jsonb; v_vivas jsonb; v_opcion text; v_opcion_ok boolean;
  v_secciones jsonb; v_claves text[]; v_tarjeta jsonb; v_tonos jsonb; v_moneda_bs text; v_datos jsonb; v_cab jsonb;
begin
  select * into fo from public.formulas x where x.id = p_formula;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', p_origen);
  v_tc := public.tiene_permiso('empresa.tipos_cambio.gestionar');
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_arr, v_editables from public._nodos_visibles(p_formula) n;
  v_ctx := public._cotizacion_contexto(v_arr, fo.definicion, fo.visibilidad);
  v_ok := v_ctx -> 'ok';
  -- Copias en memoria de lo que se busca por nodo (un jsonb que viene de la tabla se vuelve a leer entero en cada operador).
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  -- La moneda en que se escribe el total en Bs: la `moneda_a` del tipo de cambio ACTIVO que nombra el `total_en` de esta versión (una fila: tipos_cambio_clave_key).
  -- Nula sin `total_en` o sin ese tipo de cambio; no dice si `totales.bs` tiene valor (el Bs sale del tipo de cambio de cada bucket).
  select t.moneda_a::text into v_moneda_bs from public.tipos_cambio t
   where t.activo and t.clave = ((v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave');
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g ->> 'tono') from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g where (g ->> 'tono') is not null), '{}'::jsonb);
  v_niveles := coalesce((select jsonb_object_agg(l.clave, l.nombre) from public.cotizaciones_niveles l), '{}'::jsonb);
  v_visib := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(coalesce(fo.visibilidad, '{}'::jsonb)) e), '{}'::jsonb);
  -- Quien no puede guardar esa cotización (4.15-2, `p_edita` falso): ninguna celda se edita y el motivo no es un nivel (`no_se_edita`, o `se_calcula`/`del_vehiculo`).
  if p_edita is not true then
    v_editables := '{}'::jsonb;
    v_visib := '{}'::jsonb;
  end if;
  -- Las tablas que lee algún nodo que quien llama ve (la regla de `cotizacion_tabla()`) y las que existen vivas para este origen.
  v_lee := coalesce((select jsonb_object_agg(t.nombre, true)
                       from (select distinct n ->> 'tabla' as nombre from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                              where (n ->> 'tabla') is not null and n ->> 'id' = any (v_arr)) t), '{}'::jsonb);
  v_vivas := coalesce((select jsonb_object_agg(r.clave, true) from public.tablas_referencia r where r.activa and (r.origen_id = p_origen or r.origen_id is null)), '{}'::jsonb);
  -- El dato del vehículo de cada nodo `tabla` (4.14-2c2), armado una vez; viaja sólo en la celda de un nodo que se ve.
  v_datos := public._hoja_datos_del_vehiculo(v_nodos, p_origen, fo.params -> 'tablas', v_vivas);
  select n ->> 'id' into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;
  v_opcion_ok := v_opcion is not null and v_ok ? v_opcion;

  -- El aspecto de cada ítem y de cada sección se copia del diseño ya leído (con `->`: un número de columnas sigue siendo un número); sin él,
  -- la clave no viaja. Los niveles de una sección (`nivel_*`) nunca viajan.
  with it as (
    select s.ord as so, i.ord as io, s.value - 'items' as cab, i.value as item, i.value ->> 'tipo' as t, i.value ->> 'nodo' as nid
      from jsonb_array_elements(fo.diseno -> 'secciones') with ordinality s (value, ord)
     cross join lateral jsonb_array_elements(s.value -> 'items') with ordinality i (value, ord)
  ), vis as (
    -- Sólo viaja lo que su nodo (y, en un par, su porcentaje) permite.
    select it.*, v_nodos -> it.nid as n,
           jsonb_strip_nulls(jsonb_build_object('ancho', it.item -> 'ancho', 'alto', it.item -> 'alto', 'letra', it.item -> 'letra',
                                                'enfasis', it.item -> 'enfasis')) as asp
      from it
     where v_ok ? it.nid and v_nodos ? it.nid
       and (it.t <> 'celda' or not (it.item ? 'secundario') or v_ok ? (v_nodos -> it.nid ->> 'pct'))
  ), obj as (
    select vis.so, vis.io, vis.cab,
           case when vis.t in ('celda', 'subtotal') then v_grupos ->> (vis.n ->> 'grupo') end as tono,
           case vis.t
             when 'celda' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'celda', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'tipo_nodo', vis.n ->> 'tipo',
                 'formato', coalesce(vis.n ->> 'formato', 'usd'),
                 'tono', v_grupos ->> (vis.n ->> 'grupo'),
                 'ayuda', case
                            when (vis.item -> 'ayuda') ? 'texto' then jsonb_build_object('texto', vis.item -> 'ayuda' ->> 'texto')
                            when (vis.item -> 'ayuda') ? 'tabla'
                                 and (v_cfg or v_lee ? (vis.item -> 'ayuda' ->> 'tabla'))
                                 and ((jsonb_typeof(fo.params -> 'tablas') = 'object' and (fo.params -> 'tablas') ? (vis.item -> 'ayuda' ->> 'tabla'))
                                      or v_vivas ? (vis.item -> 'ayuda' ->> 'tabla'))
                              then jsonb_build_object('tabla', vis.item -> 'ayuda' ->> 'tabla') end,
                 'dato_del_vehiculo', v_datos -> vis.nid,
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end,
                 'condicion', case when v_ok ? (vis.n ->> 'condicion') then vis.n ->> 'condicion' end,
                 'requerido_si', case when v_ok ? (vis.n ->> 'requerido_si') then vis.n ->> 'requerido_si' end,
                 'secundario', case when vis.item ? 'secundario' then
                     jsonb_build_object('nodo', vis.n ->> 'pct', 'como', vis.item ->> 'secundario', 'tipo_nodo', v_nodos -> (vis.n ->> 'pct') ->> 'tipo',
                                        'formato', coalesce(v_nodos -> (vis.n ->> 'pct') ->> 'formato', 'usd'))
                     || public._hoja_estado(v_nodos -> (vis.n ->> 'pct'), true, v_editables ? (vis.n ->> 'pct'),
                                            v_visib -> (vis.n ->> 'pct') ->> 'editar', v_niveles ->> (v_visib -> (vis.n ->> 'pct') ->> 'editar'), v_cfg, v_tc) end))
               || public._hoja_estado(vis.n, true, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'atajos' then jsonb_build_object('tipo', 'atajos', 'nodo', vis.nid,
                 'chips', public._hoja_chips(p_origen, fo.params, vis.n, vis.item ->> 'columna', ((vis.item -> 'filas')::numeric)::int))
               || vis.asp
             when 'variante' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'variante', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta',
                 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', o ->> 'clave', 'etiqueta', o ->> 'etiqueta', 'titulo', o ->> 'titulo'))
                                         from jsonb_array_elements(vis.n -> 'opciones') o), '[]'::jsonb),
                 'por_defecto', vis.n ->> 'por_defecto'))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'interruptor' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'interruptor', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'efecto', vis.item ->> 'efecto',
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'subtotal' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'subtotal', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'formato', coalesce(vis.n ->> 'formato', 'usd'),
                 'tono', v_grupos ->> (vis.n ->> 'grupo')))
               || vis.asp
           end as o
      from vis
  ), secs as (
    select o.so, jsonb_strip_nulls(jsonb_build_object(
                   'id', o.cab ->> 'id', 'titulo', o.cab ->> 'titulo', 'presentacion', o.cab ->> 'presentacion',
                   'ancho', o.cab -> 'ancho', 'alto', o.cab -> 'alto', 'relleno', o.cab -> 'relleno', 'separacion', o.cab -> 'separacion',
                   'densidad', o.cab -> 'densidad', 'letra', o.cab -> 'letra', 'enfasis', o.cab -> 'enfasis', 'tono', o.cab -> 'tono'))
                 || jsonb_build_object('items', jsonb_agg(o.o order by o.io)) as sec
      from obj o
     where o.o is not null
     group by o.so, o.cab
  )
  -- Los tonos que la hoja pinta: los de los grupos de sus celdas y franjas, los de las secciones que dibuja y el de la cabecera.
  select coalesce((select jsonb_agg(s.sec order by s.so) from secs s), '[]'::jsonb),
         coalesce((select array_agg(distinct x.tono) from (select o.tono from obj o where o.tono is not null
                                                           union all
                                                           select s.sec ->> 'tono' from secs s where s.sec ? 'tono') x), '{}'::text[])
    into v_secciones, v_claves;
  v_cab := fo.diseno -> 'cabecera';
  if jsonb_typeof(v_cab -> 'tono') = 'string' then
    v_claves := v_claves || (v_cab ->> 'tono');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('clave', t.clave,
                                               'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                                               'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.clave), '[]'::jsonb)
    into v_tonos from public.tonos t where t.clave = any (v_claves);

  v_tarjeta := jsonb_build_object('nodo', fo.diseno -> 'tarjeta_total' ->> 'nodo',
                                  'etiqueta', v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'etiqueta',
                                  'formato', coalesce(v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'formato', 'usd'),
                                  'secundarios', coalesce((select jsonb_agg(jsonb_build_object('nodo', x.s, 'etiqueta', v_nodos -> x.s ->> 'etiqueta',
                                                                                              'formato', coalesce(v_nodos -> x.s ->> 'formato', 'usd')) order by x.o)
                                                             from jsonb_array_elements_text(coalesce(fo.diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality x (s, o)
                                                            where v_ok ? x.s), '[]'::jsonb));

  return jsonb_build_object(
    'formula', jsonb_build_object('id', fo.id, 'version', fo.version),
    'cabecera', jsonb_build_object(
      'modos', coalesce((select jsonb_agg(jsonb_build_object('clave', m ->> 'clave', 'nombre', m ->> 'nombre'))
                           from jsonb_array_elements(coalesce(v_cab -> 'modos', '[]'::jsonb)) m), '[]'::jsonb),
      'ver_total_bs', coalesce((v_cab ->> 'ver_total_bs')::boolean, false),
      'moneda_bs', v_moneda_bs)
      || jsonb_strip_nulls(jsonb_build_object('tono', v_cab -> 'tono', 'relleno', v_cab -> 'relleno', 'letra', v_cab -> 'letra',
                                              'enfasis', v_cab -> 'enfasis')),
    'secciones', v_secciones,
    'tarjeta_total', v_tarjeta,
    'tonos', v_tonos);
end $$;

comment on function public._cotizacion_hoja(uuid, uuid, boolean) is
  'El diseño de una versión de la fórmula recortado al nivel de quien llama: ítems cuyo nodo se ve, con su candado y su motivo, ayudas, el dato del vehículo de una celda de tabla (dato_del_vehiculo), atajos, modos (clave y nombre), la moneda del total en Bs (moneda_bs), tarjeta y tonos (los de los grupos de sus celdas, de las secciones que dibuja y de la cabecera). Copia el aspecto (ancho, alto, letra y énfasis de cada ítem; ancho, alto, relleno, separación, densidad, letra, énfasis y tono de cada sección; tono, relleno, letra y énfasis de la cabecera) sólo si el diseño lo trae; nunca los niveles. Con p_edita falso (quien no puede guardar esa cotización) nada es editable y el motivo no es un nivel. De nadie; la llaman cotizacion_hoja y cotizacion_hoja_guardada. docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)».';

revoke all on function public._cotizacion_hoja(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._cotizacion_hoja(uuid, uuid, boolean) to service_role;
