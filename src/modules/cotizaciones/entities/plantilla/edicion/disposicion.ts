// Dónde va cada cosa de la capa del editor sobre la tarjeta dibujada, en px de la tarjeta (sin escalar): la `x` de cada columna sale de los anchos de la plantilla y
// la `y` de cada fila, de las que la geometría dibuja (así no se repite la regla de qué fila se oculta). Cada celda va en la primera de sus filas que se dibuja, con
// el alto de las que se dibujan; una casilla sin celda es una pieza vacía. Las filas que no se dibujan no tienen piezas. Puro.
import type { CeldaDeLaTarjeta, PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import type { GeometriaParaEditar } from '../../vista-previa-de-la-plantilla'
import { rectDeLaCelda, type MapaDeLaGrilla } from './mapa-de-la-grilla'
import type { Pos, Rect } from './tipos'

export type Caja = {
  readonly x: number
  readonly y: number
  readonly ancho: number
  readonly alto: number
}

export type FilaDibujada = {
  readonly indice: number
  readonly id: string
  readonly y: number
  readonly alto: number
}

export type PiezaDeLaCapa = {
  readonly pos: Pos
  readonly rect: Rect
  // Nula: una casilla sin celda.
  readonly celda: CeldaDeLaTarjeta | null
  readonly caja: Caja
}

export type Disposicion = {
  // El borde izquierdo de cada columna y, al final, el ancho total.
  readonly xs: readonly number[]
  readonly filas: readonly FilaDibujada[]
  // Los índices de las filas que se dibujan, en orden.
  readonly visibles: readonly number[]
  readonly porFila: ReadonlyMap<number, FilaDibujada>
}

export function disposicionDe(
  p: PlantillaEnCuadricula,
  g: GeometriaParaEditar,
  mapa: MapaDeLaGrilla,
): Disposicion {
  const xs = p.columnas.reduce<number[]>(
    (acc, c) => [...acc, (acc[acc.length - 1] ?? 0) + c.ancho],
    [0],
  )
  const filas = g.filas.flatMap((f) => {
    const indice = mapa.indiceDeFila.get(f.id)
    return indice === undefined ? [] : [{ indice, id: f.id, y: f.y, alto: f.alto }]
  })
  return {
    xs,
    filas,
    visibles: filas.map((f) => f.indice),
    porFila: new Map(filas.map((f) => [f.indice, f])),
  }
}

// La caja de un rectángulo: sus columnas y sus filas que se dibujan. Nula si ninguna de sus filas se dibuja.
export function cajaDe(d: Disposicion, r: Rect): Caja | null {
  const filas = d.filas.filter((f) => f.indice >= r.f0 && f.indice <= r.f1)
  const [primera] = filas
  if (primera === undefined) return null
  const x = d.xs[r.k0] ?? 0
  return {
    x,
    y: primera.y,
    ancho: (d.xs[r.k1 + 1] ?? x) - x,
    alto: filas.reduce((s, f) => s + f.alto, 0),
  }
}

// Las casillas sin celda de una fila dibujada.
function vaciasDe(f: FilaDibujada, mapa: MapaDeLaGrilla, d: Disposicion): PiezaDeLaCapa[] {
  const vacias: PiezaDeLaCapa[] = []
  for (let k = 0; k < mapa.columnas; k++) {
    if ((mapa.ocupa[f.indice * mapa.columnas + k] ?? -1) !== -1) continue
    const x = d.xs[k] ?? 0
    vacias.push({
      pos: { f: f.indice, k },
      rect: { f0: f.indice, k0: k, f1: f.indice, k1: k },
      celda: null,
      caja: { x, y: f.y, ancho: (d.xs[k + 1] ?? x) - x, alto: f.alto },
    })
  }
  return vacias
}

// Una celda como pieza, en la primera de sus filas que se dibuja; nula si no se dibuja ninguna.
function piezaDeLaCelda(
  celda: CeldaDeLaTarjeta,
  mapa: MapaDeLaGrilla,
  d: Disposicion,
): { fila: number; pieza: PiezaDeLaCapa } | null {
  const rect = rectDeLaCelda(mapa, celda)
  const caja = rect === null ? null : cajaDe(d, rect)
  if (rect === null || caja === null) return null
  const primera = d.filas.find((f) => f.indice >= rect.f0 && f.indice <= rect.f1)
  return primera === undefined
    ? null
    : { fila: primera.indice, pieza: { pos: { f: rect.f0, k: rect.k0 }, rect, celda, caja } }
}

// Las piezas de la capa por la fila (dibujada) en la que empiezan, en orden de columna.
export function piezasDeLaCapa(
  p: PlantillaEnCuadricula,
  mapa: MapaDeLaGrilla,
  d: Disposicion,
): ReadonlyMap<number, PiezaDeLaCapa[]> {
  const porFila = new Map<number, PiezaDeLaCapa[]>(
    d.filas.map((f) => [f.indice, vaciasDe(f, mapa, d)]),
  )
  for (const celda of p.celdas) {
    const ubicada = piezaDeLaCelda(celda, mapa, d)
    if (ubicada !== null) porFila.get(ubicada.fila)?.push(ubicada.pieza)
  }
  for (const lista of porFila.values()) lista.sort((a, b) => a.pos.k - b.pos.k)
  return porFila
}

// La casilla de lo dibujado bajo un punto de la tarjeta (px sin escalar), o nula fuera.
export function casillaEnElPunto(d: Disposicion, x: number, y: number): Pos | null {
  const fila = d.filas.find((f) => y >= f.y && y < f.y + f.alto)
  const k = d.xs.findIndex(
    (borde, i) => i < d.xs.length - 1 && x >= borde && x < (d.xs[i + 1] ?? borde),
  )
  return fila === undefined || k < 0 ? null : { f: fila.indice, k }
}

// El espacio de la capa alrededor de la tarjeta, en px sin escalar: arriba las cabeceras de columna, a la izquierda las asas de fila.
export const MARGEN_DEL_LIENZO = { arriba: 40, izquierda: 44 } as const

// Una caja de la tarjeta llevada a la capa: escalada y con el margen de las cabeceras y las asas.
export const enLaCapa = (c: Caja, escala: number): Caja => ({
  x: MARGEN_DEL_LIENZO.izquierda + c.x * escala,
  y: MARGEN_DEL_LIENZO.arriba + c.y * escala,
  ancho: c.ancho * escala,
  alto: c.alto * escala,
})
