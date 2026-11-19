import { describe, expect, it } from 'vitest'
import type { Entradas } from './entradas'
import type { SeccionDeHoja } from './hoja'
import { comunesIguales, conLoComunDe, nodosEnParDeLaHoja } from './entradas-en-par'

const entradas = (e: Partial<Entradas>): Entradas => ({
  inputs: new Map(),
  banderas: new Set(),
  overrides: new Map(),
  variante: null,
  modoTc: null,
  atajos: new Map(),
  ...e,
})

const celda = (nodo: string, extra: Record<string, unknown> = {}) => ({
  tipo: 'celda',
  nodo,
  ...extra,
})
const secciones = [
  {
    items: [
      celda('precio'),
      celda('transporte', { enPar: true }),
      celda('seguro', { enPar: true, secundario: { nodo: 'seguro_pct' } }),
      { tipo: 'subtotal', nodo: 'total', enPar: true },
      { tipo: 'subtotal', nodo: 'cif' },
    ],
  },
] as unknown as SeccionDeHoja[]

describe('las entradas de una hoja en par', () => {
  it('los nodos en par: las celdas con su porcentaje y los subtotales que lo dicen', () => {
    expect([...nodosEnParDeLaHoja(secciones)]).toEqual([
      'transporte',
      'seguro',
      'seguro_pct',
      'total',
    ])
  })

  it('lo común viene de la que se abrió y lo de cada opción queda suyo', () => {
    const enPar = nodosEnParDeLaHoja(secciones)
    const abierta = entradas({
      inputs: new Map([
        ['precio', 100],
        ['transporte', 10],
      ]),
      banderas: new Set(['hibrido']),
      modoTc: 'oficial',
    })
    const hermana = entradas({
      inputs: new Map([
        ['precio', 90],
        ['transporte', 20],
        ['seguro_pct', 0.02],
      ]),
      overrides: new Map([['transporte', 25]]),
      modoTc: 'paralelo',
    })
    const unida = conLoComunDe(hermana, abierta, enPar)
    expect(Object.fromEntries(unida.inputs)).toEqual({
      precio: 100,
      transporte: 20,
      seguro_pct: 0.02,
    })
    expect(Object.fromEntries(unida.overrides)).toEqual({ transporte: 25 })
    expect([...unida.banderas]).toEqual(['hibrido'])
    expect(unida.modoTc).toBe('oficial')
    expect(comunesIguales(abierta, hermana, enPar)).toBe(false)
    expect(comunesIguales(abierta, unida, enPar)).toBe(true)
  })
})
