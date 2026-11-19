import { describe, expect, it } from 'vitest'
import { faltasDelOrigen } from './faltas'

describe('faltasDelOrigen', () => {
  it('sin fórmula, la fórmula (la tarjeta se arma con sus grupos)', () => {
    expect(
      faltasDelOrigen({ activo: true, versionDeLaFormula: null, tarjetaPublicada: false }),
    ).toEqual([{ texto: 'Falta publicar la fórmula', pestana: 'formula' }])
  })

  it('con fórmula y sin tarjeta, la tarjeta', () => {
    expect(
      faltasDelOrigen({ activo: true, versionDeLaFormula: 3, tarjetaPublicada: false }),
    ).toEqual([{ texto: 'Falta publicar la tarjeta', pestana: 'tarjeta' }])
  })

  it('con las dos, nada; un inactivo, nada', () => {
    expect(
      faltasDelOrigen({ activo: true, versionDeLaFormula: 1, tarjetaPublicada: true }),
    ).toEqual([])
    expect(
      faltasDelOrigen({ activo: false, versionDeLaFormula: null, tarjetaPublicada: false }),
    ).toEqual([])
  })
})
