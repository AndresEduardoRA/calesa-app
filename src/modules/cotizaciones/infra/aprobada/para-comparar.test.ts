import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('../../entities/hoja-de-una-guardada-lectura', () => ({
  hojaDeUnaGuardadaDesde: (crudo: unknown) =>
    crudo !== null && typeof crudo === 'object' && 'valida' in crudo ? { leida: crudo } : null,
}))

// Un cliente falso: cada RPC responde lo que diga `rpcs` por id; la lectura de las marcas, `marcas`. Anota lo que se pide.
const llamadas: [string, ...unknown[]][] = []
let rpcs: Record<string, { data: unknown; error: unknown }> = {}
let marcas: { data: unknown; error: unknown } = { data: [], error: null }
const consulta: Record<string, unknown> = {}
for (const nombre of ['select', 'in', 'limit']) {
  consulta[nombre] = (...args: unknown[]) => {
    llamadas.push([nombre, ...args])
    return nombre === 'limit' ? Promise.resolve(marcas) : consulta
  }
}
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      rpc: (nombre: string, args: { p_id: string }) => {
        llamadas.push(['rpc', nombre, args])
        return Promise.resolve(rpcs[args.p_id] ?? { data: null, error: null })
      },
      from: (tabla: string) => {
        llamadas.push(['from', tabla])
        return consulta
      },
    }),
  ),
}))

import { getParaComparar } from './para-comparar'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const V = '88888888-8888-4888-8888-888888888888'

const marca = (id: string, numero: number) => ({
  id,
  numero,
  vehiculo_id: V,
  origen_id: V,
  estado: 'activa',
  perfiles: null,
  cotizaciones_aprobadas: null,
})

describe('getParaComparar: la hoja guardada de cada una y sus marcas, en paralelo', () => {
  beforeEach(() => {
    llamadas.length = 0
    rpcs = {}
    marcas = { data: [marca(A, 1), marca(B, 2), marca(C, 3)], error: null }
  })

  it('una `cotizacion_hoja_guardada` por id (nunca `cotizacion_evaluar`) y las marcas acotadas a los ids', async () => {
    for (const id of [A, B, C]) {
      rpcs[id] = { data: { valida: id }, error: null }
    }
    const leido = await getParaComparar([A, B, C])
    expect(leido.ok).toBe(true)
    const pedidas = llamadas.filter(([q]) => q === 'rpc')
    expect(pedidas).toEqual([
      ['rpc', 'cotizacion_hoja_guardada', { p_id: A }],
      ['rpc', 'cotizacion_hoja_guardada', { p_id: B }],
      ['rpc', 'cotizacion_hoja_guardada', { p_id: C }],
    ])
    expect(llamadas).toContainEqual(['from', 'cotizaciones'])
    expect(llamadas).toContainEqual(['in', 'id', [A, B, C]])
    expect(llamadas.at(-1)).toEqual(['limit', 3])
    if (leido.ok) {
      expect(leido.data.columnas.map((c) => c.id)).toEqual([A, B, C])
      expect(leido.data.marcas.map((m) => m.numero)).toEqual([1, 2, 3])
    }
  })

  it('el 42501 de una columna es `sin_permiso`; otro error o una forma inválida, `fallo`; las demás siguen', async () => {
    rpcs[A] = { data: { valida: A }, error: null }
    rpcs[B] = { data: null, error: { code: '42501', message: 'no' } }
    rpcs[C] = { data: { otra: 'forma' }, error: null }
    const leido = await getParaComparar([A, B, C])
    expect(leido.ok && leido.data.columnas).toEqual([
      { id: A, hoja: { leida: { valida: A } } },
      { id: B, error: 'sin_permiso' },
      { id: C, error: 'fallo' },
    ])
    rpcs[B] = { data: null, error: { code: 'XX000', message: 'boom' } }
    const otra = await getParaComparar([A, B])
    expect(otra.ok && otra.data.columnas[1]).toEqual({ id: B, error: 'fallo' })
  })

  it('si fallan las marcas, o no cumplen, falla todo', async () => {
    marcas = { data: null, error: { code: 'XX000', message: 'boom' } }
    expect((await getParaComparar([A, B])).ok).toBe(false)
    marcas = { data: [{ id: 'x' }], error: null }
    expect(await getParaComparar([A, B])).toMatchObject({
      ok: false,
      error: { codigo: 'inesperado' },
    })
  })
})
