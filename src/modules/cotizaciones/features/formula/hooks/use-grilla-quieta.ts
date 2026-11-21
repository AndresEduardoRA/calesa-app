'use client'

import { useLayoutEffect, useRef } from 'react'

// Lo que cambia de alto arriba de la grilla (la barra de fórmula: lo de debajo, el error, la leyenda) no la corre: la página se desplaza lo mismo, así la celda
// bajo el puntero sigue ahí (el segundo clic de un doble clic cae en la celda que eligió el primero). Mide en cada dibujo, antes de pintar. Devuelve el ref de lo que
// cambia de alto.
export function useGrillaQuieta() {
  const ref = useRef<HTMLElement>(null)
  const alto = useRef<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (el === null) return
    const ahora = el.offsetHeight
    const antes = alto.current
    alto.current = ahora
    if (antes !== null && ahora !== antes) window.scrollBy(0, ahora - antes)
  })
  return ref
}
