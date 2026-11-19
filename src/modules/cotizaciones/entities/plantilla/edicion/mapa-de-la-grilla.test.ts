import { describe, expect, it } from 'vitest'
import { celda, grilla, rect, texto } from './edicion.soporte'
import {
  agrandarHastaLasCombinaciones,
  anclaEn,
  celdaEn,
  celdasConAnclaEn,
  combinacionesCortadas,
  contiene,
  dentro,
  mapaDeLaGrilla,
  posicionesDe,
  rectDeLaCelda,
  rectEn,
  seCruzan,
  unir,
} from './mapa-de-la-grilla'

// 4 × 4: `a` combina (0,0)-(1,1); `b` en (0,2); `c` combina (2,1)-(2,3).
const P = grilla(4, 4, [
  { ...celda('a', 0, 0, texto('A')), abarca_filas: 2, abarca_columnas: 2 },
  celda('b', 0, 2, texto('B')),
  { ...celda('c', 2, 1, texto('C')), abarca_columnas: 3 },
])

describe('mapaDeLaGrilla', () => {
  it('cada casilla sabe qué celda la ocupa', () => {
    const mapa = mapaDeLaGrilla(P)
    expect(mapa.filas).toBe(4)
    expect(mapa.columnas).toBe(4)
    expect(mapa.ocupa.slice(0, 4)).toEqual([0, 0, 1, -1])
    expect(mapa.ocupa.slice(4, 8)).toEqual([0, 0, -1, -1])
    expect(mapa.ocupa.slice(8, 12)).toEqual([-1, 2, 2, 2])
  })

  it('una celda que nombra una fila que no existe no ocupa nada', () => {
    const p = grilla(2, 2, [{ ...celda('x', 0, 0), fila: 'otra' }])
    const mapa = mapaDeLaGrilla(p)
    expect(mapa.ocupa).toEqual([-1, -1, -1, -1])
    expect(rectDeLaCelda(mapa, p.celdas[0] ?? celda('y', 0, 0))).toBeNull()
  })

  it('`__proto__` y `constructor` son ids como cualquier otro', () => {
    const p = {
      ...grilla(1, 1),
      filas: [{ id: '__proto__', alto: 25, ocultar_si: 'nunca' as const }],
    }
    const mapa = mapaDeLaGrilla({ ...p, celdas: [{ ...celda('c', 0, 0), fila: '__proto__' }] })
    expect(mapa.ocupa).toEqual([0])
  })
})

describe('celdaEn, rectEn y anclaEn', () => {
  const mapa = mapaDeLaGrilla(P)
  it('una casilla cubierta por una combinación da la celda de su ancla', () => {
    expect(celdaEn(mapa, P, { f: 1, k: 1 })?.celda.id).toBe('a')
    expect(rectEn(mapa, P, { f: 1, k: 1 })).toEqual(rect(0, 0, 1, 1))
    expect(anclaEn(mapa, P, { f: 2, k: 3 })).toEqual({ f: 2, k: 1 })
  })
  it('una casilla vacía no tiene celda y su rectángulo es ella misma', () => {
    expect(celdaEn(mapa, P, { f: 3, k: 3 })).toBeNull()
    expect(rectEn(mapa, P, { f: 3, k: 3 })).toEqual(rect(3, 3))
  })
  it('fuera de la grilla no hay nada', () => {
    expect(dentro(mapa, { f: 4, k: 0 })).toBe(false)
    expect(celdaEn(mapa, P, { f: -1, k: 0 })).toBeNull()
  })
})

describe('rectángulos', () => {
  const mapa = mapaDeLaGrilla(P)
  it('elegir media combinación elige la combinación entera, también encadenada', () => {
    expect(agrandarHastaLasCombinaciones(mapa, P, rect(1, 1))).toEqual(rect(0, 0, 1, 1))
    // (1,1)-(2,1) corta `a` y `c`: crece hasta las dos.
    expect(agrandarHastaLasCombinaciones(mapa, P, rect(1, 1, 2, 1))).toEqual(rect(0, 0, 2, 3))
  })
  it('las combinaciones cortadas son las que se cruzan sin quedar adentro', () => {
    expect(combinacionesCortadas(mapa, P, rect(0, 1, 0, 2)).map((c) => c.celda.id)).toEqual(['a'])
    expect(combinacionesCortadas(mapa, P, rect(0, 0, 1, 2))).toEqual([])
  })
  it('las celdas con ancla en un rectángulo, en el orden del arreglo', () => {
    expect(celdasConAnclaEn(mapa, P, rect(0, 0, 2, 3)).map((c) => c.celda.id)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(celdasConAnclaEn(mapa, P, rect(1, 1, 3, 3)).map((c) => c.celda.id)).toEqual(['c'])
  })
  it('posiciones, contener, cruzarse y unir', () => {
    expect(posicionesDe(rect(0, 0, 1, 1))).toEqual([
      { f: 0, k: 0 },
      { f: 0, k: 1 },
      { f: 1, k: 0 },
      { f: 1, k: 1 },
    ])
    expect(contiene(rect(0, 0, 2, 2), rect(1, 1))).toBe(true)
    expect(contiene(rect(1, 1), rect(0, 0, 2, 2))).toBe(false)
    expect(seCruzan(rect(0, 0, 1, 1), rect(1, 1, 2, 2))).toBe(true)
    expect(seCruzan(rect(0, 0), rect(1, 1))).toBe(false)
    expect(unir(rect(0, 1), rect(2, 0))).toEqual(rect(0, 0, 2, 1))
  })
})
