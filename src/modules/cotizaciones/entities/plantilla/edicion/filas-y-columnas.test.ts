import { describe, expect, it } from 'vitest'
import { anuncioDe, celda, grilla, motivoDe, plantillaDe } from './edicion.soporte'
import {
  MOTIVO_DEL_ALTO,
  MOTIVO_DEL_ANCHO,
  MOTIVO_SIN_NODO,
  altoDeFila,
  anchoDeColumna,
  moverFila,
  ocultarSi,
} from './filas-y-columnas'
import { MOTIVOS_DE_LOS_TOPES } from './limites'

describe('anchoDeColumna', () => {
  const P = grilla(1, 3)
  it('de 24 a 640 px, en enteros', () => {
    const r = anchoDeColumna(P, 1, 189.6)
    expect(anuncioDe(r)).toBe('La columna B mide 190 px.')
    expect(plantillaDe(r).columnas[1]?.ancho).toBe(190)
    expect(motivoDe(anchoDeColumna(P, 0, 23))).toBe(MOTIVO_DEL_ANCHO)
    expect(motivoDe(anchoDeColumna(P, 0, 641))).toBe(MOTIVO_DEL_ANCHO)
    expect(motivoDe(anchoDeColumna(P, 0, Number.NaN))).toBe(MOTIVO_DEL_ANCHO)
  })
  it('el total hasta 1.600 px; el mismo ancho no cambia nada', () => {
    expect(motivoDe(anchoDeColumna(grilla(1, 3, [], 600), 0, 601))).toBe(MOTIVOS_DE_LOS_TOPES.ancho)
    const igual = anchoDeColumna(P, 0, 100)
    expect(igual.ok && igual.plantilla).toBe(P)
  })
})

describe('altoDeFila', () => {
  it('de 16 a 240 px', () => {
    const r = altoDeFila(grilla(4, 1), 3, 32)
    expect(anuncioDe(r)).toBe('La fila 4 mide 32 px.')
    expect(plantillaDe(r).filas[3]?.alto).toBe(32)
    expect(motivoDe(altoDeFila(grilla(1, 1), 0, 15))).toBe(MOTIVO_DEL_ALTO)
    expect(motivoDe(altoDeFila(grilla(1, 1), 0, 241))).toBe(MOTIVO_DEL_ALTO)
  })
})

describe('ocultarSi', () => {
  const P = grilla(2, 1)
  it('con un nodo que la decide; «nunca» le quita el nodo', () => {
    const r = ocultarSi(P, 1, 'no_aplica', 'remate')
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('La fila 2 se oculta si no aplica.')
    expect(p.filas[1]).toEqual({ id: 'f2', alto: 25, ocultar_si: 'no_aplica', nodo: 'remate' })
    const nunca = ocultarSi(p, 1, 'nunca', 'remate')
    expect(anuncioDe(nunca)).toBe('La fila 2 no se oculta.')
    expect(plantillaDe(nunca).filas[1]).toEqual({ id: 'f2', alto: 25, ocultar_si: 'nunca' })
    expect(anuncioDe(ocultarSi(P, 0, 'no_aplica_o_cero', 'fees'))).toBe(
      'La fila 1 se oculta si no aplica o vale 0.',
    )
  })
  it('sin nodo no se oculta por nada', () => {
    expect(motivoDe(ocultarSi(P, 0, 'no_aplica', null))).toBe(MOTIVO_SIN_NODO)
  })
})

describe('moverFila', () => {
  // 5 filas: `v` combina las filas 1-3.
  const P = grilla(5, 2, [celda('a', 0, 0), { ...celda('v', 1, 0), abarca_filas: 3 }])
  it('la fila va con sus celdas al lugar nuevo', () => {
    const r = moverFila(P, 0, 4)
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('La fila 1 pasó al lugar 5.')
    expect(p.filas.map((f) => f.id)).toEqual(['f2', 'f3', 'f4', 'f5', 'f1'])
    expect(r.ok && r.seleccion).toEqual({ tipo: 'filas', desde: 4, hasta: 4 })
  })
  it('una fila de una combinación vertical no se mueve', () => {
    expect(motivoDe(moverFila(P, 2, 0))).toBe(
      'La fila 3 es parte de una combinación de 3 filas: sepárala para moverla.',
    )
  })
  it('ni cae dentro de una; en su borde, sí', () => {
    expect(motivoDe(moverFila(P, 4, 2))).toBe(
      'La fila 5 no puede ir dentro de una combinación de 3 filas.',
    )
    expect(motivoDe(moverFila(P, 0, 2))).toBe(
      'La fila 1 no puede ir dentro de una combinación de 3 filas.',
    )
    expect(plantillaDe(moverFila(P, 4, 1)).filas.map((f) => f.id)).toEqual([
      'f1',
      'f5',
      'f2',
      'f3',
      'f4',
    ])
    expect(plantillaDe(moverFila(P, 0, 3)).filas.map((f) => f.id)).toEqual([
      'f2',
      'f3',
      'f4',
      'f1',
      'f5',
    ])
  })
  it('al mismo lugar no cambia nada', () => {
    const r = moverFila(P, 4, 4)
    expect(r.ok && r.plantilla).toBe(P)
  })
})
