-- `vehiculos_inventario()` por el cierre más próximo (`p_orden = 'cierre'`): los tramos y su orden (O1), el cursor de ida y de vuelta cruzando los tramos (O2), los tramos
-- que trae cada filtro de «Subasta» (O3), la ruta «propios» (O4) y la condición de siempre (O5). La ventana `cierre_entre` contra su copia de PostgREST la ata
-- `vehiculos-inventario-filtros.sql`. Cada bloque abre su transacción y la revierte; sus ayudantes `pg_temp.oc_*` nacen dentro. Compara nombres, nunca texto.
-- Los tramos son los de `tramoDelCierre()` (src/modules/vehiculos/entities/cursor-del-cierre.ts): 0 viva con fecha, 1 viva sin fecha, 2 lo demás.

-- @test vehiculos_inventario: O1-O5 el orden por el cierre, por tramos, su cursor y la ruta «propios»
begin;
insert into auth.users (id, email) select '00000000-0000-0000-0000-000000000001', 'duena@ejemplo.com' where not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000001');
create function pg_temp.oc_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;
create temp table oc_v (nombre text primary key, id uuid not null unique);
grant select on oc_v to authenticated;
-- Todas las páginas por el cierre como esa persona, de a `p_tamano`, hacia adelante; y de vuelta con «Anterior» desde la última: cada una, los nombres en orden.
-- El cursor se arma como en la app: la clave de la fila (el cierre en el tramo 0, el alta en los otros) y su tramo.
create function pg_temp.oc_recorrer(p_quien uuid, p_origen uuid, p_tamano int, p_filtros jsonb, out ida text[], out vuelta text[]) language plpgsql as $f$
declare v_en timestamptz; v_id uuid; v_t smallint; r record; v_n int; v_vueltas int := 0; v_pag text[]; v_primera record; v_ultima record;
begin
  ida := '{}'; vuelta := '{}';
  perform pg_temp.oc_como(p_quien);
  loop
    v_n := 0; v_primera := null;
    set local role authenticated;
    for r in select coalesce(n.nombre, x.id::text) as nombre, x.id, x.creado_en, x.cierre_subasta_en, x.situacion
               from public.vehiculos_inventario(p_origen, p_tamano, p_filtros, v_en, v_id, false, 'cierre', v_t) x left join oc_v n on n.id = x.id loop
      v_n := v_n + 1;
      exit when v_n > p_tamano;
      if r.nombre = any (ida) then raise exception 'el orden por el cierre repite %', r.nombre; end if;
      ida := ida || r.nombre; v_ultima := r;
    end loop;
    reset role;
    exit when v_n <= p_tamano;
    v_t := case when v_ultima.situacion = 'en_subasta' and v_ultima.cierre_subasta_en is not null then 0 when v_ultima.situacion = 'en_subasta' then 1 else 2 end;
    v_en := case v_t when 0 then v_ultima.cierre_subasta_en else v_ultima.creado_en end; v_id := v_ultima.id;
    v_vueltas := v_vueltas + 1;
    if v_vueltas > 200 then raise exception 'el recorrido no termina'; end if;
  end loop;
  -- De vuelta: desde la primera fila de la última página, hacia atrás (la función las da en orden inverso).
  v_pag := ida[(cardinality(ida) - ((cardinality(ida) - 1) % p_tamano)):];
  vuelta := v_pag;
  select x.* into v_primera from public.vehiculos x join oc_v n on n.id = x.id where n.nombre = v_pag[1];
  loop
    exit when v_primera is null;
    v_t := case when v_primera.situacion = 'en_subasta' and v_primera.cierre_subasta_en is not null then 0 when v_primera.situacion = 'en_subasta' then 1 else 2 end;
    v_en := case v_t when 0 then v_primera.cierre_subasta_en else v_primera.creado_en end; v_id := v_primera.id;
    v_pag := '{}'; v_n := 0;
    set local role authenticated;
    for r in select coalesce(n.nombre, x.id::text) as nombre
               from public.vehiculos_inventario(p_origen, p_tamano, p_filtros, v_en, v_id, true, 'cierre', v_t) x left join oc_v n on n.id = x.id loop
      v_n := v_n + 1;
      exit when v_n > p_tamano;
      v_pag := r.nombre || v_pag;
    end loop;
    reset role;
    vuelta := v_pag || vuelta;
    exit when v_n <= p_tamano or cardinality(v_pag) = 0;
    select x.* into v_primera from public.vehiculos x join oc_v n on n.id = x.id where n.nombre = v_pag[1];
    v_vueltas := v_vueltas + 1;
    if v_vueltas > 400 then raise exception 'el recorrido hacia atrás no termina'; end if;
  end loop;
exception when others then
  reset role;
  raise;
