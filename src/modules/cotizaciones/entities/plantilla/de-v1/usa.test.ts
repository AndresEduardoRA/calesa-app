import { describe, expect, it } from 'vitest'
import { calcular, coloresNombrados, paquete, validarLosTres } from './plantilla-de-v1.soporte'

// La plantilla de V1 «USA (subasta)»: `USA_FORMULA_BANDS` con la versión `usa` publicada (v2) del extracto de V1 y la tarjeta de `seed/usa.ts`.
const p = paquete('usa')

describe('la plantilla de V1 «USA (subasta)»', () => {
  it('pasa los tres validadores contra su propia fórmula, en forma 2 y dentro de 24 KiB', () => {
    validarLosTres(p)
    expect(p.tarjeta.forma).toBe(2)
    expect(p.tarjeta.columnas.map((c) => c.ancho)).toEqual([270, 110, 290, 95, 70, 125])
  })

  it('nombra en `colores` justo los colores que usan sus grupos, su diseño y su tarjeta', () => {
    expect(coloresNombrados(p)).toEqual(p.colores.map((c) => c.clave).sort())
  })

  it('trae los modos de V1 con «Unificado» por defecto y el total en bolivianos ofrecido pero apagado', () => {
    const c = p.formula.diseno.cabecera
    expect(c.modos.map((m) => m.nombre)).toEqual(['Aduana', 'Paralelo', 'Unificado'])
    expect(c.modo_por_defecto).toBe('unificado')
    expect([c.ver_total_bs, c.ver_total_bs_por_defecto]).toEqual([true, false])
  })

  // La unidad de ejemplo de V1 (remate 32.900, tabla 41.610, grúa 1.350, transporte 3.700; Auto gasolina, factor DP 1 = el año 2026) con oficial 11,9 y paralelo
  // 12, hecha a mano desde las bandas:
  //   fees          = 32.900 × 0,13                     =  4.277
  //   transferencia = (32.900 + 4.277) × 0,04           =  1.487,08
  //   lado EE. UU.  = 32.900 + 4.277 + 1.487,08 + 1.350 + 3.700 + 500 (comisión) + 700 (documentación) = 44.914,08
  //   FOB           = 41.610 × 1;  seguro = 832,2;  CIF = 41.610 + 832,2 + 900 + 35 + 200 + 20 = 43.597,2
  //   GA            = 43.597,2 × 0,05                   =  2.179,86
  //   IVA           = (43.597,2 + 2.179,86) × 0,1494    =  6.839,092764
  //   ICE           = (43.597,2 + 2.179,86) × 0,15      =  6.866,559
  //   impuestos     = 15.885,511764;  póliza = 100 + 150 + 70 + 300 + 160 = 780;  nacionalización = 16.665,511764
  //   suma          = 44.914,08 + 16.665,511764         = 61.579,591764   (Unificado y Aduana: la suma de los dólares)
  //   Bs (Paralelo) = 44.914,08 × 12 + 16.665,511764 × 11,9 = 737.288,5499916;  ÷ 12 = 61.440,7124993
  it('con la unidad de ejemplo de V1 da los totales de la planilla de V1 en cada modo', () => {
    const paralelo = calcular(p, 'paralelo')
    expect(paralelo.faltantes).toEqual([])
    expect(paralelo.valores['fees']).toBeCloseTo(4277, 9)
    expect(paralelo.valores['transferencia']).toBeCloseTo(1487.08, 9)
    expect(paralelo.valores['cif']).toBeCloseTo(43597.2, 9)
    expect(paralelo.valores['total_impuestos']).toBeCloseTo(15885.511764, 6)
    expect(paralelo.valores['nacionalizacion']).toBeCloseTo(16665.511764, 6)
    expect(paralelo.totales.suma_usd).toBeCloseTo(61579.591764, 6)
    expect(paralelo.totales.bs).toBeCloseTo(737288.5499916, 6)
    expect(paralelo.totales.usd).toBeCloseTo(61440.7124993, 6)
    expect(calcular(p, 'unificado').totales.usd).toBeCloseTo(61579.591764, 6)
    expect(calcular(p, 'aduana').totales.usd).toBeCloseTo(61579.591764, 6)
    // La garantía va aparte: 32.900 × 0,15, nunca en el total.
    expect(paralelo.valores['garantia']).toBeCloseTo(4935, 9)
  })

  it('la cuenta especial suma 1.000 y entra en la base de la transferencia, nunca en el CIF', () => {
    const r = calcular(p, 'unificado', { banderas: { cuenta_especial_usa: true } })
    // transferencia = (32.900 + 4.277 + 1.000) × 0,04 = 1.527,08; la suma crece 1.000 + 40.
    expect(r.valores['transferencia']).toBeCloseTo(1527.08, 9)
    expect(r.valores['cif']).toBeCloseTo(43597.2, 9)
    expect(r.totales.usd).toBeCloseTo(61579.591764 + 1040, 6)
  })

  it('las variantes de V1: el híbrido suma el export, la moto no lleva documentación y USA → Chile no nacionaliza', () => {
    const hibrido = calcular(p, 'unificado', { variante: 'hibrido' })
    expect(hibrido.totales.usd).toBeCloseTo(61579.591764 + 500, 6)
    const chile = calcular(p, 'unificado', {
      variante: 'chile',
      inputs: { transporte_bolivia: 0, transporte_chile: 3700 },
    })
    // Sin documentación ni nacionalización: 44.914,08 − 700.
    expect(chile.estados['nacionalizacion']).toBe('fuera_de_variante')
    expect(chile.totales.usd).toBeCloseTo(44214.08, 6)
    // La moto: la depreciación de V1 para motos (`usa_moto`, 5 % en 2026) y sin documentación.
    const moto = calcular(p, 'unificado', { variante: 'moto' })
    expect(moto.valores['factor']).toBeCloseTo(0.05, 9)
    expect(moto.valores['documentacion']).toBe(0)
  })

  it('congela la depreciación de V1: `usa` tal cual y `usa_moto` (porcentajes enteros) como factor', () => {
    const tablas = p.formula.params['tablas'] as Record<string, { anio: number; factor: number }[]>
    expect(tablas['depreciacion']?.map((f) => [f.anio, f.factor])).toEqual([
      [2026, 1],
      [2025, 0.8],
      [2024, 0.64],
      [2023, 0.512],
      [2022, 0.41],
      [2021, 0.328],
      [2020, 0.328],
      [2019, 0.328],
      [2018, 0.326],
    ])
    // `quote_depreciation_factors` de V1, scope `usa_moto`: 5, 10, 20, 25 y 30 (%).
    const deV1 = [5, 10, 20, 25, 30, 30, 30, 30, 30]
    expect(tablas['depreciacion_moto']?.map((f) => f.factor)).toEqual(deV1.map((x) => x / 100))
  })
})

