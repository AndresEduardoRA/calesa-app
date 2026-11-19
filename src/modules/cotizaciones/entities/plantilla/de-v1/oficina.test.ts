import { describe, expect, it } from 'vitest'
import { calcular, coloresNombrados, paquete, validarLosTres } from './plantilla-de-v1.soporte'

// La plantilla de V1 «Oficina»: V1 no versiona parámetros de Oficina (`OFFICE_FORMULA_BANDS` vacío); la fórmula es «Precio acordado» − «Descuento» en un grupo
// «Contado», y la tarjeta la de `seed/office.ts`.
const p = paquete('oficina')

describe('la plantilla de V1 «Oficina»', () => {
  it('pasa los tres validadores contra su propia fórmula, en forma 2 y dentro de 24 KiB', () => {
    validarLosTres(p)
    expect(p.formula.params).toEqual({})
  })

  it('nombra en `colores` justo los colores que usan sus grupos, su diseño y su tarjeta', () => {
    expect(coloresNombrados(p)).toEqual(p.colores.map((c) => c.clave).sort())
  })

  // 25.000 − 1.500 = 23.500 dólares en los dos modos; los Bs, al paralelo (23.500 × 12 = 282.000) o al oficial (× 11,9 = 279.650), como el tipo de cambio
  // de presentación de V1.
  it('el precio acordado menos el descuento, al paralelo por defecto', () => {
    const paralelo = calcular(p, 'paralelo')
    expect(paralelo.faltantes).toEqual([])
    expect(paralelo.totales.usd).toBe(23500)
    expect(paralelo.totales.bs).toBeCloseTo(282000, 6)
    const aduana = calcular(p, 'aduana')
    expect(aduana.totales.usd).toBeCloseTo(23500, 9)
    expect(aduana.totales.bs).toBeCloseTo(279650, 6)
    expect(p.formula.diseno.cabecera.modo_por_defecto).toBe('paralelo')
  })
})
