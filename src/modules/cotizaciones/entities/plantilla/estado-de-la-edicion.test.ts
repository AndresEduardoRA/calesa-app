import { describe, expect, it } from 'vitest'
import { estadoDeLaTarjeta } from './estado-de-la-edicion'

describe('estadoDeLaTarjeta', () => {
  const publicada = { version: 5 }

  it('lo no guardado manda', () => {
    expect(estadoDeLaTarjeta({ hayCambios: true, esperada: 'x', publicada })).toEqual({
      tipo: 'cambios',
    })
  })

  it('con borrador guardado, Borrador', () => {
    expect(estadoDeLaTarjeta({ hayCambios: false, esperada: '2026-11-20', publicada })).toEqual({
      tipo: 'borrador',
    })
  })

  it('sin borrador, la publicada con su versión; sin ninguna, nada', () => {
    expect(estadoDeLaTarjeta({ hayCambios: false, esperada: null, publicada })).toEqual({
      tipo: 'publicada',
      version: 5,
    })
    expect(estadoDeLaTarjeta({ hayCambios: false, esperada: null, publicada: null })).toBeNull()
  })
})
