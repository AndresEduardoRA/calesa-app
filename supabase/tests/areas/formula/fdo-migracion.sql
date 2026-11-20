-- La conversión a fórmulas del origen (docs/COTIZADOR.md › «Fórmulas del origen»): cada origen con versiones o plantilla recibe una «Fórmula», activa si
-- tiene publicada (con la hora y el autor de esa publicación), de la que cuelgan todas sus versiones y su plantilla, sin mover `actualizado_en` ni escribir
-- actividad; un origen sin nada no recibe ninguna. Es la prueba de una migración de datos: se borra al aplastar las migraciones.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

-- @test fórmulas del origen: la conversión da una «Fórmula» por origen con versiones o plantilla, activa si tiene publicada, y cuelga todo de ella
begin;
-- El estado de antes: versiones y plantillas sin fórmula del origen, sin el trigger de compatibilidad (y sin auditar el terreno: la prueba mira la
-- actividad que escribe la conversión).
alter table public.formulas disable trigger trg_fdo_asignar, disable trigger trg_auditar;
alter table public.plantillas_tarjeta disable trigger trg_fdo_asignar, disable trigger trg_auditar;
alter table public.formulas alter column formula_del_origen_id drop not null;
alter table public.plantillas_tarjeta alter column formula_del_origen_id drop not null;
do $$
declare
  p constant uuid := '00000000-0000-4000-8000-0000000fd101';
  oa uuid; ob uuid; oc uuid; od uuid; f3 uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p, 'migracion.fdo@ejemplo.com', '{"invitado": true}');
  insert into public.origenes (clave, nombre) values ('fmig_a', 'Migración A') returning id into oa;
  insert into public.origenes (clave, nombre) values ('fmig_b', 'Migración B') returning id into ob;
  insert into public.origenes (clave, nombre) values ('fmig_c', 'Migración C') returning id into oc;
  insert into public.origenes (clave, nombre) values ('fmig_d', 'Migración D') returning id into od;
  -- A: dos archivadas, la publicada (v3), un borrador, la plantilla publicada y un borrador de plantilla.
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en, publicado_por, creado_en, actualizado_en)
  select oa, n, case when n = 3 then 'publicada' else 'archivada' end::public.estado_version, s.definicion, s.params, s.diseno, s.visibilidad,
         timestamptz '2026-01-01 10:00Z' + n * interval '1 day', case when n = 3 then p end,
         timestamptz '2026-01-01 09:00Z' + n * interval '1 day', timestamptz '2026-01-01 09:00Z' + n * interval '1 day'
    from public.formulas s join public.origenes x on x.id = s.origen_id, generate_series(1, 3) n
   where x.clave = 'subasta_usa' and s.estado = 'publicada';
  insert into public.formulas (origen_id, estado, definicion, params, diseno, creado_en, actualizado_en)
  select oa, 'borrador', s.definicion, s.params, s.diseno, timestamptz '2026-02-01 09:00Z', timestamptz '2026-02-01 09:00Z'
    from public.formulas s join public.origenes x on x.id = s.origen_id where x.clave = 'subasta_usa' and s.estado = 'publicada';
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion, publicado_en, creado_en, actualizado_en)
  values (oa, 1, 'publicada', public._fdo_tarjeta_en_blanco(), timestamptz '2026-01-05 10:00Z', timestamptz '2025-12-31 09:00Z', timestamptz '2026-01-05 10:00Z'),
         (oa, null, 'borrador', public._fdo_tarjeta_en_blanco(), null, timestamptz '2026-02-02 09:00Z', timestamptz '2026-02-02 09:00Z');
  -- B: sólo un borrador. C: nada. D: sólo un borrador de plantilla.
  insert into public.formulas (origen_id, estado, definicion, params, creado_en, actualizado_en)
  values (ob, 'borrador', '{"nodos": []}', '{}', timestamptz '2026-03-01 09:00Z', timestamptz '2026-03-01 09:00Z');
  insert into public.plantillas_tarjeta (origen_id, estado, definicion, creado_en, actualizado_en)
  values (od, 'borrador', public._fdo_tarjeta_en_blanco(), timestamptz '2026-04-01 09:00Z', timestamptz '2026-04-01 09:00Z');
  if exists (select 1 from public.formulas_del_origen where origen_id in (oa, ob, oc, od)) then raise exception 'el terreno ya tiene fórmulas del origen'; end if;
