import { describe, expect, it } from 'vitest'
import {
  anuncioDe,
  celda,
  celdaPorId,
  grilla,
  motivoDe,
  ocupante,
  plantillaDe,
} from './edicion.soporte'
import { eliminarColumnas, eliminarFilas } from './eliminar'

// 4 × 4: `v` combina las filas 0-2 de la columna 0; `w` las filas 1-3 de la columna 1; `x` en (1,2); `h` las columnas 1-3 de la fila 0.
const P = grilla(4, 4, [
  { ...celda('v', 0, 0), abarca_filas: 3 },
  { ...celda('w', 1, 1), abarca_filas: 3 },
  celda('x', 1, 2),
  { ...celda('h', 0, 1), abarca_columnas: 3 },
])

describe('eliminarFilas', () => {
  it('se van sus celdas y se achican las combinaciones que la cruzan', () => {
    const r = eliminarFilas(P, 1, 1)
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('Se eliminó una fila.')
    expect(p.filas.map((f) => f.id)).toEqual(['f1', 'f3', 'f4'])
    expect(celdaPorId(p, 'x')).toBeUndefined()
    expect(celdaPorId(p, 'v')?.abarca_filas).toBe(2)
    // `w` empezaba en la fila eliminada: su ancla pasa a la siguiente.
    expect(celdaPorId(p, 'w')).toMatchObject({ fila: 'f3', abarca_filas: 2 })
    expect(r.ok && r.seleccion).toEqual({ tipo: 'filas', desde: 1, hasta: 1 })
  })
  it('una combinación que queda en una fila pierde su `abarca`; una que no deja ninguna se quita', () => {
    const p = plantillaDe(eliminarFilas(P, 1, 2))
    expect(p.filas.map((f) => f.id)).toEqual(['f1', 'f4'])
    expect(celdaPorId(p, 'v')).not.toHaveProperty('abarca_filas')
    // `w` pasa a la fila que queda (`f4`), sin combinar.
    expect(celdaPorId(p, 'w')).toEqual({ ...celda('w', 1, 1), fila: 'f4' })
    expect(ocupante(p, 1, 1)).toBe('w')
    const sinV = plantillaDe(
      eliminarFilas(grilla(3, 1, [{ ...celda('v', 0, 0), abarca_filas: 2 }]), 0, 1),
    )
    expect(sinV.celdas).toEqual([])
  })
  it('la tarjeta lleva al menos una fila', () => {
    expect(motivoDe(eliminarFilas(P, 0, 3))).toBe('La tarjeta lleva al menos una fila.')
    expect(anuncioDe(eliminarFilas(P, 3, 2))).toBe('Se eliminaron 2 filas.')
  })
  it('la selección queda en la última si se eliminaron las de abajo', () => {
    const r = eliminarFilas(P, 2, 3)
    expect(r.ok && r.seleccion).toEqual({ tipo: 'filas', desde: 1, hasta: 1 })
  })
})

describe('eliminarColumnas', () => {
  it('lo mismo de costado', () => {
    const r = eliminarColumnas(P, 1, 2)
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('Se eliminaron 2 columnas.')
    expect(p.columnas.map((c) => c.id)).toEqual(['k1', 'k4'])
    expect(celdaPorId(p, 'w')).toBeUndefined()
    expect(celdaPorId(p, 'x')).toBeUndefined()
    // `h` empezaba en la columna 1: queda en la 3 (ahora la segunda), sin combinar.
    expect(celdaPorId(p, 'h')).toEqual(celda('h', 0, 3))
    expect(motivoDe(eliminarColumnas(P, 0, 3))).toBe('La tarjeta lleva al menos una columna.')
    expect(anuncioDe(eliminarColumnas(P, 3, 3))).toBe('Se eliminó una columna.')
  })
})
