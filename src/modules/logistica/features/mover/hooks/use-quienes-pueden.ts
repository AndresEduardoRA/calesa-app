'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import type { PersonasEncontradas } from '@/modules/agenda/client'
import type { ClaveQueSePide } from '../../../entities/mover/pedido-de-requisito'
import { NO_SE_LEYO_QUIEN } from '../../../entities/mover/textos'
import { leerQuienesPueden } from '../actions/leer-quienes-pueden'

export type LecturaDeQuienes =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | ({ tipo: 'listo'; buscado: string } & PersonasEncontradas)

// Menos de 3 letras no se busca: la lista de todos (hasta 20).
const MINIMO = 3
const ESPERA_MS = 300

// Quién puede hacer lo que falta, leído al abrir (hasta 20) y, si hay más, buscado por nombre desde 3 letras con 300 ms de espera. Una respuesta vieja se
// descarta (gana el último pedido).
export function useQuienesPueden(vehiculoId: string, clave: ClaveQueSePide) {
  const [lectura, setLectura] = useState<LecturaDeQuienes>({ tipo: 'cargando' })
  const [texto, setTexto] = useState('')
  const [buscado, setBuscado] = useState('')
  const pedido = useRef(0)

  const leer = useCallback(
    async (busqueda: string) => {
      pedido.current += 1
      const mio = pedido.current
      const envio = await enviarAccion<PersonasEncontradas>(
        leerQuienesPueden({ vehiculoId, clave, ...(busqueda ? { texto: busqueda } : {}) }),
        NO_SE_LEYO_QUIEN,
      )
      if (mio !== pedido.current) return
      setLectura(
        envio.ok
          ? { tipo: 'listo', buscado: busqueda, ...envio.data }
          : { tipo: 'error', error: envio.error },
      )
    },
    [vehiculoId, clave],
  )

  useEffect(() => {
    void leer(buscado)
    return () => {
      pedido.current += 1
    }
  }, [leer, buscado])

  useEffect(() => {
    const limpio = texto.trim()
    const siguiente = [...limpio].length >= MINIMO ? limpio : ''
    const espera = setTimeout(() => {
      setBuscado(siguiente)
    }, ESPERA_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [texto])

  return {
    lectura,
    texto,
    buscar: setTexto,
    releer: () => {
      setLectura({ tipo: 'cargando' })
      void leer(buscado)
    },
  }
}
