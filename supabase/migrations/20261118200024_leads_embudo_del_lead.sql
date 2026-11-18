-- El embudo filtrado por lead (`/leads?vista=embudo&embudo=<id>&lead=<id>`): las oportunidades de quien mira sobre un lead en un embudo, en todas
-- sus etapas (también ganadas y perdidas). Son funciones de lectura aparte de `embudo_tablero` y `embudo_etapa_pagina` (un `p_lead is null or …`
-- deja de ser condición de índice, y el tablero sin filtro no cambia de plan): con lead y sin lead son dos consultas. Los mismos topes que el
-- kanban de siempre (`_acotar_pagina(p_tope, 50, 100)` por columna, `p_tope_total` 500 en el conteo) y la misma forma JSON.

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El índice: cada columna del tablero de un lead sale exacta y en orden. `usuario_id` lo pone la RLS de «oportunidades: leer»; lead y etapa
-- son igualdad. Sin `concurrently` (en una transacción de migración no se puede): bloquea las escrituras de `oportunidades` mientras se arma,
-- y la tabla es chica.
-- ---------------------------------------------------------------------------------------------------------------------------------
create index oportunidades_lead_etapa_idx on public.oportunidades
  using btree (lead_id, usuario_id, etapa_id, ultima_actividad_en desc, id desc) where (eliminado_en is null);

comment on index public.oportunidades_lead_etapa_idx is
  'Las oportunidades vivas de quien mira sobre un lead, por etapa y en el orden del kanban: sostiene embudo_tablero_del_lead y embudo_etapa_pagina_del_lead (el embudo filtrado por lead). Lo mide supabase/tests/medir-lead-oportunidades.sql.';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El tablero de un lead en un embudo: la forma de `embudo_tablero` ({embudo, columnas[{etapa, total, total_hay_mas, hay_mas, tarjetas}]}).
-- Corre como quien llama: la RLS de embudos da sólo los propios (uno ajeno, null) y la de oportunidades, las suyas con el lead en su cartera.
-- Cada columna (tarjetas y conteo con tope) por oportunidades_lead_etapa_idx.
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public.embudo_tablero_del_lead(p_embudo uuid, p_lead uuid, p_tope integer default 50, p_tope_total integer default 500)
    returns jsonb
    language plpgsql stable
    set search_path = ''
    as $$
declare
  v_n int := public._acotar_pagina(p_tope, 50, 100);
  v_total int := public._acotar_pagina(p_tope_total, 500, 1000);
  v_tablero jsonb;
begin
  select jsonb_build_object(
    'embudo', jsonb_build_object('id', x.id, 'nombre', x.nombre, 'es_default', x.es_default, 'actualizado_en', x.actualizado_en),
    'columnas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'etapa', jsonb_build_object('id', s.id, 'nombre', s.nombre, 'color', s.color,
                   'es_inicial', s.es_inicial, 'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida),
        'total', least(c.leidas, v_total),
        'total_hay_mas', c.leidas > v_total,
        'hay_mas', c.leidas > v_n,
        'tarjetas', coalesce((
          select jsonb_agg(t.tarjeta order by t.en desc, t.id desc)
            from (select public._tarjeta_json(o, jsonb_build_object('id', l.id,
                                         'numero', (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                                         'numero_propio', (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id),
                                         'nombre', l.nombre),
                                         case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta,
                         o.ultima_actividad_en as en, o.id
                    from public.oportunidades o
                    join public.leads l on l.id = o.lead_id
                    left join public.vehiculos v on v.id = o.vehiculo_id
                   where o.lead_id = p_lead and o.etapa_id = s.id
                   order by o.ultima_actividad_en desc, o.id desc
                   limit v_n) t), '[]'::jsonb))
        order by s.orden, s.id)
      from public.embudos_etapas s
      cross join lateral (select count(*)::int as leidas
                            from (select 1 from public.oportunidades o2
                                   where o2.lead_id = p_lead and o2.etapa_id = s.id
                                   limit v_total + 1) q) c
      where s.embudo_id = x.id), '[]'::jsonb))
    into v_tablero
    from public.embudos x where x.id = p_embudo;
  return v_tablero;
