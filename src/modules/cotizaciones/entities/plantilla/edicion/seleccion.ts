// La selección del editor de la tarjeta, como en Excel: una celda o un rango de celdas (el ancla, donde empezó, y el foco, donde está el cursor), o filas o columnas
// enteras. Se guarda por índices; las operaciones que cambian la grilla devuelven la selección nueva. Un rango que corta una combinación se agranda hasta
// contenerla. Las filas que no se dibujan con la referencia (ocultas) no reciben el foco con las flechas. Puro.
import type { PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import {
  agrandarHastaLasCombinaciones,
  anclaEn,
  rectEn,
  type MapaDeLaGrilla,
} from './mapa-de-la-grilla'
import type { Pos, Rect } from './tipos'

export type Seleccion =
  | { readonly tipo: 'celdas'; readonly ancla: Pos; readonly foco: Pos }
  | { readonly tipo: 'filas'; readonly desde: number; readonly hasta: number }
  | { readonly tipo: 'columnas'; readonly desde: number; readonly hasta: number }

export type Direccion =
  | 'arriba'
  | 'abajo'
  | 'izquierda'
  | 'derecha'
  // Home y End: la primera y la última columna de la fila; con Ctrl, la primera y la última casilla de la tarjeta.
  | 'inicio'
  | 'fin'
  | 'primera'
  | 'ultima'

const limitar = (n: number, max: number) => Math.max(0, Math.min(n, max))

export function seleccionarCelda(
  mapa: MapaDeLaGrilla,
  p: PlantillaEnCuadricula,
  pos: Pos,
): Seleccion {
  const ancla = anclaEn(mapa, p, pos)
  return { tipo: 'celdas', ancla, foco: ancla }
}

// Shift+clic o arrastrar: el ancla se queda y el foco va a la casilla.
export function extenderHasta(sel: Seleccion | null, pos: Pos): Seleccion {
  if (sel?.tipo !== 'celdas') return { tipo: 'celdas', ancla: pos, foco: pos }
  return { tipo: 'celdas', ancla: sel.ancla, foco: pos }
}

export function seleccionarFilas(desde: number, hasta = desde): Seleccion {
  return { tipo: 'filas', desde, hasta }
}

export function seleccionarColumnas(desde: number, hasta = desde): Seleccion {
  return { tipo: 'columnas', desde, hasta }
}

// El rectángulo de lo elegido, agrandado hasta las combinaciones que corta.
export function rangoDe(sel: Seleccion, mapa: MapaDeLaGrilla, p: PlantillaEnCuadricula): Rect {
  const maxF = Math.max(0, mapa.filas - 1)
  const maxK = Math.max(0, mapa.columnas - 1)
  if (sel.tipo === 'filas') {
    return {
      f0: limitar(Math.min(sel.desde, sel.hasta), maxF),
      f1: limitar(Math.max(sel.desde, sel.hasta), maxF),
      k0: 0,
      k1: maxK,
    }
  }
  if (sel.tipo === 'columnas') {
    return {
      f0: 0,
      f1: maxF,
      k0: limitar(Math.min(sel.desde, sel.hasta), maxK),
      k1: limitar(Math.max(sel.desde, sel.hasta), maxK),
    }
  }
  const a = rectEn(mapa, p, { f: limitar(sel.ancla.f, maxF), k: limitar(sel.ancla.k, maxK) })
  const b = rectEn(mapa, p, { f: limitar(sel.foco.f, maxF), k: limitar(sel.foco.k, maxK) })
  return agrandarHastaLasCombinaciones(mapa, p, {
    f0: Math.min(a.f0, b.f0),
    k0: Math.min(a.k0, b.k0),
    f1: Math.max(a.f1, b.f1),
    k1: Math.max(a.k1, b.k1),
  })
}

// La casilla del cursor (la que lleva el foco del teclado): el foco de un rango; en filas o columnas, la primera de lo elegido.
export function casillaActiva(sel: Seleccion | null, visibles: readonly number[]): Pos {
  if (sel === null) return { f: visibles[0] ?? 0, k: 0 }
  if (sel.tipo === 'celdas') return sel.foco
  if (sel.tipo === 'filas') return { f: Math.min(sel.desde, sel.hasta), k: 0 }
  return { f: visibles[0] ?? 0, k: Math.min(sel.desde, sel.hasta) }
}

// ¿Es una sola celda (o una casilla vacía)? Lo elegido es exactamente lo que cubre la celda del foco.
export function esUnaSolaCelda(
  sel: Seleccion,
  mapa: MapaDeLaGrilla,
  p: PlantillaEnCuadricula,
): boolean {
  if (sel.tipo !== 'celdas') return false
  const r = rangoDe(sel, mapa, p)
  const c = rectEn(mapa, p, sel.foco)
  return r.f0 === c.f0 && r.f1 === c.f1 && r.k0 === c.k0 && r.k1 === c.k1
}

const siguienteVisible = (visibles: readonly number[], despuesDe: number) =>
  visibles.find((f) => f > despuesDe)
const anteriorVisible = (visibles: readonly number[], antesDe: number) =>
  [...visibles].reverse().find((f) => f < antesDe)

// Lo que se mira para mover el cursor: la grilla, la plantilla y los índices de las filas que se dibujan, en orden.
export type GrillaVisible = {
  readonly mapa: MapaDeLaGrilla
  readonly p: PlantillaEnCuadricula
  readonly visibles: readonly number[]
}

// De costado: salta lo que cubre la celda de `desde`; en el borde se queda.
function deCostado(desde: Pos, r: Rect, dir: 'derecha' | 'izquierda', ultima: number): Pos {
  if (dir === 'derecha') return r.k1 + 1 > ultima ? desde : { f: desde.f, k: r.k1 + 1 }
  return r.k0 - 1 < 0 ? desde : { f: desde.f, k: r.k0 - 1 }
}

// Arriba o abajo: la fila visible más cerca fuera de lo que cubre la celda de `desde`; en el borde se queda.
function vertical(desde: Pos, r: Rect, dir: 'arriba' | 'abajo', visibles: readonly number[]): Pos {
  const f = dir === 'abajo' ? siguienteVisible(visibles, r.f1) : anteriorVisible(visibles, r.f0)
  return f === undefined ? desde : { f, k: desde.k }
}

// La casilla a la que va el cursor desde `desde` (saltando lo que cubre su celda y las filas ocultas). Se queda donde está en el borde.
function destino(desde: Pos, dir: Direccion, { mapa, p, visibles }: GrillaVisible): Pos {
  const r = rectEn(mapa, p, desde)
  const ultimaColumna = Math.max(0, mapa.columnas - 1)
  switch (dir) {
    case 'derecha':
    case 'izquierda':
      return deCostado(desde, r, dir, ultimaColumna)
    case 'abajo':
    case 'arriba':
      return vertical(desde, r, dir, visibles)
    case 'inicio':
      return { f: desde.f, k: 0 }
    case 'fin':
      return { f: desde.f, k: ultimaColumna }
    case 'primera':
      return { f: visibles[0] ?? 0, k: 0 }
    case 'ultima':
      return { f: visibles[visibles.length - 1] ?? 0, k: ultimaColumna }
  }
}

// Las flechas (y Home, End, Ctrl+Home, Ctrl+End): sin Shift el cursor va a la casilla de al lado y elige sólo esa; con Shift el ancla se queda y el rango crece.
export function moverFoco(
  sel: Seleccion | null,
  dir: Direccion,
  extender: boolean,
  grilla: GrillaVisible,
): Seleccion {
  const { mapa, p, visibles } = grilla
  if (mapa.filas === 0 || mapa.columnas === 0)
    return { tipo: 'celdas', ancla: { f: 0, k: 0 }, foco: { f: 0, k: 0 } }
  if (sel === null) return seleccionarCelda(mapa, p, casillaActiva(null, visibles))
  const desde = casillaActiva(sel, visibles)
  const hasta = destino(desde, dir, grilla)
  if (extender) {
    const ancla = sel.tipo === 'celdas' ? sel.ancla : desde
    return { tipo: 'celdas', ancla, foco: hasta }
  }
  return seleccionarCelda(mapa, p, hasta)
}

// La selección dentro de una grilla que cambió de tamaño (tras deshacer, eliminar o pegar): lo que quedó fuera se recorta; sin filas o columnas, nada.
export function ajustarSeleccion(sel: Seleccion | null, mapa: MapaDeLaGrilla): Seleccion | null {
  if (sel === null || mapa.filas === 0 || mapa.columnas === 0) return null
  const maxF = mapa.filas - 1
  const maxK = mapa.columnas - 1
  if (sel.tipo === 'filas')
    return { tipo: 'filas', desde: limitar(sel.desde, maxF), hasta: limitar(sel.hasta, maxF) }
  if (sel.tipo === 'columnas')
    return { tipo: 'columnas', desde: limitar(sel.desde, maxK), hasta: limitar(sel.hasta, maxK) }
  return {
    tipo: 'celdas',
    ancla: { f: limitar(sel.ancla.f, maxF), k: limitar(sel.ancla.k, maxK) },
    foco: { f: limitar(sel.foco.f, maxF), k: limitar(sel.foco.k, maxK) },
  }
}

export const mismaSeleccion = (a: Seleccion | null, b: Seleccion | null): boolean =>
  JSON.stringify(a) === JSON.stringify(b)