end $f$;
-- La primera página (de a 100) por el cierre como esa persona: los nombres.
create function pg_temp.oc_primera(p_quien uuid, p_origen uuid, p_filtros jsonb) returns text[] language plpgsql as $f$
declare v text[];
begin
  perform pg_temp.oc_como(p_quien);
  set local role authenticated;
  select coalesce(array_agg(coalesce(n.nombre, x.id::text) order by k), '{}') into v
    from public.vehiculos_inventario(p_origen, 100, p_filtros, null, null, false, 'cierre') with ordinality x (id, numero, origen_id, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen, precio, precio_negociable, acepta_permuta,
      placado, kilometraje, categoria_id, fase_id, atributos, lead_id, publicado_web, destacado_web, precio_web, precio_web_hasta, precio_web_nota, creado_por, creado_en,
      actualizado_en, estado_subasta, situacion, cierre_subasta_en, limpieza_el, portada_ruta, k) left join oc_v n on n.id = x.id;
  reset role;
  return v;
exception when others then
  reset role;
  raise;
end $f$;
grant execute on all functions in schema pg_temp to authenticated;
do $$
declare
  d constant uuid := '00000000-0000-0000-0000-000000000001';
  p constant uuid := '00000000-0000-0000-0000-000000000ec1';
  o uuid; v_flujo uuid; f_sub uuid; f_comp uuid; v_rol uuid;
  ahora constant timestamptz := now();
  v_todo text[]; v_ida text[]; v_vuelta text[]; r record; v_id uuid;
  sin_no_ganadas constant jsonb := '[{"tipo": "situacion_fuera_de", "valores": ["no_ganada"]}]';
