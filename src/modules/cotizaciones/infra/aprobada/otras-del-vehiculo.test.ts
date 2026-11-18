import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Un cliente falso que anota lo que la consulta pide y devuelve lo que se le diga.
const llamadas: [string, ...unknown[]][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
const consulta: Record<string, unknown> = {}
for (const nombre of ['select', 'eq', 'neq', 'order', 'limit']) {
  consulta[nombre] = (...args: unknown[]) => {
    llamadas.push([nombre, ...args])
    return nombre === 'limit' ? Promise.resolve(respuesta) : consulta
  }
}
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: (tabla: string) => {
        llamadas.push(['from', tabla])
        return consulta
      },
    }),
  ),
}))

import { getOtrasDelVehiculo } from './otras-del-vehiculo'

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const ACTUAL = '00000000-0000-4000-8000-0000000000bb'
const filas = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  }))

describe('getOtrasDelVehiculo: las otras cotizaciones del vehículo, acotadas', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
  })

  it('el vehículo sin la actual, por el orden del índice y 101 filas (nunca un count)', async () => {
    await getOtrasDelVehiculo(VEHICULO, ACTUAL)
    expect(llamadas).toContainEqual(['from', 'cotizaciones'])
    expect(llamadas).toContainEqual(['select', 'id'])
    expect(llamadas).toContainEqual(['eq', 'vehiculo_id', VEHICULO])
    expect(llamadas).toContainEqual(['neq', 'id', ACTUAL])
    expect(llamadas).toContainEqual(['order', 'creado_en', { ascending: false }])
    expect(llamadas.at(-1)).toEqual(['limit', 101])
  })

  it('100 o menos es exacto; 101 es «más de 100»', async () => {
    respuesta = { data: filas(2), error: null }
    expect(await getOtrasDelVehiculo(VEHICULO, ACTUAL)).toEqual({
      ok: true,
      data: { n: 2, hayMas: false },
    })
    respuesta = { data: filas(101), error: null }
    expect(await getOtrasDelVehiculo(VEHICULO, ACTUAL)).toEqual({
      ok: true,
      data: { n: 100, hayMas: true },
    })
  })

  it('un id que no es un guid no consulta; un error de la base vuelve como valor', async () => {
    expect((await getOtrasDelVehiculo('x', ACTUAL)).ok).toBe(false)
    expect(llamadas).toHaveLength(0)
    respuesta = { data: null, error: { code: '42501', message: 'no' } }
    expect((await getOtrasDelVehiculo(VEHICULO, ACTUAL)).ok).toBe(false)
  })
})
