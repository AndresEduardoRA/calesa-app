import { describe, expect, it } from 'vitest'
import { esIdDeCotizacion } from './url'

describe('esIdDeCotizacion', () => {
  it('sólo un guid; nada que arme otra ruta', () => {
    expect(esIdDeCotizacion('0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b')).toBe(true)
    expect(esIdDeCotizacion('../../api/x')).toBe(false)
    expect(esIdDeCotizacion('')).toBe(false)
    expect(esIdDeCotizacion(null)).toBe(false)
  })
})
