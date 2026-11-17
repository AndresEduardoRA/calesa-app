'use client'

import { useEffect, useRef, useState } from 'react'

const REM_POR_DEFECTO = 16

// Cuántos px mide 1 rem ahora (con el texto al 200 %, el doble). Se mide en un elemento de 1 rem de ancho y se vuelve a medir si cambia.
export function useRem() {
  const ref = useRef<HTMLSpanElement>(null)
  const [rem, setRem] = useState(REM_POR_DEFECTO)
  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const medir = () => {
      const ancho = elemento.getBoundingClientRect().width
      if (ancho > 0) setRem(ancho)
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(elemento)
    return () => {
      observador.disconnect()
    }
  }, [])
  return { ref, rem }
}
