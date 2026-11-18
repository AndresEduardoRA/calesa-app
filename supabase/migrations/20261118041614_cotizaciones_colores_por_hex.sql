-- El catálogo de colores (nombre técnico heredado: la tabla `tonos` y las RPC `tono_*`): un color se define con un nombre y un #hex. La tarjeta de la
-- cotización usa el hex tal cual; las versiones de la hoja (claro_* y oscuro_*: fondo, borde y tinta) se derivan del hex en la base con el contraste AA
-- garantizado (`_color_derivar`, espejo de `derivarColores()` de `src/modules/cotizaciones/entities/colores.ts`) y se guardan en las columnas de siempre:
-- la hoja no calcula nada ni cambia de lectura. El tope pasa de 24 a 48.

-- 1. La columna. Cada color existente toma como hex su fondo claro y conserva sus versiones de hoja (la base ya exigía AA): la hoja y la tarjeta se ven
-- igual que antes. `tono_version()` todavía no mira `hex`, así que rellenarla no mueve la versión de nadie con el editor abierto.
alter table public.tonos add column hex text;
update public.tonos set hex = claro_fondo;
alter table public.tonos alter column hex set not null;
alter table public.tonos add constraint tonos_hex_check check (hex ~ '^#[0-9a-f]{6}$') not valid;
alter table public.tonos validate constraint tonos_hex_check;
comment on column public.tonos.hex is
  'El color tal cual (#rrggbb en minúsculas): la tarjeta de la cotización lo pinta así en los dos temas. claro_* y oscuro_* (lo que lee la hoja) se derivan de él al crear o al cambiarlo (_color_derivar), con AA garantizado.';

-- 2. Las funciones de color. Las constantes son copias de las de TS y el juego espejo (`supabase/tests/casos-de-colores.json`) cae si se separan.

-- Mezcla dos #rrggbb canal a canal: `p_peso` es cuánto de `p_hacia` entra (0 deja `p_desde`, 1 da `p_hacia`). El redondeo es el de `Math.round` de
-- `mezclar()` en `src/shared/lib/color.ts` (la mitad sube); nunca `round(float8)`, que redondea al par.
create or replace function public._color_mezclar(p_desde text, p_hacia text, p_peso float8) returns text
language sql immutable set search_path = '' as $$
  select '#' || string_agg(lpad(to_hex((floor(m.v) + case when m.v - floor(m.v) >= 0.5 then 1 else 0 end)::int), 2, '0'), '' order by m.i)
    from (select c.i, c.d::float8 + (c.h - c.d)::float8 * p_peso as v
            from (select x.i, ('x' || substr(lower(p_desde), x.i, 2))::bit(8)::int as d, ('x' || substr(lower(p_hacia), x.i, 2))::bit(8)::int as h
                    from unnest(array[2, 4, 6]) as x (i)) c) m;
$$;
comment on function public._color_mezclar(text, text, float8) is
  'Mezcla dos #rrggbb canal a canal con el redondeo de Math.round (espejo de mezclar() de src/shared/lib/color.ts). De nadie; la llama _color_derivar.';
revoke all on function public._color_mezclar(text, text, float8) from public, anon, authenticated;
grant execute on function public._color_mezclar(text, text, float8) to service_role;

