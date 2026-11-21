import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { resultadoDeAprobar } from '../../entities/aprobada/lectura'
import { CAUSA_PRIVADA } from '../../entities/privada'
import type { RepositorioDeAprobada } from '../../entities/aprobada/repositorio'

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

// Aprobar se escribe sólo por RPC (`cotizacion_aprobar`): lo que la base rechaza (sin acceso, sin permiso, sin vehículo, inválida, la versión) vuelve como error con el
// mensaje ya escrito para la persona. Una privada sin `p_hacerla_publica` vuelve con la causa `CAUSA_PRIVADA` (22023, `hint privada`): la pantalla pregunta.
export const aprobadaSupabase: RepositorioDeAprobada = {
  aprobar: async (cotizacionId, actualizadoEn, hacerlaPublica) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizacion_aprobar', {
      p_cotizacion: cotizacionId,
      p_actualizado_en_esperado: actualizadoEn,
      ...(hacerlaPublica ? { p_hacerla_publica: true } : {}),
    })
    if (error) {
      const privada = error.code === '22023' && error.hint === CAUSA_PRIVADA
      return {
        ok: false,
        error: privada
          ? { ...errorDePostgrest(error), causa: CAUSA_PRIVADA }
          : errorDePostgrest(error),
      }
    }
    const leido = resultadoDeAprobar(data)
    return leido ? ok(leido) : fallo('inesperado', NO_SE_LEYO)
  },
}
