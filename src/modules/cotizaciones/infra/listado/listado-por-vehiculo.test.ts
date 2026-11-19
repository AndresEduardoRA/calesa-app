import { beforeEach, describe, expect, it, vi } from 'vitest'
import { leerCursor } from '@/shared/lib/paginacion'

vi.mock('server-only', () => ({}))

const llamadas: [string, unknown][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      rpc: (nombre: string, argumentos: unknown) => {
        llamadas.push([nombre, argumentos])
        return Promise.resolve(respuesta)
      },
    }),
  ),
}))

import { getListadoPorVehiculo } from './listado-por-vehiculo'

const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
const VEHICULO = '00000000-0000-4000-8000-0000000000bb'
const id = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const instante = (i: number) => `2026-03-01T12:00:${String(59 - i).padStart(2, '0')}.000001+00:00`

const cabeza = (i: number, extra: Record<string, unknown> = {}) => ({
  orden_en: instante(i),
  orden_id: id(i),
  id: id(i),
  numero: 1000 + i,
  origen_id: ORIGEN,
  lead_id: null,
  vehiculo_id: VEHICULO,
  creado_por: id(99),
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  total_base: 10,
  moneda_mostrar: null,
  creado_en: instante(i),
  vence_el: '2026-03-08',
  vencida: false,
  ...extra,
})
const grupo = (i: number, n: number, extra: Record<string, unknown> = {}) => ({
  tipo: 'grupo',
  ...cabeza(i, extra),
  grupo_n: n,
})
const suelta = (i: number) => ({
  tipo: 'suelta',
  ...cabeza(i, { vehiculo_id: null }),
  grupo_n: null,
})
const cortada = (i: number) => ({
  tipo: 'cortada',
  orden_en: instante(i),
  orden_id: id(i),
  ...Object.fromEntries(
    [
      'id',
      'numero',
      'origen_id',
      'lead_id',
      'vehiculo_id',
      'creado_por',
      'clase',
      'estado',
      'titulo',
      'total_base',
      'moneda_mostrar',
      'creado_en',
      'vence_el',
      'vencida',
      'grupo_n',
    ].map((k) => [k, null]),
  ),
})

describe('getListadoPorVehiculo', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
  })

  it('pide la RPC agrupada con sus filtros y sin el vehículo ni el texto', async () => {
    await getListadoPorVehiculo({ cursor: null, tamano: 25, origenId: ORIGEN, mias: true })
    expect(llamadas[0]?.[0]).toBe('cotizaciones_listado_por_vehiculo')
    const argumentos = llamadas[0]?.[1] as Record<string, unknown>
    expect(
      Object.fromEntries(Object.entries(argumentos).filter(([, v]) => v !== undefined)),
    ).toEqual({
      p_tamano: 25,
      p_origen: ORIGEN,
      p_mias: true,
      p_hacia_atras: false,
    })
  })

  it('con búsqueda o con vehículo no lee: la página no agrupa', async () => {
    expect((await getListadoPorVehiculo({ cursor: null, tamano: 25, texto: 'hilux' })).ok).toBe(
      false,
    )
    expect(
      (await getListadoPorVehiculo({ cursor: null, tamano: 25, vehiculoId: VEHICULO })).ok,
    ).toBe(false)
    expect(llamadas).toHaveLength(0)
  })

  it('arma grupos y sueltas: el cursor va por la cotización que ordena, no por la que representa al grupo', async () => {
    respuesta = { data: [grupo(1, 3, { id: id(50) }), suelta(2), grupo(3, 101)], error: null }
    const leida = await getListadoPorVehiculo({ cursor: null, tamano: 2 })
    if (!leida.ok) throw new Error('debía leer')
    const [g, s] = leida.data.filas
    expect(g?.tipo === 'grupo' && [g.ordenId, g.cabeza.id, g.conteo]).toEqual([
      id(1),
      id(50),
      { n: 3, hayMas: false },
    ])
    expect(s?.tipo).toBe('suelta')
    expect(leerCursor(leida.data.siguiente)).toEqual({
      instante: instante(2),
      id: id(2),
      sentido: 'siguiente',
    })
    expect(leida.data.cortada).toBeNull()
  })

  it('una página cortada sigue desde donde quedó la base: es «Seguir buscando» y también «Siguiente»', async () => {
    respuesta = { data: [grupo(1, 101), cortada(40)], error: null }
    const leida = await getListadoPorVehiculo({ cursor: null, tamano: 25 })
    if (!leida.ok) throw new Error('debía leer')
    expect(leida.data.filas).toHaveLength(1)
    expect(leerCursor(leida.data.cortada)).toEqual({
      instante: instante(40),
      id: id(40),
      sentido: 'siguiente',
    })
    expect(leida.data.siguiente).toBe(leida.data.cortada)
  })

  it('hacia atrás, la cortada es «Anterior»', async () => {
    respuesta = { data: [cortada(3)], error: null }
    const leida = await getListadoPorVehiculo({
      cursor: { instante: instante(9), id: id(9), sentido: 'anterior' },
      tamano: 25,
    })
    if (!leida.ok) throw new Error('debía leer')
    expect(leida.data.filas).toHaveLength(0)
    expect(leerCursor(leida.data.anterior)).toEqual({
      instante: instante(3),
      id: id(3),
      sentido: 'anterior',
    })
  })

  it('una fila que no tiene la forma (un grupo sin conteo) no se dibuja a medias', async () => {
    respuesta = { data: [{ ...grupo(1, 3), grupo_n: null }], error: null }
    expect((await getListadoPorVehiculo({ cursor: null, tamano: 25 })).ok).toBe(false)
  })
})