end $$;
alter table public.formulas enable trigger trg_auditar;
alter table public.plantillas_tarjeta enable trigger trg_auditar;

-- La conversión, la misma de la migración, sobre lo que todavía no tiene fórmula del origen.
alter table public.formulas disable trigger trg_actualizado_en, disable trigger trg_auditar;
alter table public.plantillas_tarjeta disable trigger trg_actualizado_en, disable trigger trg_auditar;
insert into public.formulas_del_origen (origen_id, nombre, activa, activada_en, activada_por, creado_en)
select o.origen_id, 'Fórmula', p.id is not null, p.publicado_en, p.publicado_por, o.creado_en
  from (select x.origen_id, min(x.creado_en) as creado_en
          from (select f.origen_id, f.creado_en from public.formulas f where f.formula_del_origen_id is null
                union all
                select t.origen_id, t.creado_en from public.plantillas_tarjeta t where t.formula_del_origen_id is null) x
         group by x.origen_id) o
  left join public.formulas p on p.origen_id = o.origen_id and p.estado = 'publicada';
update public.formulas f set formula_del_origen_id = d.id from public.formulas_del_origen d where d.origen_id = f.origen_id and f.formula_del_origen_id is null;
update public.plantillas_tarjeta t set formula_del_origen_id = d.id from public.formulas_del_origen d where d.origen_id = t.origen_id and t.formula_del_origen_id is null;
alter table public.formulas enable trigger trg_actualizado_en, enable trigger trg_auditar;
alter table public.plantillas_tarjeta enable trigger trg_actualizado_en, enable trigger trg_auditar;
alter table public.formulas alter column formula_del_origen_id set not null;
alter table public.plantillas_tarjeta alter column formula_del_origen_id set not null;

do $$
declare
  p constant uuid := '00000000-0000-4000-8000-0000000fd101';
  oa uuid := (select id from public.origenes where clave = 'fmig_a');
  ob uuid := (select id from public.origenes where clave = 'fmig_b');
  oc uuid := (select id from public.origenes where clave = 'fmig_c');
  od uuid := (select id from public.origenes where clave = 'fmig_d');
  d public.formulas_del_origen;
begin
  -- A: una «Fórmula», activa desde su publicada (la v3) y por quien la publicó, nacida con lo más viejo (la plantilla publicada).
  if (select count(*) from public.formulas_del_origen where origen_id = oa) <> 1 then raise exception 'A no tiene una sola fórmula del origen'; end if;
  select * into d from public.formulas_del_origen where origen_id = oa;
  if d.nombre <> 'Fórmula' or not d.activa or d.activada_en <> timestamptz '2026-01-04 10:00Z' or d.activada_por is distinct from p
     or d.creado_en <> timestamptz '2025-12-31 09:00Z' or d.archivada_en is not null or d.desactivada_en is not null or d.copiada_de_otro_origen then
    raise exception 'la fórmula de A no es la esperada: %', to_jsonb(d);
  end if;
  if exists (select 1 from public.formulas where origen_id = oa and formula_del_origen_id is distinct from d.id)
     or exists (select 1 from public.plantillas_tarjeta where origen_id = oa and formula_del_origen_id is distinct from d.id) then
    raise exception 'alguna versión o plantilla de A no colgó de su «Fórmula»';
  end if;
  if (select count(*) from public.formulas where formula_del_origen_id = d.id) <> 4 or (select count(*) from public.plantillas_tarjeta where formula_del_origen_id = d.id) <> 2 then
    raise exception 'a la «Fórmula» de A no le cuelgan sus 4 versiones y sus 2 plantillas';
  end if;
  -- Sin mover `actualizado_en` (la esperada de los borradores abiertos) ni escribir actividad.
  if exists (select 1 from public.formulas where origen_id = oa and estado <> 'borrador' and actualizado_en <> creado_en)
     or (select actualizado_en from public.formulas where origen_id = oa and estado = 'borrador') <> timestamptz '2026-02-01 09:00Z'
     or (select actualizado_en from public.plantillas_tarjeta where origen_id = oa and estado = 'borrador') <> timestamptz '2026-02-02 09:00Z' then
    raise exception 'la conversión movió actualizado_en';
  end if;
  if exists (select 1 from public.actividad where tabla in ('formulas', 'plantillas_tarjeta')
               and registro_id in (select id::text from public.formulas where origen_id = oa union all select id::text from public.plantillas_tarjeta where origen_id = oa)) then
    raise exception 'la conversión escribió actividad';
  end if;
  -- B: «Fórmula» sin activar. C: ninguna. D: «Fórmula» sin activar, con su plantilla.
  select * into d from public.formulas_del_origen where origen_id = ob;
  if d.nombre is distinct from 'Fórmula' or d.activa or d.activada_en is not null or (select formula_del_origen_id from public.formulas where origen_id = ob) is distinct from d.id then
    raise exception 'la fórmula de B no es la esperada: %', to_jsonb(d);
  end if;
  if exists (select 1 from public.formulas_del_origen where origen_id = oc) then raise exception 'C, sin nada, recibió una fórmula del origen'; end if;
  select * into d from public.formulas_del_origen where origen_id = od;
  if d.nombre is distinct from 'Fórmula' or d.activa or (select formula_del_origen_id from public.plantillas_tarjeta where origen_id = od) is distinct from d.id then
    raise exception 'la fórmula de D no es la esperada: %', to_jsonb(d);
  end if;
