// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const ORIGEN = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const OTRO = '00000000-0000-4000-8000-0000000000aa'
const PERSONA = '55555555-5555-4555-8555-555555555555'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origenId: string | null; alcance: 'propios' | 'todos' }[],
  estado: null as unknown,
  layout: null as unknown,
}))

vi.mock('@/modules/equipo', () => ({
  requerirSesion: () => Promise.resolve({ usuarioId: PERSONA, permisos: h.permisos }),
}))
vi.mock('@/modules/empresa', () => ({
  getTiposCambio: () =>
    Promise.resolve([
      { clave: 'oficial', nombre: 'Oficial' },
      { clave: 'paralelo', nombre: 'Paralelo' },
    ]),
}))
vi.mock('@/modules/origenes', () => ({
  getOrigenes: () =>
    Promise.resolve({
      ok: true,
      data: [{ id: ORIGEN, nombre: 'Importadora USA', activo: true, color: '#000' }],
    }),
  leerLayout: () => Promise.resolve(h.layout),
}))
// El área de verdad, con su lectura de la base falsa: lo que viaja es lo que arma `datosDePlantillasDeV1()` con los cuatro paquetes.
vi.mock('@/modules/cotizaciones/infra/plantilla/plantillas-de-v1-de-la-sesion', () => ({
  plantillasDeV1Supabase: { leerEstado: () => Promise.resolve(h.estado), aplicar: vi.fn() },
}))

const { leerPlantillasDeV1 } = await import('@/modules/cotizaciones/areas/plantilla/composicion')
vi.mock('@/modules/cotizaciones', () => ({ leerPlantillasDeV1 }))

const { GET } = await import('./route')

const pedir = (id = ORIGEN) =>
  GET(new Request(`http://localhost/configuracion/cotizacion/${id}/plantillas-de-v1`), {
    params: Promise.resolve({ origen: id }),
  })

beforeEach(() => {
  h.permisos = [{ clave: 'cotizaciones.configurar', origenId: ORIGEN, alcance: 'todos' }]
  h.estado = {
    ok: true,
    data: {
      formula: {
        creadoPor: PERSONA,
        autor: 'Ana',
        actualizadoEn: '2026-11-19T20:00:00.123456+00:00',
      },
      tarjeta: null,
      catalogo: [],
    },
  }
  h.layout = {
    ok: true,
    data: { campos: [{ clave: 'tipo_vehiculo', activo: false }], categorias: [] },
  }
})

describe('GET /configuracion/cotizacion/<origen>/plantillas-de-v1', () => {
  it('sin cotizaciones.configurar del origen (o con el de otro), o con un id que no es un uuid: 404 en texto', async () => {
    h.permisos = [{ clave: 'cotizaciones.configurar', origenId: OTRO, alcance: 'todos' }]
    const sinPermiso = await pedir()
    expect(sinPermiso.status).toBe(404)
    expect(sinPermiso.headers.get('content-type')).toMatch(/^text\/plain/)
    h.permisos = [{ clave: 'cotizaciones.configurar', origenId: ORIGEN, alcance: 'todos' }]
    expect((await pedir('no-es-un-id')).status).toBe(404)
  })

  it('las cuatro plantillas con su lectura y los borradores, sin caché', async () => {
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    const cuerpo = (await r.json()) as {
      plantillas: { clave: string; lectura: { definicion: { forma: number } }; avisos: string[] }[]
      borradores: unknown
    }
    expect(cuerpo.plantillas.map((p) => p.clave)).toEqual(['usa', 'china', 'oficina', 'dealer'])
    expect(cuerpo.plantillas.every((p) => p.lectura.definicion.forma === 2)).toBe(true)
    expect(cuerpo.plantillas.every((p) => p.avisos.length === 0)).toBe(true)
    expect(cuerpo.borradores).toEqual({
      formula: { autor: 'Ana', tuyo: true, actualizadoEn: '2026-11-19T20:00:00.123456+00:00' },
      tarjeta: null,
    })
  })

  it('pesa menos de 80 KB sin comprimir', async () => {
    const r = await pedir()
    expect((await r.arrayBuffer()).byteLength).toBeLessThan(80 * 1024)
  })

  it('una lectura de la base que falla: 500 en texto; una sin permiso, 404', async () => {
    h.estado = { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }
    expect((await pedir()).status).toBe(500)
    h.estado = { ok: false, error: { codigo: 'sin_permiso', mensaje: 'x' } }
    expect((await pedir()).status).toBe(404)
  })
})
