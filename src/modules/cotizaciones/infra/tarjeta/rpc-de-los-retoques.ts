// Retocar la tarjeta de una cotización (`cotizacion_retocar_tarjeta()`) sobre un cliente: el de la sesión de quien retoca, porque la base vuelve a pedir poder
// guardarla. Sin `server-only`, para que una prueba la corra con un `rpc` simulado.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import type { Database, Json } from '@/shared/types/database.types'
import type { RetoquesDeLaTarjeta } from '../../entities/cuadricula-de-la-tarjeta'
import {
  esReglaDeRetoques,
  rechazoDeRetoques,
} from '../../entities/tarjeta/retoques/motivos-de-retoques'

export type PedidoDeRetoques = {
  id: string
  // La versión que se tenía en pantalla: el texto de la base, con sus microsegundos.
  esperado: string
  // Nulo: volver a la plantilla.
  retoques: RetoquesDeLaTarjeta | null
}

export type RetoquesGuardados = {
  actualizadoEn: string
  retoques: RetoquesDeLaTarjeta | null
  repetido: boolean
}

type ErrorDeLaBase = {
  code?: string | null
  message: string
  details?: string | null
  hint?: string | null
}

export const SIN_PERMISO_DE_RETOCAR = 'Ya no puedes retocar esta cotización.'
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

const esquemaDeLaRespuesta = z.object({
  actualizado_en: z.string().min(1),
  retoques: z
    .object({
      celdas: z.record(z.string(), z.string()).optional(),
      filas_ocultas: z.array(z.string()).optional(),
    })
    .nullable(),
  repetido: z.boolean(),
})

// Un rechazo de la base: la regla de los retoques con su mensaje (el `donde` viaja como `causa`, para decirlo junto a la celda o la fila), el PT409 con quién y
// cuándo, el 42501 (la papelera, lo que no existe y lo que ya no se puede guardar) y lo demás como siempre.
export function rechazoDeLosRetoques(error: ErrorDeLaBase): ResultadoDeAccion<never> {
  if (error.code === '22023' && esReglaDeRetoques(error.details)) {
    const donde = error.hint ?? 'retoques'
    return {
      ok: false,
      error: {
        codigo: 'validacion',
        mensaje: rechazoDeRetoques(error.details, donde).mensaje,
        causa: donde,
      },
    }
  }
  if (error.code === 'PT409') return fallo('conflicto', error.message)
  if (error.code === '42501') return fallo('sin_permiso', SIN_PERMISO_DE_RETOCAR)
  return { ok: false, error: errorDePostgrest(error) }
}

export async function retocarSobre(
  cliente: SupabaseClient<Database>,
  { id, esperado, retoques }: PedidoDeRetoques,
): Promise<ResultadoDeAccion<RetoquesGuardados>> {
  const { data, error } = await cliente.rpc('cotizacion_retocar_tarjeta', {
    p_id: id,
    p_actualizado_en_esperado: esperado,
    // Nulo viaja como `null` (volver a la plantilla); los textos ya pasaron por `revisarTextoParaLaBase()`.
    p_retoques: retoques as Json,
  })
  if (error) return rechazoDeLosRetoques(error)
  const leida = esquemaDeLaRespuesta.safeParse(data)
  if (!leida.success) return fallo('inesperado', NO_SE_LEYO)
  return ok({
    actualizadoEn: leida.data.actualizado_en,
    retoques: leida.data.retoques,
    repetido: leida.data.repetido,
  })
}