end;
$$;

revoke all on function public.embudo_tablero_del_lead(uuid, uuid, integer, integer) from public, anon;
grant execute on function public.embudo_tablero_del_lead(uuid, uuid, integer, integer) to authenticated, service_role;

comment on function public.embudo_tablero_del_lead(uuid, uuid, integer, integer) is
  'El kanban de un embudo propio filtrado por un lead: la forma de embudo_tablero, con las oportunidades de quien mira sobre ese lead en todas las etapas. p_tope por columna (50, hasta 100) y p_tope_total en el conteo (500, hasta 1000; nunca un total exacto). Un embudo ajeno da null. Corre como quien llama (RLS). Por oportunidades_lead_etapa_idx; lo mide supabase/tests/medir-lead-oportunidades.sql.';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- «Ver más» de una columna del tablero de un lead: sin cursor y con cursor son dos consultas, cada una por oportunidades_lead_etapa_idx.
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public.embudo_etapa_pagina_del_lead(p_etapa uuid, p_lead uuid, p_antes_en timestamp with time zone,
    p_antes_id uuid, p_tope integer default 50)
    returns jsonb
    language plpgsql stable
    set search_path = ''
    as $$
declare
  v_n int := public._acotar_pagina(p_tope, 50, 100);
  v_tarjetas jsonb;
  v_hay_mas boolean;
begin
  if p_antes_en is null then
    select coalesce(jsonb_agg(p.tarjeta order by p.en desc, p.id desc) filter (where p.k <= v_n), '[]'::jsonb),
           coalesce(bool_or(p.k > v_n), false)
      into v_tarjetas, v_hay_mas
      from (select public._tarjeta_json(o, jsonb_build_object('id', l.id,
                                         'numero', (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                                         'numero_propio', (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id),
                                         'nombre', l.nombre),
                                           case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta,
                   o.ultima_actividad_en as en, o.id,
                   row_number() over (order by o.ultima_actividad_en desc, o.id desc) as k
              from public.oportunidades o
              join public.leads l on l.id = o.lead_id
              left join public.vehiculos v on v.id = o.vehiculo_id
             where o.lead_id = p_lead and o.etapa_id = p_etapa
             order by o.ultima_actividad_en desc, o.id desc
             limit v_n + 1) p;
  else
    select coalesce(jsonb_agg(p.tarjeta order by p.en desc, p.id desc) filter (where p.k <= v_n), '[]'::jsonb),
           coalesce(bool_or(p.k > v_n), false)
      into v_tarjetas, v_hay_mas
      from (select public._tarjeta_json(o, jsonb_build_object('id', l.id,
                                         'numero', (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                                         'numero_propio', (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id),
                                         'nombre', l.nombre),
                                           case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta,
                   o.ultima_actividad_en as en, o.id,
                   row_number() over (order by o.ultima_actividad_en desc, o.id desc) as k
              from public.oportunidades o
              join public.leads l on l.id = o.lead_id
              left join public.vehiculos v on v.id = o.vehiculo_id
             where o.lead_id = p_lead and o.etapa_id = p_etapa
               and (o.ultima_actividad_en, o.id) < (p_antes_en, p_antes_id)
             order by o.ultima_actividad_en desc, o.id desc
             limit v_n + 1) p;
  end if;
  return jsonb_build_object('tarjetas', v_tarjetas, 'hay_mas', v_hay_mas);
end;
$$;

revoke all on function public.embudo_etapa_pagina_del_lead(uuid, uuid, timestamp with time zone, uuid, integer) from public, anon;
grant execute on function public.embudo_etapa_pagina_del_lead(uuid, uuid, timestamp with time zone, uuid, integer) to authenticated, service_role;

comment on function public.embudo_etapa_pagina_del_lead(uuid, uuid, timestamp with time zone, uuid, integer) is
  '«Ver más» de una columna del embudo filtrado por lead: las de quien mira sobre ese lead en esa etapa, desde el cursor (p_antes_en, p_antes_id), de a p_tope (50, hasta 100), con hay_mas. Corre como quien llama (RLS). Por oportunidades_lead_etapa_idx.';
