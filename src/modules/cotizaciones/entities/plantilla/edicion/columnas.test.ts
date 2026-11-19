import { describe, expect, it } from 'vitest'
import { letraDeColumna, nombreConocido, rotuloDeColumna } from './columnas'

describe('el nombre de una columna', () => {
  it('su letra, de la A a la P y más allá', () => {
    expect(letraDeColumna(0)).toBe('A')
    expect(letraDeColumna(15)).toBe('P')
    expect(letraDeColumna(26)).toBe('AA')
  })
  it('con el nombre de la conversión, si lo tiene', () => {
    expect(nombreConocido('tipo_cambio')).toBe('Tipo de cambio')
    expect(nombreConocido('k3')).toBeNull()
    expect(nombreConocido('constructor')).toBeNull()
    expect(rotuloDeColumna(1, 'concepto')).toBe('B · Concepto')
    expect(rotuloDeColumna(6, 'k7')).toBe('G')
  })
})
