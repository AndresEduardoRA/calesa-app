import { describe, expect, it } from 'vitest'
import { vinOLote } from './vin-o-lote'

describe('vinOLote', () => {
  it('con los dos, el VIN y el lote al lado', () => {
    expect(vinOLote({ vin: '1HGCM82633A004352', lote: '4521' })).toBe(
      'VIN 1HGCM82633A004352 · Lote 4521',
    )
  })
  it('con uno, sólo ese', () => {
    expect(vinOLote({ vin: '1HGCM82633A004352', lote: null })).toBe('VIN 1HGCM82633A004352')
    expect(vinOLote({ vin: null, lote: '4521' })).toBe('Lote 4521')
  })
  it('sin ninguno, nulo', () => {
    expect(vinOLote({ vin: null, lote: null })).toBeNull()
  })
  it('un texto en blanco cuenta como ausente', () => {
    expect(vinOLote({ vin: '  ', lote: '' })).toBeNull()
    expect(vinOLote({ vin: ' ', lote: ' 77 ' })).toBe('Lote 77')
  })
})
