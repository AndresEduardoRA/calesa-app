-- El embudo que cada persona dejó a la vista en la ficha de un lead (`leads.embudo_de_la_ficha`): la base sólo admite un id y cada persona escribe el suyo.
-- No depende de otro archivo (`SOLO=areas/equipo/preferencias-del-embudo-de-la-ficha.sql`).
--
-- Qué asegura:
--   P1. `leads.embudo_de_la_ficha` acepta un id (también en mayúsculas); rechaza otra palabra, un número, null de jsonb, un objeto o un id mal formado (23514).
--   P2. Una persona no escribe la preferencia de otra (la policy de siempre).

create or replace function pg_temp.pe_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

-- Guarda esa preferencia como `p_quien` para `p_duena`: 'ok' o el código del error.
create or replace function pg_temp.pe_guardar(p_quien uuid, p_duena uuid, p_valor text) returns text language plpgsql as $f$
declare v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    insert into public.preferencias_usuario (usuario_id, clave, valor) values (p_duena, 'leads.embudo_de_la_ficha', p_valor::jsonb)
      on conflict (usuario_id, clave) do update set valor = excluded.valor;
  exception when others then
    get stacked diagnostics v_e = returned_sqlstate;
    reset role;
    return v_e;
  end;
  reset role;
  return 'ok';
end $f$;

-- @test preferencias del embudo de la ficha: sólo admite un id (P1)
begin;
do $$
declare p uuid := pg_temp.pe_persona(); c record; v text;
begin
  for c in select * from (values ('"6f1d8f0e-3b52-4c1e-9a53-0d2a1d3c9b11"'), ('"6F1D8F0E-3B52-4C1E-9A53-0D2A1D3C9B11"')) t (valor) loop
    v := pg_temp.pe_guardar(p, p, c.valor);
    if v <> 'ok' then raise exception 'P1: % debía aceptarse: %', c.valor, v; end if;
  end loop;
  for c in select * from (values ('"ventas"'), ('1'), ('null'), ('{}'), ('["6f1d8f0e-3b52-4c1e-9a53-0d2a1d3c9b11"]'), ('"6f1d8f0e-3b52-4c1e-9a53-0d2a1d3c9b1"')) t (valor) loop
    v := pg_temp.pe_guardar(p, p, c.valor);
    if v <> '23514' then raise exception 'P1: % debía rechazarse por el check: %', c.valor, v; end if;
  end loop;
end $$;
rollback;

-- @test preferencias del embudo de la ficha: nadie escribe la de otra persona (P2)
begin;
do $$
declare ana uuid := pg_temp.pe_persona(); beto uuid := pg_temp.pe_persona(); v text;
begin
  v := pg_temp.pe_guardar(beto, ana, '"6f1d8f0e-3b52-4c1e-9a53-0d2a1d3c9b11"');
  if v <> '42501' then raise exception 'P2: Beto escribió la preferencia de Ana: %', v; end if;
  if exists (select 1 from public.preferencias_usuario where usuario_id = ana) then raise exception 'P2: quedó una fila de Ana'; end if;
end $$;
rollback;
