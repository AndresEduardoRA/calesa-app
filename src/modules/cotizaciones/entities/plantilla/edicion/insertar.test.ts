import { describe, expect, it } from 'vitest'
import {
  anuncioDe,
  celda,
  celdaPorId,
  grilla,
  motivoDe,
  plantillaDe,
  texto,
} from './edicion.soporte'
import { insertarColumna, insertarFila, sumarColumna } from './insertar'
import { MOTIVOS_DE_LOS_TOPES } from './limites'

// 3 × 3: `v` combina las filas 0-1 de la columna 0; `h` combina las columnas 1-2 de la fila 2.
const P = {
  ...grilla(3, 3, [
    { ...celda('v', 0, 0, texto('V')), abarca_filas: 2 },
    { ...celda('h', 2, 1, texto('H')), abarca_columnas: 2 },
  ]),
  filas: [
    { id: 'f1', alto: 30, ocultar_si: 'nunca' as const },
    { id: 'f2', alto: 40, ocultar_si: 'no_aplica' as const, nodo: 'remate' },
    { id: 'f3', alto: 25, ocultar_si: 'nunca' as const },
  ],
}

describe('insertarFila', () => {
  it('arriba o abajo, con el alto de la de al lado y sin ocultarse', () => {
    const r = insertarFila(P, 1, 'abajo')
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('Se insertó una fila abajo.')
    expect(p.filas[2]).toEqual({ id: 'f4', alto: 40, ocultar_si: 'nunca' })
    expect(r.ok && r.seleccion).toEqual({ tipo: 'filas', desde: 2, hasta: 2 })
    expect(plantillaDe(insertarFila(P, 0, 'arriba')).filas[0]?.alto).toBe(30)
  })
  it('dentro de una combinación la agranda; en su borde no', () => {
    expect(celdaPorId(plantillaDe(insertarFila(P, 0, 'abajo')), 'v')?.abarca_filas).toBe(3)
    expect(celdaPorId(plantillaDe(insertarFila(P, 1, 'arriba')), 'v')?.abarca_filas).toBe(3)
    expect(celdaPorId(plantillaDe(insertarFila(P, 0, 'arriba')), 'v')?.abarca_filas).toBe(2)
    expect(celdaPorId(plantillaDe(insertarFila(P, 1, 'abajo')), 'v')?.abarca_filas).toBe(2)
  })
  it('con 120 filas, no', () => {
    expect(motivoDe(insertarFila(grilla(120, 1), 0, 'abajo'))).toBe(MOTIVOS_DE_LOS_TOPES.filas)
    expect(motivoDe(insertarFila(P, 7, 'abajo'))).toBe('Esa fila no está en la tarjeta.')
  })
})

describe('insertarColumna', () => {
  it('a la izquierda o a la derecha, con el ancho de la de al lado', () => {
    const r = insertarColumna(P, 0, 'izquierda')
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('Se insertó una columna a la izquierda.')
    expect(p.columnas[0]).toEqual({ id: 'k4', ancho: 100 })
    expect(r.ok && r.seleccion).toEqual({ tipo: 'columnas', desde: 0, hasta: 0 })
  })
  it('dentro de una combinación la agranda; en su borde no', () => {
    expect(celdaPorId(plantillaDe(insertarColumna(P, 1, 'derecha')), 'h')?.abarca_columnas).toBe(3)
    expect(celdaPorId(plantillaDe(insertarColumna(P, 2, 'derecha')), 'h')?.abarca_columnas).toBe(2)
  })
  it('el ancho nuevo no pasa del total que queda; sin lugar, el tope lo dice', () => {
    const casiLlena = grilla(1, 3, [], 520)
    expect(plantillaDe(insertarColumna(casiLlena, 0, 'derecha')).columnas[1]?.ancho).toBe(40)
    expect(motivoDe(insertarColumna(grilla(1, 3, [], 533), 0, 'derecha'))).toBe(
      MOTIVOS_DE_LOS_TOPES.ancho,
    )
    expect(motivoDe(insertarColumna(grilla(1, 16, [], 50), 0, 'derecha'))).toBe(
      MOTIVOS_DE_LOS_TOPES.columnas,
    )
  })
  it('«Sumar columna» la pone al final', () => {
    const r = sumarColumna(P)
    expect(anuncioDe(r)).toBe('Se sumó una columna.')
    expect(plantillaDe(r).columnas.map((c) => c.id)).toEqual(['k1', 'k2', 'k3', 'k4'])
  })
})
