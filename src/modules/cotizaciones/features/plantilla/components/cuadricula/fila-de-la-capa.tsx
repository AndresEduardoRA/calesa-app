'use client'

import { memo } from 'react'
import {
  MARGEN_DEL_LIENZO,
  type FilaDibujada,
  type PiezaDeLaCapa,
} from '../../../../entities/plantilla/edicion/disposicion'
import { seCruzan } from '../../../../entities/plantilla/edicion/mapa-de-la-grilla'
import type { Rect } from '../../../../entities/plantilla/edicion/tipos'
import { AsaDeLaFila } from './asas-de-fila'

type Props = {
  fila: FilaDibujada
  piezas: readonly PiezaDeLaCapa[]
  escala: number
  rango: Rect | null
  // El id de la celda de una casilla (para `aria-activedescendant`).
  idDe: (f: number, k: number) => string
  nombreDe: (pieza: PiezaDeLaCapa) => string | undefined
  ocupado: boolean
  filaElegida: boolean
  alElegirLaFila: (fila: number, extender: boolean) => void
  alVolver: () => void
}

// Una fila de la grilla del lienzo (`role="row"`, con su índice real: las ocultas dejan huecos): su asa (`rowheader`) y una celda por pieza (`gridcell`, transparente:
// lo que se ve es la tarjeta de abajo). Una casilla vacía es un solo `div` sin hijos.
export const FilaDeLaCapa = memo(function FilaDeLaCapa(props: Props) {
  const { fila, piezas, escala, rango } = props
  return (
    <div
      role="row"
      aria-rowindex={fila.indice + 2}
      className="pointer-events-none absolute inset-x-0"
      style={{ top: MARGEN_DEL_LIENZO.arriba + fila.y * escala, height: fila.alto * escala }}
      data-fila-del-lienzo={fila.id}
    >
      <AsaDeLaFila
        id={fila.id}
        numero={fila.indice + 1}
        alto={fila.alto * escala}
        ocupado={props.ocupado}
        elegida={props.filaElegida}
        alElegir={(extender) => {
          props.alElegirLaFila(fila.indice, extender)
        }}
        alVolver={props.alVolver}
      />
      {piezas.map((p) => {
        const filas = p.rect.f1 - p.rect.f0 + 1
        const columnas = p.rect.k1 - p.rect.k0 + 1
        return (
          <div
            key={`${String(p.pos.f)}:${String(p.pos.k)}`}
            role="gridcell"
            id={props.idDe(p.pos.f, p.pos.k)}
            aria-colindex={p.pos.k + 2}
            aria-colspan={columnas > 1 ? columnas : undefined}
            aria-rowspan={filas > 1 ? filas : undefined}
            aria-selected={rango !== null && seCruzan(rango, p.rect)}
            aria-label={props.nombreDe(p)}
            data-pos={`${String(p.pos.f)}:${String(p.pos.k)}`}
            className="pointer-events-auto absolute top-0 hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-(--color-primario)/60"
            style={{
              left: MARGEN_DEL_LIENZO.izquierda + p.caja.x * escala,
              width: p.caja.ancho * escala,
              height: p.caja.alto * escala,
            }}
          />
        )
      })}
    </div>
  )
})
