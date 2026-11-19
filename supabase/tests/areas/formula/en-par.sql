-- Qué nodos van en par (glosario: «Variante en par»): `_nodos_en_par()` contra `nodosEnPar()` de TS, con el juego `casos-de-en-par.json` (`_juego_en_par`,
-- lo inyecta `scripts/probar-schema.mjs`). No depende de otro archivo (`SOLO=areas/formula/en-par.sql`).
--
-- Qué asegura:
--   P1. `_nodos_en_par()` da los mismos ids, en el mismo orden, que `nodosEnPar()` en cada caso del juego; `_variante_en_par()` da la variante con `en_par`.
--   P2. Las dos son de nadie: ni authenticated, ni anon, ni PUBLIC las ejecutan; STABLE y con search_path vacío.

-- @test variante en par: P1 _nodos_en_par da lo mismo que nodosEnPar con el juego casos-de-en-par.json
begin;
do $$
declare v_caso jsonb; v_n int := 0; v_dio text[]; v_esperado text[];
begin
  for v_caso in select c.value from jsonb_array_elements((select doc -> 'casos' from _juego_en_par)) c loop
    v_dio := public._nodos_en_par(v_caso -> 'definicion');
    v_esperado := array(select jsonb_array_elements_text(v_caso -> 'en_par'));
    if v_dio is distinct from v_esperado then
      raise exception '«%»: dio %, esperaba %', v_caso ->> 'nombre', v_dio, v_esperado;
    end if;
    v_n := v_n + 1;
  end loop;
  if v_n < 8 then raise exception 'el juego tiene % casos, se esperaban al menos 8', v_n; end if;
  if public._variante_en_par((select doc -> 'casos' -> 1 -> 'definicion' from _juego_en_par)) is distinct from 'contenedor' then
    raise exception '_variante_en_par no da la variante en par';
  end if;
  if public._variante_en_par((select doc -> 'casos' -> 0 -> 'definicion' from _juego_en_par)) is not null then
    raise exception '_variante_en_par da una variante sin en_par';
  end if;
  if public._nodos_en_par(null) <> '{}'::text[] or public._variante_en_par('{}'::jsonb) is not null then
    raise exception 'una definición sin nodos tiene que dar nada';
  end if;
end $$;
rollback;

-- @test variante en par: P2 _nodos_en_par y _variante_en_par son de nadie, STABLE y con search_path vacío
begin;
do $$
declare f text;
begin
  foreach f in array array['public._nodos_en_par(jsonb)', 'public._variante_en_par(jsonb)'] loop
    if has_function_privilege('authenticated', f, 'execute') or has_function_privilege('anon', f, 'execute') then
      raise exception '% la ejecuta authenticated o anon', f;
    end if;
    if exists (select 1 from aclexplode(coalesce((select proacl from pg_proc where oid = f::regprocedure),
                                                  acldefault('f', (select proowner from pg_proc where oid = f::regprocedure)))) a where a.grantee = 0) then
      raise exception '% la ejecuta PUBLIC', f;
    end if;
    if (select provolatile from pg_proc where oid = f::regprocedure) <> 's'
       or not (select proconfig @> array['search_path=""'] from pg_proc where oid = f::regprocedure) then
      raise exception '% no es STABLE o no tiene el search_path vacío', f;
    end if;
  end loop;
end $$;
rollback;
