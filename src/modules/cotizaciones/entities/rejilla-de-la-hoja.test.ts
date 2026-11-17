import { describe, expect, it } from 'vitest'
import {
  altoSirve,
  ANCHO_MINIMO_DE_UNA_PIEZA,
  COLUMNAS_DE_CADA_ANCHO,
  columnasDeLaCelda,
  corteDe,
  CORTES,
} from './rejilla-de-la-hoja'

describe('la rejilla de la hoja', () => {
  it('completo, mitad y tercio son 12, 6 y 4 columnas; un número es su número', () => {
    expect(columnasDeLaCelda('completo')).toBe(12)
    expect(columnasDeLaCelda('mitad')).toBe(6)
    expect(columnasDeLaCelda('tercio')).toBe(4)
    expect(columnasDeLaCelda(8)).toBe(8)
    expect(COLUMNAS_DE_CADA_ANCHO).toEqual({ completo: 12, mitad: 6, tercio: 4 })
  })

  it('el corte de cada ancho: el primero que le da 16 rem (mitad desde 32 y tercio desde 48, como siempre)', () => {
    const cortes = Array.from({ length: 12 }, (_, i) => corteDe(i + 1))
    expect(cortes).toEqual([
      '7xl',
      '7xl',
      '5xl',
      '3xl',
      '2xl',
      'lg',
      'lg',
      'lg',
      'lg',
      'lg',
      'lg',
      'siempre',
    ])
    for (let n = 3; n < 12; n++) {
      const corte = corteDe(n)
      if (corte === 'siempre') continue
      expect((CORTES[corte] * n) / 12).toBeGreaterThanOrEqual(ANCHO_MINIMO_DE_UNA_PIEZA)
    }
  })

  it('el alto sólo sirve si la pieza no ocupa la fila entera', () => {
    expect(altoSirve(12)).toBe(false)
    expect(altoSirve(11)).toBe(true)
    expect(altoSirve(1)).toBe(true)
  })
})
