-- Las preferencias de la lista de cotizaciones (`cotizaciones.vista`, `cotizaciones.agrupar`): la base sólo admite sus valores y cada persona escribe la suya.
-- No depende de otro archivo (`SOLO=areas/equipo/preferencias-de-cotizaciones.sql`).
--
-- Qué asegura:
--   P1. `cotizaciones.vista` acepta «tabla» y «tarjetas»; rechaza otra palabra, otra mayúscula, un número o un objeto (23514).
--   P2. `cotizaciones.agrupar` acepta true y false; rechaza «si», 1, null de jsonb o un objeto (23514).
--   P3. Una persona no escribe la preferencia de otra (la policy de siempre).

create or replace function pg_temp.pc_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

-- Guarda esa preferencia como `p_quien` para `p_duena`: 'ok' o el código del error.
create or replace function pg_temp.pc_guardar(p_quien uuid, p_duena uuid, p_clave text, p_valor text) returns text language plpgsql as $f$
declare v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    insert into public.preferencias_usuario (usuario_id, clave, valor) values (p_duena, p_clave, p_valor::jsonb)
      on conflict (usuario_id, clave) do update set valor = excluded.valor;
  exception when others then
    get stacked diagnostics v_e = returned_sqlstate;
    reset role;
    return v_e;
  end;
  reset role;
  return 'ok';
end $f$;

-- @test preferencias de cotizaciones: «cotizaciones.vista» sólo admite tabla o tarjetas (P1)
begin;
do $$
declare p uuid := pg_temp.pc_persona(); c record; v text;
begin
  for c in select * from (values ('"tabla"'), ('"tarjetas"')) t (valor) loop
    v := pg_temp.pc_guardar(p, p, 'cotizaciones.vista', c.valor);
    if v <> 'ok' then raise exception 'P1: la vista % debía aceptarse: %', c.valor, v; end if;
  end loop;
  for c in select * from (values ('"lista"'), ('"Tabla"'), ('1'), ('null'), ('{}'), ('true')) t (valor) loop
    v := pg_temp.pc_guardar(p, p, 'cotizaciones.vista', c.valor);
    if v <> '23514' then raise exception 'P1: la vista % debía rechazarse por el check: %', c.valor, v; end if;
  end loop;
end $$;
rollback;

-- @test preferencias de cotizaciones: «cotizaciones.agrupar» sólo admite un booleano (P2)
begin;
do $$
declare p uuid := pg_temp.pc_persona(); c record; v text;
begin
  for c in select * from (values ('true'), ('false')) t (valor) loop
    v := pg_temp.pc_guardar(p, p, 'cotizaciones.agrupar', c.valor);
    if v <> 'ok' then raise exception 'P2: agrupar % debía aceptarse: %', c.valor, v; end if;
  end loop;
  for c in select * from (values ('"si"'), ('"true"'), ('1'), ('null'), ('{}'), ('[]')) t (valor) loop
    v := pg_temp.pc_guardar(p, p, 'cotizaciones.agrupar', c.valor);
    if v <> '23514' then raise exception 'P2: agrupar % debía rechazarse por el check: %', c.valor, v; end if;
  end loop;
end $$;
rollback;

-- @test preferencias de cotizaciones: nadie escribe la de otra persona (P3)
begin;
do $$
declare ana uuid := pg_temp.pc_persona(); beto uuid := pg_temp.pc_persona(); v text;
begin
  v := pg_temp.pc_guardar(beto, ana, 'cotizaciones.agrupar', 'false');
  if v <> '42501' then raise exception 'P3: Beto escribió la preferencia de Ana: %', v; end if;
  if exists (select 1 from public.preferencias_usuario where usuario_id = ana) then raise exception 'P3: quedó una fila de Ana'; end if;
end $$;
rollback;
