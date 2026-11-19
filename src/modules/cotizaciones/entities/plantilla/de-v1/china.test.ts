import { describe, expect, it } from 'vitest'
import { calcular, coloresNombrados, paquete, validarLosTres } from './plantilla-de-v1.soporte'

// La plantilla de V1 «China»: `CHINA_FORMULA_BANDS` con la versión `china` publicada (v2) del extracto de V1 y la tarjeta de `seed/china.ts`.
const p = paquete('china')

describe('la plantilla de V1 «China»', () => {
  it('pasa los tres validadores contra su propia fórmula, en forma 2 y dentro de 24 KiB', () => {
    validarLosTres(p)
    expect(p.tarjeta.columnas.map((c) => c.ancho)).toEqual([325, 140, 282, 72, 50, 91])
  })

  it('nombra en `colores` justo los colores que usan sus grupos, su diseño y su tarjeta', () => {
    expect(coloresNombrados(p)).toEqual(p.colores.map((c) => c.clave).sort())
  })

  // La unidad de ejemplo de V1 (compra 27.500, factor DP 1 = el año 2026) con oficial 11,9 y paralelo 12, hecha a mano desde las bandas:
  //   transferencia = (27.500 + 1.500) × 0,04              = 1.160
  //   lado China    = 27.500 + 1.500 + 1.160 + 1.000 (grúa) + 900 (desconsolidación) + 600 (terrestre) + 1.000 (comisión) + 700 (ingreso) = 34.360
  //   FOB = 27.500;  seguro = 550;  CIF = 27.500 + 550 + 900 + 35 + 200 + 20 = 29.205
  //   GA = 0;  IVA = 29.205 × 0,1494 = 4.363,227;  ICE = 0;  póliza = 4.363,227 + 780 = 5.143,227 → la línea, a dólar entero: 5.143
  //   Bs (Paralelo) = 34.360 × 12 + 5.143 × 11,9 = 473.521,7;  USD = Bs ÷ 12 = 39.460,141666… (China parte de los Bs, como V1)
  //   suma (Unificado y Aduana) = 34.360 + 5.143 = 39.503
  it('con la unidad de ejemplo de V1 da los totales de la planilla de V1, la póliza a dólar entero', () => {
    const r = calcular(p, 'paralelo')
    expect(r.faltantes).toEqual([])
    expect(r.valores['transferencia']).toBeCloseTo(1160, 9)
    expect(r.valores['cif']).toBeCloseTo(29205, 9)
    expect(r.valores['poliza_calculada']).toBeCloseTo(5143.227, 9)
    expect(r.valores['poliza']).toBe(5143)
    expect(r.totales.bs).toBeCloseTo(473521.7, 6)
    expect(r.totales.usd).toBeCloseTo(39460.141666666, 6)
    expect(calcular(p, 'unificado').totales.usd).toBeCloseTo(39503, 6)
    expect(calcular(p, 'aduana').totales.usd).toBeCloseTo(39503, 6)
  })

  it('el transporte marítimo de la tarjeta de V1 se tipea y suma al paralelo', () => {
    const r = calcular(p, 'paralelo', { inputs: { transporte_maritimo: 2500 } })
    expect(r.totales.usd).toBeCloseTo(39460.141666666 + 2500, 6)
  })

  it('congela sólo la depreciación `china` de V1: la comisión de logística es la constante 1.000, no la tabla por categoría', () => {
    const tablas = p.formula.params['tablas'] as Record<string, unknown[]>
    expect(Object.keys(tablas)).toEqual(['depreciacion'])
    expect(p.formula.params['comision']).toBe(1000)
  })
})
