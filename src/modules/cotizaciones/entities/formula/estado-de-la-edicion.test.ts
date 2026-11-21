import { describe, expect, it } from 'vitest'
import { estadoDeLaFormulaGuardada } from './estado-de-la-edicion'

const publicada = {
  id: 'p',
  version: 4,
  nota: null,
  publicadoPor: null,
  publicadoEn: null,
  autor: 'Ana',
}
const borrador = {
  id: 'b',
  nota: null,
  creadoPor: null,
  actualizadoEn: '2026-11-20T10:00:00Z',
  versionOrigenId: null,
  versionDeOrigen: null,
  autor: 'Beto',
}

describe('estadoDeLaFormulaGuardada', () => {
  it('con borrador, dice Borrador y de quién', () => {
    expect(estadoDeLaFormulaGuardada({ publicada, borrador })).toEqual({
      tipo: 'borrador',
      detalle: 'Beto',
    })
  })

  it('sin borrador, la publicada con su versión', () => {
    expect(estadoDeLaFormulaGuardada({ publicada, borrador: null })).toEqual({
      tipo: 'publicada',
      version: 4,
    })
  })

  it('sin ninguna, nada', () => {
    expect(estadoDeLaFormulaGuardada({ publicada: null, borrador: null })).toBeNull()
  })
})