-- Las versiones de la hoja de un hex (espejo de `derivarColores()`): en claro, el fondo es la primera mezcla hacia blanco con luminancia ≥ 0,8 y la tinta,
-- la primera hacia negro que cumple AA sobre él; en oscuro, el fondo es la primera mezcla hacia la superficie oscura de `design/tokens.css` con luminancia
-- ≤ 0,05 y la tinta, la primera hacia blanco con AA. El borde es el hex. En el paso 50 la mezcla es el destino, donde siempre vale: AA garantizado.
create or replace function public._color_derivar(p_hex text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  c_pasos constant int := 50;                -- PASOS_DE_LA_DERIVACION de colores.ts
  c_claro constant float8 := 0.8;            -- LUMINANCIA_DEL_FONDO_CLARO de colores.ts
  c_oscuro constant float8 := 0.05;          -- LUMINANCIA_DEL_FONDO_OSCURO de colores.ts
  c_superficie constant text := '#1d2330';   -- COLOR_SUPERFICIE_OSCURA de src/shared/config/app.ts (el --color-surface de .dark)
  v_hex text := lower(p_hex);
  v_cf text; v_ct text; v_of text; v_ot text;
begin
  if v_hex is null or v_hex !~ '^#[0-9a-f]{6}$' then
    raise exception 'Escríbelo como #rrggbb, por ejemplo #31869b.' using errcode = '22023', hint = 'hex';
  end if;
  for i in 0 .. c_pasos loop
    v_cf := public._color_mezclar(v_hex, '#ffffff', i::float8 / c_pasos);
    exit when public._color_luminancia(v_cf) >= c_claro;
  end loop;
  for i in 0 .. c_pasos loop
    v_ct := public._color_mezclar(v_hex, '#000000', i::float8 / c_pasos);
    exit when public._contraste_aa(public._color_contraste(v_ct, v_cf));
  end loop;
  for i in 0 .. c_pasos loop
    v_of := public._color_mezclar(v_hex, c_superficie, i::float8 / c_pasos);
    exit when public._color_luminancia(v_of) <= c_oscuro;
  end loop;
  for i in 0 .. c_pasos loop
    v_ot := public._color_mezclar(v_hex, '#ffffff', i::float8 / c_pasos);
    exit when public._contraste_aa(public._color_contraste(v_ot, v_of));
  end loop;
  return jsonb_build_object('claro', jsonb_build_object('fondo', v_cf, 'borde', v_hex, 'tinta', v_ct),
                            'oscuro', jsonb_build_object('fondo', v_of, 'borde', v_hex, 'tinta', v_ot));
end;
$$;
comment on function public._color_derivar(text) is
  'Las versiones de la hoja de un #hex, claro y oscuro (fondo, borde y tinta), con AA garantizado: espejo de derivarColores() de src/modules/cotizaciones/entities/colores.ts, probado con supabase/tests/casos-de-colores.json. STABLE por jsonb_build_object. De nadie; la llaman tono_crear y tono_guardar.';
revoke all on function public._color_derivar(text) from public, anon, authenticated;
grant execute on function public._color_derivar(text) to service_role;

-- El texto de la tarjeta sobre el hex (espejo de `tintaDeLaTarjeta()`): la tinta clara del color si cumple AA ahí; si no, la que más contraste dé entre
-- la tinta oscura de la interfaz (#1b2130, COLOR_TINTA de src/shared/config/app.ts) y el blanco.
create or replace function public._color_tinta_de_la_tarjeta(p_hex text, p_tinta_clara text) returns text
language sql immutable set search_path = '' as $$
  select case when public._contraste_aa(public._color_contraste(p_tinta_clara, p_hex)) then lower(p_tinta_clara)
              when public._color_contraste('#1b2130', p_hex) >= public._color_contraste('#ffffff', p_hex) then '#1b2130'
              else '#ffffff' end;
$$;
comment on function public._color_tinta_de_la_tarjeta(text, text) is
  'El texto de un grupo de la tarjeta sobre el hex de su color: la tinta clara si cumple AA, si no #1b2130 o blanco, el de más contraste (espejo de tintaDeLaTarjeta()). De nadie; la llama cotizacion_tarjeta.';
revoke all on function public._color_tinta_de_la_tarjeta(text, text) from public, anon, authenticated;
grant execute on function public._color_tinta_de_la_tarjeta(text, text) to service_role;

-- El hex que llega de afuera: espacios recortados, en minúsculas y `#rrggbb`; si no, el motivo junto al campo (`hint = hex`), el mismo texto que da la pantalla.
create or replace function public._tono_hex(p_texto text) returns text
language plpgsql stable set search_path = '' as $$
declare v text := lower(btrim(p_texto));
begin
  if v is null or v !~ '^#[0-9a-f]{6}$' then
    raise exception 'Escríbelo como #rrggbb, por ejemplo #31869b.' using errcode = '22023', hint = 'hex';
  end if;
  return v;
end;
$$;
comment on function public._tono_hex(text) is
  'Valida y normaliza el #hex de un color del catálogo (espejo de normalizarHex() de entities/diseno/tonos.ts). De nadie; la llaman tono_crear y tono_guardar.';
revoke all on function public._tono_hex(text) from public, anon, authenticated;
grant execute on function public._tono_hex(text) to service_role;

-- 3. Un color cuyas versiones de hoja no cumplen AA se deriva de su hex (la base ya lo exigía al escribir: es una red por si la nube trae otra cosa).
update public.tonos t
   set claro_fondo = x.d -> 'claro' ->> 'fondo', claro_borde = x.d -> 'claro' ->> 'borde', claro_tinta = x.d -> 'claro' ->> 'tinta',
       oscuro_fondo = x.d -> 'oscuro' ->> 'fondo', oscuro_borde = x.d -> 'oscuro' ->> 'borde', oscuro_tinta = x.d -> 'oscuro' ->> 'tinta'
  from (select y.id, public._color_derivar(y.hex) as d from public.tonos y) x
 where x.id = t.id
   and not (public._contraste_aa(public._color_contraste(t.claro_tinta, t.claro_fondo))
            and public._contraste_aa(public._color_contraste(t.oscuro_tinta, t.oscuro_fondo)));

-- 4. La versión de un color se mueve también si cambia su hex.
create or replace function public.tono_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.hex, new.claro_fondo, new.claro_borde, new.claro_tinta, new.oscuro_fondo, new.oscuro_borde, new.oscuro_tinta)
     is distinct from (old.nombre, old.hex, old.claro_fondo, old.claro_borde, old.claro_tinta, old.oscuro_fondo, old.oscuro_borde, old.oscuro_tinta) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;
revoke all on function public.tono_version() from public, anon, authenticated;
grant execute on function public.tono_version() to service_role;

-- 5. El tope y la lista que devuelven las tres escrituras (con el hex).
create or replace function public._tonos_tope() returns integer
language sql immutable set search_path = '' as $$ select 48; $$;
revoke all on function public._tonos_tope() from public, anon, authenticated;
grant execute on function public._tonos_tope() to service_role;

create or replace function public._tonos_lista() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tope', public._tonos_tope(),
    'tonos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'hex', t.hex, 'actualizado_en', t.actualizado_en,
        'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
        'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.nombre)
      from (select x.* from public.tonos x order by x.nombre limit public._tonos_tope()) t), '[]'::jsonb));
