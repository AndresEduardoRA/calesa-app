// La cabecera de la publicada de un origen (el ⚙ de la cabecera de la hoja), sobre el cliente que recibe: el del navegador, con la sesión de quien lo abre. La policy
// `formulas: leer` deja ver sólo los orígenes donde tiene `cotizaciones.configurar`. Nombra sus columnas: del diseño, sólo la cabecera (`diseno->cabecera`).
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import { esquemaId } from '../../entities/nodos'

type Cliente = SupabaseClient<Database>

// La cabecera publicada, con lo que el panel necesita: los modos (clave y nombre), si ofrece «Ver total» y lo que trae por defecto.
export type CabeceraPublicada = {
  publicadaId: string
  version: number
  modos: { clave: string; nombre: string }[]
  verTotalBs: boolean
  modoPorDefecto: string | null
  verTotalBsPorDefecto: boolean
  modosVisibles: string[] | null
}

export const MENSAJE_SIN_LEER_LA_CABECERA = 'No pudimos leer la configuración por defecto.'

// La publicada de un origen: a lo sumo una fila, por `formulas_publicada_unica (origen_id) where estado = 'publicada'` (índice único parcial).
export function consultaDeLaCabecera(cliente: Cliente, origenId: string) {
  return cliente
    .from('formulas')
    .select('id, version, cabecera:diseno->cabecera')
    .eq('origen_id', origenId)
    .eq('estado', 'publicada')
    .limit(1)
}

const esquemaDeLaFila = z.object({
  id: z.guid(),
  version: z.number().int(),
  cabecera: z.object({
    modos: z.array(z.object({ clave: esquemaId, nombre: z.string().min(1) })).default([]),
    ver_total_bs: z.boolean().default(false),
    modo_por_defecto: esquemaId.optional(),
    ver_total_bs_por_defecto: z.boolean().optional(),
    modos_visibles: z.array(esquemaId).optional(),
  }),
})

export async function leerCabeceraSobre(
  cliente: Cliente,
  origenId: string,
): Promise<Resultado<CabeceraPublicada | null>> {
  const { data, error } = await consultaDeLaCabecera(cliente, origenId)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas: unknown[] = Array.isArray(data) ? data : []
  const [primera] = filas
  if (primera === undefined) {
    return ok(null)
  }
  const fila = esquemaDeLaFila.safeParse(primera)
  if (!fila.success) {
    return fallo('inesperado', MENSAJE_SIN_LEER_LA_CABECERA)
  }
  const { cabecera } = fila.data
  return ok({
    publicadaId: fila.data.id,
    version: fila.data.version,
    modos: cabecera.modos,
    verTotalBs: cabecera.ver_total_bs,
    modoPorDefecto: cabecera.modo_por_defecto ?? null,
    verTotalBsPorDefecto: cabecera.ver_total_bs_por_defecto ?? false,
    modosVisibles: cabecera.modos_visibles ?? null,
  })
}
