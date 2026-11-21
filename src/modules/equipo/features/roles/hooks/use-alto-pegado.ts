'use client'

import { useEffect, type RefObject } from 'react'

// Publica el alto de un elemento pegajoso como una variable CSS de su contenedor, para que lo que se pega justo debajo
// (el título del módulo) sepa dónde empezar aunque el texto crezca al 200 %.
export function useAltoPegado(ref: RefObject<HTMLElement | null>, variable: string) {
  useEffect(() => {
    const elemento = ref.current
    const destino = elemento?.parentElement
    if (!elemento || !destino) return
    const publicar = () => {
      destino.style.setProperty(variable, `${elemento.getBoundingClientRect().height}px`)
    }
    publicar()
    const observador = new ResizeObserver(publicar)
    observador.observe(elemento)
    return () => {
      observador.disconnect()
      destino.style.removeProperty(variable)
    }
  }, [ref, variable])
}
