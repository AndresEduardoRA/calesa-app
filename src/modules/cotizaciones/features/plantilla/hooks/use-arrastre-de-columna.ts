'use client'

import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { ANCHO_DE_COLUMNA, ANCHO_TOTAL_MAXIMO } from '../../../entities/cuadricula-de-la-tarjeta'

type Args = {
  ancho: number
  // La suma de los anchos de las demás columnas: el ancho de ésta no lleva el total más allá de 1.600 px.
  resto: number
  escala: number
  // Mientras se arrastra, el ancho se ve sin ser un paso; al soltar, un paso.
  alProvisional: (ancho: number | null) => void
  alCambiar: (ancho: number, clave?: string) => void
  // ↓ o Esc devuelven el foco a la grilla.
  alVolver: () => void
  clave: string
}

const limitar = (n: number, max: number) =>
  Math.max(ANCHO_DE_COLUMNA.minimo, Math.min(Math.round(n), max))

// El borde de una cabecera de columna: se arrastra con el puntero (el movimiento se divide por la escala del lienzo) y es un paso al soltar; con el teclado, ← y → cambian
// 1 px y con Shift 10 px (se juntan en un paso por columna hasta que cambia la selección).
export function useArrastreDeColumna({
  ancho,
  resto,
  escala,
  alProvisional,
  alCambiar,
  alVolver,
  clave,
}: Args) {
  const inicio = useRef<{ x: number; ancho: number; escala: number; ultimo: number } | null>(null)
  const maximo = Math.min(ANCHO_DE_COLUMNA.maximo, ANCHO_TOTAL_MAXIMO - resto)
  return {
    maximo,
    alBajar: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      inicio.current = { x: e.clientX, ancho, escala, ultimo: ancho }
    },
    alMover: (e: PointerEvent<HTMLElement>) => {
      const i = inicio.current
      if (i === null) return
      const nuevo = limitar(i.ancho + (e.clientX - i.x) / (i.escala || 1), maximo)
      if (nuevo === i.ultimo) return
      inicio.current = { ...i, ultimo: nuevo }
      alProvisional(nuevo)
    },
    alSubir: (e: PointerEvent<HTMLElement>) => {
      const i = inicio.current
      if (i === null) return
      inicio.current = null
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId)
      alProvisional(null)
      if (i.ultimo !== i.ancho) alCambiar(i.ultimo)
    },
    alTeclear: (e: KeyboardEvent<HTMLElement>) => {
      const paso = e.shiftKey ? 10 : 1
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const nuevo = limitar(ancho + (e.key === 'ArrowRight' ? paso : -paso), maximo)
        if (nuevo !== ancho) alCambiar(nuevo, clave)
      } else if (e.key === 'ArrowDown' || e.key === 'Escape') {
        alVolver()
      } else return
      e.preventDefault()
      e.stopPropagation()
    },
  }
}
