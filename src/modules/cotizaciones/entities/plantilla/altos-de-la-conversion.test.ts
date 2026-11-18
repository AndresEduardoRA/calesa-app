import { describe, expect, it } from 'vitest'
import { altoDeLaFila, altoDeRenglones, altoDeTexto, renglones } from './altos-de-la-conversion'

// D11 de T310: aritmética entera, igual que `_plantilla_alto_de_texto()` de la base.
describe('los altos de la conversión', () => {
  it('cuenta renglones por caracteres (code points) y por cada salto de línea', () => {
    // 190 px a 12 px: (182 × 10) / 72 = 25 caracteres por renglón.
    expect(renglones('x'.repeat(25), 190, 12)).toBe(1)
    expect(renglones('x'.repeat(26), 190, 12)).toBe(2)
    expect(renglones('🚗'.repeat(25), 190, 12)).toBe(1)
    expect(renglones('a\n\nb', 190, 12)).toBe(3)
    expect(renglones('', 190, 12)).toBe(1)
    // Una columna angosta da al menos un carácter por renglón.
    expect(renglones('abc', 24, 28)).toBe(3)
  })

  it('el alto: renglones × ((tamaño × 14 + 9) / 10) + 8, y la fila entre 16 y 240', () => {
    expect(altoDeRenglones(1, 12)).toBe(25)
    expect(altoDeRenglones(2, 16)).toBe(54)
    expect(altoDeTexto('Tipo de cambio', 90, 11)).toBe(40)
    expect(altoDeLaFila([])).toBe(16)
    expect(altoDeLaFila([25, 40])).toBe(40)
    expect(altoDeLaFila([999])).toBe(240)
  })
})
