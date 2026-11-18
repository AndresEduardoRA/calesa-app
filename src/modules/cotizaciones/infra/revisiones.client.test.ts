import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'

const llamadas: [string, Record<string, unknown>][] = []
let respuesta: { data: unknown; error: unknown } = { data: null, error: null }
// La lectura de los títulos (`from('vehiculos')`): lo que pidió, en orden, y lo que responde.
const pedidoDeTitulos: [string, unknown[]][] = []
let titulos: { data: unknown; error: unknown } = { data: [], error: null }
const consulta = {
  select: (columnas: string) => (pedidoDeTitulos.push(['select', [columnas]]), consulta),
  in: (columna: string, ids: unknown[]) => (pedidoDeTitulos.push(['in', [columna, ids]]), consulta),
  is: (columna: string, valor: unknown) => (
    pedidoDeTitulos.push(['is', [columna, valor]]),
    consulta
  ),
  limit: (n: number) => (pedidoDeTitulos.push(['limit', [n]]), Promise.resolve(titulos)),
}
vi.mock('@/shared/lib/supabase/browser', () => ({
  createClient: () => ({
    rpc: (nombre: string, args: Record<string, unknown>) => {
      llamadas.push([nombre, args])
      return Promise.resolve(respuesta)
    },
    from: (tabla: string) => (pedidoDeTitulos.push(['from', [tabla]]), consulta),
  }),
}))

import { leerRevisiones } from './revisiones.client'

const COTIZACION = '00000000-0000-4000-8000-0000000000aa'
const buena = {
  revisiones: [
    {
      id: 5,
      usuario_id: null,
      creado_en: '2026-11-04T10:00:00+00:00',
      autor: null,
      diff: {},
    },
  ],
  hay_mas: true,
  siguiente: 5,
  etiquetas: { nodos: {}, grupos: {} },
}

describe('leerRevisiones: las revisiones desde el navegador', () => {
  beforeEach(() => {
    llamadas.length = 0
    pedidoDeTitulos.length = 0
    respuesta = { data: buena, error: null }
  })

  it('manda p_tamano de «Ver más» y p_antes sólo con cursor', async () => {
    await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(llamadas[0]).toEqual([
      'cotizacion_revisiones',
      { p_cotizacion: COTIZACION, p_tamano: TAMANO_DE_VER_MAS },
    ])
    await leerRevisiones({ cotizacionId: COTIZACION, antes: 5, hasta: null })
    expect(llamadas[1]?.[1]).toEqual({
      p_cotizacion: COTIZACION,
      p_tamano: TAMANO_DE_VER_MAS,
      p_antes: 5,
    })
  })

  it('manda p_hasta sólo si llega, y con los dos manda los dos', async () => {
    const hasta = '2026-10-14T04:00:00.000Z'
    await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta })
    expect(llamadas[0]?.[1]).toEqual({
      p_cotizacion: COTIZACION,
      p_tamano: TAMANO_DE_VER_MAS,
      p_hasta: hasta,
    })
    await leerRevisiones({ cotizacionId: COTIZACION, antes: 5, hasta })
    expect(llamadas[1]?.[1]).toEqual({
      p_cotizacion: COTIZACION,
      p_tamano: TAMANO_DE_VER_MAS,
      p_antes: 5,
      p_hasta: hasta,
    })
    await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(llamadas[2]?.[1]).toEqual({ p_cotizacion: COTIZACION, p_tamano: TAMANO_DE_VER_MAS })
  })

  it('da la página leída', async () => {
    const r = await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(r.ok && r.data.siguiente).toBe(5)
    expect(r.ok && r.data.revisiones).toHaveLength(1)
  })

  it('el error de la base cruza como valor', async () => {
    respuesta = {
      data: null,
      error: { code: '42501', message: 'No tienes acceso a esta cotización.' },
    }
    const r = await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error.codigo).toBe('sin_permiso')
  })

  it('una respuesta que no es lo prometido es «inesperado»', async () => {
    respuesta = { data: { revisiones: 'no' }, error: null }
    const r = await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(!r.ok && r.error.codigo).toBe('inesperado')
  })
})

describe('leerRevisiones › los nombres de un cambio de vehículo (T315)', () => {
  const A = '00000000-0000-4000-8000-0000000000a1'
  const B = '00000000-0000-4000-8000-0000000000b2'
  const conCambio = {
    ...buena,
    revisiones: [{ ...buena.revisiones[0], diff: { vehiculo_id: { de: A, a: B } } }],
  }

  beforeEach(() => {
    llamadas.length = 0
    pedidoDeTitulos.length = 0
    respuesta = { data: conCambio, error: null }
    titulos = { data: [{ id: B, titulo: 'Mazda 3' }], error: null }
  })

  it('sin un cambio de vehículo en la página no lee nada más', async () => {
    respuesta = { data: buena, error: null }
    await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(pedidoDeTitulos).toEqual([])
  })

  it('lee una vez los títulos por id, sin la papelera y con el tope de los ids; lo que no volvió no se ve', async () => {
    const r = await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(pedidoDeTitulos).toEqual([
      ['from', ['vehiculos']],
      ['select', ['id, titulo']],
      ['in', ['id', [A, B]]],
      ['is', ['eliminado_en', null]],
      ['limit', [2]],
    ])
    expect(r.ok && r.data.revisiones[0]?.vehiculo).toEqual({
      de: 'oculto',
      a: { titulo: 'Mazda 3' },
    })
  })

  it('si la lectura de los títulos falla, la página llega igual, sin nombres', async () => {
    titulos = { data: null, error: { code: 'XX000', message: 'boom' } }
    const r = await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(r.ok).toBe(true)
    expect(r.ok && r.data.revisiones[0]?.vehiculo).toBeNull()
  })
})
