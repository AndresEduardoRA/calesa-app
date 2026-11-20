import { describe, expect, it } from 'vitest'
import type { CalculoDeLaTarjeta } from './calculo-de-la-tarjeta'
import type { ContextoDeLaCotizacion } from './contexto-de-la-cotizacion'
import {
  calculoDeLaReferencia,
  recortarLaReferencia,
  referenciaPlana,
  type ReferenciaLeida,
} from './referencia-de-la-tarjeta'

const CONTEXTO: ContextoDeLaCotizacion = {
  fecha: '6 nov 2026',
  numero: '12',
  titulo: 'Hilux',
  asesor: 'Ana Pérez',
  cliente: null,
  vehiculo: null,
  venceEl: null,
  empresa: null,
  logo: null,
}

const calculo = (mas: Partial<CalculoDeLaTarjeta> = {}): CalculoDeLaTarjeta => ({
  valores: new Map<string, number | string | null>([
    ['remate', 1000],
    ['variante', 'moto'],
    ['__proto__', 7],
    ['constructor', null],
  ]),
  estados: new Map([
    ['remate', 'activo'],
    ['fees', 'fuera_de_variante'],
    ['__proto__', 'activo'],
  ]),
  totales: { usd: 1355, bs: 9430.8 },
  modoTc: 'paralelo',
  verTotalBs: true,
  ...mas,
})

const DATOS = { numero: 12, monedaBs: 'BOB', contexto: CONTEXTO }

const leida = (r: ReturnType<typeof referenciaPlana>): ReferenciaLeida => {
  if (r.estado !== 'cotizacion') throw new Error('sin referencia')
  return r
}

describe('referenciaPlana', () => {
  it('lleva lo guardado plano (arreglos, sin `Map`), el número, la moneda local y el contexto', () => {
    const r = leida(referenciaPlana(calculo(), DATOS))
    expect(r.numero).toBe(12)
    expect(r.monedaBs).toBe('BOB')
    expect(r.contexto).toBe(CONTEXTO)
    expect(r.valores).toContainEqual(['remate', 1000])
    expect(r.estados).toContainEqual(['fees', 'fuera_de_variante'])
    expect(r.totales).toEqual({ usd: 1355, bs: 9430.8 })
    expect(r.modoTc).toBe('paralelo')
    expect(r.verTotalBs).toBe(true)
    // Cruza props: es JSON tal cual.
    expect(JSON.parse(JSON.stringify(r))).toEqual(r)
  })

  it('sin estados (el primer recálculo falló) no hay referencia: la tarjeta caería a la de por omisión', () => {
    expect(referenciaPlana(calculo({ estados: null }), DATOS)).toEqual({ estado: 'no_se_leyo' })
  })
})

describe('recortarLaReferencia', () => {
  it('deja sólo los valores y estados de los ids pedidos; sin cotización, tal cual', () => {
    const r = recortarLaReferencia(referenciaPlana(calculo(), DATOS), new Set(['remate', 'fees']))
    expect(leida(r).valores).toEqual([['remate', 1000]])
    expect(leida(r).estados).toEqual([
      ['remate', 'activo'],
      ['fees', 'fuera_de_variante'],
    ])
    expect(recortarLaReferencia({ estado: 'sin_cotizacion' }, new Set())).toEqual({
      estado: 'sin_cotizacion',
    })
  })
})

describe('calculoDeLaReferencia', () => {
  it('vuelve al cálculo de la geometría (ida y vuelta), con `__proto__` y `constructor` como ids', () => {
    const original = calculo()
    const vuelta = calculoDeLaReferencia(leida(referenciaPlana(original, DATOS)))
    expect(vuelta).toEqual(original)
    expect(vuelta.valores.get('__proto__')).toBe(7)
    expect(vuelta.valores.has('constructor')).toBe(true)
    expect(vuelta.estados?.get('__proto__')).toBe('activo')
    expect(vuelta.estados?.has('constructor')).toBe(false)
  })
})
