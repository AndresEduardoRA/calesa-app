'use client'

import { useLayoutEffect, useRef, useState } from 'react'

// Cuánto se achica la tarjeta para caber en el ancho de su contenedor, como una imagen (D16 de T310): `min(1, ancho del contenedor / ancho de la tarjeta)`;
// nunca agranda. Lo mide un `ResizeObserver` (el modal a pantalla completa en el celular, la columna de Configuración): la página nunca se desplaza de costado.
export function useEscalaDeLaTarjeta(ancho: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  useLayoutEffect(() => {
    const nodo = ref.current
    if (nodo === null || ancho <= 0) return
    const medir = (disponible: number) => {
      setEscala(Math.min(1, disponible / ancho))
    }
    medir(nodo.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(([entrada]) => {
      if (entrada !== undefined) medir(entrada.contentRect.width)
    })
    observador.observe(nodo)
    return () => {
      observador.disconnect()
    }
  }, [ancho])
  return { ref, escala }
}
