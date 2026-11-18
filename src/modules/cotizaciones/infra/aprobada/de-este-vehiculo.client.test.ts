import { beforeEach, describe, expect, it, vi } from 'vitest'
import { leerCursor } from '@/shared/lib/paginacion'

const llamadas: [string, ...unknown[]][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('@/shared/lib/supabase/browser', () => ({
  createClient: () => ({
    rpc: (nombre: string, args: unknown) => {
      llamadas.push(['rpc', nombre, args])
      return Promise.resolve(respuesta)
    },
  }),
}))

import { leerDeEsteVehiculo } from './de-este-vehiculo.client'

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const fila = (i: number, extra: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  numero: 100 - i,
  origen_id: '00000000-0000-4000-8000-0000000000a1',
  origen: 'Japón',
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  total: 10,
  moneda: null,
  modo: null,
  autor: 'Gala',
  creado_en: `2026-10-29T08:${String(59 - i).padStart(2, '0')}:00.123456+00:00`,
  editada_en: '2026-10-29T09:00:00.654321+00:00',
  vencida: false,
  aprobada: false,
  fijada: false,
  ...extra,
})

describe('leerDeEsteVehiculo', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
  })

  it('sin cursor pide la primera página de 10 sin borde', async () => {
    await leerDeEsteVehiculo({ vehiculoId: VEHICULO, cursor: null })
    expect(llamadas).toEqual([
      ['rpc', 'cotizaciones_de_este_vehiculo', { p_vehiculo: VEHICULO, p_tamano: 10 }],
    ])
  })

  it('con cursor manda el instante tal cual y el id', async () => {
    const cursor = {
      instante: '2026-10-29T08:00:00.123456+00:00',
      id: fila(3).id,
      sentido: 'siguiente' as const,
    }
    await leerDeEsteVehiculo({ vehiculoId: VEHICULO, cursor })
    expect(llamadas[0]?.[2]).toEqual({
      p_vehiculo: VEHICULO,
      p_tamano: 10,
      p_cursor_en: cursor.instante,
      p_cursor_id: cursor.id,
    })
  })

  it('con 11 filas y la fijada: la página de 10, el cursor desde la décima (no la fijada) y la fijada aparte', async () => {
    respuesta = {
      data: [
        fila(50, { fijada: true, aprobada: true }),
        ...Array.from({ length: 11 }, (_, i) => fila(i)),
      ],
      error: null,
    }
    const leido = await leerDeEsteVehiculo({ vehiculoId: VEHICULO, cursor: null })
    if (!leido.ok) throw new Error('debía leer')
    expect(leido.data.filas).toHaveLength(10)
    expect(leido.data.fijada?.id).toBe(fila(50).id)
    expect(leerCursor(leido.data.siguiente)).toMatchObject({
      id: fila(9).id,
      instante: fila(9).creado_en,
    })
  })

  it('la última página no tiene siguiente; una forma mala o un error vuelven como valor', async () => {
    respuesta = { data: [fila(1)], error: null }
    const ultima = await leerDeEsteVehiculo({ vehiculoId: VEHICULO, cursor: null })
    expect(ultima.ok && ultima.data.siguiente).toBeNull()
    respuesta = { data: [{ id: 'x' }], error: null }
    expect(await leerDeEsteVehiculo({ vehiculoId: VEHICULO, cursor: null })).toMatchObject({
      ok: false,
      error: { codigo: 'inesperado' },
    })
    respuesta = { data: null, error: { code: '42501', message: 'no' } }
    expect((await leerDeEsteVehiculo({ vehiculoId: VEHICULO, cursor: null })).ok).toBe(false)
  })
})
