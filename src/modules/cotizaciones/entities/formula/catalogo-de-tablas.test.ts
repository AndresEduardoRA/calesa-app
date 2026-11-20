import { describe, expect, it } from 'vitest'
import { catalogoDe } from './catalogo-de-tablas'

describe('catalogoDe', () => {
  it('una tabla del origen tapa a la compartida de la misma clave, llegue antes o después', () => {
    const propia = { clave: 'fletes', compartida: false, columnas: ['desde', 'hasta', 'monto'] }
    const compartida = { clave: 'fletes', compartida: true, columnas: ['monto'] }
    const esperado = [{ clave: 'fletes', columnas: ['desde', 'hasta', 'monto'] }]
    expect(catalogoDe([propia, compartida])).toEqual(esperado)
    expect(catalogoDe([compartida, propia])).toEqual(esperado)
  })

  it('las demás quedan, en su orden; sin tablas, ninguna', () => {
    const tablas = [
      { clave: 'aranceles', compartida: true, columnas: ['anio', 'tasa'] },
      { clave: 'fletes', compartida: false, columnas: ['monto'] },
    ]
    expect(catalogoDe(tablas).map((t) => t.clave)).toEqual(['aranceles', 'fletes'])
    expect(catalogoDe([])).toEqual([])
  })
})
