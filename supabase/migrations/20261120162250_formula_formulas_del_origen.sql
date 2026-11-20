-- Fórmulas del origen: un origen tiene una o más fórmulas con nombre, cada una con su borrador, sus versiones, su diseño y su plantilla de
-- tarjeta, y a lo sumo una activa, que es la que se usa al cotizar. docs/COTIZADOR.md › «Fórmulas del origen».

create table public.formulas_del_origen (
  id uuid primary key default gen_random_uuid(),
  origen_id uuid not null references public.origenes (id) on delete cascade,
  nombre text not null check (nombre = btrim(nombre) and char_length(nombre) between 1 and 60),
  activa boolean not null default false,
  copiada_de_otro_origen boolean not null default false,
  activada_en timestamptz,
  activada_por uuid references public.perfiles (id) on delete set null,
  desactivada_en timestamptz,
  archivada_en timestamptz,
  archivada_por uuid references public.perfiles (id) on delete set null,
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- El destino de la FK compuesta de `formulas` y `plantillas_tarjeta`: una versión nunca cuelga de la fórmula de otro origen. Con `origen_id`
  -- adelante, también es el índice de la FK a `origenes`.
  constraint formulas_del_origen_origen_id_id_key unique (origen_id, id),
  constraint formulas_del_origen_activa_no_archivada check (not (activa and archivada_en is not null))
);

-- A lo sumo una activa por origen. Cambiar de activa apaga la vieja antes de prender la nueva.
create unique index formulas_del_origen_activa_unica on public.formulas_del_origen (origen_id) where activa;
-- Nombre único por origen sin distinguir mayúsculas, también entre las archivadas.
create unique index formulas_del_origen_nombre_unico on public.formulas_del_origen (origen_id, lower(nombre));
-- La lista de un origen (las no archivadas, más nuevas primero), la fórmula de trabajo y el tope de 50.
create index formulas_del_origen_origen_idx on public.formulas_del_origen (origen_id, archivada_en, creado_en desc, id desc);
create index formulas_del_origen_activada_por_idx on public.formulas_del_origen (activada_por);
create index formulas_del_origen_archivada_por_idx on public.formulas_del_origen (archivada_por);
create index formulas_del_origen_creado_por_idx on public.formulas_del_origen (creado_por);

create trigger trg_actualizado_en before update on public.formulas_del_origen
  for each row execute function public.set_actualizado_en();

alter table public.formulas_del_origen enable row level security;
revoke all on table public.formulas_del_origen from anon, authenticated;
grant select on table public.formulas_del_origen to authenticated;
grant all on table public.formulas_del_origen to service_role;
-- Se escribe sólo por RPC (formula_del_origen_*, y las de la fórmula y la plantilla al crear la de trabajo).
create policy "formulas_del_origen: leer" on public.formulas_del_origen for select to authenticated
  using (origen_id = any ((select public.origenes_con_alcance('cotizaciones.configurar', 'propios'))::uuid[]));

comment on table public.formulas_del_origen is 'Una fórmula con nombre de un origen: agrupa sus versiones de formulas (borrador, publicada, archivadas) y su plantilla de tarjeta. A lo sumo una activa por origen (la que se cotiza). Se lee con cotizaciones.configurar del origen y se escribe sólo por RPC. docs/COTIZADOR.md › «Fórmulas del origen».';
comment on column public.formulas_del_origen.activa is 'La que se usa al cotizar en su origen (formulas_del_origen_activa_unica). Una activa siempre tiene versión publicada y no está archivada.';
comment on column public.formulas_del_origen.activada_en is 'La última vez que pasó a ser la activa; con valor, la fórmula ya no se elimina (se archiva).';
comment on column public.formulas_del_origen.desactivada_en is 'Cuándo dejó de ser la activa: desde ahí corren las 24 h de «Guardar con la N» para una hoja abierta con su versión.';
comment on column public.formulas_del_origen.copiada_de_otro_origen is 'Nació como copia de una fórmula de otro origen: publicar y activar exigen que cada dato del vehículo que nombra exista en este origen.';

-- Las versiones y la plantilla pasan a colgar de una fórmula del origen. `origen_id` queda en las dos tablas: las policies, cotizacion_validar y
-- las hermanas siguen igual, y la FK compuesta impide que se mezclen orígenes.
alter table public.formulas add column formula_del_origen_id uuid;
alter table public.plantillas_tarjeta add column formula_del_origen_id uuid;

-- Lo de hoy: una «Fórmula» por origen con versiones o plantilla, activa si tiene publicada. Sin mover `actualizado_en` (es la esperada de los
-- borradores abiertos) ni escribir actividad.
alter table public.formulas disable trigger trg_actualizado_en, disable trigger trg_auditar;
alter table public.plantillas_tarjeta disable trigger trg_actualizado_en, disable trigger trg_auditar;

insert into public.formulas_del_origen (origen_id, nombre, activa, activada_en, activada_por, creado_en)
select o.origen_id, 'Fórmula', p.id is not null, p.publicado_en, p.publicado_por, o.creado_en
  from (select x.origen_id, min(x.creado_en) as creado_en
          from (select f.origen_id, f.creado_en from public.formulas f
                union all
                select t.origen_id, t.creado_en from public.plantillas_tarjeta t) x
         group by x.origen_id) o
  left join public.formulas p on p.origen_id = o.origen_id and p.estado = 'publicada';

update public.formulas f set formula_del_origen_id = d.id from public.formulas_del_origen d where d.origen_id = f.origen_id;
update public.plantillas_tarjeta t set formula_del_origen_id = d.id from public.formulas_del_origen d where d.origen_id = t.origen_id;

alter table public.formulas enable trigger trg_actualizado_en, enable trigger trg_auditar;
alter table public.plantillas_tarjeta enable trigger trg_actualizado_en, enable trigger trg_auditar;

alter table public.formulas alter column formula_del_origen_id set not null;
alter table public.plantillas_tarjeta alter column formula_del_origen_id set not null;

alter table public.formulas
  add constraint formulas_formula_del_origen_fkey foreign key (origen_id, formula_del_origen_id)
      references public.formulas_del_origen (origen_id, id) on delete cascade;
alter table public.plantillas_tarjeta
  add constraint plantillas_tarjeta_formula_del_origen_fkey foreign key (origen_id, formula_del_origen_id)
      references public.formulas_del_origen (origen_id, id) on delete cascade;

-- Un borrador y una publicada por fórmula del origen; cada una numera sus versiones desde 1.
drop index public.formulas_borrador_unico;
drop index public.formulas_publicada_unica;
drop index public.plantillas_borrador_unico;
drop index public.plantillas_publicada_unica;
alter table public.formulas drop constraint formulas_origen_id_version_key;
alter table public.plantillas_tarjeta drop constraint plantillas_tarjeta_origen_id_version_key;
create unique index formulas_borrador_unico on public.formulas (formula_del_origen_id) where estado = 'borrador';
create unique index formulas_publicada_unica on public.formulas (formula_del_origen_id) where estado = 'publicada';
create unique index plantillas_borrador_unico on public.plantillas_tarjeta (formula_del_origen_id) where estado = 'borrador';
create unique index plantillas_publicada_unica on public.plantillas_tarjeta (formula_del_origen_id) where estado = 'publicada';
alter table public.formulas add constraint formulas_formula_del_origen_id_version_key unique (formula_del_origen_id, version);
alter table public.plantillas_tarjeta add constraint plantillas_tarjeta_formula_del_origen_id_version_key unique (formula_del_origen_id, version);
-- La FK compuesta y la de `origenes`, y la columna de la policy.
create index formulas_origen_id_formula_del_origen_id_idx on public.formulas (origen_id, formula_del_origen_id);
create index plantillas_tarjeta_origen_id_formula_del_origen_id_idx on public.plantillas_tarjeta (origen_id, formula_del_origen_id);

comment on table public.formulas is 'Las versiones de una fórmula del origen, append-only. A lo sumo un borrador y una publicada por fórmula del origen. Publicar archiva la vigente. «Revertir» publica una copia. Escritura sólo por RPC formula_*.';
comment on table public.plantillas_tarjeta is 'Cómo se ve la cotización (PDF y tarjeta), de una fórmula del origen. Versionado espejo de formulas, independiente de ella.';
comment on column public.formulas.formula_del_origen_id is 'La fórmula del origen de esta versión. Nula al insertar: la pone trg_fdo_asignar (la de trabajo del origen).';
comment on column public.plantillas_tarjeta.formula_del_origen_id is 'La fórmula del origen de esta plantilla. Nula al insertar: la pone trg_fdo_asignar (la de trabajo del origen).';


-- La fórmula de trabajo de un origen: la activa o, si no hay, la más nueva sin archivar. Con `p_crear`, si el origen no tiene ninguna, crea
-- «Fórmula» (o «Fórmula 2»… si una archivada tiene el nombre). La llaman las RPC con el candado del origen tomado y el trigger de las
-- inserciones directas; dos que crean a la vez chocan en el nombre y la segunda relee la de la primera.
create function public._fdo_de_trabajo(p_origen uuid, p_crear boolean) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  select d.id into v_id from public.formulas_del_origen d where d.origen_id = p_origen and d.activa;   -- formulas_del_origen_activa_unica
  if v_id is null then
    select d.id into v_id from public.formulas_del_origen d                                            -- formulas_del_origen_origen_idx
     where d.origen_id = p_origen and d.archivada_en is null order by d.creado_en desc, d.id desc limit 1;
  end if;
  if v_id is not null or not coalesce(p_crear, false) or p_origen is null then
    return v_id;
  end if;
  for v_n in 1..60 loop
    begin
      insert into public.formulas_del_origen (origen_id, nombre, creado_por)
      values (p_origen, case when v_n = 1 then 'Fórmula' else 'Fórmula ' || v_n end, (select auth.uid()))
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      select d.id into v_id from public.formulas_del_origen d
       where d.origen_id = p_origen and d.archivada_en is null order by d.creado_en desc, d.id desc limit 1;
      if v_id is not null then
        return v_id;
      end if;
    end;
  end loop;
  raise exception 'No pudimos nombrar la fórmula del origen: renombra alguna archivada.' using errcode = '23505', hint = 'nombre';
end $$;
comment on function public._fdo_de_trabajo(uuid, boolean) is 'Interna: la fórmula de trabajo del origen (la activa; si no hay, la más nueva sin archivar). Con p_crear crea «Fórmula» si el origen no tiene ninguna. docs/COTIZADOR.md › «Fórmulas del origen».';

-- La fórmula del origen sobre la que escribe una RPC de Configuración: nula, la de trabajo; con id, la de ese origen y sin archivar. Una de otro
-- origen y una que no existe dan el mismo 42501 que no tener el permiso.
create function public._fdo_resolver(p_origen uuid, p_formula_del_origen uuid, p_crear boolean) returns public.formulas_del_origen
  language plpgsql security definer set search_path = '' as $$
declare
  v public.formulas_del_origen; v_id uuid;
begin
  if p_formula_del_origen is null then
    v_id := public._fdo_de_trabajo(p_origen, p_crear);
    select * into v from public.formulas_del_origen d where d.id = v_id;   -- formulas_del_origen_pkey
    return v;
  end if;
  select * into v from public.formulas_del_origen d where d.id = p_formula_del_origen and d.origen_id = p_origen;   -- formulas_del_origen_pkey
  if v.id is null then
    raise exception 'No tienes el permiso «cotizaciones.configurar».' using errcode = '42501';
  end if;
  if v.archivada_en is not null then
    raise exception 'Esta fórmula está archivada.' using errcode = '22023', hint = 'formula_del_origen';
  end if;
  return v;
end $$;
comment on function public._fdo_resolver(uuid, uuid, boolean) is 'Interna: la fórmula del origen de una RPC de Configuración (nula: la de trabajo). 42501 si no es del origen o no existe; 22023 si está archivada.';

-- La versión que se cotiza en un origen: la publicada de su fórmula activa, o nula.
create function public._publicada_de_la_activa(p_origen uuid) returns uuid
  language sql stable security definer set search_path = '' as $$
  select f.id
    from public.formulas_del_origen d                                                   -- formulas_del_origen_activa_unica
    join public.formulas f on f.formula_del_origen_id = d.id and f.estado = 'publicada'   -- formulas_publicada_unica
   where d.origen_id = p_origen and d.activa;
$$;
comment on function public._publicada_de_la_activa(uuid) is 'Interna: la versión publicada de la fórmula activa del origen (la que se cotiza), o nula. docs/COTIZADOR.md › «Fórmulas del origen».';

-- Los datos del vehículo que nombra una fórmula y el origen no tiene: ni columna común ni campo del origen (activo o no).
create function public._fdo_campos_que_faltan(p_def jsonb, p_origen uuid) returns jsonb
  language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('nodo', x.n ->> 'id', 'campo', x.n ->> 'campo') order by x.o), '[]'::jsonb)
    from jsonb_array_elements(case when jsonb_typeof(p_def -> 'nodos') = 'array' then p_def -> 'nodos' else '[]'::jsonb end) with ordinality x (n, o)
   where x.n ->> 'tipo' = 'campo_vehiculo'
     and coalesce(x.n ->> 'campo', '') not in ('anio', 'marca', 'modelo', 'kilometraje', 'precio')
     and not exists (select 1 from public.origenes_campos c where c.origen_id = p_origen and c.clave = x.n ->> 'campo');   -- origenes_campos_origen_id_clave_key
$$;
comment on function public._fdo_campos_que_faltan(jsonb, uuid) is 'Interna: [{nodo, campo}] de cada campo_vehiculo que no es una columna común ni un campo del origen.';

-- Una copia de otro origen no publica ni se activa con un dato del vehículo que este origen no tiene.
create function public._fdo_exigir_campos(p_def jsonb, p_origen uuid) returns void
  language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb := public._fdo_campos_que_faltan(p_def, p_origen) -> 0;
begin
  if v is not null then
    raise exception 'El dato «%» no existe en este origen: elige otro o créalo en el origen.', v ->> 'campo'
      using errcode = '22023', hint = 'nodos.' || (v ->> 'nodo');
  end if;
end $$;
comment on function public._fdo_exigir_campos(jsonb, uuid) is 'Interna: 22023 (hint nodos.<id>) si la fórmula nombra un dato del vehículo que el origen no tiene. La usan publicar y activar en una copia de otro origen.';

-- La fórmula en blanco: la fila del total, que se escribe a mano, en el tipo de cambio por defecto (el total necesita un bucket y el bucket un
-- tipo de cambio que exista), y la hoja con esa sola celda.
create function public._fdo_formula_en_blanco() returns jsonb
  language plpgsql stable security definer set search_path = '' as $$
declare
  v_tc text;
begin
  select t.clave into v_tc from public.tipos_cambio t order by t.activo desc, t.es_default desc, t.orden, t.clave collate "C" limit 1;
  if v_tc is null then
    raise exception 'Crea un tipo de cambio antes de la primera fórmula.' using errcode = '22023', hint = 'tipos_cambio';
  end if;
  return jsonb_build_object(
    'definicion', jsonb_build_object(
      'nodos', jsonb_build_array(
        jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', v_tc, 'etiqueta', 'Tipo de cambio'),
        jsonb_build_object('id', 'total', 'tipo', 'input', 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'local')),
      'buckets', jsonb_build_object('local', 'tc')),
    'params', '{}'::jsonb,
    'diseno', jsonb_build_object(
      'cabecera', jsonb_build_object('modos', '[]'::jsonb, 'ver_total_bs', false),
      'secciones', jsonb_build_array(jsonb_build_object('id', 'hoja', 'presentacion', 'principal',
        'items', jsonb_build_array(jsonb_build_object('tipo', 'celda', 'nodo', 'total', 'ancho', 'completo')))),
      'tarjeta_total', jsonb_build_object('nodo', 'total', 'secundarios', '[]'::jsonb)));
end $$;
comment on function public._fdo_formula_en_blanco() is 'Interna: {definicion, params, diseno} de una fórmula nueva en blanco (la fila del total y su celda). Publica tal cual.';

-- La tarjeta por omisión (forma 2): espejo de PLANTILLA_POR_OMISION (src/modules/cotizaciones/entities/tarjeta/por-omision.ts).
create function public._fdo_tarjeta_en_blanco() returns jsonb
  language sql immutable security definer set search_path = '' as $$
  select '{"forma":2,"columnas":[{"id":"concepto","ancho":120},{"id":"monto","ancho":340},{"id":"logo","ancho":140}],"filas":[{"id":"fecha","alto":25,"ocultar_si":"nunca"},{"id":"numero","alto":25,"ocultar_si":"nunca"},{"id":"asesor","alto":25,"ocultar_si":"nunca"},{"id":"vehiculo","alto":28,"ocultar_si":"nunca"},{"id":"total","alto":54,"ocultar_si":"nunca"}],"celdas":[{"id":"c_fecha_concepto","fila":"fecha","columna":"concepto","contenido":{"tipo":"dato","variable":"fecha_larga"}},{"id":"c_fecha_monto","fila":"fecha","columna":"monto","contenido":{"tipo":"dato","variable":"titulo"}},{"id":"c_logo","fila":"fecha","columna":"logo","abarca_filas":3,"contenido":{"tipo":"logo"}},{"id":"c_numero_concepto","fila":"numero","columna":"concepto","contenido":{"tipo":"texto","texto":"Cotización n.º"}},{"id":"c_numero_monto","fila":"numero","columna":"monto","contenido":{"tipo":"dato","variable":"numero"}},{"id":"c_asesor_concepto","fila":"asesor","columna":"concepto","contenido":{"tipo":"texto","texto":"Asesor:"}},{"id":"c_asesor_monto","fila":"asesor","columna":"monto","contenido":{"tipo":"dato","variable":"asesor_nombre"}},{"id":"c_vehiculo_concepto","fila":"vehiculo","columna":"concepto","abarca_columnas":3,"contenido":{"tipo":"dato","variable":"vehiculo_titulo"},"estilo":{"tamano":14,"negrita":true}},{"id":"c_total_concepto","fila":"total","columna":"concepto","contenido":{"tipo":"texto","texto":"Total"},"estilo":{"tamano":16,"negrita":true,"bordes":{"todos":"fino"}}},{"id":"c_total_monto","fila":"total","columna":"monto","abarca_columnas":2,"contenido":{"tipo":"dato","nodo":"total","mostrar":"monto"},"estilo":{"tamano":16,"negrita":true,"alinear":"derecha","bordes":{"todos":"fino"}}}]}'::jsonb;
$$;
comment on function public._fdo_tarjeta_en_blanco() is 'Interna: la plantilla de tarjeta por omisión (forma 2), espejo de PLANTILLA_POR_OMISION. La usa una fórmula nueva en blanco o una copia sin plantilla.';

-- Las inserciones directas (la semilla, las pruebas) no dicen la fórmula del origen: se cuelgan de la de trabajo. Una publicada en un origen sin
-- activa vuelve activa a su fórmula: una activa siempre tiene publicada. Sólo lee formulas_del_origen (la fila de formulas todavía no existe).
create function public._fdo_asignar() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if new.formula_del_origen_id is null then
    new.formula_del_origen_id := public._fdo_de_trabajo(new.origen_id, true);
  end if;
  if tg_table_name = 'formulas' then
    if new.estado = 'publicada'
       and not exists (select 1 from public.formulas_del_origen d where d.origen_id = new.origen_id and d.activa) then   -- formulas_del_origen_activa_unica
      update public.formulas_del_origen d
         set activa = true, activada_en = coalesce(new.publicado_en, now()), activada_por = new.publicado_por, desactivada_en = null
       where d.id = new.formula_del_origen_id and d.archivada_en is null;
    end if;
  end if;
  return new;
end $$;
comment on function public._fdo_asignar() is 'Trigger: pone la fórmula de trabajo del origen a una versión o plantilla que se inserta sin ella, y activa la fórmula de la primera publicada de un origen sin activa.';

create trigger trg_fdo_asignar before insert or update of estado on public.formulas
  for each row execute function public._fdo_asignar();
create trigger trg_fdo_asignar before insert on public.plantillas_tarjeta
  for each row execute function public._fdo_asignar();
-- También con session_replication_role = replica (las pruebas, las mediciones y los e2e que insertan sin los triggers de auditoría): una versión
-- o una plantilla nunca queda sin fórmula del origen.
alter table public.formulas enable always trigger trg_fdo_asignar;
alter table public.plantillas_tarjeta enable always trigger trg_fdo_asignar;

