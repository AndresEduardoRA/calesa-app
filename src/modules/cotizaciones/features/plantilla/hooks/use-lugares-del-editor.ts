'use client'

import { useEffect, useMemo, type RefObject } from 'react'
import {
  nombreDeLaVariable,
  nombreDeMostrar,
} from '../../../entities/plantilla/edicion/datos-para-elegir'
import type { PiezaDeLaCapa } from '../../../entities/plantilla/edicion/disposicion'
import { seleccionDelDonde } from '../../../entities/plantilla/edicion/donde'
import { nombreDelContenido } from '../../../entities/plantilla/edicion/ruta-de-la-seleccion'
import type { ContextoDePlantilla } from '../../../entities/plantilla/validar-plantilla'
import type { EditorDeLaCuadricula } from './use-editor-de-la-cuadricula'

// El nombre accesible de cada celda del lienzo (lo que muestra, sin montos): el texto, «Dato: «Remate» · Monto», «Logo». Una casilla vacía no lleva nombre.
export function useNombreDeLaPieza(contexto: ContextoDePlantilla) {
  const etiquetas = useMemo(
    () => new Map((contexto.definicion.nodos ?? []).map((n) => [n.id, n.etiqueta || n.id])),
    [contexto],
  )
  return useMemo(() => {
    const nombres = {
      nodo: (id: string) => etiquetas.get(id) ?? id,
      variable: nombreDeLaVariable,
      mostrar: nombreDeMostrar,
    }
    return (pieza: PiezaDeLaCapa): string | undefined =>
      pieza.celda === null ? undefined : nombreDelContenido(pieza.celda.contenido, nombres)
  }, [etiquetas])
}

// «Ir a la celda» desde un rechazo de publicar (o del guardado): elige ese lugar en el lienzo y le da el foco a la grilla.
export function useIrAlLugar(
  irA: { donde: string; vez: number } | null,
  editor: EditorDeLaCuadricula,
  rejilla: RefObject<HTMLDivElement | null>,
) {
  const { hacer, mapa, plantilla } = editor
  useEffect(() => {
    if (irA === null) return
    const seleccion = seleccionDelDonde(irA.donde, mapa, plantilla)
    if (seleccion === null) return
    hacer({ tipo: 'seleccionar', seleccion })
    requestAnimationFrame(() => rejilla.current?.focus())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [irA?.vez])
}
