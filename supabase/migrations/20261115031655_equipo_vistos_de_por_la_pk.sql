-- `vistos_de()` de verdad por la PK. Con la lista de ids recortada dentro de la consulta (`= any (coalesce(p_ids[1:100], '{}'))`), la RLS de `vistos` no deja
-- que esa condición entre al índice: la consulta recorría todo el par (módulo, tipo) de la persona (hasta 20.000 filas) y descartaba lo que no estaba en la
-- página. Recortada a una variable antes de consultar, `referencia_id = any (v_ids)` es condición de `vistos_pkey` y la lectura cuesta lo de sus 100 ids, con
-- 2.000 vistos o con 20.000 (`supabase/tests/medir-vistos.sql` lo mide). Misma firma, mismas reglas y mismo resultado: no cambian los privilegios.
create or replace function public.vistos_de(p_modulo text, p_tipo text, p_ids uuid[]) returns jsonb
  language plpgsql stable security invoker
  set search_path = ''
  as $$
declare
  -- El tope de 100 ids por llamada (espejo de `IDS_POR_LLAMADA`), antes de la consulta y no dentro de ella.
  v_ids uuid[] := coalesce(p_ids[1:100], '{}'::uuid[]);
begin
  return jsonb_build_object(
    'vistos', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.referencia_id, 'visto_en', v.visto_en))
      from public.vistos v
      where v.usuario_id = (select auth.uid()) and v.modulo = p_modulo and v.tipo = p_tipo
        and v.referencia_id = any (v_ids)
    ), '[]'::jsonb),
    'ultimo', (
      select v.referencia_id
      from public.vistos v
      where v.usuario_id = (select auth.uid()) and v.modulo = p_modulo and v.tipo = p_tipo
      order by v.visto_en desc
      limit 1
    )
  );
end;
$$;