revoke all on function public._fdo_de_trabajo(uuid, boolean) from public, anon, authenticated;
grant execute on function public._fdo_de_trabajo(uuid, boolean) to service_role;
revoke all on function public._fdo_resolver(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._fdo_resolver(uuid, uuid, boolean) to service_role;
revoke all on function public._publicada_de_la_activa(uuid) from public, anon, authenticated;
grant execute on function public._publicada_de_la_activa(uuid) to service_role;
revoke all on function public._fdo_campos_que_faltan(jsonb, uuid) from public, anon, authenticated;
grant execute on function public._fdo_campos_que_faltan(jsonb, uuid) to service_role;
revoke all on function public._fdo_exigir_campos(jsonb, uuid) from public, anon, authenticated;
grant execute on function public._fdo_exigir_campos(jsonb, uuid) to service_role;
revoke all on function public._fdo_formula_en_blanco() from public, anon, authenticated;
grant execute on function public._fdo_formula_en_blanco() to service_role;
revoke all on function public._fdo_tarjeta_en_blanco() from public, anon, authenticated;
grant execute on function public._fdo_tarjeta_en_blanco() to service_role;
revoke all on function public._fdo_asignar() from public, anon, authenticated;
grant execute on function public._fdo_asignar() to service_role;


-- Las RPC de Configuración suman `p_formula_del_origen` al final (nula: la fórmula de trabajo); las internas lo reciben siempre.
drop function public.formula_guardar_borrador(uuid, jsonb, jsonb, jsonb, text, uuid, timestamptz);
drop function public.formula_publicar(uuid, text, uuid, timestamptz);
drop function public._publicar_formula(uuid, text, uuid, boolean, timestamptz);
drop function public._publicar_version(uuid, jsonb, jsonb, jsonb, text, uuid, jsonb, boolean);
drop function public.formula_descartar_borrador(uuid, timestamptz);
drop function public.formula_revertir(uuid, uuid, text, uuid);
drop function public.formula_cambiar_constante(uuid, text, numeric, uuid);
drop function public.formula_cambiar_cabecera(uuid, text, boolean, text[], uuid);
drop function public.plantilla_guardar_borrador(uuid, timestamptz, jsonb, text);
drop function public.plantilla_publicar(uuid, timestamptz, text);
drop function public.plantilla_descartar_borrador(uuid, timestamptz);
drop function public._plantilla_borrador_ausente(uuid, timestamptz);
drop function public._tabla_referencia_usada_en(uuid, uuid);

CREATE OR REPLACE FUNCTION "public"."formula_guardar_borrador"("p_origen" "uuid", "p_def" "jsonb", "p_params" "jsonb", "p_diseno" "jsonb", "p_nota" "text" DEFAULT NULL::"text", "p_publicada_esperada" "uuid" DEFAULT NULL::"uuid", "p_actualizado_en_esperado" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_formula_del_origen" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_b public.formulas; v_pub uuid; v_id uuid; v_en timestamptz; v_fdo public.formulas_del_origen;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  perform public.validar_formula(p_def, p_params);
  if p_diseno is not null then
    perform public._diseno_forma(p_diseno);   -- sólo la forma: cruzarlo con la fórmula es de publicar
  end if;
  -- Guardar, publicar, el ⚙ y revertir de un origen, en serie: el segundo lee lo que dejó el primero.
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  -- La fórmula del origen que se edita (nula: la de trabajo, que se crea si el origen no tiene ninguna).
  v_fdo := public._fdo_resolver(p_origen, p_formula_del_origen, true);
  select * into v_b from public.formulas where formula_del_origen_id = v_fdo.id and estado = 'borrador' for update;   -- formulas_borrador_unico
  if p_actualizado_en_esperado is null then
    -- Crear: no había borrador, y la publicada sobre la que se empezó (si se dice) sigue siendo la publicada.
    if v_b.id is not null then
      raise exception 'Ya hay un borrador: % y se guardó %.', public._borrador_formula_empezado_por(v_b.creado_por), public._hace(v_b.actualizado_en)
        using errcode = 'PT409';
    end if;
    select id into v_pub from public.formulas where formula_del_origen_id = v_fdo.id and estado = 'publicada';   -- formulas_publicada_unica
    if p_publicada_esperada is not null and v_pub is distinct from p_publicada_esperada then
      if v_pub is null then
        raise exception 'La versión que tenías ya no es la publicada, y el origen no tiene otra.' using errcode = 'PT409';
      end if;
      raise exception 'Mientras editabas, %.', public._version_publicada_por(v_pub) using errcode = 'PT409';
    end if;
    insert into public.formulas (origen_id, formula_del_origen_id, estado, definicion, params, diseno, nota, creado_por, version_origen_id)
    values (p_origen, v_fdo.id, 'borrador', p_def, p_params, p_diseno, p_nota, (select auth.uid()), v_pub)
    returning id, actualizado_en into v_id, v_en;
  else
    -- Pisar: el borrador que leyó, tal como lo leyó. La publicada no se compara: publicarlo atrasado da su propio PT409.
    perform public._exigir_borrador_formula(v_b, p_actualizado_en_esperado);
    update public.formulas set definicion = p_def, params = p_params, diseno = p_diseno, nota = p_nota, visibilidad = null
     where id = v_b.id
    returning id, actualizado_en into v_id, v_en;   -- la hora que puso trg_actualizado_en
  end if;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_en);
end;
$$;
revoke all on function public.formula_guardar_borrador(uuid, jsonb, jsonb, jsonb, text, uuid, timestamptz, uuid) from public, anon;
grant execute on function public.formula_guardar_borrador(uuid, jsonb, jsonb, jsonb, text, uuid, timestamptz, uuid) to authenticated, service_role;
comment on function public.formula_guardar_borrador(uuid, jsonb, jsonb, jsonb, text, uuid, timestamptz, uuid) is 'Guarda el borrador de una fórmula del origen (cotizaciones.configurar; p_formula_del_origen nula: la de trabajo, que se crea si el origen no tiene ninguna). Sin p_actualizado_en_esperado crea (PT409 si ya hay borrador o si p_publicada_esperada ya no es la publicada); con ella pisa sólo si es la del borrador (PT409 si cambió o ya no está). Devuelve {id, actualizado_en}. docs/COTIZADOR.md › «Versiones (4.20-1)».';

CREATE OR REPLACE FUNCTION "public"."formula_publicar"("p_origen" "uuid", "p_nota" "text", "p_publicada_esperada" "uuid" DEFAULT NULL::"uuid", "p_actualizado_en_esperado" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_formula_del_origen" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  return public._publicar_formula(p_origen, p_nota, p_publicada_esperada, false, p_actualizado_en_esperado, p_formula_del_origen);
end;
$$;
revoke all on function public.formula_publicar(uuid, text, uuid, timestamptz, uuid) from public, anon;
grant execute on function public.formula_publicar(uuid, text, uuid, timestamptz, uuid) to authenticated, service_role;
comment on function public.formula_publicar(uuid, text, uuid, timestamptz, uuid) is 'Publica el borrador de una fórmula del origen (cotizaciones.configurar; p_formula_del_origen nula: la de trabajo). PT409 si p_publicada_esperada ya no es la publicada, si el borrador ya no tiene la p_actualizado_en_esperado (o ya no está) o si nació sobre otra publicada. La primera publicada de un origen sin activa la vuelve activa. docs/COTIZADOR.md › «Versiones (4.20-1)».';

CREATE OR REPLACE FUNCTION "public"."_publicar_formula"("p_origen" "uuid", "p_nota" "text", "p_publicada_esperada" "uuid", "p_ignorar_retirados" boolean, "p_actualizado_en_esperado" timestamp with time zone, "p_formula_del_origen" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_b public.formulas; v_pub uuid; v_ver int; v_vis jsonb; v_f text; v_fdo public.formulas_del_origen;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if coalesce(trim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023'; end if;
  -- Guardar, publicar, el ⚙ y revertir de un origen, en serie: el segundo relee la publicada y el borrador y los compara con sus esperadas.
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  v_fdo := public._fdo_resolver(p_origen, p_formula_del_origen, false);
  select * into v_b from public.formulas where formula_del_origen_id = v_fdo.id and estado = 'borrador' for update;   -- formulas_borrador_unico
  select id into v_pub from public.formulas where formula_del_origen_id = v_fdo.id and estado = 'publicada';           -- formulas_publicada_unica
  if p_publicada_esperada is not null and v_pub is distinct from p_publicada_esperada then
    if v_pub is null then
      raise exception 'La versión que tenías ya no es la publicada, y el origen no tiene otra.' using errcode = 'PT409';
    end if;
    v_f := public._version_publicada_por(v_pub);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  perform public._exigir_borrador_formula(v_b, p_actualizado_en_esperado);
  if v_b.id is null then raise exception 'No hay borrador para publicar.' using errcode = '22023'; end if;
  if v_b.version_origen_id is not null and v_b.version_origen_id is distinct from v_pub then
    raise exception 'Después de que empezaste este borrador, %.', coalesce(public._version_publicada_por(v_pub), 'la versión publicada cambió')
      using errcode = 'PT409';
  end if;
  -- Una copia de otro origen no publica un dato del vehículo que este origen no tiene.
  if v_fdo.copiada_de_otro_origen then
    perform public._fdo_exigir_campos(v_b.definicion, p_origen);
  end if;

  v_vis := public._preparar_publicacion(v_b.definicion, v_b.params, v_b.diseno, p_ignorar_retirados);

  select coalesce(max(version), 0) + 1 into v_ver from public.formulas where formula_del_origen_id = v_fdo.id;   -- formulas_formula_del_origen_id_version_key
  update public.formulas set estado = 'archivada' where id = v_pub;
  update public.formulas set estado = 'publicada', version = v_ver, nota = p_nota, visibilidad = v_vis, publicado_por = (select auth.uid()),
         publicado_en = now(), version_origen_id = v_pub where id = v_b.id;
  perform public.registrar_actividad('formula.publicada', 'formulas', v_b.id::text, jsonb_build_object('anterior', v_pub), jsonb_build_object('version', v_ver, 'nota', p_nota),
                                     jsonb_build_object('formula_del_origen_id', v_fdo.id, 'nombre', v_fdo.nombre));
  return v_b.id;
end;
$$;
revoke all on function public._publicar_formula(uuid, text, uuid, boolean, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._publicar_formula(uuid, text, uuid, boolean, timestamptz, uuid) to service_role;
comment on function public._publicar_formula(uuid, text, uuid, boolean, timestamptz, uuid) is 'Interna: publica el borrador de una fórmula del origen (nula: la de trabajo) tras el candado del origen, la publicada esperada y la actualizado_en esperada del borrador (nula: no compara). En una copia de otro origen exige los datos del vehículo. La usan formula_publicar y formula_del_origen_activar. docs/COTIZADOR.md › «Versiones (4.20-1)».';

CREATE OR REPLACE FUNCTION "public"."_publicar_version"("p_origen" "uuid", "p_def" "jsonb", "p_params" "jsonb", "p_diseno" "jsonb", "p_nota" "text", "p_esperada" "uuid", "p_detalle" "jsonb", "p_ignorar_retirados" boolean, "p_formula_del_origen" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_pub uuid; v_ver int; v_vis jsonb; v_id uuid; v_f text;
begin
  if coalesce(trim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  select id into v_pub from public.formulas where formula_del_origen_id = p_formula_del_origen and estado = 'publicada';   -- formulas_publicada_unica
  if v_pub is null then raise exception 'El origen no tiene fórmula publicada.' using errcode = '22023'; end if;
  if p_esperada is distinct from v_pub then
    v_f := public._version_publicada_por(v_pub);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;

  v_vis := public._preparar_publicacion(p_def, p_params, p_diseno, p_ignorar_retirados);

  select coalesce(max(version), 0) + 1 into v_ver from public.formulas where formula_del_origen_id = p_formula_del_origen;   -- formulas_formula_del_origen_id_version_key
  update public.formulas set estado = 'archivada' where id = v_pub;
  insert into public.formulas (origen_id, formula_del_origen_id, version, estado, definicion, params, diseno, visibilidad, nota, version_origen_id, creado_por, publicado_por, publicado_en)
  values (p_origen, p_formula_del_origen, v_ver, 'publicada', p_def, p_params, p_diseno, v_vis, p_nota, v_pub, (select auth.uid()), (select auth.uid()), now())
  returning id into v_id;
  perform public.registrar_actividad('formula.publicada', 'formulas', v_id::text, jsonb_build_object('anterior', v_pub),
                                     jsonb_build_object('version', v_ver, 'nota', p_nota) || coalesce(p_detalle, '{}'::jsonb),
                                     jsonb_build_object('formula_del_origen_id', p_formula_del_origen));
  return v_id;
end;
$$;
revoke all on function public._publicar_version(uuid, jsonb, jsonb, jsonb, text, uuid, jsonb, boolean, uuid) from public, anon, authenticated;
grant execute on function public._publicar_version(uuid, jsonb, jsonb, jsonb, text, uuid, jsonb, boolean, uuid) to service_role;
comment on function public._publicar_version(uuid, jsonb, jsonb, jsonb, text, uuid, jsonb, boolean, uuid) is 'Interna: publica la N+1 de una fórmula del origen como fila nueva (archiva la publicada), sin leer ni escribir el borrador, tras el candado del origen y la esperada. La usan el ⚙, formula_revertir y tabla_referencia_publicar. docs/COTIZADOR.md › «Versiones (4.20-1)».';

CREATE OR REPLACE FUNCTION "public"."formula_descartar_borrador"("p_origen" "uuid", "p_actualizado_en_esperado" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_formula_del_origen" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_b public.formulas; v_fdo public.formulas_del_origen;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  v_fdo := public._fdo_resolver(p_origen, p_formula_del_origen, false);
  select * into v_b from public.formulas where formula_del_origen_id = v_fdo.id and estado = 'borrador' for update;   -- formulas_borrador_unico
  perform public._exigir_borrador_formula(v_b, p_actualizado_en_esperado);
  delete from public.formulas where id = v_b.id;
end;
$$;
revoke all on function public.formula_descartar_borrador(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.formula_descartar_borrador(uuid, timestamptz, uuid) to authenticated, service_role;
comment on function public.formula_descartar_borrador(uuid, timestamptz, uuid) is 'Descarta el borrador de una fórmula del origen (cotizaciones.configurar; p_formula_del_origen nula: la de trabajo). Con p_actualizado_en_esperado, PT409 si el borrador cambió o ya no está. docs/COTIZADOR.md › «Versiones (4.20-1)».';

CREATE OR REPLACE FUNCTION "public"."formula_revertir"("p_origen" "uuid", "p_version" "uuid", "p_nota" "text", "p_publicada_esperada" "uuid", "p_formula_del_origen" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_v public.formulas; v_estado text; v_fdo public.formulas_del_origen;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_publicada_esperada is null then
    raise exception 'Revertir pide la versión publicada que tienes.' using errcode = '22023', hint = 'publicada_esperada';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  v_fdo := public._fdo_resolver(p_origen, p_formula_del_origen, false);
  -- Una versión de otro origen y una que no existe dan el mismo texto: no se delata ninguna fila.
  select * into v_v from public.formulas f where f.id = p_version and f.origen_id = p_origen;
  if v_v.id is null then raise exception 'Esa versión no es de este origen.' using errcode = '22023', hint = 'version'; end if;
  if v_v.formula_del_origen_id is distinct from v_fdo.id then
    raise exception 'Esa versión es de otra fórmula del origen.' using errcode = '22023', hint = 'version';
  end if;
  v_estado := v_v.estado::text;
  if v_estado = 'publicada' then raise exception 'Esa ya es la versión publicada.' using errcode = '22023', hint = 'version'; end if;
  if v_estado = 'borrador' then raise exception 'Un borrador no se revierte: se publica.' using errcode = '22023', hint = 'version'; end if;
  return public._publicar_version(p_origen, v_v.definicion, v_v.params, v_v.diseno, p_nota, p_publicada_esperada,
                                  jsonb_build_object('copia_de', v_v.id, 'version_copiada', v_v.version), false, v_fdo.id);
end;
$$;
revoke all on function public.formula_revertir(uuid, uuid, text, uuid, uuid) from public, anon;
grant execute on function public.formula_revertir(uuid, uuid, text, uuid, uuid) to authenticated, service_role;
comment on function public.formula_revertir(uuid, uuid, text, uuid, uuid) is 'Publica como N+1 una copia de una versión archivada de la misma fórmula del origen (cotizaciones.configurar; p_formula_del_origen nula: la de trabajo). PT409 si p_publicada_esperada ya no es la publicada. docs/COTIZADOR.md › «Versiones (4.20-1)».';

CREATE OR REPLACE FUNCTION "public"."formula_cambiar_constante"("p_origen" "uuid", "p_nodo" "text", "p_valor" numeric, "p_publicada_esperada" "uuid" DEFAULT NULL::"uuid", "p_formula_del_origen" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_pub public.formulas; v_anterior numeric; v_f text; v_fdo public.formulas_del_origen; v_esperada uuid;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  -- Sin esperada, la publicada leída antes del candado (lo que quien llama tenía a la vista): si alguien publicó o activó mientras tanto, PT409.
  v_esperada := coalesce(p_publicada_esperada, (select f.id from public.formulas f
                                                 where f.formula_del_origen_id = coalesce(p_formula_del_origen, public._fdo_de_trabajo(p_origen, false))
                                                   and f.origen_id = p_origen and f.estado = 'publicada'));   -- formulas_publicada_unica
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  v_fdo := public._fdo_resolver(p_origen, p_formula_del_origen, false);
  select * into v_pub from public.formulas where formula_del_origen_id = v_fdo.id and estado = 'publicada';   -- formulas_publicada_unica
  if v_pub.id is null then raise exception 'El origen no tiene fórmula publicada.' using errcode = '22023'; end if;
  -- Se compara con lo leído aquí, tras el candado, que es lo que se copia.
  if v_esperada is distinct from v_pub.id then
    v_f := public._version_publicada_por(v_pub.id);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  v_anterior := (v_pub.params ->> p_nodo)::numeric;
  if v_anterior is null then raise exception 'La fórmula publicada no tiene la constante «%».', p_nodo using errcode = '22023'; end if;
  if v_anterior = p_valor then raise exception 'La constante ya tiene ese valor.' using errcode = '22023', hint = 'valor'; end if;
  return public._publicar_version(p_origen, v_pub.definicion, v_pub.params || jsonb_build_object(p_nodo, p_valor), v_pub.diseno,
                                  format('%s: %s → %s, desde el cotizador', p_nodo, v_anterior, p_valor), v_pub.id,
                                  jsonb_build_object('constante', p_nodo), true, v_fdo.id);
end;
$$;
revoke all on function public.formula_cambiar_constante(uuid, text, numeric, uuid, uuid) from public, anon;
grant execute on function public.formula_cambiar_constante(uuid, text, numeric, uuid, uuid) to authenticated, service_role;
comment on function public.formula_cambiar_constante(uuid, text, numeric, uuid, uuid) is 'El ⚙ del cotizador: publica la N+1 de una fórmula del origen (nula: la de trabajo, la activa) con una constante cambiada (cotizaciones.configurar). PT409 si p_publicada_esperada ya no es la publicada. docs/COTIZADOR.md › «Versiones (4.20-1)».';

CREATE OR REPLACE FUNCTION "public"."formula_cambiar_cabecera"("p_origen" "uuid", "p_modo_por_defecto" "text", "p_ver_total_bs_por_defecto" boolean, "p_modos_visibles" "text"[], "p_publicada_esperada" "uuid" DEFAULT NULL::"uuid", "p_formula_del_origen" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_pub public.formulas;
  v_cab jsonb;
  v_modos jsonb;
  v_f text;
  v_modo text;
  v_ver boolean;
  v_visibles jsonb;
  v_pedido jsonb;
  v_fdo public.formulas_del_origen;
  v_esperada uuid;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_modo_por_defecto is null then
    raise exception 'Elige el modo por defecto.' using errcode = '22023', hint = 'modo_por_defecto';
  end if;
  if p_ver_total_bs_por_defecto is null then
    raise exception 'Di si el total en moneda local sale por defecto.' using errcode = '22023', hint = 'ver_total_bs_por_defecto';
  end if;
  if p_modos_visibles is null then
    raise exception 'Elige las opciones visibles.' using errcode = '22023', hint = 'modos_visibles';
  end if;
  -- Sin esperada, la publicada leída antes del candado (lo que quien llama tenía a la vista): si alguien publicó o activó mientras tanto, PT409.
  v_esperada := coalesce(p_publicada_esperada, (select f.id from public.formulas f
                                                 where f.formula_del_origen_id = coalesce(p_formula_del_origen, public._fdo_de_trabajo(p_origen, false))
                                                   and f.origen_id = p_origen and f.estado = 'publicada'));   -- formulas_publicada_unica
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  v_fdo := public._fdo_resolver(p_origen, p_formula_del_origen, false);
  select * into v_pub from public.formulas where formula_del_origen_id = v_fdo.id and estado = 'publicada';   -- formulas_publicada_unica
  if v_pub.id is null then raise exception 'El origen no tiene fórmula publicada.' using errcode = '22023'; end if;
  -- Se compara con lo leído aquí, tras el candado, que es lo que se copia.
  if v_esperada is distinct from v_pub.id then
    v_f := public._version_publicada_por(v_pub.id);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  v_cab := coalesce(v_pub.diseno -> 'cabecera', '{}'::jsonb);
  v_modos := coalesce(v_cab -> 'modos', '[]'::jsonb);
  if jsonb_array_length(v_modos) = 0 then
    raise exception 'Esta fórmula no tiene modos de tipo de cambio.' using errcode = '22023', hint = 'cabecera';
  end if;
  -- Los valores efectivos de la publicada.
  v_modo := coalesce(v_cab ->> 'modo_por_defecto', v_modos -> 0 ->> 'clave');
  v_ver := coalesce((v_cab ->> 'ver_total_bs_por_defecto')::boolean, false);
  v_visibles := coalesce(v_cab -> 'modos_visibles',
                         (select jsonb_agg(m.valor ->> 'clave' order by m.o) from jsonb_array_elements(v_modos) with ordinality m (valor, o)));
  v_pedido := jsonb_build_object('modo_por_defecto', p_modo_por_defecto, 'ver_total_bs_por_defecto', p_ver_total_bs_por_defecto,
                                 'modos_visibles', to_jsonb(p_modos_visibles));
  if v_modo = p_modo_por_defecto and v_ver = p_ver_total_bs_por_defecto and v_visibles = to_jsonb(p_modos_visibles) then
    raise exception 'La cabecera ya tiene esos valores.' using errcode = '22023', hint = 'cabecera';
  end if;
  return public._publicar_version(p_origen, v_pub.definicion, v_pub.params,
                                  jsonb_set(v_pub.diseno, '{cabecera}', (v_cab - array['modo_por_defecto', 'ver_total_bs_por_defecto', 'modos_visibles']) || v_pedido),
                                  format('Cabecera: %s por defecto, desde el cotizador', p_modo_por_defecto), v_pub.id,
                                  jsonb_build_object('cabecera', v_pedido), true, v_fdo.id);
end $$;
revoke all on function public.formula_cambiar_cabecera(uuid, text, boolean, text[], uuid, uuid) from public, anon;
grant execute on function public.formula_cambiar_cabecera(uuid, text, boolean, text[], uuid, uuid) to authenticated, service_role;
comment on function public.formula_cambiar_cabecera(uuid, text, boolean, text[], uuid, uuid) is 'El ⚙ del cotizador: publica la N+1 de una fórmula del origen (nula: la de trabajo, la activa) con el modo por defecto, «Ver total Bs» por defecto y las opciones visibles de la cabecera (cotizaciones.configurar). PT409 si p_publicada_esperada ya no es la publicada. docs/COTIZADOR.md › «Versiones (4.20-1)».';

CREATE OR REPLACE FUNCTION "public"."plantilla_guardar_borrador"("p_origen" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_def" "jsonb", "p_nota" "text" DEFAULT NULL::"text", "p_formula_del_origen" "uuid" DEFAULT NULL::"uuid") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_b public.plantillas_tarjeta; v_v timestamptz; v_fdo public.formulas_del_origen;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  perform public.validar_plantilla(p_def, null, null, null, null);
  -- Guardar, publicar y descartar de un origen, en serie: el segundo lee el borrador que dejó el primero.
  perform pg_advisory_xact_lock(hashtextextended('plantillas:' || p_origen::text, 0));
  -- La fórmula del origen de la plantilla (nula: la de trabajo, que se crea si el origen no tiene ninguna).
  v_fdo := public._fdo_resolver(p_origen, p_formula_del_origen, true);
  select * into v_b from public.plantillas_tarjeta where formula_del_origen_id = v_fdo.id and estado = 'borrador' for update;   -- plantillas_borrador_unico
  if p_actualizado_en_esperado is null then
    if v_b.id is not null then
      raise exception 'Ya hay un borrador de esta plantilla, guardado %.', public._hace(v_b.actualizado_en) using errcode = 'PT409';
    end if;
    insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, estado, definicion, nota, creado_por)
    values (p_origen, v_fdo.id, 'borrador', p_def, p_nota, (select auth.uid()))
    returning actualizado_en into v_v;
    return v_v;
  end if;
  if v_b.id is null then perform public._plantilla_borrador_ausente(v_fdo.id, p_actualizado_en_esperado); end if;
  perform public._exigir_version(v_b.actualizado_en, p_actualizado_en_esperado,
    'El borrador de esta plantilla cambió ' || public._hace(v_b.actualizado_en) || ', mientras lo editabas.');
  update public.plantillas_tarjeta set definicion = p_def, nota = p_nota where id = v_b.id returning actualizado_en into v_v;
  return v_v;
end;
$$;
revoke all on function public.plantilla_guardar_borrador(uuid, timestamptz, jsonb, text, uuid) from public, anon;
grant execute on function public.plantilla_guardar_borrador(uuid, timestamptz, jsonb, text, uuid) to authenticated, service_role;
comment on function public.plantilla_guardar_borrador(uuid, timestamptz, jsonb, text, uuid) is 'Guarda el borrador de la plantilla de una fórmula del origen (cotizaciones.configurar; p_formula_del_origen nula: la de trabajo, que se crea si el origen no tiene ninguna). Esperada nula crea (PT409 si ya hay borrador); con ella pisa sólo si es la del borrador. Devuelve la actualizado_en nueva. docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».';

-- Publicar el borrador de la plantilla de una fórmula del origen, con el candado `plantillas:` ya tomado: valida contra la publicada de ESA
-- fórmula. La usan plantilla_publicar y formula_del_origen_activar.
create function public._plantilla_publicar_en(p_origen uuid, p_formula_del_origen uuid, p_nota text, p_esperada timestamptz) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare
  v_b public.plantillas_tarjeta; v_pub uuid; v_ver int; fo record;
begin
  select * into v_b from public.plantillas_tarjeta where formula_del_origen_id = p_formula_del_origen and estado = 'borrador' for update;   -- plantillas_borrador_unico
  if v_b.id is null then perform public._plantilla_borrador_ausente(p_formula_del_origen, p_esperada); end if;
  perform public._exigir_version(v_b.actualizado_en, p_esperada,
    'El borrador de esta plantilla cambió ' || public._hace(v_b.actualizado_en) || ', mientras lo editabas.');
  select id into v_pub from public.plantillas_tarjeta where formula_del_origen_id = p_formula_del_origen and estado = 'publicada';   -- plantillas_publicada_unica
  select f.definicion, f.diseno, f.visibilidad into fo from public.formulas f
   where f.formula_del_origen_id = p_formula_del_origen and f.estado = 'publicada';   -- formulas_publicada_unica
  if not found then perform public._formula_rechazar('formula_sin_publicar', 'origen', 'Publica la fórmula del origen antes que su plantilla.'); end if;
  perform public.validar_plantilla(v_b.definicion, fo.definicion, fo.diseno, fo.visibilidad, array(select t.clave from public.tonos t));
  select coalesce(max(version), 0) + 1 into v_ver from public.plantillas_tarjeta where formula_del_origen_id = p_formula_del_origen;   -- plantillas_tarjeta_formula_del_origen_id_version_key
  update public.plantillas_tarjeta set estado = 'archivada' where id = v_pub;
  update public.plantillas_tarjeta set estado = 'publicada', version = v_ver, nota = p_nota, publicado_en = now() where id = v_b.id;
  return v_b.id;
end $$;
revoke all on function public._plantilla_publicar_en(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public._plantilla_publicar_en(uuid, uuid, text, timestamptz) to service_role;
comment on function public._plantilla_publicar_en(uuid, uuid, text, timestamptz) is 'Interna: publica el borrador de la plantilla de una fórmula del origen, validado contra la publicada de esa fórmula, con el candado plantillas: tomado. La usan plantilla_publicar y formula_del_origen_activar. docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».';

create function public.plantilla_publicar(p_origen uuid, p_actualizado_en_esperado timestamptz, p_nota text, p_formula_del_origen uuid default null) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare
  v_fdo public.formulas_del_origen;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_actualizado_en_esperado is null then perform public._exigir_version(null, null, null); end if;
  if coalesce(btrim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023', hint = 'nota'; end if;
  perform pg_advisory_xact_lock(hashtextextended('plantillas:' || p_origen::text, 0));
  v_fdo := public._fdo_resolver(p_origen, p_formula_del_origen, false);
  return public._plantilla_publicar_en(p_origen, v_fdo.id, p_nota, p_actualizado_en_esperado);
end $$;
revoke all on function public.plantilla_publicar(uuid, timestamptz, text, uuid) from public, anon;
grant execute on function public.plantilla_publicar(uuid, timestamptz, text, uuid) to authenticated, service_role;
comment on function public.plantilla_publicar(uuid, timestamptz, text, uuid) is 'Publica el borrador de la plantilla de una fórmula del origen (cotizaciones.configurar; p_formula_del_origen nula: la de trabajo), validado contra la publicada de esa fórmula. PT409 si el borrador cambió o ya no está. docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».';

CREATE OR REPLACE FUNCTION "public"."plantilla_descartar_borrador"("p_origen" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_formula_del_origen" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_b public.plantillas_tarjeta; v_fdo public.formulas_del_origen;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_actualizado_en_esperado is null then perform public._exigir_version(null, null, null); end if;
  perform pg_advisory_xact_lock(hashtextextended('plantillas:' || p_origen::text, 0));
  v_fdo := public._fdo_resolver(p_origen, p_formula_del_origen, false);
  select * into v_b from public.plantillas_tarjeta where formula_del_origen_id = v_fdo.id and estado = 'borrador' for update;   -- plantillas_borrador_unico
  if v_b.id is null then perform public._plantilla_borrador_ausente(v_fdo.id, p_actualizado_en_esperado); end if;
  perform public._exigir_version(v_b.actualizado_en, p_actualizado_en_esperado,
    'El borrador de esta plantilla cambió ' || public._hace(v_b.actualizado_en) || ', mientras lo editabas.');
  delete from public.plantillas_tarjeta where id = v_b.id;
end;
$$;
revoke all on function public.plantilla_descartar_borrador(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.plantilla_descartar_borrador(uuid, timestamptz, uuid) to authenticated, service_role;
comment on function public.plantilla_descartar_borrador(uuid, timestamptz, uuid) is 'Descarta el borrador de la plantilla de una fórmula del origen (cotizaciones.configurar; p_formula_del_origen nula: la de trabajo). PT409 si cambió o ya no está. docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».';

CREATE OR REPLACE FUNCTION "public"."_plantilla_borrador_ausente"("p_formula_del_origen" "uuid", "p_esperada" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_pub public.plantillas_tarjeta;
begin
  select * into v_pub from public.plantillas_tarjeta where formula_del_origen_id = p_formula_del_origen and estado = 'publicada';   -- plantillas_publicada_unica
  if v_pub.id is not null and v_pub.publicado_en >= p_esperada then
    raise exception 'El borrador ya no está: la versión % se publicó %.', v_pub.version, public._hace(v_pub.publicado_en) using errcode = 'PT409';
  end if;
  raise exception 'El borrador ya no está: se descartó.' using errcode = 'PT409';
end;
$$;
revoke all on function public._plantilla_borrador_ausente(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public._plantilla_borrador_ausente(uuid, timestamptz) to service_role;
comment on function public._plantilla_borrador_ausente(uuid, timestamptz) is 'Interna: el PT409 de guardar, publicar, descartar o activar un borrador de plantilla que ya no está (se publicó o se descartó). docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».';

-- Las tablas de referencia: cada fórmula del origen sin archivar con publicada que la usa.
create function public._tabla_referencia_usada_en(p_tabla uuid, p_origen uuid default null)
  returns table (origen_id uuid, formula_del_origen_id uuid, formula_id uuid)
  language sql stable security definer set search_path = '' as $$
  select o.id, u.fdo_id, u.formula_id
    from public.tablas_referencia t                                                              -- tablas_referencia_pkey
    join public.origenes o
      on (t.origen_id is not null and o.id = t.origen_id)
      or (t.origen_id is null
          and not exists (select 1 from public.tablas_referencia r                               -- tablas_referencia_origen_id_clave_key
                           where r.origen_id = o.id and r.clave = t.clave and r.activa))
    left join lateral (
      select d.id as fdo_id, d.creado_en, f.id as formula_id
        from public.formulas_del_origen d                                                        -- formulas_del_origen_origen_idx
        join public.formulas f on f.formula_del_origen_id = d.id and f.estado = 'publicada'     -- formulas_publicada_unica
       where d.origen_id = o.id and d.archivada_en is null
         and (coalesce(f.params -> 'tablas', '{}'::jsonb) ? t.clave
              or exists (select 1 from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tabla' = t.clave))
    ) u on true
   where t.id = p_tabla and (p_origen is null or o.id = p_origen)
   order by o.id, u.creado_en, u.fdo_id;
$$;
revoke all on function public._tabla_referencia_usada_en(uuid, uuid) from public, anon, authenticated;
grant execute on function public._tabla_referencia_usada_en(uuid, uuid) to service_role;
comment on function public._tabla_referencia_usada_en(uuid, uuid) is 'Interna: los orígenes que reciben una tabla de referencia y, de cada uno, cada fórmula del origen sin archivar cuya publicada la usa (un nodo la nombra o la congeló); una fila con fórmula nula si ninguna la usa. docs/COTIZADOR.md › «Las tablas congeladas (D5)».';

CREATE OR REPLACE FUNCTION "public"."tabla_referencia_publicar"("p_tabla" "uuid", "p_filas" "jsonb", "p_nota" "text", "p_version_esperada" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c_sin_permiso constant text := 'No tienes el permiso «cotizaciones.configurar».';
  v_t public.tablas_referencia; v_anterior int; v_o record; v_pub public.formulas; v_nuevas jsonb; v_vivas jsonb; v_f text; v_id uuid;
  v_formulas jsonb := '[]'::jsonb; v_igual boolean; v_u record;
begin
  perform public.assert_activo();
  -- Una tabla que no existe, una inactiva y una de un origen ajeno dan el mismo 42501: no se delata ninguna fila.
  select * into v_t from public.tablas_referencia r where r.id = p_tabla;                          -- tablas_referencia_pkey
  if v_t.id is null or not v_t.activa then raise exception '%', c_sin_permiso using errcode = '42501'; end if;
  -- Con origen, el de ese origen; compartida (origen nulo), el de algún origen.
  perform public.assert_permiso('cotizaciones.configurar', v_t.origen_id);
  if p_version_esperada is null then
    raise exception 'Falta la versión de la tabla que tenías.' using errcode = '22023', hint = 'version';
  end if;
  if coalesce(btrim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023', hint = 'nota'; end if;

  -- El candado de la tabla: dos publicaciones de la misma tabla van en fila y la segunda ve la versión de la primera.
  select * into v_t from public.tablas_referencia r where r.id = p_tabla for update;
  if not v_t.activa then raise exception '%', c_sin_permiso using errcode = '42501'; end if;
  -- Una compartida cambia los precios de cada origen que la usa: hace falta el permiso de todos ellos (P2), antes de decir nada de la tabla.
  for v_o in select u.origen_id from public._tabla_referencia_usada_en(p_tabla) u where u.formula_id is not null loop
    perform public.assert_permiso('cotizaciones.configurar', v_o.origen_id);
  end loop;
  if v_t.version <> p_version_esperada then
    v_f := public._tabla_referencia_publicada_por(p_tabla);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  perform public._tabla_referencia_filas_validas(v_t.columnas, p_filas);

  -- Una celda nula es una celda ausente: así se guarda y así se compara.
  select coalesce(jsonb_agg(jsonb_strip_nulls(f.fila) order by f.n), '[]'::jsonb) into v_nuevas
    from jsonb_array_elements(p_filas) with ordinality f (fila, n);
  -- tablas_referencia_filas_tabla_orden_idx: las vivas activas, en su orden.
  select coalesce(jsonb_agg(jsonb_strip_nulls(x.valores) order by x.orden, x.id), '[]'::jsonb) into v_vivas
    from public.tablas_referencia_filas x where x.tabla_id = p_tabla and x.activa;
  -- Tras revertir una fórmula, su copia congelada vuelve a ser otra: publicar las mismas filas vivas le devuelve la tabla.
  v_igual := v_nuevas = v_vivas and not exists (
    select 1 from public._tabla_referencia_usada_en(p_tabla) u join public.formulas f on f.id = u.formula_id   -- formulas_pkey
     where (f.params -> 'tablas' -> v_t.clave) is distinct from v_nuevas);
  if v_igual then raise exception 'La tabla no cambió.' using errcode = '22023', hint = 'filas'; end if;

  -- Las filas nuevas reemplazan a todas, también a las inactivas: el cálculo y la copia congelada sólo leen las activas, y la historia queda en
  -- las copias congeladas de cada versión de la fórmula.
  delete from public.tablas_referencia_filas x where x.tabla_id = p_tabla;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
  select p_tabla, jsonb_strip_nulls(f.fila), (f.n - 1)::smallint from jsonb_array_elements(p_filas) with ordinality f (fila, n);
  v_anterior := v_t.version;
  update public.tablas_referencia r
     set version = r.version + 1, nota = btrim(p_nota), publicado_por = (select auth.uid()), publicado_en = now()
   where r.id = p_tabla
  returning * into v_t;

  -- La N+1 de cada fórmula del origen que la usa, en orden de origen. Las publicadas se releen tras el candado del origen (el ⚙ o un revertir
  -- pudieron publicar otra mientras se esperaba): la que ya no la usa se salta; la que la usa, con el permiso de ese origen.
  for v_o in select distinct u.origen_id from public._tabla_referencia_usada_en(p_tabla) u order by u.origen_id loop
    perform pg_advisory_xact_lock(hashtextextended('formulas:' || v_o.origen_id::text, 0));
    for v_u in select u.formula_del_origen_id, u.formula_id from public._tabla_referencia_usada_en(p_tabla, v_o.origen_id) u
                where u.formula_id is not null loop
      select f.* into v_pub from public.formulas f where f.id = v_u.formula_id;   -- formulas_pkey
      perform public.assert_permiso('cotizaciones.configurar', v_o.origen_id);
      v_id := public._publicar_version(
        v_o.origen_id, v_pub.definicion,
        v_pub.params || jsonb_build_object('tablas', coalesce(v_pub.params -> 'tablas', '{}'::jsonb) || jsonb_build_object(v_t.clave, v_nuevas)),
        v_pub.diseno, format('Tabla «%s» versión %s: %s', v_t.nombre, v_t.version, btrim(p_nota)), v_pub.id,
        jsonb_build_object('tabla', v_t.clave, 'version_tabla', v_t.version), true, v_u.formula_del_origen_id);
      v_formulas := v_formulas || jsonb_build_array(jsonb_build_object(
        'origen_id', v_o.origen_id, 'formula_del_origen_id', v_u.formula_del_origen_id,
        'version', (select f.version from public.formulas f where f.id = v_id)));   -- formulas_pkey
    end loop;
  end loop;

  perform public.registrar_actividad('tabla_referencia.publicada', 'tablas_referencia', p_tabla::text,
    jsonb_build_object('version', v_anterior),
    jsonb_build_object('version', v_t.version, 'nota', v_t.nota, 'filas', jsonb_array_length(v_nuevas), 'formulas', v_formulas));
  return jsonb_build_object('version', v_t.version, 'formulas', v_formulas);
end;
$$;

-- Cotizar lee la publicada de la fórmula activa del origen (`_publicada_de_la_activa`).
CREATE OR REPLACE FUNCTION "public"."cotizacion_crear"("p_id" "uuid", "p_origen" "uuid", "p_lead" "uuid", "p_entradas" "jsonb", "p_abierta" "text", "p_vehiculo" "uuid" DEFAULT NULL::"uuid", "p_vehiculo_nuevo" "jsonb" DEFAULT NULL::"jsonb", "p_modo_tc" "text" DEFAULT NULL::"text", "p_clase" "public"."clase_cotizacion" DEFAULT 'preventa'::"public"."clase_cotizacion", "p_con_la_abierta" boolean DEFAULT false, "p_ver_total_bs" boolean DEFAULT false, "p_titulo" "text" DEFAULT NULL::"text", "p_titulo_manual" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_yo uuid := (select auth.uid());
  c public.cotizaciones;
  a record;
  v_formula uuid; v_uso uuid; v_vuelta int := 0; v_version int; v_fdo uuid; v_otra text;
  v_ab_formula uuid; v_ab_en timestamptz; v_ab_huella text;
  v_veh uuid := p_vehiculo;
  v_modo jsonb;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb;
  v_k text; v_opc text;
  v_res jsonb;
  v_total_base numeric;
  v_constraint text;
  v_ids uuid[]; v_tomadas uuid[];
  v_titulo text := nullif(btrim(p_titulo), '');
  v_titulo_manual boolean;
  -- Lo fija `cotizacion_crear_en_par` (la opción por su posición, la hermana y la hora); nulo fuera de ella.
  v_par jsonb := nullif(current_setting('importadora.en_par', true), '')::jsonb;
  v_par_nodo text; v_par_clave text; v_par_etiqueta text; v_tope int;
begin
  perform public.assert_activo();
  if p_id is null or p_origen is null then
    raise exception 'Faltan el identificador y el origen de la cotización.' using errcode = '22023';
  end if;
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  -- Cotizar pide también ver: con sólo `crear` la hoja no tiene nada que mostrar (4-32). Después de `crear`: quien no cotiza ahí sigue recibiendo ese permiso en el error.
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  -- D2: la hoja que se abrió. La firma la base (`cotizacion_hoja()`): trae la versión de la fórmula y la hora de la apertura, y no se puede inventar (4-27).
  if p_abierta is null then
    raise exception 'Falta la hoja que abriste: ábrela de nuevo.' using errcode = '22023', hint = 'abierta';
  end if;
  if p_clase = 'final' then
    perform public.assert_permiso('cotizaciones.final.gestionar', p_origen);
  end if;

  -- El intento: dos llamadas con el mismo id se ordenan acá (la segunda espera a que la primera confirme). Sólo una cotización MÍA, de este origen y viva se devuelve; un id ajeno
  -- no se mira (sería una sonda barata de ids): sigue y choca con la clave en el `insert`.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.origen_id = p_origen and x.eliminado_en is null;
  if found then
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- La hoja abierta: su firma, su versión, su hora y la huella de las tarifas que vio. Después del intento: un reintento vuelve lo guardado aunque la clave haya rotado o la hoja sea vieja.
  select l.formula_id, l.abierta_en, l.huella into v_ab_formula, v_ab_en, v_ab_huella from public._cotizacion_abierta_leer(p_abierta, p_origen) l;

  -- 4.25-1b, C1.1: una final sin vehículo, antes de mirar el lead (el mismo error que abajo).
  if p_clase = 'final' and p_vehiculo is null and p_vehiculo_nuevo is null then
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- El lead (comprobar, bloquear y volver a comprobar: nadie bloquea un lead que no ve).
  -- Sin lead sólo con `cotizaciones.crear.sin_lead` de ese origen, y nunca una final.
  if p_lead is null then
    if p_clase = 'final' or not public.tiene_permiso('cotizaciones.crear.sin_lead', p_origen) then
      raise exception 'Elige el lead de la cotización.' using errcode = '22023', hint = 'lead';
    end if;
  else
    if not public.puede_lead(p_lead, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    if p_clase = 'final' then
      -- 4.25-1b, una final mira sin candado lo que mira marcar (C1): el lead en la cartera con leads.editar (P2 a) y, con un vehículo del inventario, que lo
      -- vea (antes que nada que delate su final, su vínculo o sus preventas) y, en la ayudante, otra final activa (P7 a), las preventas que no puede mandar a la
      -- papelera (P3 a) y el vínculo de otro lead (P4 a). Después toma el lead como marcar (no key update); una preventa, como siempre (key share).
      if not public.puede_actuar_lead(p_lead, 'leads.editar') then
        raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
      end if;
      if p_vehiculo is not null and p_vehiculo_nuevo is null then
        if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
          raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
        end if;
        v_ids := array(select z.id from public.cotizaciones z where z.vehiculo_id = p_vehiculo and z.eliminado_en is null order by z.id);
        perform public._final_crear_mirar(p_vehiculo, p_lead, v_ids);
      end if;
      perform 1 from public.leads l where l.id = p_lead and l.eliminado_en is null for no key update;
    else
      perform 1 from public.leads l where l.id = p_lead and l.eliminado_en is null for key share;
    end if;
    if not found or not public.puede_lead(p_lead, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
  end if;

  -- El vehículo.
  if p_vehiculo is not null and p_vehiculo_nuevo is not null then
    raise exception 'Elige un vehículo del inventario o carga uno a mano, no los dos.' using errcode = '22023', hint = 'vehiculo';
  end if;
  if p_vehiculo_nuevo is not null then
    if jsonb_typeof(p_vehiculo_nuevo) <> 'object' or (p_vehiculo_nuevo - array['id', 'datos', 'consulta']) <> '{}'::jsonb
       or coalesce(p_vehiculo_nuevo ->> 'id', '') !~ c_uuid
       or (p_vehiculo_nuevo ? 'consulta' and coalesce(p_vehiculo_nuevo ->> 'consulta', '') !~ c_uuid)
       or (p_vehiculo_nuevo ? 'datos' and jsonb_typeof(p_vehiculo_nuevo -> 'datos') <> 'object') then
      raise exception 'El vehículo a mano lleva su identificador y sus datos.' using errcode = '22023', hint = 'vehiculo';
    end if;
    v_veh := (p_vehiculo_nuevo ->> 'id')::uuid;
    -- En su propia sentencia y antes de armar: `_cotizacion_armar()` es STABLE y ve lo que esta transacción ya escribió.
    perform public.vehiculo_crear(v_veh, p_origen, coalesce(p_vehiculo_nuevo -> 'datos', '{}'::jsonb), (p_vehiculo_nuevo ->> 'consulta')::uuid, 'cotizar');
  elsif p_vehiculo is not null then
    perform public._cotizacion_vehiculo(p_vehiculo);
  elsif p_clase = 'final' or not public.tiene_permiso('cotizaciones.crear.sin_vehiculo', p_origen) then
    -- Sin la clave de ese origen el vehículo es obligatorio; una final lo pide siempre.
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- El título, después del lead y del vehículo (T307): manual si trae texto y lo pide (sin vehículo no hay automático: el texto que llega es manual); si no, el del
  -- vehículo cortado a 120 puntos de código (`tituloAutomatico()` es su espejo). Sin vehículo y sin título, no se guarda.
  v_titulo_manual := v_titulo is not null and (coalesce(p_titulo_manual, false) or v_veh is null);
  if v_titulo_manual then
    if char_length(v_titulo) > 120 then
      raise exception 'El título tiene como máximo 120 caracteres.' using errcode = '22023', detail = 'titulo_largo', hint = 'titulo';
    end if;
  else
    v_titulo := null;
    if v_veh is not null then
      select nullif(btrim(left(btrim(v.titulo), 120)), '') into v_titulo from public.vehiculos v where v.id = v_veh;
    end if;
  end if;
  if v_titulo is null and v_veh is null then
    raise exception 'Escribe el título de la cotización.' using errcode = '22023', hint = 'titulo';
  end if;

  -- La fórmula activa y su publicada, `for share` por su id: activar otra espera a esta alta, y si publicaron o activaron mientras esperábamos,
  -- READ COMMITTED descarta la fila que ya cambió y se vuelve a leer.
  loop
    v_vuelta := v_vuelta + 1;
    v_formula := null;
    select d.id into v_fdo from public.formulas_del_origen d where d.origen_id = p_origen and d.activa;   -- formulas_del_origen_activa_unica
    if v_fdo is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas_del_origen d where d.id = v_fdo and d.activa for share;
    if found then
      select f.id into v_formula from public.formulas f where f.formula_del_origen_id = v_fdo and f.estado = 'publicada';   -- formulas_publicada_unica
      if v_formula is null then
        perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
      end if;
      perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    end if;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  -- D2: la hoja se abrió sobre otra versión que la publicada. Sin «Guardar con la N», se avisa y no se guarda; con ella, se usa esa versión (publicada o archivada de este origen, y reciente).
  -- «Con la abierta» vale siempre dentro de las 24 h de la apertura (4-27): con la versión vigente sólo cambia algo si una tarifa cambió desde entonces, y la hora ya no la elige el cliente.
  v_uso := v_formula;
  if v_ab_formula is distinct from v_formula then
    select f.version into v_version from public.formulas f where f.id = v_formula;
    if not p_con_la_abierta then
      -- La abierta es de otra fórmula del origen: mientras cotizaba se activó la de ahora (formulas_pkey y formulas_del_origen_pkey).
      select d.nombre into v_otra from public.formulas ab, public.formulas_del_origen d
       where ab.id = v_ab_formula and ab.formula_del_origen_id is distinct from v_fdo and d.id = v_fdo;
      if v_otra is not null then
        raise exception 'Se activó la fórmula «%» mientras cotizabas: ahora se cotiza con su versión %.', v_otra, v_version using errcode = 'PT409', detail = 'desactualizada', hint = 'formula';
      end if;
      raise exception 'Se publicó la versión % de la hoja mientras cotizabas.', v_version using errcode = 'PT409', detail = 'desactualizada', hint = 'formula';
    end if;
    perform public._cotizacion_abierta(p_origen, v_ab_formula, v_ab_en);
    -- `for share`, como la publicada: archivada ya no cambia, pero el candado ordena esta alta con quien la borre (un origen que se elimina).
    perform 1 from public.formulas f where f.id = v_ab_formula and f.estado in ('publicada', 'archivada') for share;
    if not found then
      raise exception 'La versión de la hoja que abriste ya no está disponible: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_no_disponible', hint = 'abierta';
    end if;
    v_uso := v_ab_formula;
  elsif p_con_la_abierta then
    perform public._cotizacion_abierta(p_origen, v_ab_formula, v_ab_en);
  end if;

  select * into a from public._cotizacion_armar(p_entradas, null, p_origen, v_veh, v_uso, v_ab_en, p_con_la_abierta);
  if a.formula_id is distinct from v_uso then
    raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
  end if;
  -- D2 (4-33): las tarifas de la apertura que ARMAR reconstruyó del historial son las que la hoja vio. Un cambio que confirmó después de abrirla con un
  -- `cambiado_en` anterior (una transacción larga) entra en la reconstrucción sin haberse visto: la huella firmada no coincide. Va en una sentencia posterior a ARMAR,
  -- con una foto igual o más nueva: lo que ARMAR vio, la huella lo ve. Con «Guardar con la N», lo que la hoja vio ya no se puede reproducir: recargar.
  if public._cotizacion_huella_tarifas(v_ab_formula, v_ab_en) is distinct from v_ab_huella then
    if p_con_la_abierta then
      raise exception 'Cambió un tipo de cambio mientras abrías la hoja: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_tarifas', hint = 'abierta';
    end if;
    raise exception 'Cambió un tipo de cambio de la hoja mientras cotizabas.' using errcode = 'PT409', detail = 'desactualizada', hint = 'tipo_cambio';
  end if;
  -- D2: algún tipo de cambio que la hoja usa cambió desde que se abrió (ARMAR lo lee en una sola foto con los de hoy).
  if a.tc_cambiado and not p_con_la_abierta then
    raise exception 'Cambió un tipo de cambio de la hoja mientras cotizabas.' using errcode = 'PT409', detail = 'desactualizada', hint = 'tipo_cambio';
  end if;

  -- La variante en par (glosario: «Variante en par»): una versión en par se cotiza sólo en par (`cotizacion_crear_en_par`). La opción la pone la base y el título
  -- lleva su etiqueta: el manual entra si cabe con « · <etiqueta>»; el automático es el del vehículo cortado para que quepa.
  v_par_nodo := public._variante_en_par(a.definicion);
  if v_par is null and v_par_nodo is not null then
    raise exception 'Esta hoja cotiza dos opciones a la vez: ábrela de nuevo.' using errcode = '22023', detail = 'cotizar_en_par', hint = 'variante';
  end if;
  if v_par is not null and v_par_nodo is null then
    raise exception 'Esta hoja ya no cotiza dos opciones a la vez: ábrela de nuevo.' using errcode = '22023', detail = 'sin_par', hint = 'variante';
  end if;
  if v_par_nodo is not null then
    if a.entrada ? 'variante' then
      raise exception 'En esta hoja las dos opciones se cotizan a la vez: la opción no se elige.' using errcode = '22023', detail = 'variante_en_par', hint = 'variante';
    end if;
    select x.o ->> 'clave', x.o ->> 'etiqueta' into v_par_clave, v_par_etiqueta
      from jsonb_array_elements(a.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') with ordinality x (o, k)
     where n ->> 'id' = v_par_nodo and x.k = (v_par ->> 'opcion')::int;
    v_tope := 120 - char_length(' · ' || v_par_etiqueta);
    if v_titulo_manual then
      if char_length(v_titulo) > v_tope then
        raise exception 'El título tiene como máximo % caracteres.', v_tope using errcode = '22023', detail = 'titulo_largo', hint = 'titulo';
      end if;
    elsif v_veh is not null then
      select nullif(btrim(left(btrim(v.titulo), v_tope)), '') into v_titulo from public.vehiculos v where v.id = v_veh;
    end if;
    v_titulo := v_titulo || ' · ' || v_par_etiqueta;
  end if;

  -- El modo de cambio: la clave de uno de los modos del diseño de esa versión, convertido a la forma del motor.
  v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);
  -- «Ver total Bs»: sólo si el diseño de esa versión lo ofrece (y nunca nulo).
  perform public._cotizacion_ver_total_bs(a.formula_id, p_ver_total_bs);

  -- Lo que se ve y lo que se edita (una sola lectura de los niveles) y la revisión de lo tipeado, la misma que hace `cotizacion_evaluar()`.
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb)
    into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  perform public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ctx -> 'ok', v_par_nodo is not null);

  -- Un override de un nodo que no se ve y uno de un nodo que no existe: el mismo error (el primero por id, en bytes).
  select min(k collate "C") into v_k from jsonb_object_keys(a.entrada -> 'overrides') k where not (v_ctx -> 'ok') ? k;
  if v_k is not null then
    raise exception 'La hoja no tiene un nodo «%».', v_k using errcode = '22023', detail = 'nodo_inexistente', hint = v_k;
  end if;
  -- Un valor para un nodo que se ve y no se edita.
  select min(t.k collate "C") into v_k
    from (select jsonb_object_keys(a.entrada -> 'inputs') as k
          union all select jsonb_object_keys(a.entrada -> 'banderas')
          union all select jsonb_object_keys(a.entrada -> 'overrides')) t
   where not v_editables ? t.k;
  if v_k is null and a.entrada ? 'variante' then
    select n ->> 'id' into v_opc from jsonb_array_elements(a.definicion -> 'nodos') n where n ->> 'tipo' = 'opcion' limit 1;
    if v_opc is not null and not v_editables ? v_opc then v_k := v_opc; end if;
  end if;
  if v_k is not null then
    raise exception 'No puedes cambiar «%» en esta hoja.', v_k using errcode = '42501', detail = 'nodo_no_editable', hint = v_k;
  end if;

  -- El cálculo, entero (los nodos que quien llama no ve toman el valor de la fórmula y se guardan igual).
  v_res := public.evaluar_formula(a.definicion, a.params,
                                  case when v_par_clave is null then a.entrada else a.entrada || jsonb_build_object('variante', v_par_clave) end, v_modo);
  -- Lo que el motor descarta de un nodo visible no se guarda en silencio; el total tiene que tener valor, caber y estar en la moneda base: `_cotizacion_guardable()`.
  v_total_base := public._cotizacion_guardable(v_res, a.entrada -> 'overrides');

  -- 4.25-1b, una final (C2.4 y C3): después del cálculo, las vivas del vehículo en una pasada por id (el orden de marcar y de la papelera de cotizaciones);
  -- con todo tomado, otra vez la cartera y la ayudante, que relee el vínculo en una sentencia nueva (otro pudo escribirlo mientras se esperaba).
  if p_clase = 'final' then
    v_tomadas := array(select z.id from public.cotizaciones z where z.vehiculo_id = v_veh and z.eliminado_en is null order by z.id for no key update);
    if not public.puede_actuar_lead(p_lead, 'leads.editar') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    perform public._final_crear_mirar(v_veh, p_lead, v_tomadas);
  end if;

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, ver_total_bs,
                                     titulo, titulo_manual, hermana_id, creado_en)
    values (p_id, p_origen, p_lead, v_veh, v_yo, p_clase, a.formula_id, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, p_modo_tc, p_ver_total_bs, v_titulo, v_titulo_manual, (v_par ->> 'hermana')::uuid,
            coalesce((v_par ->> 'creado_en')::timestamptz, now()))
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_hermana_unica' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_final_por_vehiculo' then
      raise exception 'Este vehículo ya tiene una cotización final activa.' using errcode = '23505', hint = 'vehiculo';
    end if;
    raise;
  end;
  -- 4.25-1b, C4: los efectos de marcar, con todo tomado (la cotización ya es final: el paso 2 no la toca). La respuesta no cambia.
  if p_clase = 'final' then
    perform public._final_aplicar(c, v_tomadas);
  end if;

  return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
end $_$;

CREATE OR REPLACE FUNCTION "public"."cotizacion_encima"("p_id" "uuid", "p_anterior" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_yo uuid := (select auth.uid());
  c public.cotizaciones; ant public.cotizaciones; a record;
  v_formula uuid; v_vuelta int := 0; v_enc uuid; v_fdo uuid;
  v_lleva jsonb; v_modo_tc text; v_bs boolean; v_res jsonb; v_total_base numeric; v_constraint text; v_desc int;
  v_lead uuid; v_vehiculo uuid; v_tomas int := 0;
  -- Lo fija `cotizacion_encima_en_par` (la posición de la opción, la hermana nueva y la hora); nulo fuera de ella.
  v_par jsonb := nullif(current_setting('importadora.en_par', true), '')::jsonb;
  v_par_nodo text; v_par_clave text; v_par_etiqueta text; v_ant_etiqueta text; v_titulo text; v_tope int;
begin
  perform public.assert_activo();
  if p_id is null or p_anterior is null then
    raise exception 'Faltan el identificador y la cotización anterior.' using errcode = '22023';
  end if;
  -- La anterior, antes que todo lo demás: una que no existe, está en la papelera o no se ve da el mismo error, con o sin permiso de cotizar y vea o no su lead.
  if not public.puede_cotizacion(p_anterior, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into ant from public.cotizaciones x where x.id = p_anterior;
  perform public.assert_permiso('cotizaciones.crear', ant.origen_id);
  perform public.assert_permiso('cotizaciones.ver', ant.origen_id);
  -- Cotizar encima es crear: una anterior sin lead pide `cotizaciones.crear.sin_lead` de su origen.
  if ant.lead_id is null then
    if not public.tiene_permiso('cotizaciones.crear.sin_lead', ant.origen_id) then
      raise exception 'La cotización anterior no tiene lead: cotiza una nueva.' using errcode = '22023', hint = 'lead';
    end if;
  elsif not public.puede_lead(ant.lead_id, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;

  -- El intento, como en `cotizacion_crear` (el mismo candado): una mía viva con ese id es la de este intento si es de esta anterior.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.eliminado_en is null;
  if found then
    if c.cotizacion_padre_id is distinct from p_anterior then
      raise exception 'Ese intento ya se usó para otra cotización.' using errcode = '22023', detail = 'intento_reusado', hint = 'intento';
    end if;
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- El orden de candados (lead → vehículo → cotización): el lead y el vehículo de la anterior, leídos sin candado, antes que la anterior `for share` (choca con
  -- guardarla y con mandarla a la papelera). Al revés se cruza en un 40P01 con mandar su vehículo a la papelera, que toma el vehículo y después sus cotizaciones.
  -- Sólo se toma lo que se ve: lo demás falla abajo sin esperar. Con la anterior tomada, otra vez visible y se relee lo que quedó; si mientras se esperaba
  -- cambió su lead o su vehículo, los candados son de otros y se vuelve a tomar.
  loop
    v_tomas := v_tomas + 1;
    v_lead := ant.lead_id;
    v_vehiculo := ant.vehiculo_id;
    if v_lead is not null and public.puede_lead(v_lead, 'leads.ver') then
      perform 1 from public.leads l where l.id = v_lead for key share;
    end if;
    if v_vehiculo is not null and public.puede_vehiculo(v_vehiculo, 'vehiculos.ver') then
      perform 1 from public.vehiculos v where v.id = v_vehiculo for key share;
    end if;
    perform 1 from public.cotizaciones x where x.id = p_anterior and x.eliminado_en is null for share;
    if not found or not public.puede_cotizacion(p_anterior, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    select * into ant from public.cotizaciones x where x.id = p_anterior;
    exit when ant.lead_id is not distinct from v_lead and ant.vehiculo_id is not distinct from v_vehiculo;
    if v_tomas >= 3 then
      raise exception 'La cotización cambió mientras cotizabas encima. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;
  -- Una versión nueva viva por anterior (P3): de la que se ve, su id en el hint; de la que no, sólo que existe (P11).
  select x.id into v_enc from public.cotizaciones x where x.cotizacion_padre_id = p_anterior and x.eliminado_en is null limit 1;   -- cotizaciones_encima_unica
  if v_enc is not null and public.puede_cotizacion(v_enc, 'cotizaciones.ver') then
    raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima', hint = v_enc::text;
  elsif v_enc is not null then
    raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima';
  end if;

  -- El lead (ya tomado: volver a mirar) y el vehículo de la anterior.
  if ant.lead_id is not null then
    perform 1 from public.leads l where l.id = ant.lead_id and l.eliminado_en is null for key share;
    if not found or not public.puede_lead(ant.lead_id, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
  elsif not public.tiene_permiso('cotizaciones.crear.sin_lead', ant.origen_id) then
    raise exception 'La cotización anterior no tiene lead: cotiza una nueva.' using errcode = '22023', hint = 'lead';
  end if;
  if ant.vehiculo_id is not null then
    perform public._cotizacion_vehiculo(ant.vehiculo_id);
  elsif not public.tiene_permiso('cotizaciones.crear.sin_vehiculo', ant.origen_id) then
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- La publicada de la fórmula activa de hoy, `for share` (como en `cotizacion_crear`).
  loop
    v_vuelta := v_vuelta + 1;
    v_formula := null;
    select d.id into v_fdo from public.formulas_del_origen d where d.origen_id = ant.origen_id and d.activa;   -- formulas_del_origen_activa_unica
    if v_fdo is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas_del_origen d where d.id = v_fdo and d.activa for share;
    if found then
      select f.id into v_formula from public.formulas f where f.formula_del_origen_id = v_fdo and f.estado = 'publicada';   -- formulas_publicada_unica
      if v_formula is null then
        perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
      end if;
      perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    end if;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  -- La versión y las tarifas de hoy, con lo que se lleva de la anterior (P2: también lo que quien llama no ve); el modo de la anterior si sigue (si no, el primero de hoy) y
  -- «Ver total Bs» si hoy se ofrece. Un override llevado que el motor descarta no falla (nadie lo mandó): cuenta en `descartados`.
  select * into a from public._cotizacion_armar('{}'::jsonb, null, ant.origen_id, ant.vehiculo_id, v_formula);
  v_lleva := public._cotizacion_lo_que_se_lleva(a.definicion, a.entrada, ant.valores, ant.fuentes);
  v_titulo := ant.titulo;
  -- En par: la opción de su misma posición en el par de hoy, y el título otra vez con la etiqueta de esa opción sobre el de la anterior sin la suya.
  if v_par is not null then
    v_par_nodo := public._variante_en_par(a.definicion);
    if v_par_nodo is null then
      raise exception 'La hoja de hoy no cotiza dos opciones a la vez.' using errcode = '22023', detail = 'sin_par', hint = 'variante';
    end if;
    select x.o ->> 'clave', x.o ->> 'etiqueta' into v_par_clave, v_par_etiqueta
      from jsonb_array_elements(a.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') with ordinality x (o, k)
     where n ->> 'id' = v_par_nodo and x.k = (v_par ->> 'opcion')::int;
    v_lleva := v_lleva || jsonb_build_object('variante', v_par_clave);
    select (select o ->> 'etiqueta' from jsonb_array_elements(f.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') o
             where n ->> 'id' = public._variante_en_par(f.definicion) and o ->> 'clave' = ant.valores ->> (n ->> 'id'))
      into v_ant_etiqueta from public.formulas f where f.id = ant.formula_id;
    if v_ant_etiqueta is not null and right(v_titulo, char_length(' · ' || v_ant_etiqueta)) = ' · ' || v_ant_etiqueta then
      v_titulo := left(v_titulo, char_length(v_titulo) - char_length(' · ' || v_ant_etiqueta));
    end if;
    v_tope := 120 - char_length(' · ' || v_par_etiqueta);
    v_titulo := nullif(btrim(left(v_titulo, v_tope)), '') || ' · ' || v_par_etiqueta;
  end if;
  select coalesce((select m ->> 'clave' from jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m where m ->> 'clave' = ant.modo_tc),
                  case when ant.modo_tc is not null then f.diseno -> 'cabecera' -> 'modos' -> 0 ->> 'clave' end),
         ant.ver_total_bs and coalesce((f.diseno -> 'cabecera' ->> 'ver_total_bs')::boolean, false)
    into v_modo_tc, v_bs from public.formulas f where f.id = v_formula;
  v_res := public.evaluar_formula(a.definicion, a.params, v_lleva, public._cotizacion_modo(v_formula, v_modo_tc));
  v_total_base := public._cotizacion_guardable(v_res, '{}'::jsonb);
  v_desc := public._cotizacion_descartados((select f.definicion from public.formulas f where f.id = ant.formula_id),
                                           coalesce(array(select n.nodo from public._nodos_visibles(ant.formula_id) n), '{}'), ant.valores, ant.fuentes, v_lleva, v_res);

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, ver_total_bs,
                                     titulo, titulo_manual, notas, tarjeta_retoques, cotizacion_padre_id, version, hermana_id, creado_en)
    values (p_id, ant.origen_id, ant.lead_id, ant.vehiculo_id, v_yo, 'preventa', v_formula, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, v_modo_tc, v_bs, v_titulo, ant.titulo_manual, ant.notas, ant.tarjeta_retoques, p_anterior, ant.version + 1,
            (v_par ->> 'hermana')::uuid, coalesce((v_par ->> 'creado_en')::timestamptz, now()))
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_hermana_unica' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_encima_unica' then
      raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima';
    end if;
    raise;
  end;

  return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', false, 'descartados', v_desc);
end $$;

CREATE OR REPLACE FUNCTION "public"."_cotizacion_armar"("p_entradas" "jsonb", "p_cotizacion" "uuid", "p_origen" "uuid", "p_vehiculo" "uuid", "p_formula" "uuid" DEFAULT NULL::"uuid", "p_abierta_en" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_con_la_abierta" boolean DEFAULT false) RETURNS TABLE("definicion" "jsonb", "params" "jsonb", "entrada" "jsonb", "formula_id" "uuid", "origen_id" "uuid", "visibilidad" "jsonb", "tc_cambiado" boolean, "guardado" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_origen uuid;
  v_formula uuid;
  v_vehiculo uuid;
  v_tc_cot jsonb;
  v_valores jsonb; v_fuentes jsonb; v_clase public.clase_cotizacion;
  v_def jsonb;
  v_par jsonb;
  v_visib jsonb;
  v_cong jsonb;
  v_ids text[];
  v_tablas text[];
  v_tcs text[];
  v_campos text[];
  v_match text[];
  v_vivas text[];
  v_extra text;
  v_tc jsonb;
  v_tc_cambiado boolean := false;
  v_tab jsonb;
  v_veh jsonb := '{}'::jsonb;
  v_v_origen uuid;
  v_anio smallint; v_marca text; v_modelo text; v_km int; v_precio numeric; v_attr jsonb;
begin
  perform public.assert_activo();

  -- La llamada: uno de los dos, y el vehículo sólo con un origen (la cotización trae el suyo).
  if (p_cotizacion is null) = (p_origen is null) then
    perform public._motor_fallar('llamada_invalida', null, 'Evaluar pide una cotización o un origen, y no los dos ni ninguno.');
  end if;
  -- La versión de la hoja que se abrió y cuándo (D2) son de un alta: una cotización ya trae su versión y sus tipos de cambio.
  if p_cotizacion is not null and (p_formula is not null or p_abierta_en is not null or p_con_la_abierta) then
    perform public._motor_fallar('llamada_invalida', 'p_formula', 'Una cotización ya trae su versión de la hoja y sus tipos de cambio.');
  end if;
  -- Las entradas: un objeto y sólo lo que la persona puede tipear. Lo demás lo pone la base.
  if p_entradas is null or jsonb_typeof(p_entradas) <> 'object' then
    perform public._motor_fallar('entradas_invalidas', null, 'Las entradas son un objeto con inputs, banderas, overrides y variante.');
  end if;
  select min(k collate "C") into v_extra from jsonb_object_keys(p_entradas) k where k not in ('inputs', 'banderas', 'overrides', 'variante');
  if v_extra is not null then
    perform public._motor_fallar('entradas_invalidas', v_extra, 'Las entradas no llevan «' || v_extra || '»: la base lo pone.');
  end if;

  -- Quién puede, y de dónde sale la fórmula.
  if p_cotizacion is not null then
    -- Una cotización que no existe y una que no se ve dan el mismo error.
    if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    select c.origen_id, c.formula_id, c.vehiculo_id, c.tipos_cambio, c.valores, c.fuentes, c.clase into v_origen, v_formula, v_vehiculo, v_tc_cot, v_valores, v_fuentes, v_clase
      from public.cotizaciones c where c.id = p_cotizacion;                                    -- cotizaciones_pkey
    -- Otro vehículo para ese cálculo (lo que daría cambiarlo, antes de guardar): una final no cambia de vehículo.
    if p_vehiculo is not null then
      if v_clase = 'final' and p_vehiculo is distinct from v_vehiculo then
        perform public._motor_fallar('llamada_invalida', 'p_vehiculo', 'Una cotización final no cambia de vehículo.');
      end if;
      v_vehiculo := p_vehiculo;
    end if;
    select f.definicion, f.params, f.visibilidad into v_def, v_par, v_visib from public.formulas f where f.id = v_formula;  -- formulas_pkey
  else
    perform public.assert_permiso('cotizaciones.crear', p_origen);
    v_origen := p_origen;
    v_vehiculo := p_vehiculo;
    if p_formula is not null then
      -- La versión que se abrió (D2, «Guardar con la N»): una publicada o archivada de este origen.
      select f.id, f.definicion, f.params, f.visibilidad into v_formula, v_def, v_par, v_visib
        from public.formulas f where f.id = p_formula and f.origen_id = p_origen and f.estado in ('publicada', 'archivada');   -- formulas_pkey
      if not found then
        perform public._motor_fallar('llamada_invalida', 'p_formula', 'La versión de la hoja no es de este origen.');
      end if;
    else
      v_formula := public._publicada_de_la_activa(p_origen);                                   -- la publicada de la fórmula activa
      select f.id, f.definicion, f.params, f.visibilidad into v_formula, v_def, v_par, v_visib
        from public.formulas f where f.id = v_formula;                                           -- formulas_pkey
      if not found then
        perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
      end if;
    end if;
  end if;

  -- El vehículo: sólo si quien llama lo ve (esto corre con los derechos de la base y no puede devolver lo que él no vería).
  if v_vehiculo is not null then
    if not public.puede_vehiculo(v_vehiculo, 'vehiculos.ver') then
      raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
    end if;
    select v.origen_id, v.anio, v.marca, v.modelo, v.kilometraje, v.precio, v.atributos
      into v_v_origen, v_anio, v_marca, v_modelo, v_km, v_precio, v_attr
      from public.vehiculos v where v.id = v_vehiculo;                                         -- vehiculos_pkey
    if p_vehiculo is not null and v_v_origen <> v_origen then
      perform public._motor_fallar('vehiculo_de_otro_origen', 'p_vehiculo', 'El vehículo no es de este origen.');
    end if;
  end if;

  -- Lo que la fórmula nombra, en una sola pasada por sus nodos (`definicion` se desarma una vez: un jsonb que llega de una columna
  -- comprimida se descomprime entero en cada `->`). Los campos del vehículo son los de `campo_vehiculo` y los valores de un `match` que
  -- no son el id de un nodo.
  select array_agg(distinct n ->> 'id'),
         coalesce(array_agg(distinct n ->> 'tabla') filter (where n ->> 'tabla' is not null), '{}'),
         coalesce(array_agg(distinct n ->> 'clave') filter (where n ->> 'tipo' = 'tipo_cambio'), '{}'),
         coalesce(array_agg(distinct n ->> 'campo') filter (where n ->> 'tipo' = 'campo_vehiculo'), '{}'),
         coalesce(array_agg(distinct m.value) filter (where m.value is not null), '{}')
    into v_ids, v_tablas, v_tcs, v_campos, v_match
    from jsonb_array_elements(v_def -> 'nodos') n
    left join lateral jsonb_each_text(case when jsonb_typeof(n -> 'match') = 'object' then n -> 'match' end) m on true;
  v_campos := array(select distinct c from unnest(v_campos || array(select r from unnest(v_match) r where r <> all (coalesce(v_ids, '{}')))) c);

  -- Las tablas vivas: las que un nodo nombra y la fórmula no congeló.
  v_cong := v_par -> 'tablas';
  v_vivas := array(select t from unnest(v_tablas) t where jsonb_typeof(v_cong) is distinct from 'object' or not (v_cong ? t));
  select coalesce(jsonb_object_agg(x.clave, x.filas), '{}'::jsonb) into v_tab
    from (
      select c.clave,
             -- tablas_referencia_filas_tabla_orden_idx: sus filas activas, en su orden.
             (select coalesce(jsonb_agg(f.valores order by f.orden, f.id), '[]'::jsonb)
                from public.tablas_referencia_filas f where f.tabla_id = t.id and f.activa) as filas
        from unnest(v_vivas) c (clave)
        -- tablas_referencia_origen_id_clave_key: la del origen y, si no hay una activa, la compartida.
        cross join lateral (
          select coalesce(
                   (select r.id from public.tablas_referencia r where r.origen_id = v_origen and r.clave = c.clave and r.activa),
                   (select r.id from public.tablas_referencia r where r.origen_id is null and r.clave = c.clave and r.activa)
                 ) as id
        ) t
       where t.id is not null
    ) x;

  -- Los tipos de cambio: los congelados de la cotización o los vigentes de la empresa, sólo los que un nodo nombra.
  if p_cotizacion is not null then
    select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_tc
      from jsonb_each(case when jsonb_typeof(v_tc_cot) = 'object' then v_tc_cot else '{}'::jsonb end) e
     where e.key = any (v_tcs) and case when jsonb_typeof(e.value) = 'number' then (e.value)::numeric > 0 else false end;
  else
    -- Los vigentes de hoy, los que valían cuando se abrió la hoja (`tipos_cambio_historial_tipo_idx`: el último cambio hasta `p_abierta_en`) y si alguno cambió desde entonces (D2), todo en
    -- una sola lectura: una foto. Uno que no tenía valor entonces (nació después) cuenta como cambiado. «Guardar con la N» congela los de entonces.
    select coalesce(jsonb_object_agg(x.clave, case when p_con_la_abierta and x.entonces is not null then x.entonces else x.valor end), '{}'::jsonb),
           coalesce(bool_or(p_abierta_en is not null and x.entonces is distinct from x.valor), false)
      into v_tc, v_tc_cambiado
      from (select t.clave, t.valor,
                   case when p_abierta_en is not null then
                     (select h.valor_nuevo from public.tipos_cambio_historial h where h.tipo_cambio_id = t.id and h.cambiado_en <= p_abierta_en order by h.cambiado_en desc, h.id desc limit 1)
                   end as entonces
              from public.tipos_cambio t where t.clave = any (v_tcs) and t.activo) x;          -- tipos_cambio_clave_key
  end if;

  -- Los campos del vehículo.
  if v_vehiculo is not null then
    select coalesce(jsonb_object_agg(n.campo, n.valor) filter (where n.valor is not null), '{}'::jsonb) into v_veh
      from (
        select s.campo,
               case when jsonb_typeof(s.x) = 'number' and abs((s.x #>> '{}')::numeric) < 1e308 then s.x
                    when jsonb_typeof(s.x) = 'string' and char_length(s.x #>> '{}') <= 200 then s.x end as valor
          from (
            select k.campo,
                   case k.campo
                     when 'anio' then to_jsonb(v_anio)
                     when 'marca' then to_jsonb(v_marca)
                     when 'modelo' then to_jsonb(v_modelo)
                     when 'kilometraje' then to_jsonb(v_km)
                     when 'precio' then to_jsonb(v_precio)
                     -- origenes_campos_origen_id_clave_key: sólo un campo activo del origen del vehículo.
                     else case when exists (select 1 from public.origenes_campos oc
                                             where oc.origen_id = v_v_origen and oc.clave = k.campo and oc.activo)
                               then v_attr -> k.campo end
                   end as x
              from unnest(v_campos) k (campo)
          ) s
      ) n;
  end if;

  return query select
    v_def,
    v_par,
    jsonb_build_object(
      'inputs', case when p_entradas ? 'inputs' then p_entradas -> 'inputs' else '{}'::jsonb end,
      'banderas', case when p_entradas ? 'banderas' then p_entradas -> 'banderas' else '{}'::jsonb end,
      'tipos_cambio', v_tc,
      'vehiculo', v_veh,
      'tablas', v_tab,
      'overrides', case when p_entradas ? 'overrides' then p_entradas -> 'overrides' else '{}'::jsonb end)
    || case when p_entradas ? 'variante' then jsonb_build_object('variante', p_entradas -> 'variante') else '{}'::jsonb end,
    v_formula,
    v_origen,
    coalesce(v_visib, '{}'::jsonb),
    v_tc_cambiado,
    -- Lo guardado, para completar lo que quien llama no ve o no edita (cotizacion_conservar): sólo con una cotización.
    case when p_cotizacion is not null then jsonb_build_object('valores', v_valores, 'fuentes', v_fuentes) end;
end $$;

CREATE OR REPLACE FUNCTION "public"."_cotizacion_tabla_version"("p_cotizacion" "uuid", "p_origen" "uuid", "p_abierta" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_formula uuid; v_abierta_en timestamptz; v_publicada uuid;
begin
  perform public.assert_activo();
  -- La hoja abierta es de una hoja nueva (por origen), y eso se dice antes que «una cotización o un origen».
  if p_abierta is not null and p_cotizacion is not null then
    perform public._motor_fallar('llamada_invalida', 'p_abierta', 'Una cotización ya trae su versión de la hoja.');
  end if;
  if (p_cotizacion is null) = (p_origen is null) then
    raise exception 'Pide una cotización o un origen, y no los dos ni ninguno.' using errcode = '22023';
  end if;
  if p_cotizacion is not null then
    if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    return (select c.formula_id from public.cotizaciones c where c.id = p_cotizacion);
  end if;
  -- Por origen, la puerta de la hoja (`crear` y `ver`), antes de leer la hoja abierta y de mirar nada más.
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  v_publicada := public._publicada_de_la_activa(p_origen);
  if p_abierta is null then
    return v_publicada;
  end if;
  select l.formula_id, l.abierta_en into v_formula, v_abierta_en from public._cotizacion_abierta_leer(p_abierta, p_origen) l;
  -- Una versión que ya no es la publicada vale mientras se podría guardar con ella; si no, «abierta_vencida» y la hoja pide recargar.
  if v_formula is distinct from v_publicada then
    perform public._cotizacion_abierta(p_origen, v_formula, v_abierta_en);
  end if;
  return v_formula;
end $$;

CREATE OR REPLACE FUNCTION "public"."cotizacion_evaluar"("p_entradas" "jsonb", "p_cotizacion" "uuid" DEFAULT NULL::"uuid", "p_origen" "uuid" DEFAULT NULL::"uuid", "p_vehiculo" "uuid" DEFAULT NULL::"uuid", "p_modo" "jsonb" DEFAULT NULL::"jsonb", "p_modo_tc" "text" DEFAULT NULL::"text", "p_abierta" "text" DEFAULT NULL::"text", "p_opcion" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  a record;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_cfg boolean;
  v_ent jsonb; v_ov_ocultos text[];
  v_modo jsonb := p_modo;
  v_formula uuid; v_abierta_en timestamptz; v_publicada uuid;
  v_res jsonb;
  v_par text;
begin
  -- La hoja abierta es de una hoja nueva (por origen): una cotización ya trae su versión y sus tipos de cambio.
  if p_abierta is not null and p_cotizacion is not null then
    perform public.assert_activo();
    perform public._motor_fallar('llamada_invalida', 'p_abierta', 'Una cotización ya trae su versión de la hoja y sus tipos de cambio.');
  end if;
  -- La opción de un par es de una hoja nueva: una cotización ya trae la suya (la guardada).
  if p_opcion is not null and p_cotizacion is not null then
    perform public.assert_activo();
    perform public._motor_fallar('llamada_invalida', 'p_opcion', 'Una cotización ya trae su opción.');
  end if;
  -- Por origen se cotiza con `crear` y `ver` del origen (4-32), antes de leer la hoja abierta y de mirar nada más.
  if p_cotizacion is null and p_origen is not null then
    perform public.assert_permiso('cotizaciones.crear', p_origen);
    perform public.assert_permiso('cotizaciones.ver', p_origen);
    if p_abierta is not null then
      select l.formula_id, l.abierta_en into v_formula, v_abierta_en from public._cotizacion_abierta_leer(p_abierta, p_origen) l;
      v_publicada := public._publicada_de_la_activa(p_origen);
      -- Una versión que ya no es la publicada: ¿todavía se podría guardar con ella? Si no, «abierta_vencida» y la hoja pide recargar.
      if v_formula is distinct from v_publicada then
        perform public._cotizacion_abierta(p_origen, v_formula, v_abierta_en);
      end if;
    end if;
  end if;
  -- Con la hoja abierta (4-28): la versión Y las tarifas de la apertura, lo mismo que verá D2 al guardar «con la N»; sin ella, la publicada y las tarifas de hoy.
  if v_formula is not null then
    select * into a from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo, v_formula, v_abierta_en, true);
  else
    select * into a from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo);
  end if;
  -- El modo por su clave (de esa versión) se vuelve la forma del motor antes de revisar lo tipeado.
  if p_modo_tc is not null then
    if p_modo is not null then
      perform public._motor_fallar('llamada_invalida', null, 'Pide el modo por su clave o completo, no los dos.');
    end if;
    v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);
  end if;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', a.origen_id);
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  v_ok := v_ctx -> 'ok';
  v_ent := a.entrada;
  -- La variante en par (glosario: «Variante en par»): la opción la pone la base (`p_opcion`), nunca la persona; con una cotización, la guardada.
  v_par := public._variante_en_par(a.definicion);
  if p_opcion is not null and v_par is null then
    perform public._motor_fallar('sin_par', 'opcion', 'Esta hoja no cotiza dos opciones a la vez.');
  end if;
  if v_par is not null and coalesce(p_entradas ? 'variante', false) then
    perform public._motor_fallar('variante_en_par', 'variante', 'En esta hoja las dos opciones se cotizan a la vez: la opción no se elige.');
  end if;
  if p_opcion is not null and not exists (select 1 from jsonb_array_elements(a.definicion -> 'nodos') n, jsonb_array_elements(n -> 'opciones') o
                                           where n ->> 'id' = v_par and o ->> 'clave' = p_opcion) then
    perform public._motor_fallar('opcion_invalida', 'opcion', 'Esa opción no es de esta hoja.');
  end if;

  -- Lo tipeado (la forma, la fórmula inválida, inputs, banderas y variante que se ven): `_cotizacion_tipeado()`, la misma que revisa `cotizacion_crear()`.
  v_ov_ocultos := public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ok, p_cotizacion is not null or p_opcion is not null);
  -- Un override de un nodo que existe y no se ve se quita antes del motor; vuelve como `nodo_inexistente` (abajo).
  if cardinality(v_ov_ocultos) > 0 then
    v_ent := jsonb_set(a.entrada, '{overrides}', (a.entrada -> 'overrides') - v_ov_ocultos);
  end if;
  if p_opcion is not null then
    v_ent := v_ent || jsonb_build_object('variante', p_opcion);
  end if;
  -- Con una cotización, lo que quien llama no ve o no edita es lo GUARDADO (D7: guardar conserva lo que quien guarda no ve), y un valor distinto para un nodo que se ve y no se edita es un
  -- error. Con un origen no hay nada guardado.
  if p_cotizacion is not null then
    v_ent := public._cotizacion_conservar(a.definicion, v_ent, v_editables, a.guardado);
  end if;

  -- El modo: quien no configura sólo elige uno de los del diseño de esa versión (convertido a la forma del motor).
  if v_modo is not null and not v_cfg and not exists (
       select 1 from public.formulas f, jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m
        where f.id = a.formula_id
          and jsonb_build_object('buckets', coalesce((select jsonb_object_agg(b ->> 'bucket', b ->> 'nodo') from jsonb_array_elements(m -> 'buckets') b), '{}'::jsonb),
                                 'total_en', m ->> 'total_en') = v_modo) then
    perform public._motor_fallar('modo_invalido', null, 'El modo no es uno de los que ofrece la hoja.');
  end if;

  v_res := public.evaluar_formula(a.definicion, a.params, v_ent, v_modo);
  v_res := public._cotizacion_recorte(v_res, v_ctx);

  -- Los overrides que se quitaron vuelven como inexistentes, entre los inexistentes y en su orden (por id, en bytes), después de los descartados de nodos que existen: es lo que el
  -- motor habría dicho si el nodo no estuviera. (Se agregan después de recortar: el recorte descarta, con razón, todo lo de un nodo que existe y no se ve.)
  if cardinality(v_ov_ocultos) > 0 then
    v_res := jsonb_set(v_res, '{overrides_descartados}', (
      select coalesce(jsonb_agg(x.e order by x.grupo, x.id collate "C", x.ord), '[]'::jsonb)
        from (select d.e, case when d.e ->> 'motivo' = 'nodo_inexistente' then 1 else 0 end as grupo, d.e ->> 'id' as id, d.ord
                from jsonb_array_elements(coalesce(v_res -> 'overrides_descartados', '[]'::jsonb)) with ordinality d (e, ord)
              union all
              select jsonb_build_object('id', k, 'motivo', 'nodo_inexistente'), 1, k, 0 from unnest(v_ov_ocultos) k) x));
  end if;
  return v_res;
end $$;

CREATE OR REPLACE FUNCTION "public"."cotizacion_hoja"("p_origen" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_nombre text; v_formula uuid;
begin
  -- Los permisos, antes de mirar si el origen existe: con cualquier uuid, quien no cotiza ahí recibe el mismo 42501. Cotizar pide ver (4-32): con sólo `crear` la hoja iba vacía.
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  if p_origen is null then
    raise exception 'Falta el origen.' using errcode = '22023';
  end if;
  select o.nombre into v_nombre from public.origenes o where o.id = p_origen;
  if v_nombre is null then
    raise exception 'No encontramos ese origen.' using errcode = '22023';
  end if;
  v_formula := public._publicada_de_la_activa(p_origen);
  if v_formula is null then
    return jsonb_build_object('estado', 'sin_publicar', 'origen', jsonb_build_object('id', p_origen, 'nombre', v_nombre),
                              'puede_configurar', public.tiene_permiso('cotizaciones.configurar', p_origen));
  end if;
  -- `abierta` es lo que `cotizacion_crear()` y `cotizacion_evaluar()` reciben como `p_abierta`: la versión y la hora, firmadas para esta persona y este origen (4-27 y 4-28).
  return jsonb_build_object('estado', 'lista', 'origen', jsonb_build_object('id', p_origen, 'nombre', v_nombre),
                            'abierta_en', now(), 'abierta', public._cotizacion_abierta_firmar(p_origen, v_formula, now()))
         || public._cotizacion_hoja(v_formula, p_origen);
end $$;

CREATE OR REPLACE FUNCTION "public"."cotizacion_hoja_guardada"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c public.cotizaciones; v_edita boolean; v_nombre text; v_pub record; v_vence date; v_hoy date;
  h public.cotizaciones; v_hoja jsonb; v_hermana jsonb; v_h_disponible boolean := false; v_cadena jsonb; v_encima_en_par boolean;
begin
  perform public.assert_activo();
  -- Una que no existe, una en la papelera y una que no se ve dan el mismo error que `cotizacion_leer`.
  if not public.puede_cotizacion(p_id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into c from public.cotizaciones x where x.id = p_id;
  -- Quién guarda decide también qué celdas se editan (no `_nodos_visibles()`, que da «editar» con `crear`).
  v_edita := public._cotizacion_puede_guardar(c.id, c.clase, c.origen_id);
  select o.nombre into v_nombre from public.origenes o where o.id = c.origen_id;
  select x.id, x.version into v_pub from public.formulas x where x.id = (select public._publicada_de_la_activa(c.origen_id));   -- formulas_pkey
  -- La vigencia, por día en la zona de la empresa (docs/GLOSARIO.md › «Vencida»): vale hasta el día de `creado_en` + `vigencia_dias`, entero.
  select (c.creado_en at time zone e.zona_horaria)::date + e.vigencia_dias, (now() at time zone e.zona_horaria)::date
    into v_vence, v_hoy from public.ajustes_empresa e where e.id = 1;
  v_hoja := public._cotizacion_hoja(c.formula_id, c.origen_id, v_edita);
  -- La opción de esta cotización en su par (la elige la base al crear: es estructura, como el par).
  if jsonb_typeof(v_hoja -> 'par') = 'object' then
    v_hoja := jsonb_set(v_hoja, '{par,opcion}', coalesce(c.valores -> (v_hoja -> 'par' ->> 'nodo'), 'null'::jsonb));
  end if;
  -- La hermana: disponible si se ve, está viva y no es inválida; de una que no, sólo su id (la guardada se abre sola, con su aviso).
  if c.hermana_id is not null then
    select * into h from public.cotizaciones x where x.id = c.hermana_id;
    v_h_disponible := found and h.eliminado_en is null and h.estado <> 'invalida' and public.puede_cotizacion(h.id, 'cotizaciones.ver');
    v_hermana := case when v_h_disponible
                      then jsonb_build_object('id', h.id, 'disponible', true, 'actualizado_en', h.actualizado_en,
                                              'puede_guardar', public._cotizacion_puede_guardar(h.id, h.clase, h.origen_id))
                      else jsonb_build_object('id', c.hermana_id, 'disponible', false) end;
  end if;
  -- Cotizar encima del par: lo de cotizar encima de esta, la hermana disponible y sin versión nueva viva, y la publicada de hoy con su variante en par.
  v_cadena := public._cotizacion_cadena(c, v_pub.id);
  v_encima_en_par := coalesce((v_cadena ->> 'puede_cotizar_encima')::boolean, false) and v_h_disponible
                     and not exists (select 1 from public.cotizaciones x where x.cotizacion_padre_id = c.hermana_id and x.eliminado_en is null)   -- cotizaciones_encima_unica
                     and public._variante_en_par((select f.definicion from public.formulas f where f.id = v_pub.id)) is not null;
  return public._cotizacion_respuesta(c)
      || v_hoja
      || jsonb_build_object(
           'estado', 'lista',
           'origen', jsonb_build_object('id', c.origen_id, 'nombre', v_nombre),
           'puede_guardar', v_edita,
           'publicada', case when v_pub.id is not null then jsonb_build_object('id', v_pub.id, 'version', v_pub.version) end,
           'vence_el', v_vence,
           'vencida', v_vence < v_hoy,
           'hermana', v_hermana)
      || v_cadena || jsonb_build_object('puede_cotizar_encima_en_par', v_encima_en_par);
end $$;

CREATE OR REPLACE FUNCTION "public"."cotizacion_encima_en_par"("p_ids" "uuid"[], "p_anteriores" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_ok boolean; ant1 public.cotizaciones; ant2 public.cotizaciones; v_def_hoy jsonb; v_def_ant jsonb; v_par_ant text;
  v_pos int[] := array[null, null]::int[]; v_p1 int; v_orden int[]; v_i int; v_otra int; v_creado timestamptz;
  r jsonb[] := array[null, null]::jsonb[];
begin
  perform public.assert_activo();
  v_ok := coalesce(array_length(p_ids, 1), 0) = 2 and p_ids[1] is not null and p_ids[2] is not null and p_ids[1] <> p_ids[2]
          and coalesce(array_length(p_anteriores, 1), 0) = 2 and p_anteriores[1] is not null and p_anteriores[2] is not null;
  if v_ok is not true then
    raise exception 'Cotizar encima en par lleva las dos cotizaciones anteriores y los dos ids nuevos.' using errcode = '22023';
  end if;
  -- Las anteriores, antes que todo: que se vean (si no, el 42501 de lo que no existe) y que sean hermanas entre sí.
  v_ok := public.puede_cotizacion(p_anteriores[1], 'cotizaciones.ver') and public.puede_cotizacion(p_anteriores[2], 'cotizaciones.ver');
  if v_ok is not true then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into ant1 from public.cotizaciones x where x.id = p_anteriores[1];
  select * into ant2 from public.cotizaciones x where x.id = p_anteriores[2];
  v_ok := ant1.hermana_id = ant2.id and ant2.hermana_id = ant1.id;
  if v_ok is not true then
    raise exception 'Esas cotizaciones no son hermanas.' using errcode = '22023', detail = 'no_son_hermanas', hint = 'anteriores';
  end if;
  perform public.assert_permiso('cotizaciones.crear', ant1.origen_id);
  perform public.assert_permiso('cotizaciones.ver', ant1.origen_id);
  select f.definicion into v_def_hoy from public.formulas f where f.id = (select public._publicada_de_la_activa(ant1.origen_id));   -- formulas_pkey
  if public._variante_en_par(v_def_hoy) is null then
    raise exception 'La hoja de hoy no cotiza dos opciones a la vez.' using errcode = '22023', detail = 'sin_par', hint = 'variante';
  end if;
  -- La posición de cada anterior en su par (la de la opción que tiene); la nueva toma la opción de esa misma posición en el par de hoy.
  select f.definicion into v_def_ant from public.formulas f where f.id = ant1.formula_id;
  v_par_ant := public._variante_en_par(v_def_ant);
  select x.k into v_p1 from jsonb_array_elements(v_def_ant -> 'nodos') n, jsonb_array_elements(n -> 'opciones') with ordinality x (o, k)
   where n ->> 'id' = v_par_ant and x.o ->> 'clave' = ant1.valores ->> v_par_ant;
  v_pos[1] := coalesce(v_p1, 1);
  v_pos[2] := 3 - v_pos[1];

  -- El orden de candados de `cotizacion_encima` (lead → vehículo → las anteriores `for share`, en orden de id) para las dos de una vez; los intentos en orden de id.
  if ant1.lead_id is not null and public.puede_lead(ant1.lead_id, 'leads.ver') then
    perform 1 from public.leads l where l.id = ant1.lead_id for key share;
  end if;
  if ant1.vehiculo_id is not null and public.puede_vehiculo(ant1.vehiculo_id, 'vehiculos.ver') then
    perform 1 from public.vehiculos v where v.id = ant1.vehiculo_id for key share;
  end if;
  perform 1 from public.cotizaciones x where x.id = least(ant1.id, ant2.id) for share;
  perform 1 from public.cotizaciones x where x.id = greatest(ant1.id, ant2.id) for share;
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || least(p_ids[1], p_ids[2])::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || greatest(p_ids[1], p_ids[2])::text, 0));

  -- Primero la de la primera opción; la segunda, con su hora + 1 µs (la aprobada y el orden de las listas, como al crear el par).
  v_orden := case when v_pos[1] = 1 then array[1, 2] else array[2, 1] end;
  perform set_config('importadora.en_par', '', true);
  foreach v_i in array v_orden loop
    v_otra := 3 - v_i;
    perform set_config('importadora.en_par', (jsonb_build_object('opcion', v_pos[v_i], 'hermana', p_ids[v_otra])
                                              || case when v_creado is null then '{}'::jsonb else jsonb_build_object('creado_en', v_creado + interval '1 microsecond') end)::text, true);
    r[v_i] := public.cotizacion_encima(p_ids[v_i], p_anteriores[v_i]);
    select x.creado_en into v_creado from public.cotizaciones x where x.id = p_ids[v_i];
  end loop;
  perform set_config('importadora.en_par', '', true);
  return jsonb_build_object('cotizaciones', jsonb_build_array(r[1] - 'repetido', r[2] - 'repetido'),
                            'repetido', coalesce((r[1] ->> 'repetido')::boolean, false) and coalesce((r[2] ->> 'repetido')::boolean, false));
end $$;

CREATE OR REPLACE FUNCTION "public"."formula_para_cotizar"("p_origen" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  f public.formulas;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_origen is null then
    raise exception 'Falta el origen.' using errcode = '22023';
  end if;
  select * into f from public.formulas x where x.id = (select public._publicada_de_la_activa(p_origen));   -- formulas_pkey
  if f.id is null then
    raise exception 'Este origen no tiene una fórmula publicada.' using errcode = '22023';
  end if;
  return jsonb_build_object('id', f.id, 'version', f.version, 'nota', f.nota, 'publicado_en', f.publicado_en,
                            'definicion', f.definicion, 'params', f.params, 'diseno', f.diseno, 'visibilidad', f.visibilidad);
end $$;

CREATE OR REPLACE FUNCTION "public"."_cotizacion_abierta"("p_origen" "uuid", "p_formula" "uuid", "p_abierta_en" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_version int; v_estado text; v_siguiente timestamptz; v_fdo uuid; v_activa boolean; v_desactivada timestamptz;
begin
  -- «Guardar con la N» no fija precios viejos para siempre: la hoja tiene que haberse abierto hace menos de un día y, si la versión ya no es la que se cotiza,
  -- haber dejado de serlo hace menos de un día: la reemplazó una versión posterior de su fórmula o su fórmula dejó de ser la activa, lo primero que pasó.
  if p_abierta_en < statement_timestamp() - interval '24 hours' then
    raise exception 'Abriste la hoja hace más de un día: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_vencida', hint = 'abierta';
  end if;
  select f.version, f.estado::text, f.formula_del_origen_id into v_version, v_estado, v_fdo
    from public.formulas f where f.id = p_formula and f.origen_id = p_origen and f.estado in ('publicada', 'archivada');
  if not found then
    raise exception 'La versión de la hoja que abriste ya no está disponible: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_no_disponible', hint = 'abierta';
  end if;
  select d.activa, d.desactivada_en into v_activa, v_desactivada from public.formulas_del_origen d where d.id = v_fdo;   -- formulas_del_origen_pkey
  if v_estado = 'publicada' and v_activa then
    return;
  end if;
  if v_estado = 'archivada' then
    select min(f.publicado_en) into v_siguiente from public.formulas f                                   -- formulas_formula_del_origen_id_version_key
     where f.formula_del_origen_id = v_fdo and f.version > v_version and f.estado in ('publicada', 'archivada');
  end if;
  if not v_activa then
    v_siguiente := least(v_siguiente, v_desactivada);
  end if;
  if v_siguiente is null or v_siguiente < statement_timestamp() - interval '24 hours' then
    raise exception 'Esa versión de la hoja se reemplazó hace más de un día: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_vencida', hint = 'abierta';
  end if;
end $$;

CREATE OR REPLACE FUNCTION "public"."cotizacion_tarjeta"("p_formula" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  fo public.formulas; v_pla public.plantillas_tarjeta; v_p jsonb; v_celdas jsonb; v_filas jsonb; v_nodos jsonb; v_grupos jsonb; v_total text; v_opcion jsonb;
  v_datos jsonb; v_ids text[]; v_pcts jsonb; v_de_grupo text[]; v_buckets text[]; v_tc jsonb; v_variables text[];
begin
  perform public.assert_activo();
  select * into fo from public.formulas f where f.id = p_formula;
  -- La inexistencia y el borrador se deciden antes del permiso (`tiene_permiso` con un origen nulo da verdadero) y dan lo mismo que no tenerlo.
  if not found or fo.estado = 'borrador' then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;
  if not public.tiene_permiso('cotizaciones.ver', fo.origen_id) then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;

  -- La publicada de la fórmula del origen de esta versión (plantillas_publicada_unica), validada contra ESTA versión sin el catálogo: un color borrado se dibuja `auto`. La de la forma 1 se
  -- convierte con el catálogo de hoy (un color borrado cae al del grupo) y lo convertido se valida sin el tope de 24 KiB.
  select * into v_pla from public.plantillas_tarjeta p where p.formula_del_origen_id = fo.formula_del_origen_id and p.estado = 'publicada';
  if not found then return jsonb_build_object('estado', 'sin_plantilla'); end if;
  begin
    perform public.validar_plantilla(v_pla.definicion, fo.definicion, fo.diseno, fo.visibilidad, null);
    if v_pla.definicion ? 'forma' then
      v_p := v_pla.definicion;
    else
      v_p := public._plantilla_convertir(v_pla.definicion, fo.definicion, fo.diseno, fo.visibilidad, array(select t.clave from public.tonos t));
      perform public._plantilla_cuadricula_forma(v_p, false);
      perform public._plantilla_cuadricula_nodos(v_p, fo.definicion, fo.diseno, fo.visibilidad, null);
    end if;
  exception when sqlstate '22023' then
    return jsonb_build_object('estado', 'sin_plantilla');
  end;

  v_celdas := v_p -> 'celdas';
  v_filas := v_p -> 'filas';
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g) from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g), '{}'::jsonb);
  select n ->> 'id' into v_total from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'salida' = 'total' limit 1;
  select n into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;

  -- Lo que muestran las celdas de un nodo ({nodo, mostrar}) y el `pct` del par de cada porcentaje: el suyo si es el `porcentaje_de`, él mismo si es el `pct`.
  v_datos := coalesce((select jsonb_agg(jsonb_build_object('nodo', c -> 'contenido' ->> 'nodo', 'mostrar', c -> 'contenido' ->> 'mostrar'))
                         from jsonb_array_elements(v_celdas) c where c -> 'contenido' ->> 'tipo' = 'dato' and c -> 'contenido' ? 'nodo'), '[]'::jsonb);
  v_pcts := coalesce((select jsonb_object_agg(d ->> 'nodo',
                                              case when v_nodos -> (d ->> 'nodo') ->> 'tipo' = 'calculo' and v_nodos -> (d ->> 'nodo') ->> 'op' = 'porcentaje_de'
                                                        and v_nodos -> (d ->> 'nodo') ->> 'pct' is not null
                                                   then v_nodos -> (d ->> 'nodo') ->> 'pct' else d ->> 'nodo' end)
                        from jsonb_array_elements(v_datos) d where d ->> 'mostrar' = 'porcentaje'), '{}'::jsonb);
  v_ids := array(select distinct x from (select f ->> 'nodo' as x from jsonb_array_elements(v_filas) f where f ? 'nodo'
                                         union all select d ->> 'nodo' from jsonb_array_elements(v_datos) d
                                         union all select value #>> '{}' from jsonb_each(v_pcts)) t where x is not null);
  v_de_grupo := array(select distinct v_nodos -> (d ->> 'nodo') ->> 'grupo' from jsonb_array_elements(v_datos) d
                       where d ->> 'mostrar' in ('tc_nombre', 'tc_valor', 'plazo') and v_nodos -> (d ->> 'nodo') ->> 'grupo' is not null);
  v_buckets := array(select distinct v_grupos -> (v_nodos -> (d ->> 'nodo') ->> 'grupo') ->> 'bucket' from jsonb_array_elements(v_datos) d
                      where d ->> 'mostrar' in ('tc_nombre', 'tc_valor') and v_grupos -> (v_nodos -> (d ->> 'nodo') ->> 'grupo') ->> 'bucket' is not null);
  v_variables := array(select distinct c -> 'contenido' ->> 'variable' from jsonb_array_elements(v_celdas) c where c -> 'contenido' ? 'variable');
  -- El nombre de cada tipo de cambio por su nodo: el de `tipos_cambio` activo con la clave del nodo (nulo si no hay uno activo), nunca la clave ni el id.
  v_tc := coalesce((select jsonb_object_agg(n ->> 'id', t.nombre) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                      left join public.tipos_cambio t on t.activo and t.clave = n ->> 'clave' where n ->> 'tipo' = 'tipo_cambio'), '{}'::jsonb);

  return jsonb_build_object(
    'estado', 'lista',
    'plantilla', jsonb_build_object('version', v_pla.version),
    'definicion', v_p,
    'nodos', coalesce((select jsonb_agg(jsonb_build_object('id', x, 'etiqueta', v_nodos -> x ->> 'etiqueta', 'descripcion', v_nodos -> x ->> 'descripcion',
                                                           'grupo', v_nodos -> x ->> 'grupo', 'pct', v_pcts ->> x) order by x collate "C")
                         from unnest(v_ids) x), '[]'::jsonb),
    'grupos', coalesce((select jsonb_agg(jsonb_build_object('id', g, 'etiqueta', v_grupos -> g ->> 'etiqueta',
                                                            'plazo', case when jsonb_typeof(v_grupos -> g -> 'plazo') = 'string' then v_grupos -> g -> 'plazo' end,
                                                            -- El bucket sólo si una celda `tc_*` lo nombra (y la plantilla validó su tipo de cambio): un grupo de un `plazo` no lo lleva.
                                                            'bucket', case when v_grupos -> g ->> 'bucket' = any (v_buckets) then v_grupos -> g ->> 'bucket' end)
                                            order by g collate "C")
                          from unnest(v_de_grupo) g), '[]'::jsonb),
    'tipos_de_cambio', jsonb_build_object(
      'buckets', coalesce((select jsonb_object_agg(b, jsonb_build_object('nombre', v_tc ->> (fo.definicion -> 'buckets' ->> b), 'nodo', fo.definicion -> 'buckets' ->> b))
                             from unnest(v_buckets) b), '{}'::jsonb),
      'modos', coalesce((select jsonb_object_agg(md ->> 'clave',
                                  coalesce((select jsonb_object_agg(mb ->> 'bucket', jsonb_build_object('nombre', v_tc ->> (mb ->> 'nodo'), 'nodo', mb ->> 'nodo'))
                                              from jsonb_array_elements(coalesce(md -> 'buckets', '[]'::jsonb)) mb where mb ->> 'bucket' = any (v_buckets)), '{}'::jsonb))
                           from jsonb_array_elements(coalesce(fo.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) md
                          where exists (select 1 from jsonb_array_elements(coalesce(md -> 'buckets', '[]'::jsonb)) mb where mb ->> 'bucket' = any (v_buckets))), '{}'::jsonb)),
    'modos', case when 'modo_tc' = any (v_variables)
                  then coalesce((select jsonb_agg(jsonb_build_object('clave', md ->> 'clave', 'nombre', md ->> 'nombre') order by o)
                                   from jsonb_array_elements(coalesce(fo.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) with ordinality t (md, o)), '[]'::jsonb)
                  else '[]'::jsonb end,
    'variante', case when 'titulo_opcion' = any (v_variables) and (fo.visibilidad -> (v_opcion ->> 'id') ->> 'ver') = 'todos'
                     then jsonb_build_object('nodo', v_opcion ->> 'id', 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', x.v ->> 'clave', 'titulo', x.v ->> 'titulo') order by x.o)
                                                                                               from jsonb_array_elements(v_opcion -> 'opciones') with ordinality x (v, o)), '[]'::jsonb)) end,
    'colores', coalesce((select jsonb_agg(jsonb_build_object('clave', t.clave, 'hex', t.hex) order by t.clave collate "C")
                           from public.tonos t
                          where exists (select 1 from jsonb_array_elements(v_celdas) c where c -> 'estilo' ->> 'fondo' = t.clave or c -> 'estilo' ->> 'texto' = t.clave)), '[]'::jsonb),
    'total', jsonb_build_object('nodo', v_total),
    -- La moneda del total en Bs: la `moneda_a` del tipo de cambio activo que nombra el `total_en` de esta versión (la regla de la hoja).
    'moneda_bs', (select to_jsonb(t.moneda_a::text) from public.tipos_cambio t where t.activo and t.clave = (v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave'));
end;
$$;

create or replace function public.cotizacion_imagen_huella(p_cotizacion uuid) returns text
  language plpgsql stable security definer
  set search_path = ''
  as $$
declare
  v_c public.cotizaciones; v_yo uuid := (select auth.uid()); v_ve_cliente boolean; v_ve_vehiculo boolean;
begin
  perform public.assert_activo();
  -- Lo que no existe, está en la papelera o no se ve, lo mismo (puede_cotizacion: cotizaciones_pkey).
  select * into v_c from public.cotizaciones c where c.id = p_cotizacion and c.eliminado_en is null;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- El cliente y el vehículo entran sólo si quien pide los ve: la imagen los dibuja sólo entonces.
  v_ve_cliente := v_c.lead_id is not null and public.puede_lead(v_c.lead_id, 'leads.ver');
  v_ve_vehiculo := v_c.vehiculo_id is not null and public.puede_vehiculo(v_c.vehiculo_id, 'vehiculos.ver');
  return 'i-' || md5(jsonb_build_array(
    -- La cotización: guardar, el título y los retoques mueven `actualizado_en`; la versión y el origen dicen qué tarjeta se dibuja.
    extract(epoch from v_c.actualizado_en), v_c.formula_id, v_c.origen_id,
    -- La plantilla publicada de la fórmula del origen de esa versión (plantillas_publicada_unica), o ninguna: la tarjeta por omisión.
    (select jsonb_build_array(p.id, extract(epoch from p.actualizado_en))
       from public.plantillas_tarjeta p
      where p.formula_del_origen_id = (select f.formula_del_origen_id from public.formulas f where f.id = v_c.formula_id) and p.estado = 'publicada'),
    -- Esa versión de la fórmula (formulas_pkey).
    (select extract(epoch from f.actualizado_en) from public.formulas f where f.id = v_c.formula_id),
    -- El catálogo de colores (decenas de filas, entero): la clave y el hex de cada uno, lo que lee `cotizacion_tarjeta()`.
    (select md5(string_agg(t.clave || ':' || t.hex, ',' order by t.clave collate "C")) from public.tonos t),
    -- Los tipos de cambio (decenas de filas, enteros): el nombre, si está activo y la moneda, nunca el valor del día.
    (select md5(string_agg(jsonb_build_array(t.clave, t.nombre, t.activo, t.moneda_a)::text, ',' order by t.clave collate "C", t.id))
       from public.tipos_cambio t),
    -- El cliente (leads_pkey) y el vehículo (vehiculos_pkey), vivos y si quien pide los ve.
    v_ve_cliente,
    case when v_ve_cliente then (select l.nombre from public.leads l where l.id = v_c.lead_id and l.eliminado_en is null) end,
    v_ve_vehiculo,
    case when v_ve_vehiculo then (select jsonb_build_array(v.titulo, v.lote, v.vin) from public.vehiculos v
                                   where v.id = v_c.vehiculo_id and v.eliminado_en is null) end,
    -- Quien pide, el asesor de la tarjeta (perfiles_pkey): lo que lee `getAsesorQueMira()`.
    v_yo,
    (select jsonb_build_array(pe.nombre, pe.email, pe.whatsapp_web, pe.cargo_web, pe.avatar_ruta) from public.perfiles pe where pe.id = v_yo),
    -- Los ajustes de la empresa (ajustes_empresa_pkey, la fila única): el logo, la zona, el formato regional, la vigencia y el nombre.
    (select extract(epoch from e.actualizado_en) from public.ajustes_empresa e where e.id = 1)
  )::text);
end;
$$;

-- `formula_publicada` pasa a decir si el origen tiene fórmula activa (una activa siempre tiene versión publicada) y `tarjeta_publicada`, si la fórmula de trabajo
-- (la activa o, si no hay, la más nueva sin archivar: la que edita la pestaña Tarjeta) tiene su plantilla publicada. Mismas columnas, mismo orden y mismos grants.
CREATE OR REPLACE FUNCTION "public"."origenes_resumen"() RETURNS TABLE("origen_id" "uuid", "vehiculos" integer, "cotizaciones" integer, "campos_activos" integer, "categorias" integer, "fases" integer, "formula_publicada" boolean, "concesiones" integer, "tarjeta_publicada" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform public.assert_activo();
  if not (public.tiene_permiso('origenes.gestionar') or public.tiene_permiso('flujos.configurar') or public.tiene_permiso('cotizaciones.configurar')) then
    raise exception 'No tienes permiso para ver cómo está configurado cada origen.' using errcode = '42501';
  end if;
  return query
  select o.id,
    (select count(*)::int from public.vehiculos v where v.origen_id = o.id),
    (select count(*)::int from public.cotizaciones q where q.origen_id = o.id),
    (select count(*)::int from public.origenes_campos c where c.origen_id = o.id and c.activo),
    (select count(*)::int from public.categorias k where k.origen_id = o.id),
    (select count(*)::int from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = o.id and f.activa),
    exists (select 1 from public.formulas_del_origen fo where fo.origen_id = o.id and fo.activa),   -- formulas_del_origen_activa_unica
    (select count(*)::int from public.roles_permisos rp where rp.origen_id = o.id),
    -- La de trabajo, sin crearla (`_fdo_de_trabajo()`, la misma regla que la pestaña Tarjeta); su publicada, por plantillas_publicada_unica.
    exists (select 1 from public.plantillas_tarjeta p
             where p.estado = 'publicada' and p.formula_del_origen_id = (select public._fdo_de_trabajo(o.id, false)))
  from public.origenes o
  order by o.orden, o.nombre;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."_nivel_uso"("p_clave" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  -- Materializada: el índice conduce (la misma lección que _nivel_en_uso).
  with u as materialized (
    select f.id, f.origen_id, f.formula_del_origen_id, f.version from public.formulas f
     where public._niveles_del_diseno(f.diseno) @> jsonb_build_array(p_clave)  -- formulas_niveles_idx
  ), ultimas as (
    -- La última de cada fórmula del origen sin archivar.
    select distinct on (u.formula_del_origen_id) u.id, u.origen_id from u
      join public.formulas_del_origen d on d.id = u.formula_del_origen_id and d.archivada_en is null   -- formulas_del_origen_pkey
     order by u.formula_del_origen_id, u.version desc nulls first
  ), secciones as (
    select s.value as s from ultimas l join public.formulas f on f.id = l.id, jsonb_array_elements(f.diseno -> 'secciones') s
  )
  select jsonb_build_object(
    'origenes', (select count(*) from (select distinct l.origen_id from ultimas l limit 1000) x),
    'secciones', (select count(*) from (select 1 from secciones where p_clave in (s ->> 'nivel_ver', s ->> 'nivel_editar') limit 1000) x),
    'celdas', (select count(*) from (
        select 1 from secciones, jsonb_array_elements(s -> 'items') it
         where it ->> 'tipo' <> 'atajos'
           and p_clave in (coalesce(it ->> 'nivel_ver', s ->> 'nivel_ver'), coalesce(it ->> 'nivel_editar', s ->> 'nivel_editar')) limit 1000) x));
$$;

CREATE OR REPLACE FUNCTION "public"."_actividad_recorte"("p_tabla" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select case
    when p_tabla = 'leads' then 'lead'
    when p_tabla in ('vehiculos', 'cotizaciones', 'comprobantes', 'declaraciones_aduana', 'documentos', 'gastos', 'pagos', 'transportes',
                     'repuestos_compras', 'repuestos_items', 'formulas', 'formulas_del_origen') then 'entidad'
    when p_tabla in ('ajustes_empresa', 'ajustes_web', 'ajustes_leads', 'categorias', 'cola_web_asesores', 'fases', 'fases_requisitos',
                     'fases_transiciones', 'integraciones', 'leads_campos', 'origenes', 'origenes_campos', 'origenes_lead',
                     'plantillas_tarjeta', 'roles_permisos', 'tipos_cambio', 'tipos_lead', 'tipos_seguimiento', 'usuarios_roles') then 'configuracion'
  end;
$$;

CREATE OR REPLACE FUNCTION "public"."_actividad_puede_ver_fila"("p_tabla" "text", "p_registro" "text", "p_fila" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_id uuid;
  v_fila jsonb := p_fila;
begin
  if p_registro is null or p_registro !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_id := p_registro::uuid;
  if v_fila is null and p_tabla in ('comprobantes', 'documentos', 'formulas', 'formulas_del_origen', 'gastos', 'pagos', 'transportes') then
    -- Cada una por su PK.
    v_fila := case p_tabla
      when 'comprobantes' then (select to_jsonb(t) from public.comprobantes t where t.id = v_id)
      when 'documentos' then (select to_jsonb(t) from public.documentos t where t.id = v_id)
      when 'formulas' then (select to_jsonb(t) from public.formulas t where t.id = v_id)
      when 'formulas_del_origen' then (select to_jsonb(t) from public.formulas_del_origen t where t.id = v_id)
      when 'gastos' then (select to_jsonb(t) from public.gastos t where t.id = v_id)
      when 'pagos' then (select to_jsonb(t) from public.pagos t where t.id = v_id)
      when 'transportes' then (select to_jsonb(t) from public.transportes t where t.id = v_id)
    end;
    if v_fila is null then
      return false;
    end if;
  end if;
  return coalesce(case p_tabla
    -- policy «vehiculos: leer» / «cotizaciones: leer»: la fila propia, por su id.
    when 'vehiculos' then public.puede_vehiculo(v_id, 'vehiculos.ver')
    when 'cotizaciones' then public.puede_cotizacion(v_id, 'cotizaciones.ver')
    when 'comprobantes' then public.puede_cotizacion((v_fila ->> 'cotizacion_id')::uuid, 'cotizaciones.ver')
    when 'documentos' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.ver', 'repuestos.ver')
    when 'gastos' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.gastos.ver', 'repuestos.costos.ver')
    when 'transportes' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.ver', 'repuestos.ver')
    when 'pagos' then ((v_fila ->> 'vehiculo_id') is not null and public.puede_vehiculo((v_fila ->> 'vehiculo_id')::uuid, 'logistica.pagos.ver'))
                   or ((v_fila ->> 'proyecto_repuestos_id') is not null and public.tiene_permiso('repuestos.costos.ver'))
    -- policies «formulas: leer» y «formulas_del_origen: leer»: el origen con cotizaciones.configurar (propios o más).
    when 'formulas' then (v_fila ->> 'origen_id')::uuid = any (public.origenes_con_alcance('cotizaciones.configurar', 'propios'))
    when 'formulas_del_origen' then (v_fila ->> 'origen_id')::uuid = any (public.origenes_con_alcance('cotizaciones.configurar', 'propios'))
    when 'repuestos_compras' then public.tiene_permiso('repuestos.costos.ver')
    when 'repuestos_items' then public.tiene_permiso('repuestos.ver')
    -- policy «declaraciones_aduana: leer» (6.07-3): quien gestiona aduana, o un vehículo vigente de la declaración que se ve.
    when 'declaraciones_aduana' then public.tiene_permiso('logistica.aduana.gestionar')
      or exists (select 1 from public.declaraciones_vehiculos dv
                  where dv.declaracion_id = v_id and dv.removido_en is null and public.puede_vehiculo(dv.vehiculo_id, 'logistica.ver'))
  end, false);
end;
$_$;


-- Las RPC de las fórmulas del origen: crear (en blanco o como copia), renombrar, archivar, eliminar y activar. Todas piden cotizaciones.configurar
-- del origen antes de mirar nada (lo que no existe da el mismo 42501) y toman los candados `formulas:` y después `plantillas:` del origen antes de
-- leer el estado. docs/COTIZADOR.md › «Fórmulas del origen».

-- El origen de una fórmula del origen, con el permiso de configurarlo: lo que no existe da lo mismo que no poder.
create function public._fdo_origen_con_permiso(p_id uuid) returns uuid
  language plpgsql stable security definer set search_path = '' as $$
declare v_origen uuid;
begin
  perform public.assert_activo();
  select d.origen_id into v_origen from public.formulas_del_origen d where d.id = p_id;   -- formulas_del_origen_pkey
  if v_origen is null then
    raise exception 'No tienes el permiso «cotizaciones.configurar».' using errcode = '42501';
  end if;
  perform public.assert_permiso('cotizaciones.configurar', v_origen);
  return v_origen;
end $$;
revoke all on function public._fdo_origen_con_permiso(uuid) from public, anon, authenticated;
grant execute on function public._fdo_origen_con_permiso(uuid) to service_role;
comment on function public._fdo_origen_con_permiso(uuid) is 'Interna: el origen de una fórmula del origen tras exigir cotizaciones.configurar en él; la que no existe da el mismo 42501.';

-- Los candados del origen y la fila de la fórmula, comparada con la que se tenía en pantalla (PT409 con quién y cuándo).
create function public._fdo_tomar(p_id uuid, p_origen uuid, p_esperada timestamptz) returns public.formulas_del_origen
  language plpgsql security definer set search_path = '' as $$
declare v public.formulas_del_origen;
begin
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('plantillas:' || p_origen::text, 0));
  select * into v from public.formulas_del_origen d where d.id = p_id for no key update;   -- formulas_del_origen_pkey
  if v.id is null then
    raise exception 'No tienes el permiso «cotizaciones.configurar».' using errcode = '42501';
  end if;
  if v.actualizado_en is distinct from p_esperada then
    perform public._conflicto_de_edicion('formulas_del_origen', p_id, v.actualizado_en, 'esta fórmula');
  end if;
  return v;
end $$;
revoke all on function public._fdo_tomar(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public._fdo_tomar(uuid, uuid, timestamptz) to service_role;
comment on function public._fdo_tomar(uuid, uuid, timestamptz) is 'Interna: toma los candados formulas: y plantillas: del origen y la fila de la fórmula del origen; PT409 (_conflicto_de_edicion) si su actualizado_en no es la esperada.';

-- El nombre de una fórmula del origen, sin espacios de más y de 1 a 60.
create function public._fdo_nombre(p_nombre text) returns text
  language plpgsql immutable set search_path = '' as $$
declare v text := btrim(p_nombre);
begin
  if v is null or char_length(v) not between 1 and 60 then
    raise exception 'El nombre lleva de 1 a 60 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end $$;
revoke all on function public._fdo_nombre(text) from public, anon, authenticated;
grant execute on function public._fdo_nombre(text) to service_role;
comment on function public._fdo_nombre(text) is 'Interna: el nombre de una fórmula del origen sin espacios de más; 22023 (hint nombre) si no tiene de 1 a 60 caracteres.';

-- Quién activó la activa de hoy y cuándo: «Ana activó «Planilla» hace 2 min.», «Activaste…» u «Otra persona activó…».
create function public._fdo_activada_por(p_fdo uuid) returns text
  language plpgsql stable security definer set search_path = '' as $$
declare v public.formulas_del_origen; v_sujeto text;
begin
  select * into v from public.formulas_del_origen d where d.id = p_fdo;   -- formulas_del_origen_pkey
  if v.id is null then return null; end if;
  if v.activada_por is not null and v.activada_por = (select auth.uid()) then
    v_sujeto := 'Activaste';
  else
    select nullif(btrim(p.nombre), '') || ' activó' into v_sujeto from public.perfiles p where p.id = v.activada_por;
    v_sujeto := coalesce(v_sujeto, 'Otra persona activó');
  end if;
  return v_sujeto || ' «' || v.nombre || '»' || case when v.activada_en is null then '' else ' ' || public._hace(v.activada_en) end || '.';
end $$;
revoke all on function public._fdo_activada_por(uuid) from public, anon, authenticated;
grant execute on function public._fdo_activada_por(uuid) to service_role;
comment on function public._fdo_activada_por(uuid) is 'Interna: «Ana activó «Planilla» hace 2 min.»: el PT409 de activar cuando la activa no es la que se vio.';

-- Crear una fórmula del origen: en blanco, o copia de la publicada o del borrador de otra (del mismo origen o de otro). Nace como borradores, sin
-- versión: nunca toca lo que se cotiza. Idempotente por p_id.
create function public.formula_del_origen_crear(p_id uuid, p_origen uuid, p_nombre text, p_copia_de uuid default null, p_pieza text default 'publicada')
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := (select auth.uid());
  v_nombre text;
  v_fuente public.formulas_del_origen;
  v_ya public.formulas_del_origen;
  v_d public.formulas_del_origen;
  v_pieza public.formulas;
  v_def jsonb; v_params jsonb; v_diseno jsonb; v_nota text; v_tarjeta jsonb; v_blanco jsonb;
  v_otro boolean := false;
  v_marcada boolean := false;
  v_avisos jsonb := '[]'::jsonb;
  v_n int; v_c text; v_clave text; v_tf public.tablas_referencia; v_nueva uuid; v_filas jsonb; v_origen_fuente text;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_id is null then raise exception 'Falta el id de la fórmula.' using errcode = '22023', hint = 'id'; end if;
  -- La fuente de una copia: también con configurar en su origen; la que no existe da el mismo 42501.
  if p_copia_de is not null then
    select * into v_fuente from public.formulas_del_origen d where d.id = p_copia_de;   -- formulas_del_origen_pkey
    if v_fuente.id is null or not public.tiene_permiso('cotizaciones.configurar', v_fuente.origen_id) then
      raise exception 'No tienes el permiso «cotizaciones.configurar».' using errcode = '42501';
    end if;
    if p_pieza is null or p_pieza not in ('publicada', 'borrador') then
      raise exception 'Se copia la versión publicada o el borrador.' using errcode = '22023', hint = 'pieza';
    end if;
    v_otro := v_fuente.origen_id <> p_origen;
    -- La copia de una copia de otro origen sigue marcada: D9 vale para las dos.
    v_marcada := v_otro or v_fuente.copiada_de_otro_origen;
  end if;
  v_nombre := public._fdo_nombre(p_nombre);
  -- En blanco pide un tipo de cambio: se valida antes de tomar los candados.
  if p_copia_de is null then v_blanco := public._fdo_formula_en_blanco(); end if;

  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('plantillas:' || p_origen::text, 0));
  -- El mismo intento otra vez: lo mismo, sin avisos; con otros datos, PT409.
  select * into v_ya from public.formulas_del_origen d where d.id = p_id;   -- formulas_del_origen_pkey
  if v_ya.id is not null then
    if v_ya.origen_id = p_origen and v_ya.nombre = v_nombre then
      return jsonb_build_object('id', v_ya.id, 'actualizado_en', v_ya.actualizado_en, 'avisos', '[]'::jsonb);
    end if;
    raise exception 'Esa fórmula ya se creó con otros datos.' using errcode = 'PT409';
  end if;
  -- El tope: 50 sin archivar (formulas_del_origen_origen_idx), contado con uno de más.
  select count(*) into v_n from (select 1 from public.formulas_del_origen d where d.origen_id = p_origen and d.archivada_en is null limit 51) x;
  if v_n >= 50 then
    raise exception 'Este origen ya tiene 50 fórmulas: archiva o elimina alguna.' using errcode = '22023', hint = 'formulas';
  end if;

  if p_copia_de is null then
    v_def := v_blanco -> 'definicion'; v_params := v_blanco -> 'params'; v_diseno := v_blanco -> 'diseno';
    v_tarjeta := public._fdo_tarjeta_en_blanco();
  else
    select * into v_pieza from public.formulas f where f.formula_del_origen_id = v_fuente.id and f.estado = p_pieza::public.estado_version;   -- formulas_borrador_unico / formulas_publicada_unica
    if v_pieza.id is null then
      raise exception '%', case p_pieza when 'borrador' then 'Esa fórmula no tiene borrador.' else 'Esa fórmula no tiene versión publicada.' end
        using errcode = '22023', hint = 'pieza';
    end if;
    v_def := v_pieza.definicion; v_params := v_pieza.params; v_diseno := v_pieza.diseno; v_nota := v_pieza.nota;
    -- La tarjeta de la misma pieza; si no hay, la otra; si no, la de omisión.
    select p.definicion into v_tarjeta from public.plantillas_tarjeta p
     where p.formula_del_origen_id = v_fuente.id and p.estado in ('publicada', 'borrador')                       -- plantillas_publicada_unica / plantillas_borrador_unico
     order by (p.estado::text = p_pieza) desc limit 1;
    v_tarjeta := coalesce(v_tarjeta, public._fdo_tarjeta_en_blanco());
  end if;

  begin
    insert into public.formulas_del_origen (id, origen_id, nombre, copiada_de_otro_origen, creado_por)
    values (p_id, p_origen, v_nombre, v_marcada, v_yo)
    returning * into v_d;
  exception when unique_violation then
    get stacked diagnostics v_c = constraint_name;
    if v_c = 'formulas_del_origen_nombre_unico' then
      raise exception 'Ya hay una fórmula «%» en este origen.', v_nombre using errcode = '23505', hint = 'nombre';
    end if;
    -- El mismo id creado en otro origen mientras tanto.
    raise exception 'Esa fórmula ya se creó con otros datos.' using errcode = 'PT409';
  end;

  if v_otro then
    select o.nombre into v_origen_fuente from public.origenes o where o.id = v_fuente.origen_id;   -- origenes_pkey
    -- Las tablas que usa (las que congeló y las que nombra un nodo): la del destino si la tiene (sin la copia congelada, para leer la suya); si no
    -- y la de la fuente es de su origen, se crea en el destino con las filas de la copia (las congeladas o, si no congeló, las vivas). Una
    -- compartida ya la ven los dos.
    for v_clave in
      select x.c from (
        select jsonb_object_keys(case when jsonb_typeof(v_params -> 'tablas') = 'object' then v_params -> 'tablas' else '{}'::jsonb end) as c
        union
        select n ->> 'tabla' from jsonb_array_elements(case when jsonb_typeof(v_def -> 'nodos') = 'array' then v_def -> 'nodos' else '[]'::jsonb end) n
         where n ->> 'tabla' is not null) x
       order by x.c collate "C"
    loop
      if exists (select 1 from public.tablas_referencia r where r.origen_id = p_origen and r.clave = v_clave) then   -- tablas_referencia_origen_id_clave_key
        if jsonb_typeof(v_params -> 'tablas') = 'object' and (v_params -> 'tablas') ? v_clave then
          v_params := jsonb_set(v_params, '{tablas}', (v_params -> 'tablas') - v_clave);
        end if;
        v_avisos := v_avisos || jsonb_build_array(jsonb_build_object('tipo', 'tabla_del_destino', 'clave', v_clave));
        continue;
      end if;
      select * into v_tf from public.tablas_referencia r where r.origen_id = v_fuente.origen_id and r.clave = v_clave;   -- tablas_referencia_origen_id_clave_key
      if v_tf.id is null then continue; end if;
      if jsonb_typeof(v_params -> 'tablas' -> v_clave) = 'array' then
        v_filas := v_params -> 'tablas' -> v_clave;
      else
        select coalesce(jsonb_agg(f.valores order by f.orden, f.id), '[]'::jsonb) into v_filas
          from public.tablas_referencia_filas f where f.tabla_id = v_tf.id and f.activa;   -- tablas_referencia_filas_tabla_orden_idx
      end if;
      insert into public.tablas_referencia (origen_id, clave, nombre, descripcion, columnas, version, nota, publicado_por, publicado_en)
      values (p_origen, v_clave, v_tf.nombre, v_tf.descripcion, v_tf.columnas, 1, 'Copiada de ' || coalesce(v_origen_fuente, 'otro origen'), v_yo, now())
      returning id into v_nueva;
      insert into public.tablas_referencia_filas (tabla_id, valores, orden)
      select v_nueva, f.fila, (f.n - 1)::smallint from jsonb_array_elements(v_filas) with ordinality f (fila, n);
      v_avisos := v_avisos || jsonb_build_array(jsonb_build_object('tipo', 'tabla_creada', 'clave', v_clave));
    end loop;
  end if;
  if v_marcada then
    -- Los datos del vehículo que el destino no tiene: quedan marcados hasta arreglarlos (publicar y activar los exigen).
    v_avisos := v_avisos || (select coalesce(jsonb_agg(jsonb_build_object('tipo', 'campo', 'nodo', c ->> 'nodo', 'campo', c ->> 'campo')), '[]'::jsonb)
                               from jsonb_array_elements(public._fdo_campos_que_faltan(v_def, p_origen)) c);
  end if;

  insert into public.formulas (origen_id, formula_del_origen_id, estado, definicion, params, diseno, nota, creado_por)
  values (p_origen, v_d.id, 'borrador', v_def, coalesce(v_params, '{}'::jsonb), v_diseno, v_nota, v_yo);
  insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, estado, definicion, creado_por)
  values (p_origen, v_d.id, 'borrador', v_tarjeta, v_yo);
  perform public.registrar_actividad('formula_del_origen.crear', 'formulas_del_origen', v_d.id::text, null, to_jsonb(v_d),
                                     jsonb_build_object('copia_de', p_copia_de, 'pieza', case when p_copia_de is not null then p_pieza end, 'avisos', v_avisos));
  return jsonb_build_object('id', v_d.id, 'actualizado_en', v_d.actualizado_en, 'avisos', v_avisos);
end $$;
revoke all on function public.formula_del_origen_crear(uuid, uuid, text, uuid, text) from public, anon;
grant execute on function public.formula_del_origen_crear(uuid, uuid, text, uuid, text) to authenticated, service_role;
comment on function public.formula_del_origen_crear(uuid, uuid, text, uuid, text) is 'Crea una fórmula del origen (cotizaciones.configurar; copiar de otro origen lo pide también en el de la fuente): en blanco, o copia de la publicada o del borrador (p_pieza) de otra, como borradores de la fórmula y de la tarjeta. Una copia de otro origen trae o reusa sus tablas y avisa los datos del vehículo que faltan. Tope de 50 sin archivar; nombre único (23505). Idempotente por p_id. Devuelve {id, actualizado_en, avisos}. docs/COTIZADOR.md › «Fórmulas del origen».';

create function public.formula_del_origen_renombrar(p_id uuid, p_actualizado_en_esperado timestamptz, p_nombre text) returns timestamptz
  language plpgsql security definer set search_path = '' as $$
declare v_origen uuid; v public.formulas_del_origen; v_d public.formulas_del_origen; v_nombre text; v_c text;
begin
  v_origen := public._fdo_origen_con_permiso(p_id);
  if p_actualizado_en_esperado is null then perform public._exigir_version(null, null, null); end if;
  v_nombre := public._fdo_nombre(p_nombre);
  v := public._fdo_tomar(p_id, v_origen, p_actualizado_en_esperado);
  begin
    update public.formulas_del_origen set nombre = v_nombre where id = p_id returning * into v_d;
  exception when unique_violation then
    get stacked diagnostics v_c = constraint_name;
    if v_c = 'formulas_del_origen_nombre_unico' then
      raise exception 'Ya hay una fórmula «%» en este origen.', v_nombre using errcode = '23505', hint = 'nombre';
    end if;
    raise;
  end;
  perform public.registrar_actividad('formula_del_origen.renombrar', 'formulas_del_origen', p_id::text, to_jsonb(v), to_jsonb(v_d), null);
  return v_d.actualizado_en;
end $$;
revoke all on function public.formula_del_origen_renombrar(uuid, timestamptz, text) from public, anon;
grant execute on function public.formula_del_origen_renombrar(uuid, timestamptz, text) to authenticated, service_role;
comment on function public.formula_del_origen_renombrar(uuid, timestamptz, text) is 'Renombra una fórmula del origen, también archivada (cotizaciones.configurar). PT409 si cambió desde p_actualizado_en_esperado; 23505 si el nombre ya está en el origen. Devuelve la actualizado_en nueva. docs/COTIZADOR.md › «Fórmulas del origen».';

create function public.formula_del_origen_archivar(p_id uuid, p_actualizado_en_esperado timestamptz) returns timestamptz
  language plpgsql security definer set search_path = '' as $$
declare v_origen uuid; v public.formulas_del_origen; v_d public.formulas_del_origen;
begin
  v_origen := public._fdo_origen_con_permiso(p_id);
  if p_actualizado_en_esperado is null then perform public._exigir_version(null, null, null); end if;
  v := public._fdo_tomar(p_id, v_origen, p_actualizado_en_esperado);
  if v.archivada_en is not null then
    raise exception 'Esta fórmula está archivada.' using errcode = '22023', hint = 'formula_del_origen';
  end if;
  if v.activa then
    raise exception 'La fórmula activa no se archiva ni se elimina: activa otra primero.' using errcode = '22023', hint = 'activa';
  end if;
  update public.formulas_del_origen set archivada_en = now(), archivada_por = (select auth.uid()) where id = p_id returning * into v_d;
  perform public.registrar_actividad('formula_del_origen.archivar', 'formulas_del_origen', p_id::text, to_jsonb(v), to_jsonb(v_d), null);
  return v_d.actualizado_en;
end $$;
revoke all on function public.formula_del_origen_archivar(uuid, timestamptz) from public, anon;
grant execute on function public.formula_del_origen_archivar(uuid, timestamptz) to authenticated, service_role;
comment on function public.formula_del_origen_archivar(uuid, timestamptz) is 'Archiva una fórmula del origen que no es la activa (cotizaciones.configurar): deja de ofrecerse y no se edita; sus versiones quedan. PT409 si cambió desde p_actualizado_en_esperado. docs/COTIZADOR.md › «Fórmulas del origen».';

create function public.formula_del_origen_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz) returns void
  language plpgsql security definer set search_path = '' as $$
declare v_origen uuid; v public.formulas_del_origen;
begin
  v_origen := public._fdo_origen_con_permiso(p_id);
  if p_actualizado_en_esperado is null then perform public._exigir_version(null, null, null); end if;
  v := public._fdo_tomar(p_id, v_origen, p_actualizado_en_esperado);
  if v.activa then
    raise exception 'La fórmula activa no se archiva ni se elimina: activa otra primero.' using errcode = '22023', hint = 'activa';
  end if;
  -- Lo que se cotizó o se cotizaba con ella se conserva (cotizaciones_formula_id_idx y formulas_formula_del_origen_id_version_key).
  if v.activada_en is not null
     or exists (select 1 from public.formulas f join public.cotizaciones c on c.formula_id = f.id where f.formula_del_origen_id = p_id) then
    raise exception 'Esta fórmula ya se usó para cotizar o estuvo activa: archívala.' using errcode = '23503', hint = 'formula_del_origen';
  end if;
  delete from public.formulas_del_origen where id = p_id;
  perform public.registrar_actividad('formula_del_origen.eliminar', 'formulas_del_origen', p_id::text, to_jsonb(v), null, null);
end $$;
revoke all on function public.formula_del_origen_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.formula_del_origen_eliminar(uuid, timestamptz) to authenticated, service_role;
comment on function public.formula_del_origen_eliminar(uuid, timestamptz) is 'Elimina una fórmula del origen que nunca estuvo activa ni se usó para cotizar, con sus versiones y su tarjeta (cotizaciones.configurar); si no, 23503: se archiva. PT409 si cambió desde p_actualizado_en_esperado. docs/COTIZADOR.md › «Fórmulas del origen».';

-- Activar: publica lo pendiente de la fórmula y de su tarjeta (con una nota), comprueba que la tarjeta calce con la publicada y la vuelve la
-- que se cotiza en su origen. Cada pieza con su esperada. Activar la activa sólo publica lo pendiente.
create function public.formula_del_origen_activar(p_id uuid, p_actualizado_en_esperado timestamptz, p_nota text, p_activa_esperada uuid,
                                                 p_borrador_esperado timestamptz, p_publicada_esperada uuid,
                                                 p_plantilla_borrador_esperado timestamptz, p_plantilla_publicada_esperada uuid)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := (select auth.uid());
  v_origen uuid; v public.formulas_del_origen; v_d public.formulas_del_origen; v_vieja public.formulas_del_origen;
  v_activa uuid; v_b public.formulas; v_pub uuid; v_pb public.plantillas_tarjeta; v_pp public.plantillas_tarjeta;
  v_formula uuid; v_plantilla uuid; fo public.formulas; v_f text;
begin
  v_origen := public._fdo_origen_con_permiso(p_id);
  if coalesce(btrim(p_nota), '') = '' then raise exception 'Activar pide una nota.' using errcode = '22023', hint = 'nota'; end if;
  if p_actualizado_en_esperado is null then perform public._exigir_version(null, null, null); end if;
  v := public._fdo_tomar(p_id, v_origen, p_actualizado_en_esperado);
  if v.archivada_en is not null then
    raise exception 'Esta fórmula está archivada.' using errcode = '22023', hint = 'formula_del_origen';
  end if;

  -- La activa que se vio (nula: ninguna).
  select d.id into v_activa from public.formulas_del_origen d where d.origen_id = v_origen and d.activa;   -- formulas_del_origen_activa_unica
  if v_activa is distinct from p_activa_esperada then
    if v_activa is null then
      raise exception 'La fórmula que viste activa ya no lo está, y el origen no tiene otra.' using errcode = 'PT409';
    end if;
    raise exception '%', public._fdo_activada_por(v_activa) using errcode = 'PT409';
  end if;
  -- El borrador de la fórmula: sin esperada, que no haya; con ella, que sea ése.
  select * into v_b from public.formulas f where f.formula_del_origen_id = p_id and f.estado = 'borrador' for update;   -- formulas_borrador_unico
  if p_borrador_esperado is null and v_b.id is not null then
    raise exception 'Ya hay un borrador: % y se guardó %.', public._borrador_formula_empezado_por(v_b.creado_por), public._hace(v_b.actualizado_en)
      using errcode = 'PT409';
  end if;
  perform public._exigir_borrador_formula(v_b, p_borrador_esperado);
  -- La publicada.
  select f.id into v_pub from public.formulas f where f.formula_del_origen_id = p_id and f.estado = 'publicada';   -- formulas_publicada_unica
  if v_pub is distinct from p_publicada_esperada then
    if v_pub is null then
      raise exception 'La versión que tenías ya no es la publicada, y el origen no tiene otra.' using errcode = 'PT409';
    end if;
    v_f := public._version_publicada_por(v_pub);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  -- El borrador de la tarjeta: lo mismo.
  select * into v_pb from public.plantillas_tarjeta p where p.formula_del_origen_id = p_id and p.estado = 'borrador' for update;   -- plantillas_borrador_unico
  if p_plantilla_borrador_esperado is null then
    if v_pb.id is not null then
      raise exception 'Ya hay un borrador de esta plantilla, guardado %.', public._hace(v_pb.actualizado_en) using errcode = 'PT409';
    end if;
  else
    if v_pb.id is null then perform public._plantilla_borrador_ausente(p_id, p_plantilla_borrador_esperado); end if;
    perform public._exigir_version(v_pb.actualizado_en, p_plantilla_borrador_esperado,
      'El borrador de esta plantilla cambió ' || public._hace(v_pb.actualizado_en) || ', mientras lo editabas.');
  end if;
  -- La tarjeta publicada.
  select * into v_pp from public.plantillas_tarjeta p where p.formula_del_origen_id = p_id and p.estado = 'publicada';   -- plantillas_publicada_unica
  if v_pp.id is distinct from p_plantilla_publicada_esperada then
    if v_pp.id is null then
      raise exception 'La tarjeta que tenías ya no es la publicada, y la fórmula no tiene otra.' using errcode = 'PT409';
    end if;
    raise exception 'Se publicó la versión % de la tarjeta%.', v_pp.version, coalesce(' ' || public._hace(v_pp.publicado_en), '') using errcode = 'PT409';
  end if;

  if v_pub is null and v_b.id is null then
    raise exception 'Esta fórmula no tiene una versión que se pueda publicar.' using errcode = '22023', hint = 'formula';
  end if;
  if v_pp.id is null and v_pb.id is null then
    raise exception 'Esta fórmula no tiene tarjeta: guarda una antes de activarla.' using errcode = '22023', hint = 'tarjeta';
  end if;

  -- Lo pendiente, con sus validaciones de siempre (y la de los datos del vehículo en una copia de otro origen): un error corta todo.
  v_formula := v_pub;
  if v_b.id is not null then
    v_formula := public._publicar_formula(v_origen, p_nota, v_pub, false, v_b.actualizado_en, p_id);
  elsif v.copiada_de_otro_origen then
    perform public._fdo_exigir_campos((select f.definicion from public.formulas f where f.id = v_formula), v_origen);
  end if;
  if v_pb.id is not null then
    -- Valida el borrador contra la publicada de esta fórmula (la recién publicada, si la hubo).
    v_plantilla := public._plantilla_publicar_en(v_origen, p_id, p_nota, v_pb.actualizado_en);
  else
    -- La tarjeta publicada tiene que calzar con la versión que se va a cotizar (como la dibuja cotizacion_tarjeta: sin el catálogo de colores).
    select * into fo from public.formulas f where f.id = v_formula;   -- formulas_pkey
    perform public.validar_plantilla(v_pp.definicion, fo.definicion, fo.diseno, fo.visibilidad, null);
    v_plantilla := v_pp.id;
  end if;

  -- La vieja se apaga antes de prender la nueva (formulas_del_origen_activa_unica), y queda dicho quién y cuándo.
  if v_activa is distinct from p_id then
    if v_activa is not null then
      select * into v_vieja from public.formulas_del_origen d where d.id = v_activa;
      update public.formulas_del_origen set activa = false, desactivada_en = now() where id = v_activa;
      perform public.registrar_actividad('formula_del_origen.desactivar', 'formulas_del_origen', v_activa::text, to_jsonb(v_vieja),
                                         (select to_jsonb(d) from public.formulas_del_origen d where d.id = v_activa), jsonb_build_object('nueva', p_id));
    end if;
    update public.formulas_del_origen set activa = true, activada_en = now(), activada_por = v_yo, desactivada_en = null where id = p_id;
  end if;
  select * into v_d from public.formulas_del_origen d where d.id = p_id;
  perform public.registrar_actividad('formula_del_origen.activar', 'formulas_del_origen', p_id::text, to_jsonb(v), to_jsonb(v_d),
                                     jsonb_build_object('nota', p_nota, 'anterior', v_activa, 'formula', v_formula, 'plantilla', v_plantilla));
  return jsonb_build_object('activa', p_id, 'formula', v_formula, 'plantilla', v_plantilla, 'actualizado_en', v_d.actualizado_en);
end $$;
revoke all on function public.formula_del_origen_activar(uuid, timestamptz, text, uuid, timestamptz, uuid, timestamptz, uuid) from public, anon;
grant execute on function public.formula_del_origen_activar(uuid, timestamptz, text, uuid, timestamptz, uuid, timestamptz, uuid) to authenticated, service_role;
comment on function public.formula_del_origen_activar(uuid, timestamptz, text, uuid, timestamptz, uuid, timestamptz, uuid) is 'Activa una fórmula del origen (cotizaciones.configurar): publica con p_nota su borrador y el de su tarjeta, exige que la tarjeta calce con la publicada y la vuelve la que se cotiza en su origen (la anterior queda sin activar, con desactivada_en). PT409 si cambió cualquiera de las esperadas (la fila, la activa que se vio, el borrador y la publicada de la fórmula y de la tarjeta). Devuelve {activa, formula, plantilla, actualizado_en}. docs/COTIZADOR.md › «Fórmulas del origen».';
