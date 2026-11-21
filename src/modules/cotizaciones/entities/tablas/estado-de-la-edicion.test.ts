import { describe, expect, it } from 'vitest'
import { estadoDeLaTabla } from './estado-de-la-edicion'

describe('estadoDeLaTabla', () => {
  it('con filas cambiadas, Cambios sin guardar', () => {
    expect(estadoDeLaTabla({ cambios: true, version: 3, publicadoPor: 'Ana' })).toEqual({
      tipo: 'cambios',
    })
  })

  it('sin cambios, la versión publicada y quién la publicó', () => {
    expect(estadoDeLaTabla({ cambios: false, version: 3, publicadoPor: 'Ana' })).toEqual({
      tipo: 'publicada',
      version: 3,
      detalle: 'Ana',
    })
    expect(estadoDeLaTabla({ cambios: false, version: 1, publicadoPor: null })).toEqual({
      tipo: 'publicada',
      version: 1,
    })
  })
})
