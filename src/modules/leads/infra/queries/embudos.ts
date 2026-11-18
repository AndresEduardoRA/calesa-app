import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { embudosDesde } from '../../entities/embudo'
import type { LectorDeEmbudos, LectorDeTablero } from '../../entities/repositorios-de-oportunidades'
import { TOPE_DE_COLUMNA, tableroDesde } from '../../entities/tablero'

type FilaDeEtapa = { orden: number }

// Los embudos de quien mira con sus etapas en orden: la RLS da sólo los propios (a lo sumo 10).
export const getEmbudos: LectorDeEmbudos = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('embudos')
    .select(
      'id,nombre,es_default,actualizado_en,etapas:embudos_etapas(id,nombre,color,es_inicial,es_ganada,es_perdida,orden)',
    )
    .limit(20)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const ordenados = data.map((embudo) => ({
    ...embudo,
    etapas: [...(embudo.etapas as FilaDeEtapa[])].sort((a, b) => a.orden - b.orden),
  }))
  return ok(embudosDesde(ordenados))
}

// El kanban: una RPC de invocador (la RLS decide qué tarjetas llegan y qué se cuenta).
export const getTablero: LectorDeTablero = async ({ embudoId, tope, buscar, lead }) => {
  const supabase = await createClient()
  // Con lead, su propia lectura (por oportunidades_lead_etapa_idx), sin búsqueda; sin lead, la de siempre (por oportunidades_tablero_idx).
  const { data, error } = lead
    ? await supabase.rpc('embudo_tablero_del_lead', {
        p_embudo: embudoId,
        p_lead: lead.id,
        p_tope: tope,
        p_tope_total: TOPE_DE_COLUMNA,
      })
    : await supabase.rpc('embudo_tablero', {
        p_embudo: embudoId,
        p_tope: tope,
        p_tope_total: TOPE_DE_COLUMNA,
        ...(buscar ? { p_buscar: buscar } : {}),
      })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const tablero = lead ? tableroDesde(data, null, lead) : tableroDesde(data, buscar)
  return tablero ? ok(tablero) : fallo('inesperado', 'No pudimos leer el embudo.')
}
