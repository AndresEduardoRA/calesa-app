-- Lo que falta de un documento dice cuántos hay subidos por revisar (`evaluar_requisitos`, detalle `por_revisar`): «Qué falta» ofrece «Revisar» antes que
-- «Subir». No depende de otro archivo (`SOLO=areas/mover/requisito-por-revisar.sql`). Cada bloque abre su transacción y la revierte. Prefijo `rpr_`.
--
-- Qué asegura:
--   R1. Vehículo: sin documentos `por_revisar` 0; uno subido cuenta 1 sin cumplir; aprobado pasa a `aprobados` 1, `por_revisar` 0 y cumple; un subido con
--       un formato fuera del requisito, vencido, rechazado o eliminado no cuenta. El detalle conserva sus claves (`aprobados`, `min`, `max`,
--       `tipo_documento_id`).
--   R2. Ítem de repuesto: lo mismo por su columna.

-- Un requisito de documento (PDF) en una fase nueva; devuelve {fase, tipo, requisito}.
create or replace function pg_temp.rpr_requisito(p_flujo uuid) returns jsonb language plpgsql as $f$
declare f uuid; t uuid; q uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.fases (flujo_id, nombre, orden) values (p_flujo, 'rpr fase ' || s, 900) returning id into f;
  insert into public.tipos_documento (nombre) values ('rpr tipo ' || s) returning id into t;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id, formatos)
  values (f, 'documento', true, t, array['application/pdf']) returning id into q;
  return jsonb_build_object('fase', f, 'tipo', t, 'requisito', q);
end $f$;

-- La fila del requisito en la evaluación de esa unidad.
create or replace function pg_temp.rpr_fila(p_vehiculo uuid, p_repuesto uuid, r jsonb) returns jsonb language sql as $f$
  select jsonb_build_object('cumplido', e.cumplido, 'detalle', e.detalle)
    from public.evaluar_requisitos(p_vehiculo, p_repuesto, (r ->> 'fase')::uuid) e
   where e.requisito_id = (r ->> 'requisito')::uuid;
$f$;

create or replace function pg_temp.rpr_es(p_que text, p_fila jsonb, p_aprobados int, p_por_revisar int, p_cumplido boolean) returns void language plpgsql as $f$
begin
  if (jsonb_path_query_first(p_fila, '$.detalle.aprobados'))::int is distinct from p_aprobados
     or (jsonb_path_query_first(p_fila, '$.detalle.por_revisar'))::int is distinct from p_por_revisar
     or (jsonb_path_query_first(p_fila, '$.cumplido'))::boolean is distinct from p_cumplido then
    raise exception '%: debía dar aprobados %, por_revisar %, cumplido % y dio %', p_que, p_aprobados, p_por_revisar, p_cumplido, p_fila;
  end if;
end $f$;

-- @test mover: por_revisar de un documento de un vehículo (R1)
begin;
do $$
declare
  o uuid; fl uuid; r jsonb; v uuid; d uuid; fila jsonb; t uuid;
  s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('rpr_' || s, 'rpr origen ' || s, 'manual') returning id into o;
  select id into fl from public.flujos where origen_id = o;
  r := pg_temp.rpr_requisito(fl);
  t := (r ->> 'tipo')::uuid;
  insert into public.vehiculos (origen_id, titulo) values (o, 'rpr vehículo') returning id into v;

  fila := pg_temp.rpr_fila(v, null, r);
  perform pg_temp.rpr_es('sin documentos', fila, 0, 0, false);
  if (select array_agg(k order by k) from jsonb_object_keys(fila -> 'detalle') k)
     is distinct from array['aprobados', 'max', 'min', 'por_revisar', 'tipo_documento_id'] then
    raise exception 'el detalle no tiene las claves de siempre más por_revisar: %', fila;
  end if;

  insert into public.documentos (vehiculo_id, tipo_documento_id, estado, mime) values (v, t, 'subido', 'image/png');
  perform pg_temp.rpr_es('subido con un formato fuera del requisito', pg_temp.rpr_fila(v, null, r), 0, 0, false);
  insert into public.documentos (vehiculo_id, tipo_documento_id, estado, mime, vence_el) values (v, t, 'subido', 'application/pdf', current_date - 1);
  perform pg_temp.rpr_es('subido vencido', pg_temp.rpr_fila(v, null, r), 0, 0, false);
  insert into public.documentos (vehiculo_id, tipo_documento_id, estado, mime) values (v, t, 'rechazado', 'application/pdf');
  perform pg_temp.rpr_es('rechazado', pg_temp.rpr_fila(v, null, r), 0, 0, false);
  insert into public.documentos (vehiculo_id, tipo_documento_id, estado, mime, eliminado_en) values (v, t, 'subido', 'application/pdf', now());
  perform pg_temp.rpr_es('subido eliminado', pg_temp.rpr_fila(v, null, r), 0, 0, false);

  insert into public.documentos (vehiculo_id, tipo_documento_id, estado, mime) values (v, t, 'subido', 'application/pdf') returning id into d;
  perform pg_temp.rpr_es('uno subido', pg_temp.rpr_fila(v, null, r), 0, 1, false);
  update public.documentos set estado = 'aprobado' where id = d;
  perform pg_temp.rpr_es('aprobado', pg_temp.rpr_fila(v, null, r), 1, 0, true);
end $$;
rollback;

-- @test mover: por_revisar de un documento de un ítem de repuesto (R2)
begin;
do $$
declare
  fr uuid := (select id from public.flujos where ambito = 'repuestos');
  r jsonb; p uuid; i uuid; d uuid; t uuid;
begin
  r := pg_temp.rpr_requisito(fr);
  t := (r ->> 'tipo')::uuid;
  insert into public.repuestos_proyectos (vehiculo_etiqueta) values ('rpr proyecto') returning id into p;
  insert into public.repuestos_items (proyecto_id, descripcion) values (p, 'rpr ítem') returning id into i;

  perform pg_temp.rpr_es('ítem sin documentos', pg_temp.rpr_fila(null, i, r), 0, 0, false);
  insert into public.documentos (repuesto_id, tipo_documento_id, estado, mime) values (i, t, 'rechazado', 'application/pdf');
  perform pg_temp.rpr_es('ítem con un rechazado', pg_temp.rpr_fila(null, i, r), 0, 0, false);
  insert into public.documentos (repuesto_id, tipo_documento_id, estado, mime) values (i, t, 'subido', 'application/pdf') returning id into d;
  perform pg_temp.rpr_es('ítem con uno subido', pg_temp.rpr_fila(null, i, r), 0, 1, false);
  update public.documentos set estado = 'aprobado' where id = d;
  perform pg_temp.rpr_es('ítem con uno aprobado', pg_temp.rpr_fila(null, i, r), 1, 0, true);
end $$;
rollback;
