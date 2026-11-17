'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { guardarLeyendaDeTiposCambio } from '../actions/guardar-leyenda'

// Guardar la leyenda. Lo tipeado queda siempre; con `ok`, la revalidación trae la fila nueva y el formulario vuelve a montarse (su `key` es la versión).
export function useGuardarLeyenda(actualizadoEn: string) {
  const { executeAsync, result, isPending } = useAction(guardarLeyendaDeTiposCambio)

  async function guardar(leyenda: string): Promise<boolean> {
    const resultado = resultadoDeAccion(
      await conRed(executeAsync({ leyenda, actualizadoEnEsperado: actualizadoEn })),
    )
    if (!resultado.ok) {
      // Un error de validación ya está escrito junto al campo.
      if (resultado.error.codigo !== 'validacion') {
        avisarError(resultado.error)
      }
      return false
    }
    avisarExito(leyenda.trim() === '' ? 'Leyenda quitada' : 'Leyenda guardada')
    return true
  }

  return { guardar, enCurso: isPending, errores: result.validationErrors?.fieldErrors }
}
