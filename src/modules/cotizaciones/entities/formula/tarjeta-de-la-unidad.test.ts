import { describe, expect, it } from 'vitest'
import type { LecturaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { calculoDeLaUnidad, idsDeLaLectura } from './tarjeta-de-la-unidad'
import type { VistaPrevia } from './vista-previa'

const lectura: LecturaEnCuadricula = {
  definicion: { forma: 2, columnas: [], filas: [], celdas: [] },
  nodos: [
    { id: 'fees', etiqueta: 'Fees', descripcion: null, grupo: 'compra', pct: null },
    { id: 'comision', etiqueta: 'Comisión', descripcion: null, grupo: 'compra', pct: 'tasa' },
    { id: 'borrada', etiqueta: 'Borrada', descripcion: null, grupo: null, pct: null },
  ],
  grupos: [{ id: 'compra', etiqueta: 'Compra', plazo: null, bucket: 'b' }],
  tiposDeCambio: {
    buckets: [{ bucket: 'b', nombre: 'TC', nodo: 'tc' }],
    modos: [{ modo: 'm', bucket: 'b', nombre: 'TP', nodo: 'tp' }],
  },
  modos: [{ clave: 'm', nombre: 'Paralelo' }],
  variante: { nodo: 'via', opciones: [{ clave: 'a', titulo: 'A' }] },
  colores: [],
  total: { nodo: 'total' },
}

const vista: VistaPrevia = {
  tipo: 'calculada',
  valores: new Map<string, number | string | null>([
    ['fees', 100],
    ['comision', 4],
    ['tasa', 0.04],
    ['tc', 6.96],
    ['tp', 10],
    ['via', 'a'],
    ['total', 104],
    ['secreto', 999],
  ]),
  estados: new Map([
    ['fees', 'activo'],
    ['comision', 'condicion_apagada'],
    ['secreto', 'activo'],
  ]),
  faltantes: new Map(),
  totales: { usd: 104, bs: 723.84, monedaBs: 'BOB' },
  grupos: new Map(),
}

describe('idsDeLaLectura', () => {
  it('los nodos, su pct, los tipos de cambio de cada bucket y modo, la variante y el total', () => {
    expect([...idsDeLaLectura(lectura)].sort()).toEqual(
      ['borrada', 'comision', 'fees', 'tasa', 'tc', 'total', 'tp', 'via'].sort(),
    )
  })
})

describe('calculoDeLaUnidad', () => {
  it('sólo los valores de lo que la tarjeta nombra, con los estados del motor y sus totales', () => {
    const c = calculoDeLaUnidad(vista, lectura, 'm', true)
    expect(c.valores.has('secreto')).toBe(false)
    expect(Object.fromEntries(c.valores)).toEqual({
      fees: 100,
      comision: 4,
      tasa: 0.04,
      tc: 6.96,
      tp: 10,
      via: 'a',
      total: 104,
    })
    expect(Object.fromEntries(c.estados ?? [])).toEqual({
      fees: 'activo',
      comision: 'condicion_apagada',
    })
    expect(c.totales).toEqual({ usd: 104, bs: 723.84 })
    expect(c.modoTc).toBe('m')
    expect(c.verTotalBs).toBe(true)
  })

  it('un nodo que la fórmula de trabajo ya no tiene queda sin estado (su fila no se dibuja)', () => {
    expect(calculoDeLaUnidad(vista, lectura, null, false).estados?.has('borrada')).toBe(false)
  })

  it('sin cifra: las filas a la vista, sin valores ni totales', () => {
    for (const sin of [null, { tipo: 'no_valida' } as const, { tipo: 'no_calcula' } as const]) {
      const c = calculoDeLaUnidad(sin, lectura, null, false)
      expect(c.valores.size).toBe(0)
      expect([...(c.estados ?? new Map()).values()]).toEqual(['activo', 'activo', 'activo'])
      expect(c.totales).toEqual({ usd: null, bs: null })
    }
  })
})
