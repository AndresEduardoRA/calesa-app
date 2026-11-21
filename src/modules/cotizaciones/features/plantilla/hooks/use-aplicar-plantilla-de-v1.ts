'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'
import type { BorradoresDelOrigen } from '../../../entities/plantillas-de-v1/pregunta'
import type { ClaveDePlantillaDeV1 } from '../../../entities/plantillas-de-v1/claves'
import { aplicarLaPlantillaDeV1 } from '../actions/aplicar-plantilla-de-v1'

// Lo que pasó al aplicar, para el modal: sin red se reintenta tal cual (todo o nada, y los colores con el id del intento); un PT409 pide «Recargar» (las versiones de
// los borradores cambiaron); lo demás se dice como viene.
export type RechazoDeAplicar =
  | { tipo: 'sin_red'; mensaje: string }
  | { tipo: 'conflicto'; mensaje: string }
  | { tipo: 'otro'; mensaje: string }

const NO_SE_LEYO = 'No se pudo aplicar la plantilla.'

export function useAplicarPlantillaDeV1(
  origenId: string,
  formulaDelOrigenId: string,
  alAplicar: () => void,
) {
  const accion = useAction(aplicarLaPlantillaDeV1)
  const [rechazo, setRechazo] = useState<RechazoDeAplicar | null>(null)
  const aplicar = async (clave: ClaveDePlantillaDeV1, borradores: BorradoresDelOrigen) => {
    setRechazo(null)
    const r = await enviarAccion(
      accion.executeAsync({
        origenId,
        formulaDelOrigenId,
        plantilla: clave,
        formulaEsperada: borradores.formula?.actualizadoEn ?? null,
        plantillaEsperada: borradores.tarjeta?.actualizadoEn ?? null,
      }),
      NO_SE_LEYO,
    )
    if (r.ok) {
      alAplicar()
      return
    }
    setRechazo(
      'sinRed' in r
        ? { tipo: 'sin_red', mensaje: MENSAJE_SIN_CONEXION }
        : { tipo: r.error.codigo === 'conflicto' ? 'conflicto' : 'otro', mensaje: r.error.mensaje },
    )
  }
  return { aplicar, enviando: accion.isPending, rechazo, olvidar: () => setRechazo(null) }
}