// El caso «excel» de `casos-de-formula.json` (las cifras de `semilla-cifras.test.ts`), con los tipos de cambio de su hoja (9,73 y 10) y lo tipeado en ella. Dos
// diferencias de estructura con V1: el transporte de V1 se tipea (el Excel lo saca de una tabla por tipo de vehículo, con el mismo valor) y V1 tiene una sola
// comisión de 500, cuando el Excel cobra 400 en la moto y en Chile: ahí se sobrescribe a 400, como en la hoja.
describe('la plantilla de V1 «USA (subasta)» reproduce las cifras del Excel en las cuatro variantes', () => {
  const hoja = { tipos_cambio: { oficial: 9.73, paralelo: 10 } }

  it('la moto: 16.826,354', () => {
    const r = calcular(p, undefined, {
      ...hoja,
      variante: 'moto',
      inputs: { remate: 9500, grua: 880, transporte_bolivia: 1300 },
      overrides: { fees: 1300, comision: 400, nacionalizacion: 3098 },
    })
    expect(r.totales.usd).toBeCloseTo(16826.354, 6)
    expect(r.totales.suma_usd).toBeCloseTo(16910, 6)
  })

  it('el auto a gasolina: 43.756,416', () => {
    const r = calcular(p, undefined, {
      ...hoja,
      inputs: { remate: 14000, grua: 1300, transporte_bolivia: 3600 },
      overrides: { nacionalizacion: 21792 },
    })
    expect(r.totales.usd).toBeCloseTo(43756.416, 6)
    expect(r.totales.suma_usd).toBeCloseTo(44344.8, 6)
  })

  it('el híbrido: 61.710,6', () => {
    const r = calcular(p, undefined, {
      ...hoja,
      variante: 'hibrido',
      inputs: { remate: 30000, grua: 1500, transporte_bolivia: 3600 },
      overrides: { nacionalizacion: 20200 },
    })
    expect(r.totales.usd).toBeCloseTo(61710.6, 6)
    expect(r.totales.suma_usd).toBeCloseTo(62256, 6)
  })

  it('EE. UU. → Chile: 20.157,6', () => {
    const r = calcular(p, undefined, {
      ...hoja,
      variante: 'chile',
      inputs: { remate: 13000, grua: 1180, transporte_bolivia: 0, transporte_chile: 3300 },
      overrides: { comision: 400 },
    })
    expect(r.totales.usd).toBeCloseTo(20157.6, 6)
  })
})
