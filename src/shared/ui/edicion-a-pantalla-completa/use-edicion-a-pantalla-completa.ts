'use client'

import { useEffect, useRef } from 'react'
import type { EstadoDeLaEdicion } from '@/shared/lib/edicion'
import { useContextoDeLaEdicion } from './contexto'

type Args = {
  estado: EstadoDeLaEdicion
  // Lo que se ve en el editor no es lo guardado: «Salir» pregunta antes de tirarlo.
  hayCambios: boolean
  // Lo que se hace al descartar al salir (el borrador de la pestaña, lo escrito).
  alDescartar: () => void
}

const claveDelEstado = (estado: EstadoDeLaEdicion): string => (estado ? JSON.stringify(estado) : '')

// El editor le dice a la barra de la edición su estado y sus cambios sin guardar. Fuera del modo no hace nada.
export function useEdicionAPantallaCompleta({ estado, hayCambios, alDescartar }: Args): void {
  const contexto = useContextoDeLaEdicion()
  const registrar = contexto?.registrar
  const descartar = useRef(alDescartar)
  const ultimo = useRef(estado)
  useEffect(() => {
    descartar.current = alDescartar
    ultimo.current = estado
  })
  const clave = claveDelEstado(estado)
  useEffect(() => {
    registrar?.({
      estado: ultimo.current,
      hayCambios,
      alDescartar: () => {
        descartar.current()
      },
    })
    return () => {
      registrar?.(null)
    }
  }, [registrar, hayCambios, clave])
}
