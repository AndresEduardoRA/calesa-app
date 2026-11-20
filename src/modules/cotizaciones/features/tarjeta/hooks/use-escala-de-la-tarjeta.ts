'use client'

import { useLayoutEffect, useRef, useState } from 'react'

// Cuánto se achica la tarjeta para caber en el ancho de su contenedor, como una imagen (D16 de T310): `min(1, ancho del contenedor / ancho de la tarjeta)`;
// nunca agranda. Lo mide un `ResizeObserver` (el modal a pantalla completa en el celular, la columna de Configuración): la página nunca se desplaza de costado.
// `reservado`: los px del contenedor que no son de la tarjeta (el margen de la capa del lienzo del editor de la plantilla).
// El nodo medido no se desplaza ni depende de lo que lleva adentro: si lo que dibuja puede desbordar (una barra que aparece le resta ancho), se mide su
// contenedor con `contain: inline-size`; si no, la barra cambia el ancho, la escala, el alto y otra vez la barra, en un ciclo de pocos píxeles. El ancho se
// redondea hacia abajo: con fracciones, la tarjeta queda una fracción más ancha que su lugar, y el mismo entero no vuelve a dibujar.
export function useEscalaDeLaTarjeta(ancho: number, reservado = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  useLayoutEffect(() => {
    const nodo = ref.current
    if (nodo === null || ancho <= 0) return
    const medir = (disponible: number) => {
      setEscala(Math.max(0, Math.min(1, (Math.floor(disponible) - reservado) / ancho)))
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
  }, [ancho, reservado])
  return { ref, escala }
}
