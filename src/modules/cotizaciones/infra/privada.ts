import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { CambiadorDePrivada } from '../entities/privada'

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

const esquemaDeLaRespuesta = z.object({
  resultado: z.enum(['cambiada', 'sin_cambios']),
  privada: z.boolean(),
  actualizado_en: z.string().min(1),
})

// Hacerla privada o pública se escribe sólo por RPC (`cotizacion_privada_cambiar`): lo que la base rechaza (sin acceso, no la creó, una final, la aprobada, la versión)
// vuelve como error con el mensaje ya escrito para la persona.
export const cambiarPrivada: CambiadorDePrivada = async ({ id, privada, actualizadoEn }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cotizacion_privada_cambiar', {
    p_cotizacion: id,
    p_privada: privada,
    p_actualizado_en_esperado: actualizadoEn,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leida = esquemaDeLaRespuesta.safeParse(data)
  return leida.success
    ? ok({
        cambiada: leida.data.resultado === 'cambiada',
        privada: leida.data.privada,
        actualizadoEn: leida.data.actualizado_en,
      })
    : fallo('inesperado', NO_SE_LEYO)
}
