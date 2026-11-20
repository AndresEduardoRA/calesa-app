'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { guardarWebPublica } from '../actions/guardar-web-publica'
import { probarWebPublica } from '../actions/probar-web-publica'

// El interruptor de la web pública (guarda al instante) y «Probar», que no escribe: su resultado lo dibuja la tarjeta. `version` es el
// `actualizado_en` de su fila; la dirección y el secreto se editan en sus modales.
export function useWebPublica(version: string) {
  const guardando = useAction(guardarWebPublica)
  const probando = useAction(probarWebPublica)

  return {
    cambiarEstado: async (activa: boolean) => {
      const resultado = resultadoDeAccion(
        await conRed(guardando.executeAsync({ actualizadoEnEsperado: version, activa })),
      )
      if (resultado.ok) {
        avisarExito(activa ? 'Web pública activada' : 'Web pública desactivada')
      } else {
        avisarError(resultado.error)
      }
    },
    probar: async () => resultadoDeAccion(await conRed(probando.executeAsync())),
    enCurso: guardando.isPending,
    probando: probando.isPending,
  }
}

export type EdicionesDeWebPublica = ReturnType<typeof useWebPublica>
