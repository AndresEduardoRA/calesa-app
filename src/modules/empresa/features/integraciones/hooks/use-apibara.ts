'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { guardarApibara } from '../actions/guardar-apibara'

// El interruptor de apibara, que guarda al instante. `version` es el `actualizado_en` de su fila; la dirección, las plataformas y la clave
// se editan en sus modales.
export function useApibara(version: string) {
  const guardando = useAction(guardarApibara)
  return {
    cambiarEstado: async (activa: boolean) => {
      const resultado = resultadoDeAccion(
        await conRed(guardando.executeAsync({ actualizadoEnEsperado: version, activa })),
      )
      if (resultado.ok) {
        avisarExito(activa ? 'apibara activada' : 'apibara desactivada')
      } else {
        avisarError(resultado.error)
      }
    },
    enCurso: guardando.isPending,
  }
}