end $$;
rollback;

-- @test fórmulas del origen: en la semilla cada origen con publicada tiene una activa de la que cuelga, y las FK y los índices por fórmula del origen existen
do $$
declare v text;
begin
  if exists (select 1 from public.formulas f where f.estado = 'publicada'
               and not exists (select 1 from public.formulas_del_origen d where d.id = f.formula_del_origen_id and d.origen_id = f.origen_id)) then
    raise exception 'una publicada no cuelga de una fórmula de su origen';
  end if;
  if exists (select 1 from public.origenes o where exists (select 1 from public.formulas f where f.origen_id = o.id and f.estado = 'publicada')
               and (select count(*) from public.formulas_del_origen d where d.origen_id = o.id and d.activa) <> 1) then
    raise exception 'un origen de la semilla con publicada no tiene una sola activa';
  end if;
  -- Las FK compuestas, en cascada, por (origen_id, formula_del_origen_id).
  foreach v in array array['formulas', 'plantillas_tarjeta'] loop
    if not exists (select 1 from pg_constraint c
                    where c.conrelid = ('public.' || v)::regclass and c.conname = v || '_formula_del_origen_fkey' and c.contype = 'f' and c.confdeltype = 'c'
                      and c.confrelid = 'public.formulas_del_origen'::regclass
                      and (select array_agg(a.attname::text order by k.n) from unnest(c.conkey) with ordinality k (attnum, n)
                             join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) = array['origen_id', 'formula_del_origen_id']) then
      raise exception 'falta la FK compuesta de %', v;
    end if;
    if not exists (select 1 from pg_constraint c where c.conrelid = ('public.' || v)::regclass and c.conname = v || '_formula_del_origen_id_version_key' and c.contype = 'u') then
      raise exception 'falta la unique de versión por fórmula del origen en %', v;
    end if;
    if exists (select 1 from pg_constraint c where c.conrelid = ('public.' || v)::regclass and c.conname = v || '_origen_id_version_key') then
      raise exception 'quedó la unique de versión por origen en %', v;
    end if;
  end loop;
  -- Un borrador y una publicada por fórmula del origen.
  if (select count(*) from pg_indexes where schemaname = 'public'
        and indexname in ('formulas_borrador_unico', 'formulas_publicada_unica', 'plantillas_borrador_unico', 'plantillas_publicada_unica')
        and indexdef like '%UNIQUE%(formula_del_origen_id) WHERE%') <> 4 then
    raise exception 'los índices de un borrador y una publicada no son por fórmula del origen';
  end if;
end $$;
