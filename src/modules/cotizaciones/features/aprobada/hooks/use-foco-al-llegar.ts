'use client'

import { useEffect } from 'react'

// Si la URL nombra ese ancla (`#id`), le da el foco al montarse y cada vez que el hash cambia: el «Ver» de la línea de la guardada salta al título del bloque
// aunque el navegador no mueva el foco solo. Apagado (`activo` falso), no escucha.
export function useFocoAlLlegar(id: string, activo: boolean): void {
  useEffect(() => {
    if (!activo) {
      return
    }
    const enfocar = () => {
      if (window.location.hash === `#${id}`) {
        document.getElementById(id)?.focus()
      }
    }
    enfocar()
    window.addEventListener('hashchange', enfocar)
    return () => {
      window.removeEventListener('hashchange', enfocar)
    }
  }, [id, activo])
}
