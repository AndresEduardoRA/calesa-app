import { beforeEach, describe, expect, it, vi } from 'vitest'

const llamadas: unknown[][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
const AUTOR = '00000000-0000-4000-8000-000000000099'
vi.mock('@/shared/lib/supabase/browser', () => ({
  createClient: () => ({
    rpc: (nombre: string, args: unknown) => {
      llamadas.push(['rpc', nombre, args])
      return Promise.resolve(
        nombre === 'cotizaciones_modos_de'
          ? { data: [{ id: fila(0).id, modo: 'Unificado' }], error: null }
          : respuesta,
      )
    },
    from: (tabla: string) => ({
      select: () => ({
        in: (_columna: string, ids: unknown) => ({
          limit: (n: number) => {
            llamadas.push(['from', tabla, ids, n])
            return Promise.resolve({
              data:
                tabla === 'perfiles'
                  ? [{ id: AUTOR, nombre: 'Gala Ríos', email: 'gala@ejemplo.com' }]
                  : [{ cotizacion_id: fila(1).id }],
              error: null,
            })
          },
        }),
      }),
    }),
  }),
}))

import { leerTarjetasDelLead } from './tarjetas-del-lead.client'

const LEAD = '00000000-0000-4000-8000-0000000000bb'
function fila(i: number) {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    numero: 100 - i,
    origen_id: '00000000-0000-4000-8000-0000000000a1',
    lead_id: LEAD,
    vehiculo_id: null,
    creado_por: AUTOR,
    clase: 'preventa',
    estado: 'activa',
    titulo: `Hilux ${String(i)}`,
    total_base: 10,
    moneda_mostrar: null,
    creado_en: `2026-10-29T08:${String(59 - i).padStart(2, '0')}:00.123456+00:00`,
    vence_el: '2026-11-28',
    vencida: false,
  }
}

describe('leerTarjetasDelLead', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
  })

  it('pide las últimas diez del lead al listado, sin cursor', async () => {
    await leerTarjetasDelLead(LEAD)
    expect(llamadas[0]).toEqual(['rpc', 'cotizaciones_listado', { p_tamano: 10, p_lead: LEAD }])
  })

  it('con once filas dibuja diez, dice que hay más y une autor, modo y aprobada', async () => {
    respuesta = { data: Array.from({ length: 11 }, (_, i) => fila(i)), error: null }
    const leido = await leerTarjetasDelLead(LEAD)
    if (!leido.ok) throw new Error('debía leer')
    expect(leido.data.filas).toHaveLength(10)
    expect(leido.data.hayMas).toBe(true)
    expect(leido.data.filas[0]).toMatchObject({
      autor: 'Gala Ríos',
      modo: 'Unificado',
      aprobada: false,
      venceEl: '2026-11-28',
    })
    expect(leido.data.filas[1]?.aprobada).toBe(true)
  })

  it('con menos de once no hay «Ver más»', async () => {
    respuesta = { data: [fila(0), fila(1)], error: null }
    const leido = await leerTarjetasDelLead(LEAD)
    expect(leido).toMatchObject({ ok: true, data: { hayMas: false } })
  })

  it('un error de la base es un error, no una lista vacía', async () => {
    respuesta = { data: null, error: { message: 'x', code: '42501' } }
    expect((await leerTarjetasDelLead(LEAD)).ok).toBe(false)
  })

  it('un id que no es guid ni llega a la base', async () => {
    expect((await leerTarjetasDelLead('no-es-guid')).ok).toBe(false)
    expect(llamadas).toHaveLength(0)
  })
})
