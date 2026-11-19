import { describe, expect, it } from 'vitest'
import { MOTIVO_DE_LA_COMBINACION_CORTADA, combinar, separar } from './combinar'
import {
  anuncioDe,
  celda,
  celdaPorId,
  grilla,
  motivoDe,
  ocupante,
  plantillaDe,
  rect,
  texto,
} from './edicion.soporte'

describe('combinar', () => {
  it('queda la celda de arriba a la izquierda abarcando el rango y se quitan las demás', () => {
    const p0 = grilla(2, 3, [{ ...celda('a', 0, 0, texto('A')), estilo: { negrita: true } }])
    const r = combinar(p0, rect(0, 0, 0, 2))
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('Se combinaron 3 celdas.')
    expect(p.celdas).toEqual([
      { ...celda('a', 0, 0, texto('A')), estilo: { negrita: true }, abarca_columnas: 3 },
    ])
    expect(r.ok && r.seleccion).toEqual({
      tipo: 'celdas',
      ancla: { f: 0, k: 0 },
      foco: { f: 0, k: 0 },
    })
  })
  it('dice cuántas tenían contenido y se quitó', () => {
    const p0 = grilla(2, 2, [
      celda('a', 0, 0, texto('A')),
      celda('b', 0, 1, texto('B')),
      celda('c', 1, 0, texto('C')),
      celda('d', 1, 1),
    ])
    const r = combinar(p0, rect(0, 0, 1, 1))
    expect(anuncioDe(r)).toBe('Se combinaron 4 celdas. Se quitó el contenido de 2.')
    expect(plantillaDe(r).celdas).toEqual([
      { ...celda('a', 0, 0, texto('A')), abarca_columnas: 2, abarca_filas: 2 },
    ])
  })
  it('sin celda arriba a la izquierda, nace una vacía', () => {
    const p = plantillaDe(combinar(grilla(2, 2, [celda('b', 1, 1, texto('B'))]), rect(0, 0, 1, 1)))
    expect(p.celdas).toHaveLength(1)
    expect(ocupante(p, 1, 1)).toBe('c1')
    expect(celdaPorId(p, 'c1')).toMatchObject({
      contenido: { tipo: 'vacio' },
      abarca_filas: 2,
      abarca_columnas: 2,
    })
  })
  it('una sola casilla o un rango que corta una combinación, no', () => {
    const p0 = grilla(3, 3, [{ ...celda('m', 0, 0, texto('M')), abarca_filas: 2 }])
    expect(motivoDe(combinar(p0, rect(2, 2)))).toBe('Elige más de una celda para combinar.')
    expect(motivoDe(combinar(p0, rect(1, 0, 1, 2)))).toBe(MOTIVO_DE_LA_COMBINACION_CORTADA)
    // Recombinar una combinación más grande que la contiene, sí.
    expect(anuncioDe(combinar(p0, rect(0, 0, 2, 1)))).toBe('Se combinaron 6 celdas.')
  })
})

describe('separar', () => {
  it('quita la combinación y las casillas liberadas quedan sin celda', () => {
    const p0 = grilla(2, 2, [
      { ...celda('m', 0, 0, texto('M')), abarca_filas: 2, abarca_columnas: 2 },
    ])
    const r = separar(p0, rect(0, 0, 1, 1))
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('Se separó la celda.')
    expect(p.celdas).toEqual([celda('m', 0, 0, texto('M'))])
    expect(ocupante(p, 1, 1)).toBeNull()
  })
  it('varias, y sin combinaciones lo dice', () => {
    const p0 = grilla(2, 4, [
      { ...celda('a', 0, 0, texto('A')), abarca_columnas: 2 },
      { ...celda('b', 0, 2, texto('B')), abarca_columnas: 2 },
    ])
    expect(anuncioDe(separar(p0, rect(0, 0, 0, 3)))).toBe('Se separaron 2 celdas.')
    expect(motivoDe(separar(p0, rect(1, 0)))).toBe('No hay celdas combinadas en lo elegido.')
  })
})
