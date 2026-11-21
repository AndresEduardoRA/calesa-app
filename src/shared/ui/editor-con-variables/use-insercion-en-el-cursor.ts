'use client'

import { useLayoutEffect, useRef } from 'react'
import { insertarEnElCursor } from '@/shared/lib/texto-con-variables'

// La inserción de un botón de variable en una `<textarea>` controlada. Guarda la selección de la última vez que la caja la tuvo (un botón la
// usa cuando el foco ya se fue) y, tras insertar, cuando el valor nuevo ya está en la caja, devuelve el foco con el cursor detrás de lo escrito.
export function useInsercionEnElCursor(valor: string, alCambiar: (texto: string) => void) {
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const seleccion = useRef({ inicio: valor.length, fin: valor.length })
  const cursorPendiente = useRef<number | null>(null)

  useLayoutEffect(() => {
    const cursor = cursorPendiente.current
    const area = areaRef.current
    if (cursor === null || area === null) {
      return
    }
    cursorPendiente.current = null
    area.focus()
    area.setSelectionRange(cursor, cursor)
    seleccion.current = { inicio: cursor, fin: cursor }
  }, [valor])

  return {
    areaRef,
    guardarSeleccion: () => {
      const area = areaRef.current
      if (area) {
        seleccion.current = { inicio: area.selectionStart, fin: area.selectionEnd }
      }
    },
    insertar: (clave: string) => {
      const { inicio, fin } = seleccion.current
      const dentro = insertarEnElCursor(valor, inicio, fin, `{${clave}}`)
      cursorPendiente.current = dentro.cursor
      alCambiar(dentro.texto)
    },
  }
}
