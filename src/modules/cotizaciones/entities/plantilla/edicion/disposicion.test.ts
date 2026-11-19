import { describe, expect, it } from 'vitest'
import type { GeometriaParaEditar } from '../../vista-previa-de-la-plantilla'
import {
  cajaDe,
  casillaEnElPunto,
  disposicionDe,
  enLaCapa,
  MARGEN_DEL_LIENZO,
  piezasDeLaCapa,
} from './disposicion'
import { celda, grilla, rect } from './edicion.soporte'
import { mapaDeLaGrilla } from './mapa-de-la-grilla'

// 4 filas de 25 px y 3 columnas de 100 px; una celda combina A1:A3 (tres filas) y otra B1:C1. La fila 2 (`f2`) no se dibuja con esta referencia.
const p = grilla(4, 3, [
  { ...celda('alta', 0, 0), abarca_filas: 3 },
  { ...celda('ancha', 0, 1), abarca_columnas: 2 },
])
const mapa = mapaDeLaGrilla(p)
const g: GeometriaParaEditar = {
  ancho: 300,
  alto: 75,
  filas: [
    { id: 'f1', y: 0, alto: 25 },
    { id: 'f3', y: 25, alto: 25 },
    { id: 'f4', y: 50, alto: 25 },
  ],
  ocultas: [{ fila: 'f2', etiqueta: 'F2', delNodo: 'x', motivo: 'cero', variante: null }],
}
const d = disposicionDe(p, g, mapa)

describe('disposicionDe', () => {
  it('la x de cada columna sale de los anchos; las filas, de las que se dibujan, con su índice real', () => {
    expect(d.xs).toEqual([0, 100, 200, 300])
    expect(d.visibles).toEqual([0, 2, 3])
    expect(d.porFila.get(2)).toEqual({ indice: 2, id: 'f3', y: 25, alto: 25 })
    expect(d.porFila.has(1)).toBe(false)
  })
})

describe('cajaDe', () => {
  it('une las columnas y las filas que se dibujan (la oculta no suma alto)', () => {
    expect(cajaDe(d, rect(0, 0, 2, 0))).toEqual({ x: 0, y: 0, ancho: 100, alto: 50 })
    expect(cajaDe(d, rect(0, 1, 0, 2))).toEqual({ x: 100, y: 0, ancho: 200, alto: 25 })
  })
  it('un rectángulo sólo de filas ocultas no tiene caja', () => {
    expect(cajaDe(d, rect(1, 0, 1, 2))).toBeNull()
  })
})

describe('piezasDeLaCapa', () => {
  const piezas = piezasDeLaCapa(p, mapa, d)
  it('cada celda va en la primera de sus filas que se dibuja, con el alto de las que se dibujan', () => {
    const primera = piezas.get(0) ?? []
    expect(primera.map((x) => x.celda?.id ?? null)).toEqual(['alta', 'ancha'])
    expect(primera[0]?.caja).toEqual({ x: 0, y: 0, ancho: 100, alto: 50 })
    expect(primera[0]?.rect).toEqual(rect(0, 0, 2, 0))
  })
  it('una casilla sin celda es una pieza vacía; las cubiertas por una combinación no tienen pieza', () => {
    const tercera = piezas.get(2) ?? []
    expect(tercera.map((x) => [x.pos, x.celda])).toEqual([
      [{ f: 2, k: 1 }, null],
      [{ f: 2, k: 2 }, null],
    ])
    expect((piezas.get(3) ?? []).map((x) => x.pos.k)).toEqual([0, 1, 2])
  })
  it('una fila oculta no tiene piezas', () => {
    expect(piezas.has(1)).toBe(false)
  })
})

describe('casillaEnElPunto', () => {
  it('la casilla bajo un punto de la tarjeta, o nada fuera', () => {
    expect(casillaEnElPunto(d, 150, 30)).toEqual({ f: 2, k: 1 })
    expect(casillaEnElPunto(d, 0, 0)).toEqual({ f: 0, k: 0 })
    expect(casillaEnElPunto(d, 300, 10)).toBeNull()
    expect(casillaEnElPunto(d, 10, 80)).toBeNull()
  })
})

describe('enLaCapa', () => {
  it('escala la caja y le suma el margen de las cabeceras y las asas', () => {
    expect(enLaCapa({ x: 100, y: 25, ancho: 200, alto: 50 }, 0.5)).toEqual({
      x: MARGEN_DEL_LIENZO.izquierda + 50,
      y: MARGEN_DEL_LIENZO.arriba + 12.5,
      ancho: 100,
      alto: 25,
    })
  })
})
