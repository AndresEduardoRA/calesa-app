import { describe, expect, it } from 'vitest'
import { textoDeLaOculta } from './ocultas'

describe('textoDeLaOculta', () => {
  it('no aplica: con la variante elegida, si la hay', () => {
    expect(textoDeLaOculta({ motivo: 'no_aplica', variante: 'Moto' })).toBe(
      'No aplica en esta cotización: la variante es Moto',
    )
    expect(textoDeLaOculta({ motivo: 'no_aplica', variante: null })).toBe(
      'No aplica en esta cotización',
    )
  })
  it('vale 0 y fuera de la versión, sin variante', () => {
    expect(textoDeLaOculta({ motivo: 'cero', variante: 'Moto' })).toBe('Vale 0')
    expect(textoDeLaOculta({ motivo: 'fuera_de_la_version', variante: null })).toBe(
      'Su nodo no está en la versión de la referencia',
    )
  })
  it('por sus condiciones', () => {
    expect(textoDeLaOculta({ motivo: 'condicion', variante: null })).toBe(
      'Se cumplen sus condiciones',
    )
  })
})
