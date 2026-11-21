import { beforeEach, describe, expect, it, vi } from 'vitest'
import { leerCursor, TAMANO_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'

const llamadas: unknown[][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
let modos: { data: unknown; error: unknown } = { data: [], error: null }
const perfiles = [
  { id: '00000000-0000-4000-8000-000000000099', nombre: 'Gala Ríos', email: 'gala@ejemplo.com' },
]
vi.mock('@/shared/lib/supabase/browser', () => ({
  createClient: () => ({
    rpc: (nombre: string, args: unknown) => {
      llamadas.push(['rpc', nombre, args])
      return Promise.resolve(nombre === 'cotizaciones_modos_de' ? modos : respuesta)
    },
    from: (tabla: string) => ({
      select: () => ({
        in: (_columna: string, ids: unknown) => ({
          limit: (n: number) => {
            llamadas.push(['from', tabla, ids, n])
            return Promise.resolve({ data: perfiles, error: null })
          },
        }),
      }),
    }),
  }),
}))

import { leerGrupoDelListado } from './grupo-del-listado.client'

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const fila = (i: number) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  numero: 100 - i,
  origen_id: '00000000-0000-4000-8000-0000000000a1',
  lead_id: null,
  vehiculo_id: VEHICULO,
  creado_por: '00000000-0000-4000-8000-000000000099',
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  total_base: 10,
  moneda_mostrar: null,
  creado_en: `2026-10-29T08:${String(59 - i).padStart(2, '0')}:00.123456+00:00`,
  vence_el: '2026-11-05',
  vencida: false,
  privada: false,
})

describe('leerGrupoDelListado', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
    modos = { data: [], error: null }
  })

  it('sin texto, el listado del vehículo con los filtros de la página, de a TAMANO_DE_ESTE_VEHICULO', async () => {
    respuesta = {
      data: Array.from({ length: TAMANO_DE_ESTE_VEHICULO + 1 }, (_, i) => fila(i)),
      error: null,
    }
    modos = { data: [{ id: fila(0).id, modo: 'Oficial' }], error: null }
    const leida = await leerGrupoDelListado({ vehiculoId: VEHICULO, clase: 'final', cursor: null })
    expect(llamadas[0]?.slice(0, 2)).toEqual(['rpc', 'cotizaciones_listado'])
    expect(llamadas[0]?.[2]).toMatchObject({
      p_vehiculo: VEHICULO,
      p_clase: 'final',
      p_tamano: TAMANO_DE_ESTE_VEHICULO,
    })
    if (!leida.ok) throw new Error('debía leer')
    expect(leida.data.filas).toHaveLength(TAMANO_DE_ESTE_VEHICULO)
    expect(leida.data.filas[0]?.autor).toBe('Gala Ríos')
    // El modo de las que lo tienen; sin él, nulo.
    expect(leida.data.filas[0]?.modo).toBe('Oficial')
    expect(leida.data.filas[1]?.modo).toBeNull()
    expect(llamadas.filter((l) => l[1] === 'cotizaciones_modos_de')).toHaveLength(1)
    expect(leerCursor(leida.data.siguiente)?.id).toBe(fila(TAMANO_DE_ESTE_VEHICULO - 1).id)
    // Los autores, una vez por página y sólo los de la página.
    expect(llamadas.filter((l) => l[0] === 'from')).toEqual([
      ['from', 'perfiles', [fila(0).creado_por], 1],
    ])
  })

  it('si el modo no se puede leer, la página sirve igual con el total sin su modo', async () => {
    respuesta = { data: [fila(0)], error: null }
    modos = { data: null, error: { message: 'x', code: '500' } }
    const leida = await leerGrupoDelListado({ vehiculoId: VEHICULO, cursor: null })
    if (!leida.ok) throw new Error('debía leer')
    expect(leida.data.filas[0]?.modo).toBeNull()
  })

  it('con texto, la búsqueda del vehículo', async () => {
    await leerGrupoDelListado({ vehiculoId: VEHICULO, texto: 'hilux', cursor: null })
    expect(llamadas[0]?.slice(0, 2)).toEqual(['rpc', 'cotizaciones_buscar'])
    expect(llamadas[0]?.[2]).toMatchObject({ p_texto: 'hilux', p_vehiculo: VEHICULO })
  })

  it('un error de la base vuelve como valor, sin leer los autores', async () => {
    respuesta = { data: null, error: { message: 'x', code: '500' } }
    const leida = await leerGrupoDelListado({ vehiculoId: VEHICULO, cursor: null })
    expect(leida.ok).toBe(false)
    expect(llamadas.filter((l) => l[0] === 'from')).toHaveLength(0)
    expect(llamadas.filter((l) => l[1] === 'cotizaciones_modos_de')).toHaveLength(0)
  })
})
