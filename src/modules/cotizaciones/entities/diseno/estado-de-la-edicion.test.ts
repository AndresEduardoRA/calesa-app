import { describe, expect, it } from 'vitest'
import { estadoDeLaHoja } from './estado-de-la-edicion'

describe('estadoDeLaHoja', () => {
  it('lo no guardado manda', () => {
    expect(estadoDeLaHoja(true, 'publicada')).toEqual({ tipo: 'cambios' })
  })

  it('sin cambios, dice la versión que se edita', () => {
    expect(estadoDeLaHoja(false, 'borrador')).toEqual({ tipo: 'borrador' })
    expect(estadoDeLaHoja(false, 'publicada')).toEqual({ tipo: 'publicada' })
  })
})
