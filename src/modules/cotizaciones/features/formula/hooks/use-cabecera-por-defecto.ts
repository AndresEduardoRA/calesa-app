'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fallo, type Resultado } from '@/shared/lib/errores'
import {
  leerCabeceraPublicada,
  type CabeceraPublicada,
} from '../../../areas/formula/composicion.client'

export const MENSAJE_SIN_LEER_LA_CABECERA = 'No pudimos leer la configuración por defecto.'
export const MENSAJE_SIN_PUBLICADA =
  'Este origen no tiene una fórmula publicada: no hay configuración por defecto que cambiar.'

export type EstadoDeLaCabeceraPorDefecto =
  | { tipo: 'leyendo' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'sin_publicada'; mensaje: string }
  | ({ tipo: 'listo' } & CabeceraPublicada)

function estadoDesde(resultado: Resultado<CabeceraPublicada | null>): EstadoDeLaCabeceraPorDefecto {
  if (!resultado.ok) {
    return { tipo: 'error', mensaje: MENSAJE_SIN_LEER_LA_CABECERA }
  }
  return resultado.data === null
    ? { tipo: 'sin_publicada', mensaje: MENSAJE_SIN_PUBLICADA }
    : { tipo: 'listo', ...resultado.data }
}

// La cabecera de la publicada (el ⚙ de la cabecera; lo monta el panel al abrirse): una lectura al montarse y otra con `releer` («Reintentar», «Volver a leer» tras un
// PT409). Sólo la respuesta del último pedido cambia el estado, como `useValorPorDefecto()`.
export function useCabeceraPorDefecto(origenId: string) {
  const [estado, setEstado] = useState<EstadoDeLaCabeceraPorDefecto>({ tipo: 'leyendo' })
  const ultimo = useRef(0)

  const pedir = useCallback(() => {
    ultimo.current += 1
    const pedido = ultimo.current
    leerCabeceraPublicada(origenId)
      .catch((): Resultado<CabeceraPublicada | null> =>
        fallo('inesperado', MENSAJE_SIN_LEER_LA_CABECERA),
      )
      .then((resultado) => {
        if (pedido === ultimo.current) {
          setEstado(estadoDesde(resultado))
        }
      })
      .catch(() => undefined)
  }, [origenId])

  useEffect(() => {
    pedir()
    return () => {
      ultimo.current += 1
    }
  }, [pedir])

  return {
    estado,
    releer: () => {
      setEstado({ tipo: 'leyendo' })
      pedir()
    },
  }
}
