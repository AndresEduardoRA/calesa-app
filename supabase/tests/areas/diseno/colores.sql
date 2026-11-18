-- Los colores del catálogo derivados de su #hex (nombre técnico heredado: `tonos`): `_color_derivar()` y `_color_tinta_de_la_tarjeta()` dan exactamente lo
-- mismo que `derivarColores()` y `tintaDeLaTarjeta()` de `src/modules/cotizaciones/entities/colores.ts`, con el AA garantizado en los dos temas, y
-- `_tono_hex()` valida lo que llega de afuera con el mismo texto que la pantalla. `scripts/probar-schema.mjs` carga antes
-- `supabase/tests/casos-de-colores.json` en `_casos_de_colores` (lo genera TS). Ningún bloque escribe en la base.

create or replace function pg_temp.colores_falla(p_sql text, p_estado text, p_texto text, p_hint text) returns void language plpgsql as $$
declare v_h text;
begin
  execute p_sql;
  raise exception 'no falló: %', p_sql;
exception when others then
  get stacked diagnostics v_h = pg_exception_hint;
  if sqlstate <> p_estado or position(p_texto in sqlerrm) = 0 or v_h is distinct from p_hint then
    raise exception '% debía fallar con % «%» (hint %), falló con % «%» (hint %)', p_sql, p_estado, p_texto, p_hint, sqlstate, sqlerrm, v_h;
  end if;
end $$;

-- @test colores: _color_derivar da lo mismo que derivarColores() en cada caso del juego (seis hex exactos) y _color_tinta_de_la_tarjeta lo mismo que tintaDeLaTarjeta()
do $$
declare c jsonb; v_d jsonb; v_n int := 0; v_tarjeta text;
begin
  for c in select x from _casos_de_colores j, jsonb_array_elements(j.doc -> 'casos') x loop
    v_d := public._color_derivar(c ->> 'hex');
    if v_d is distinct from c -> 'colores' then
      raise exception 'el hex %: la base % y colores.ts %', c ->> 'hex', v_d, c -> 'colores'; end if;
    v_tarjeta := public._color_tinta_de_la_tarjeta(c ->> 'hex', v_d -> 'claro' ->> 'tinta');
    if v_tarjeta is distinct from c ->> 'tintaDeLaTarjeta' then
      raise exception 'el texto de la tarjeta sobre %: la base % y colores.ts %', c ->> 'hex', v_tarjeta, c ->> 'tintaDeLaTarjeta'; end if;
    -- El aviso suave de la pantalla: ni la tinta oscura (#1b2130) ni el blanco llegan a AA sobre el hex.
    if (greatest(public._color_contraste('#1b2130', c ->> 'hex'), public._color_contraste('#ffffff', c ->> 'hex')) < 4.5) is distinct from (c ->> 'avisoDeLaTarjeta')::boolean then
      raise exception 'el aviso de la tarjeta sobre % decide distinto', c ->> 'hex'; end if;
    v_n := v_n + 1;
  end loop;
  if v_n < 300 then raise exception 'el juego trae % casos', v_n; end if;
end $$;

-- @test colores: AA garantizado en claro y oscuro para negro, blanco, amarillo puro, rojo puro, grises (#767676, #777777, #808080) y #31869b; borde = hex; todo en minúsculas
do $$
declare v_hex text; v_d jsonb; v_t text;
begin
  foreach v_hex in array array['#000000', '#FFFFFF', '#ffff00', '#ff0000', '#767676', '#777777', '#808080', '#31869B', '#00ff00', '#0000ff'] loop
    v_d := public._color_derivar(v_hex);
    foreach v_t in array array['claro', 'oscuro'] loop
      if not public._contraste_aa(public._color_contraste(v_d -> v_t ->> 'tinta', v_d -> v_t ->> 'fondo')) then
        raise exception '% en el tema % no pasa AA: %', v_hex, v_t, v_d; end if;
      if v_d -> v_t ->> 'borde' <> lower(v_hex) then raise exception 'el borde de % en % no es el hex: %', v_hex, v_t, v_d; end if;
      if (v_d -> v_t ->> 'fondo') !~ '^#[0-9a-f]{6}$' or (v_d -> v_t ->> 'tinta') !~ '^#[0-9a-f]{6}$' then
        raise exception 'no está en minúsculas: %', v_d; end if;
    end loop;
    if public._color_luminancia(v_d -> 'claro' ->> 'fondo') < 0.8 or public._color_luminancia(v_d -> 'oscuro' ->> 'fondo') > 0.05 then
      raise exception 'los fondos de % no llegan a su umbral: %', v_hex, v_d; end if;
  end loop;
  -- Los de fábrica (su hex es su fondo claro) quedan con ese mismo fondo claro, y la mezcla redondea como Math.round (la mitad sube).
  if public._color_derivar('#fff7d6') -> 'claro' ->> 'fondo' <> '#fff7d6' then raise exception 'un hex claro cambió de fondo'; end if;
  if public._color_mezclar('#000000', '#010101', 0.5) <> '#010101' or public._color_mezclar('#000000', '#030303', 0.5) <> '#020202' then
    raise exception 'el redondeo de la mezcla no es el de Math.round'; end if;
  if public._color_mezclar('#123456', '#abcdef', 0) <> '#123456' or public._color_mezclar('#123456', '#ABCDEF', 1) <> '#abcdef' then
    raise exception 'los extremos de la mezcla'; end if;
end $$;

-- @test colores: _tono_hex acepta mayúsculas y espacios, rechaza #fff, rojo, #12345g y nulo con 22023, hint hex y el texto
do $$
begin
  if public._tono_hex('  #31869B ') <> '#31869b' then raise exception 'no normalizó: %', public._tono_hex('  #31869B '); end if;
  perform pg_temp.colores_falla($f$select public._tono_hex('#fff')$f$, '22023', 'Escríbelo como #rrggbb, por ejemplo #31869b.', 'hex');
  perform pg_temp.colores_falla($f$select public._tono_hex('rojo')$f$, '22023', 'Escríbelo como #rrggbb, por ejemplo #31869b.', 'hex');
  perform pg_temp.colores_falla($f$select public._tono_hex('#12345g')$f$, '22023', 'Escríbelo como #rrggbb, por ejemplo #31869b.', 'hex');
  perform pg_temp.colores_falla($f$select public._tono_hex(null)$f$, '22023', 'Escríbelo como #rrggbb, por ejemplo #31869b.', 'hex');
  perform pg_temp.colores_falla($f$select public._color_derivar('azul')$f$, '22023', 'Escríbelo como #rrggbb', 'hex');
end $$;
