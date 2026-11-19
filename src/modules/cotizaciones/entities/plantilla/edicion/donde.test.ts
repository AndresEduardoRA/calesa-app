import { describe, expect, it } from 'vitest'
import { seleccionDelDonde } from './donde'
import { celda, grilla } from './edicion.soporte'
import { mapaDeLaGrilla } from './mapa-de-la-grilla'

const p = grilla(3, 3, [celda('c_1', 1, 1), { ...celda('ancha', 2, 0), abarca_columnas: 2 }])
const mapa = mapaDeLaGrilla(p)

describe('seleccionDelDonde', () => {
  it('una celda por id o por índice: su ancla', () => {
    expect(seleccionDelDonde('celdas.c_1', mapa, p)).toEqual({
      tipo: 'celdas',
      ancla: { f: 1, k: 1 },
      foco: { f: 1, k: 1 },
    })
    expect(seleccionDelDonde('celdas[1].estilo.tamano', mapa, p)).toEqual({
      tipo: 'celdas',
      ancla: { f: 2, k: 0 },
      foco: { f: 2, k: 0 },
    })
  })
  it('una fila o una columna, por id o por índice', () => {
    expect(seleccionDelDonde('filas.f2', mapa, p)).toEqual({ tipo: 'filas', desde: 1, hasta: 1 })
    expect(seleccionDelDonde('filas[2].nodo', mapa, p)).toEqual({
      tipo: 'filas',
      desde: 2,
      hasta: 2,
    })
    expect(seleccionDelDonde('columnas.k3', mapa, p)).toEqual({
      tipo: 'columnas',
      desde: 2,
      hasta: 2,
    })
    expect(seleccionDelDonde('columnas[0].ancho', mapa, p)).toEqual({
      tipo: 'columnas',
      desde: 0,
      hasta: 0,
    })
  })
  it('lo que no nombra un lugar, o uno que no existe, no elige nada', () => {
    expect(seleccionDelDonde('definicion', mapa, p)).toBeNull()
    expect(seleccionDelDonde('forma', mapa, p)).toBeNull()
    expect(seleccionDelDonde('celdas.no_esta', mapa, p)).toBeNull()
    expect(seleccionDelDonde('filas[9]', mapa, p)).toBeNull()
  })
})