begin
  insert into public.origenes (clave, nombre, tipo) values ('oc_subasta', 'OC subasta', 'subasta') returning id into o;
  select id into v_flujo from public.flujos where origen_id = o;
  insert into public.fases (flujo_id, nombre, orden, es_inicial, es_subasta) values (v_flujo, 'OC subasta', 1, true, true) returning id into f_sub;
  insert into public.fases (flujo_id, nombre, orden, es_inicial, es_subasta) values (v_flujo, 'OC comprado', 2, false, false) returning id into f_comp;
  -- P ve «propios» del origen: lo que creó.
  insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('oc_p', 'OC P') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'vehiculos.ver', o, 'propios');
  -- El terreno: el alta de cada uno, en minutos antes de ahora (más grande = más viejo); el cierre de las vivas, en horas desde ahora, desordenado respecto del alta.
  -- (nombre, minutos de alta, estado, fin en horas, fase, no ganada, de P)
  for r in select * from (values
      ('viva +30h', 10, 'abierta', 30, 's', false, true),
      ('viva +2h', 20, 'abierta', 2, 's', false, false),
      ('viva +100h', 30, 'en_vivo', 100, 's', false, true),
      ('viva +5h', 40, 'abierta', 5, 's', false, false),
      ('viva sin fecha nueva', 50, 'abierta', null, 's', false, true),
      ('viva sin fecha vieja', 60, 'abierta', null, 's', false, false),
      ('sin resolver', 15, 'terminada', -24, 's', false, true),
      ('comprado', 25, null, null, 'c', false, false),
      ('abierta vieja comprada', 35, 'abierta', -200, 'c', false, true),
      ('no ganada', 45, 'terminada', -48, 's', true, false),
      ('sin fase', 55, null, null, null, false, false)) t (nombre, min, estado, horas, fase, no, de_p) loop
    insert into public.vehiculos (origen_id, titulo, creado_por, creado_en, fase_id, fase_desde, estado_subasta, subasta_en, subasta_fin_en, subasta_resultado, subasta_resuelta_en)
    values (o, 'OC ' || r.nombre, case when r.de_p then p else d end, ahora - make_interval(mins => r.min),
            case r.fase when 's' then f_sub when 'c' then f_comp end, case when r.fase is not null then ahora - make_interval(mins => r.min) end,
            r.estado::public.estado_subasta, case when r.horas is not null then ahora + make_interval(hours => r.horas) end,
            case when r.horas is not null then ahora + make_interval(hours => r.horas) end,
            case when r.no then 'no_ganada' end, case when r.no then ahora end)
    returning id into v_id;
    insert into oc_v (nombre, id) values (r.nombre, v_id);
  end loop;
  -- El terreno quedó con la situación que se espera (la calcula la base).
  for r in select n.nombre, v.situacion, case when n.nombre like 'viva%' then 'en_subasta' when n.nombre = 'sin resolver' then 'sin_resolver' when n.nombre = 'no ganada' then 'no_ganada'
                    else 'fase' end as esperada from oc_v n join public.vehiculos v on v.id = n.id loop
    if r.situacion is distinct from r.esperada then raise exception 'O0: «%» quedó %', r.nombre, r.situacion; end if;
  end loop;

  -- O1: la primera página: las vivas con fecha por su cierre, las vivas sin fecha por alta, y lo demás por alta (sin las no ganadas: la de siempre).
  v_todo := array['viva +2h', 'viva +5h', 'viva +30h', 'viva +100h', 'viva sin fecha nueva', 'viva sin fecha vieja', 'sin resolver', 'comprado', 'abierta vieja comprada', 'sin fase'];
  if pg_temp.oc_primera(d, o, sin_no_ganadas) is distinct from v_todo then raise exception 'O1: la primera página por el cierre es %', pg_temp.oc_primera(d, o, sin_no_ganadas); end if;

  -- O2: de a 2 (y de a 3) hacia adelante cruza los tres tramos sin repetir ni saltear; hacia atrás desde la última página, lo mismo.
  select * into v_ida, v_vuelta from pg_temp.oc_recorrer(d, o, 2, sin_no_ganadas);
  if v_ida is distinct from v_todo then raise exception 'O2: de a 2 hacia adelante: %', v_ida; end if;
  if v_vuelta is distinct from v_todo then raise exception 'O2: de a 2 hacia atrás: %', v_vuelta; end if;
  select * into v_ida, v_vuelta from pg_temp.oc_recorrer(d, o, 3, sin_no_ganadas);
  if v_ida is distinct from v_todo or v_vuelta is distinct from v_todo then raise exception 'O2: de a 3: % / %', v_ida, v_vuelta; end if;

  -- O3: una ventana trae sólo vivas con fecha, por su cierre y con `hasta` exclusivo; «Todas las vivas», los tramos 0 y 1; «Sin resolver», sólo la suya.
  if pg_temp.oc_primera(d, o, jsonb_build_array(jsonb_build_object('tipo', 'cierre_entre', 'desde', to_jsonb(ahora), 'hasta', to_jsonb(ahora + interval '30 hours'))) || sin_no_ganadas)
     is distinct from array['viva +2h', 'viva +5h'] then
    raise exception 'O3: la ventana de 30 h (exclusiva) no trae sólo las de 2 y 5 h';
  end if;
  if pg_temp.oc_primera(d, o, jsonb_build_array(jsonb_build_object('tipo', 'cierre_entre', 'desde', to_jsonb(ahora - interval '300 hours'), 'hasta', to_jsonb(ahora + interval '1000 hours'))))
     is distinct from array['viva +2h', 'viva +5h', 'viva +30h', 'viva +100h'] then
    raise exception 'O3: la ventana ancha trae la abierta vieja (fuera del tramo) o la sin resolver con el cierre pasado';
  end if;
  if pg_temp.oc_primera(d, o, '[{"tipo": "situacion_en", "situaciones": ["en_subasta"], "fases": [], "sinFase": false}]'::jsonb || sin_no_ganadas)
     is distinct from v_todo[1:6] then
    raise exception 'O3: «Todas las vivas» por el cierre no son los tramos 0 y 1';
  end if;
  if pg_temp.oc_primera(d, o, '[{"tipo": "situacion_en", "situaciones": ["sin_resolver"], "fases": [], "sinFase": false}]'::jsonb || sin_no_ganadas)
     is distinct from array['sin resolver'] then
    raise exception 'O3: «Sin resolver» por el cierre no es sólo la suya';
  end if;
  -- Varias ramas de «Situación» (las vivas y las no ganadas) con su orden por tramos.
  if pg_temp.oc_primera(d, o, '[{"tipo": "situacion_en", "situaciones": ["no_ganada", "en_subasta"], "fases": [], "sinFase": false}]'::jsonb)
     is distinct from v_todo[1:6] || array['no ganada'] then
    raise exception 'O3: las vivas y las no ganadas por el cierre no van por tramos';
  end if;
  -- La fase (por la columna, no por la situación): «OC subasta» trae las vivas, la sin resolver y la no ganada que están en ella.
  if pg_temp.oc_primera(d, o, jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', jsonb_build_array(f_sub), 'incluirNulo', false)) || sin_no_ganadas)
     is distinct from v_todo[1:7] then
    raise exception 'O3: la fase de subasta por el cierre es %', pg_temp.oc_primera(d, o, jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', jsonb_build_array(f_sub), 'incluirNulo', false)) || sin_no_ganadas);
  end if;

  -- O4: P va por la ruta «propios» (R2) y ve lo suyo en el mismo orden, de ida y de vuelta.
  perform pg_temp.oc_como(p);
  set local role authenticated;
  if not public.leads_cartera_corta() then reset role; raise exception 'O4: la cartera de P no es corta: no va por «propios»'; end if;
  reset role;
  select * into v_ida, v_vuelta from pg_temp.oc_recorrer(p, o, 2, sin_no_ganadas);
  if v_ida is distinct from array['viva +30h', 'viva +100h', 'viva sin fecha nueva', 'sin resolver', 'abierta vieja comprada'] or v_vuelta is distinct from v_ida then
    raise exception 'O4: P por «propios»: % / %', v_ida, v_vuelta;
  end if;

  -- O5: sin la de siempre, la no ganada entra en el tramo 2 por su alta.
  if pg_temp.oc_primera(d, o, '[]') is distinct from v_todo[1:9] || array['no ganada', 'sin fase'] then raise exception 'O5: sin filtros por el cierre es %', pg_temp.oc_primera(d, o, '[]'); end if;
end $$;
rollback;
