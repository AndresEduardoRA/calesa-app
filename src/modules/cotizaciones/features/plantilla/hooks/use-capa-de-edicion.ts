'use client'

import { useId, useMemo } from 'react'
import type { PlantillaEnCuadricula } from '../../../entities/cuadricula-de-la-tarjeta'
import {
  cajaDe,
  disposicionDe,
  enLaCapa,
  piezasDeLaCapa,
} from '../../../entities/plantilla/edicion/disposicion'
import { anclaEn, rectEn } from '../../../entities/plantilla/edicion/mapa-de-la-grilla'
import { casillaActiva, rangoDe } from '../../../entities/plantilla/edicion/seleccion'
import type { Pos } from '../../../entities/plantilla/edicion/tipos'
import type { GeometriaParaEditar } from '../../../entities/vista-previa-de-la-plantilla'
import type { EditorDeLaCuadricula } from './use-editor-de-la-cuadricula'

// Lo que la capa del editor deriva de la geometría y del estado: dónde va cada fila, columna y celda (`disposicion.ts`), la casilla del cursor, el rango elegido y sus
// cajas en la capa (escaladas y con el margen), y el id de cada celda para `aria-activedescendant`.
export function useCapaDeEdicion(
  editor: EditorDeLaCuadricula,
  plantilla: PlantillaEnCuadricula,
  g: GeometriaParaEditar,
  escala: number,
) {
  const { estado, mapa } = editor
  const base = useId()
  const d = useMemo(() => disposicionDe(plantilla, g, mapa), [plantilla, g, mapa])
  const piezas = useMemo(() => piezasDeLaCapa(plantilla, mapa, d), [plantilla, mapa, d])
  const sel = estado.seleccion
  const activa = anclaEn(mapa, plantilla, casillaActiva(sel, d.visibles))
  const rango = sel === null ? null : rangoDe(sel, mapa, plantilla)
  const cajaActiva = cajaDe(d, rectEn(mapa, plantilla, activa))
  const cajaDelRango = rango === null ? null : cajaDe(d, rango)
  const escritura = estado.escribiendo
  const cajaDeLaEscritura =
    escritura === null ? null : cajaDe(d, rectEn(mapa, plantilla, escritura.pos))
  const enCapa = (c: ReturnType<typeof cajaDe>) => (c === null ? null : enLaCapa(c, escala))
  return {
    d,
    piezas,
    activa,
    rango,
    cajaActiva: enCapa(cajaActiva),
    cajaDelRango: enCapa(cajaDelRango),
    cajaDeLaEscritura: enCapa(cajaDeLaEscritura),
    idDe: (f: number, k: number) => `${base}-${String(f)}-${String(k)}`,
    piezaEn: (pos: Pos) =>
      (piezas.get(pos.f) ?? []).find((p) => p.pos.f === pos.f && p.pos.k === pos.k) ?? null,
  }
}

export type CapaCalculada = ReturnType<typeof useCapaDeEdicion>
