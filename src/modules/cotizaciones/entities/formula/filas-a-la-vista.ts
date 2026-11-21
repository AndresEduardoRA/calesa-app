// Las filas de la planilla que se dibujan (D del cambio de la planilla y `.claude/rules/escala.md`): las que tienen lo buscado en el concepto (sin distinguir
// mayúsculas ni tildes), hasta el tope; la fila en edición o la activa se dibujan siempre, en su lugar. Cada fila conserva su número: buscar no renumera. Y las
// tramos de filas seguidas con la misma banda. Puro, O(filas).
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { FilaDeLaHoja, HojaDeLaPlanilla } from './hoja-de-la-planilla'

export type FilasALaVista = {
  readonly filas: readonly FilaDeLaHoja[]
  readonly hayMas: boolean
  readonly sinCoincidencias: boolean
}

const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function filasALaVista(
  hoja: HojaDeLaPlanilla,
  busqueda: string,
  siempre: string | null,
  tope: number = TOPE_DE_LO_CARGADO,
): FilasALaVista {
  const buscada = normal(busqueda.trim())
  const encontradas =
    buscada === ''
      ? hoja.filas
      : hoja.filas.filter((f) => normal(f.nodo.etiqueta).includes(buscada))
  const cortadas = encontradas.slice(0, tope)
  const fuera =
    siempre !== null && !cortadas.some((f) => f.id === siempre)
      ? hoja.filas.find((f) => f.id === siempre)
      : undefined
  return {
    filas:
      fuera === undefined ? cortadas : [...cortadas, fuera].sort((a, b) => a.numero - b.numero),
    hayMas: encontradas.length > tope,
    sinCoincidencias: encontradas.length === 0,
  }
}

// Las filas a la vista en tramos: filas seguidas con la misma banda (una búsqueda junta las que quedan a la vista). Un tramo con banda lleva su cabecera; los grupos
// sin filas van al final, sólo con su cabecera, para arreglarlos (no al buscar).
export type TramoALaVista = {
  readonly grupo: string | null
  readonly filas: readonly FilaDeLaHoja[]
}

export function tramosALaVista(
  filas: readonly FilaDeLaHoja[],
  gruposSinFilas: readonly string[] = [],
): TramoALaVista[] {
  const tramos: { grupo: string | null; filas: FilaDeLaHoja[] }[] = []
  for (const fila of filas) {
    const ultimo = tramos[tramos.length - 1]
    if (ultimo?.grupo === fila.grupo) ultimo.filas.push(fila)
    else tramos.push({ grupo: fila.grupo, filas: [fila] })
  }
  return [...tramos, ...gruposSinFilas.map((grupo) => ({ grupo, filas: [] }))]
}