$$;
revoke all on function public._tonos_lista() from public, anon, authenticated;
grant execute on function public._tonos_lista() to service_role;

-- 6. El nombre (los textos dicen «color»).
create or replace function public._tono_nombre(p_texto text) returns text
language plpgsql stable set search_path = '' as $$
declare v text := btrim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g'));
begin
  if v = '' then
    raise exception 'Escribe el nombre del color.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v) > 40 then
    raise exception 'El nombre del color admite hasta 40 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;
revoke all on function public._tono_nombre(text) from public, anon, authenticated;
grant execute on function public._tono_nombre(text) to service_role;

-- 7. Crear recibe el hex en vez de los seis colores (otra firma: drop + create). Los colores de hoja los deriva la base; `_tono_colores` queda como red
-- de defensa sobre lo derivado (forma y AA).
drop function public.tono_crear(uuid, text, jsonb);

create function public.tono_crear(p_id uuid, p_nombre text, p_hex text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_nombre text; v_hex text; v_version timestamptz; v_c jsonb; v_tope integer := public._tonos_tope();
begin
  perform public.assert_permiso('cotizaciones.configurar');
  lock table public.tonos in share row exclusive mode;
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  select t.actualizado_en into v_version from public.tonos t where t.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true, 'lista', public._tonos_lista());
  end if;
  v_nombre := public._tono_nombre(p_nombre);
  v_hex := public._tono_hex(p_hex);
  v_c := public._tono_colores(public._color_derivar(v_hex));
  if (select count(*) from (select 1 from public.tonos limit v_tope) t) >= v_tope then
    raise exception 'Ya hay % colores, que es el máximo. Elimina uno que ningún grupo use.', v_tope using errcode = '22023', hint = 'nombre';
  end if;
  if exists (select 1 from public.tonos t where lower(btrim(t.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un color «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  insert into public.tonos (id, clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
  values (p_id, public._tono_clave(v_nombre), v_nombre, v_hex, v_c -> 'claro' ->> 'fondo', v_c -> 'claro' ->> 'borde', v_c -> 'claro' ->> 'tinta',
          v_c -> 'oscuro' ->> 'fondo', v_c -> 'oscuro' ->> 'borde', v_c -> 'oscuro' ->> 'tinta')
  returning actualizado_en into v_version;
  perform public.registrar_actividad('tono.crear', 'tonos', p_id::text, null, jsonb_build_object('nombre', v_nombre, 'hex', v_hex, 'colores', v_c));
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', false, 'lista', public._tonos_lista());
end;
$$;
comment on function public.tono_crear(uuid, text, text) is
  'Crea un color del catálogo (cotizaciones.configurar) con el id del intento (repetirlo devuelve el mismo): nombre y #hex; la clave sale del nombre y las versiones de la hoja se derivan del hex (_color_derivar). Tope _tonos_tope(). Devuelve la lista entera.';
revoke all on function public.tono_crear(uuid, text, text) from public, anon;
grant execute on function public.tono_crear(uuid, text, text) to authenticated, service_role;

-- 8. Guardar cambia el nombre o el hex. Un hex distinto deriva de nuevo las versiones de la hoja; el mismo hex no las toca (un guardado sin cambio no
-- altera un color migrado). `colores` ya no se acepta.
create or replace function public.tono_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.tonos; v_k text; v_nombre text; v_hex text; v_c jsonb; v_version timestamptz;
begin
  perform public.assert_permiso('cotizaciones.configurar');
  lock table public.tonos in share row exclusive mode;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un color tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k not in ('nombre', 'hex') then
      raise exception 'El dato «%» de un color no se cambia.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  select * into o from public.tonos x where x.id = p_id for update;
  if not found then
    raise exception 'Ese color ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este color mientras lo editabas.');   -- rechaza también una versión nula

  v_nombre := o.nombre;
  if p_cambios ? 'nombre' then
    if jsonb_typeof(p_cambios -> 'nombre') <> 'string' then
      raise exception 'Escribe el nombre del color.' using errcode = '22023', hint = 'nombre';
    end if;
    v_nombre := public._tono_nombre(p_cambios ->> 'nombre');
  end if;
  v_hex := o.hex;
  if p_cambios ? 'hex' then
    v_hex := public._tono_hex(case when jsonb_typeof(p_cambios -> 'hex') = 'string' then p_cambios ->> 'hex' end);
  end if;
  v_c := case when v_hex is distinct from o.hex then public._tono_colores(public._color_derivar(v_hex))
              else jsonb_build_object('claro', jsonb_build_object('fondo', o.claro_fondo, 'borde', o.claro_borde, 'tinta', o.claro_tinta),
                                      'oscuro', jsonb_build_object('fondo', o.oscuro_fondo, 'borde', o.oscuro_borde, 'tinta', o.oscuro_tinta)) end;
  if exists (select 1 from public.tonos t where t.id <> p_id and lower(btrim(t.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un color «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  update public.tonos set nombre = v_nombre, hex = v_hex,
         claro_fondo = v_c -> 'claro' ->> 'fondo', claro_borde = v_c -> 'claro' ->> 'borde', claro_tinta = v_c -> 'claro' ->> 'tinta',
         oscuro_fondo = v_c -> 'oscuro' ->> 'fondo', oscuro_borde = v_c -> 'oscuro' ->> 'borde', oscuro_tinta = v_c -> 'oscuro' ->> 'tinta'
   where id = p_id returning actualizado_en into v_version;
  perform public.registrar_actividad('tono.guardar', 'tonos', p_id::text, jsonb_build_object('nombre', o.nombre, 'hex', o.hex),
                                     jsonb_build_object('nombre', v_nombre, 'hex', v_hex, 'colores', v_c));
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'lista', public._tonos_lista());
end;
$$;
revoke all on function public.tono_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.tono_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

-- 9. Eliminar: la misma regla, con los textos de «color».
create or replace function public.tono_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.tonos; v_origen text;
begin
  perform public.assert_permiso('cotizaciones.configurar');
  lock table public.tonos in share row exclusive mode;
  select * into o from public.tonos x where x.id = p_id for update;
  if not found then
    raise exception 'Ese color ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este color mientras lo editabas.');
  v_origen := public._tono_en_uso(o.clave);
  if v_origen is not null then
    raise exception '«%» lo usa la fórmula de «%» (alguna de sus versiones): no se elimina. Cambia su nombre o su color.', o.nombre, v_origen using errcode = '23503';
  end if;
  delete from public.tonos where id = p_id;
  perform public.registrar_actividad('tono.eliminar', 'tonos', p_id::text, jsonb_build_object('nombre', o.nombre, 'clave', o.clave), null);
  return jsonb_build_object('lista', public._tonos_lista());
end;
$$;
revoke all on function public.tono_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.tono_eliminar(uuid, timestamptz) to authenticated, service_role;

-- 10. La tabla dice qué es.
comment on table public.tonos is
  'Catálogo de colores de la empresa (nombre técnico heredado: tonos): nombre, clave y #hex; la tarjeta usa el hex y la hoja sus versiones clara y oscura (fondo, borde y tinta) derivadas con AA (_color_derivar). Sólo de lectura para la app: se escribe por tono_*(). Un color que alguna versión de una fórmula nombra no se elimina.';
