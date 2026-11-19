// Lo publicado de cada origen para el inicio de Configuración › Cotización: dos consultas, con la sesión de quien mira. Las policies
// `formulas: leer` y `plantillas_tarjeta: leer` dejan ver sólo los orígenes donde tiene `cotizaciones.configurar`: lo que no ve vuelve «sin».
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Database } from '@/shared/types/database.types'
import {
  esquemaDeLasFormulasPublicadas,
  esquemaDeLasPlantillasPublicadas,
  esquemaDeLosIds,
  publicadasPorOrigen,
  type PublicadoDelOrigen,
} from '../../entities/publicadas-por-origen'

type Cliente = SupabaseClient<Database>

// Una fila por origen como mucho: `formulas_publicada_unica` (índice único parcial por `origen_id` donde `estado = 'publicada'`).
export function consultaDeLasFormulasPublicadas(cliente: Cliente, ids: readonly string[]) {
  return cliente
    .from('formulas')
    .select('origen_id, version')
    .eq('estado', 'publicada')
    .in('origen_id', [...ids])
    .limit(ids.length)
}

// Una fila por origen como mucho: `plantillas_publicada_unica` (índice único parcial por `origen_id` donde `estado = 'publicada'`).
export function consultaDeLasPlantillasPublicadas(cliente: Cliente, ids: readonly string[]) {
  return cliente
    .from('plantillas_tarjeta')
    .select('origen_id')
    .eq('estado', 'publicada')
    .in('origen_id', [...ids])
    .limit(ids.length)
}

const NO_SE_PUDO = 'No pudimos leer lo publicado de cada origen. Recarga para intentarlo de nuevo.'

export async function getPublicadasPorOrigen(
  ids: readonly string[],
): Promise<Resultado<Map<string, PublicadoDelOrigen>>> {
  const pedidos = esquemaDeLosIds.safeParse(ids)
  if (!pedidos.success) {
    return fallo('validacion', NO_SE_PUDO)
  }
  if (pedidos.data.length === 0) {
    return ok(new Map())
  }
  const supabase = await createClient()
  const [formulas, plantillas] = await Promise.all([
    consultaDeLasFormulasPublicadas(supabase, pedidos.data),
    consultaDeLasPlantillasPublicadas(supabase, pedidos.data),
  ])
  if (formulas.error) return { ok: false, error: errorDePostgrest(formulas.error) }
  if (plantillas.error) return { ok: false, error: errorDePostgrest(plantillas.error) }
  const filasDeFormulas = esquemaDeLasFormulasPublicadas.safeParse(formulas.data)
  const filasDePlantillas = esquemaDeLasPlantillasPublicadas.safeParse(plantillas.data)
  if (!filasDeFormulas.success || !filasDePlantillas.success) {
    return fallo('inesperado', NO_SE_PUDO)
  }
  return ok(publicadasPorOrigen(pedidos.data, filasDeFormulas.data, filasDePlantillas.data))
}
