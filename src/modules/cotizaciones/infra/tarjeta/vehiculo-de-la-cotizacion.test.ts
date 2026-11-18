import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const lecturas: unknown[][] = []
let fila: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: (tabla: string) => ({
        select: (columnas: string) => ({
          eq: (columna: string, valor: string) => ({
            is: (nula: string) => ({
              limit: (n: number) => {
                lecturas.push([tabla, columnas, columna, valor, nula, n])
                return Promise.resolve(fila)
              },
            }),
          }),
        }),
      }),
    }),
  ),
}))

import { getVehiculoDeLaCotizacion } from './vehiculo-de-la-cotizacion'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const VEHICULO = '00000000-0000-4000-8000-0000000000aa'

describe('getVehiculoDeLaCotizacion', () => {
  beforeEach(() => {
    lecturas.length = 0
    fila = { data: [], error: null }
  })

  it('lee sólo el vehículo, por clave primaria, sin la papelera y con limit(1)', async () => {
    fila = { data: [{ vehiculo_id: VEHICULO }], error: null }
    expect(await getVehiculoDeLaCotizacion(ID)).toEqual({ ok: true, data: VEHICULO })
    expect(lecturas).toEqual([['cotizaciones', 'vehiculo_id', 'id', ID, 'eliminado_en', 1]])
  })

  it('sin fila (no se ve) o sin vehículo, nulo', async () => {
    expect(await getVehiculoDeLaCotizacion(ID)).toEqual({ ok: true, data: null })
    fila = { data: [{ vehiculo_id: null }], error: null }
    expect(await getVehiculoDeLaCotizacion(ID)).toEqual({ ok: true, data: null })
  })

  it('un error de la base sube como error', async () => {
    fila = { data: null, error: { code: '500', message: 'x' } }
    expect((await getVehiculoDeLaCotizacion(ID)).ok).toBe(false)
  })
})
