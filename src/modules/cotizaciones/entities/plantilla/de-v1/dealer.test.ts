import { describe, expect, it } from 'vitest'
import { calcular, coloresNombrados, paquete, validarLosTres } from './plantilla-de-v1.soporte'

// La plantilla de V1 «Compra dealer USA»: `DEALER_FORMULA_BANDS` con la versión `dealer` publicada del extracto de V1, la pareja 20/40 pies como variante en par
// y la tarjeta de `seed/dealer.ts` (v2).
const p = paquete('dealer')

describe('la plantilla de V1 «Compra dealer USA»', () => {
  it('pasa los tres validadores contra su propia fórmula, en forma 2 y dentro de 24 KiB', () => {
    validarLosTres(p)
  })

  it('nombra en `colores` justo los colores que usan sus grupos, su diseño y su tarjeta', () => {
    expect(coloresNombrados(p)).toEqual(p.colores.map((c) => c.clave).sort())
  })

  it('cotiza en par: el contenedor de 20 y el de 40 pies, con los títulos de V1', () => {
    const variante = p.formula.definicion.nodos.find((n) => n.tipo === 'opcion')
    expect(variante?.tipo === 'opcion' && variante.en_par).toBe(true)
    expect(variante?.tipo === 'opcion' && variante.opciones.map((o) => o.titulo)).toEqual([
      '1 VEHÍCULO CONTENEDOR DE 20 PIES',
      '2 VEHÍCULOS CONTENEDOR DE 40 PIES',
    ])
  })

  // La unidad de ejemplo de V1 (contenedor de 20, precio 65.000, valor tabla 52.000, Auto gasolina: sin export híbrido) con oficial 11,9 y paralelo 12:
  //   fees = 6.500;  transferencia = 71.500 × 0,04 = 2.860
  //   lado EE. UU. = 65.000 + 6.500 + 2.860 + 1.200 (grúa) + 9.000 (transporte 20) + 1.000 (comisión) + 700 (documentación) = 86.260
  //   CIF = 52.000 + 1.040 + 900 + 35 + 200 + 20 = 54.195;  GA = 2.709,75;  IVA = 56.904,75 × 0,1494 = 8.501,56965;  ICE = 8.535,7125
  //   nacionalización = 19.747,03215 + 780 = 20.527,03215 → la línea, a dólar entero: 20.527
  //   Bs (Paralelo) = 86.260 × 12 + 20.527 × 11,9 = 1.279.391,3;  ÷ 12 = 106.615,941666…;  suma = 106.787
  it('con la unidad de ejemplo de V1 da los totales de la planilla de V1, cada línea a dólar entero', () => {
    const r = calcular(p, 'paralelo')
    expect(r.faltantes).toEqual([])
    expect(r.valores['nacionalizacion']).toBeCloseTo(20527.03215, 6)
    expect(r.valores['nacionalizacion_linea']).toBe(20527)
    expect(r.totales.bs).toBeCloseTo(1279391.3, 6)
    expect(r.totales.usd).toBeCloseTo(106615.94166666667, 6)
    expect(r.totales.suma_usd).toBe(106787)
    expect(calcular(p, 'unificado').totales.usd).toBeCloseTo(106787, 6)
  })

  it('lo que cambia entre 20 y 40 pies es el transporte y el export híbrido', () => {
    const r = calcular(p, 'paralelo', { variante: 'pies_40' })
    // 86.260 − 9.000 + 5.300 = 82.560 al paralelo.
    expect(r.valores['transporte_20']).toBe(0)
    expect(r.valores['transporte_40']).toBe(5300)
    expect(r.totales.bs).toBeCloseTo(82560 * 12 + 20527 * 11.9, 6)
  })

  // Los dorados de V1 (`README.md` › «Compra dealer USA»: TCO 11,84, TCP 12,30, póliza manual, híbrido), en Paralelo, el total en dólares entero como V1:
  //   20 pies: 65.000 + 6.500 + 2.860 + 1.200 + 9.000 + 1.200 + 1.000 + 700 = 87.460;  87.460 × 12,30 + 23.000 × 11,84 = 1.348.078;  ÷ 12,30 → 109.600
  //   40 pies: 36.000 + 3.600 + 1.584 + 1.200 + 5.300 + 600 + 1.000 + 700 = 49.984;  49.984 × 12,30 + 14.000 × 11,84 = 780.563,2;  ÷ 12,30 → 63.460
  it('da los dorados de V1: 109.600 con 20 pies y 63.460 con 40 pies', () => {
    const dorado = { tipos_cambio: { oficial: 11.84, paralelo: 12.3 }, banderas: { hibrido: true } }
    const veinte = calcular(p, 'paralelo', {
      ...dorado,
      variante: 'pies_20',
      overrides: { nacionalizacion: 23000 },
    })
    expect(veinte.totales.bs).toBeCloseTo(1348078, 6)
    expect(Math.round(veinte.totales.usd ?? 0)).toBe(109600)
    const cuarenta = calcular(p, 'paralelo', {
      ...dorado,
      variante: 'pies_40',
      inputs: { precio: 36000 },
      overrides: { nacionalizacion: 14000 },
    })
    expect(cuarenta.totales.bs).toBeCloseTo(780563.2, 6)
    expect(Math.round(cuarenta.totales.usd ?? 0)).toBe(63460)
  })
})
