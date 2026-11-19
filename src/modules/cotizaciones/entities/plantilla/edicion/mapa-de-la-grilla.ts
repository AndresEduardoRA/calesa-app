// El mapa de la grilla de una plantilla en cuadrícula: el índice de cada fila y columna por su id, y qué celda ocupa cada casilla (la de su ancla o la que la
// combinación cubre). Lo usan todas las operaciones del editor. Puro. Todo lo que se busca por id va con `Map`: `__proto__` y `constructor` son ids válidos.
import type { CeldaDeLaTarjeta, PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import type { Pos, Rect } from './tipos'

export type MapaDeLaGrilla = {
  readonly filas: number
  readonly columnas: number
  readonly indiceDeFila: ReadonlyMap<string, number>
  readonly indiceDeColumna: ReadonlyMap<string, number>
  // Por casilla (`f * columnas + k`), el índice en `celdas` de la celda que la ocupa, o -1. Una celda que nombra una fila o columna que no existe no ocupa nada.
  readonly ocupa: readonly number[]
}

export type CeldaUbicada = {
  readonly celda: CeldaDeLaTarjeta
  // Su índice en `plantilla.celdas`.
  readonly indice: number
  // Las casillas que cubre (su ancla arriba a la izquierda).
  readonly rect: Rect
}

export function mapaDeLaGrilla(p: PlantillaEnCuadricula): MapaDeLaGrilla {
  const filas = p.filas.length
  const columnas = p.columnas.length
  const indiceDeFila = new Map(p.filas.map((f, i) => [f.id, i]))
  const indiceDeColumna = new Map(p.columnas.map((c, i) => [c.id, i]))
  const ocupa = new Array<number>(filas * columnas).fill(-1)
  p.celdas.forEach((c, i) => {
    const f0 = indiceDeFila.get(c.fila)
    const k0 = indiceDeColumna.get(c.columna)
    if (f0 === undefined || k0 === undefined) return
    const f1 = Math.min(filas, f0 + (c.abarca_filas ?? 1))
    const k1 = Math.min(columnas, k0 + (c.abarca_columnas ?? 1))
    for (let f = f0; f < f1; f++) {
      for (let k = k0; k < k1; k++) {
        if (ocupa[f * columnas + k] === -1) ocupa[f * columnas + k] = i
      }
    }
  })
  return { filas, columnas, indiceDeFila, indiceDeColumna, ocupa }
}

// Las casillas que cubre una celda (recortadas al borde de la grilla), o nulo si nombra una fila o columna que no existe.
export function rectDeLaCelda(mapa: MapaDeLaGrilla, c: CeldaDeLaTarjeta): Rect | null {
  const f0 = mapa.indiceDeFila.get(c.fila)
  const k0 = mapa.indiceDeColumna.get(c.columna)
  if (f0 === undefined || k0 === undefined) return null
  return {
    f0,
    k0,
    f1: Math.min(mapa.filas, f0 + (c.abarca_filas ?? 1)) - 1,
    k1: Math.min(mapa.columnas, k0 + (c.abarca_columnas ?? 1)) - 1,
  }
}

export const dentro = (mapa: MapaDeLaGrilla, { f, k }: Pos): boolean =>
  f >= 0 && k >= 0 && f < mapa.filas && k < mapa.columnas

// La celda que ocupa una casilla, con su rectángulo; nula si la casilla está vacía (sin celda) o fuera de la grilla.
export function celdaEn(
  mapa: MapaDeLaGrilla,
  p: PlantillaEnCuadricula,
  pos: Pos,
): CeldaUbicada | null {
  if (!dentro(mapa, pos)) return null
  const indice = mapa.ocupa[pos.f * mapa.columnas + pos.k] ?? -1
  const celda = p.celdas[indice]
  if (indice < 0 || celda === undefined) return null
  const rect = rectDeLaCelda(mapa, celda)
  return rect === null ? null : { celda, indice, rect }
}

// El rectángulo de lo que hay en una casilla: el de su celda, o la casilla sola si está vacía.
export function rectEn(mapa: MapaDeLaGrilla, p: PlantillaEnCuadricula, pos: Pos): Rect {
  return celdaEn(mapa, p, pos)?.rect ?? { f0: pos.f, k0: pos.k, f1: pos.f, k1: pos.k }
}

// El ancla de lo que hay en una casilla: la de su celda, o la casilla misma.
export function anclaEn(mapa: MapaDeLaGrilla, p: PlantillaEnCuadricula, pos: Pos): Pos {
  const r = rectEn(mapa, p, pos)
  return { f: r.f0, k: r.k0 }
}

// Las celdas cuyo ancla cae dentro del rectángulo, en el orden del arreglo.
export function celdasConAnclaEn(
  mapa: MapaDeLaGrilla,
  p: PlantillaEnCuadricula,
  r: Rect,
): CeldaUbicada[] {
  return p.celdas.flatMap((celda, indice) => {
    const rect = rectDeLaCelda(mapa, celda)
    if (rect === null) return []
    const adentro = rect.f0 >= r.f0 && rect.f0 <= r.f1 && rect.k0 >= r.k0 && rect.k0 <= r.k1
    return adentro ? [{ celda, indice, rect }] : []
  })
}

export const posicionesDe = (r: Rect): Pos[] => {
  const todas: Pos[] = []
  for (let f = r.f0; f <= r.f1; f++) for (let k = r.k0; k <= r.k1; k++) todas.push({ f, k })
  return todas
}

export const contiene = (a: Rect, b: Rect): boolean =>
  b.f0 >= a.f0 && b.f1 <= a.f1 && b.k0 >= a.k0 && b.k1 <= a.k1

export const seCruzan = (a: Rect, b: Rect): boolean =>
  a.f0 <= b.f1 && b.f0 <= a.f1 && a.k0 <= b.k1 && b.k0 <= a.k1

export const unir = (a: Rect, b: Rect): Rect => ({
  f0: Math.min(a.f0, b.f0),
  k0: Math.min(a.k0, b.k0),
  f1: Math.max(a.f1, b.f1),
  k1: Math.max(a.k1, b.k1),
})

// El rectángulo agrandado hasta contener entera cada combinación que corta (como Excel: elegir media combinación elige la combinación entera).
export function agrandarHastaLasCombinaciones(
  mapa: MapaDeLaGrilla,
  p: PlantillaEnCuadricula,
  r: Rect,
): Rect {
  let actual = r
  for (;;) {
    let siguiente = actual
    for (const celda of p.celdas) {
      const rc = rectDeLaCelda(mapa, celda)
      if (rc !== null && seCruzan(siguiente, rc) && !contiene(siguiente, rc))
        siguiente = unir(siguiente, rc)
    }
    if (siguiente === actual) return actual
    actual = siguiente
  }
}

// Las combinaciones (celdas de más de una casilla) que el rectángulo corta sin contenerlas enteras.
export function combinacionesCortadas(
  mapa: MapaDeLaGrilla,
  p: PlantillaEnCuadricula,
  r: Rect,
): CeldaUbicada[] {
  return p.celdas.flatMap((celda, indice) => {
    const rect = rectDeLaCelda(mapa, celda)
    if (rect === null || !seCruzan(r, rect) || contiene(r, rect)) return []
    return [{ celda, indice, rect }]
  })
}
