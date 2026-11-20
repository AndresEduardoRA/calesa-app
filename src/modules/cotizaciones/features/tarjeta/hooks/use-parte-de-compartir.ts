'use client'

import { useEffect, useRef, useState } from 'react'
import { MENSAJE_INESPERADO, type ErrorApp, type Resultado } from '@/shared/lib/errores'

export type ParteDeCompartir<T> =
  | { estado: 'quieta' }
  | { estado: 'leyendo' }
  | { estado: 'listo'; dato: T }
  | { estado: 'error'; error: ErrorApp }

type Guardada<T> = { pedido: string; parte: ParteDeCompartir<T> }

const INESPERADO = { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO } as const

// Una parte de lo que se comparte (los datos, la imagen de la tarjeta, la lista de fotos): se lee una vez por `clave` (nula: todavía no, `quieta`) y otra con `reintentar()`. Lo que
// llega tarde se descarta (el pedido se corta) y lo que ocupa memoria (una URL de un blob) se suelta con `liberar` al cambiar o al desmontarse. `leer` y `liberar` se
// toman del último render: lo que decide cuándo se vuelve a leer es el pedido.
export function useParteDeCompartir<T>(
  leer: (senal: AbortSignal) => Promise<Resultado<T>>,
  clave: string | null,
  liberar?: (dato: T) => void,
) {
  const [guardada, setGuardada] = useState<Guardada<T> | null>(null)
  const [intento, setIntento] = useState(0)
  const pedido = clave === null ? null : `${clave}:${String(intento)}`
  const funciones = useRef({ leer, liberar })
  useEffect(() => {
    funciones.current = { leer, liberar }
  })

  useEffect(() => {
    if (pedido === null) {
      return
    }
    const control = new AbortController()
    let soltar: (() => void) | null = null
    const { leer: leerAhora, liberar: liberarDespues } = funciones.current
    void leerAhora(control.signal)
      .catch((): Resultado<T> => ({ ok: false, error: INESPERADO }))
      .then((resultado) => {
        if (control.signal.aborted) {
          if (resultado.ok) liberarDespues?.(resultado.data)
          return
        }
        if (resultado.ok) {
          soltar = () => liberarDespues?.(resultado.data)
        }
        setGuardada({
          pedido,
          parte: resultado.ok
            ? { estado: 'listo', dato: resultado.data }
            : { estado: 'error', error: resultado.error },
        })
      })
    return () => {
      control.abort()
      soltar?.()
    }
  }, [pedido])

  const parte: ParteDeCompartir<T> =
    pedido === null
      ? { estado: 'quieta' }
      : guardada?.pedido === pedido
        ? guardada.parte
        : { estado: 'leyendo' }
  return {
    parte,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
