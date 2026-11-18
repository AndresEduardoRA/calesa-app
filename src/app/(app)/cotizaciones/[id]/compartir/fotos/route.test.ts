// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const sesion = vi.fn()
vi.mock('@/modules/equipo/composicion', () => ({ leerSesion: () => sesion(), servicioAcceso: {} }))
vi.mock('@/shared/lib/navegacion', () => ({
  redirigir: (destino: string) => {
    throw new Error(`redirigido a ${destino}`)
  },
}))
const leerVehiculo = vi.fn()
vi.mock('@/modules/cotizaciones', () => ({
  leerVehiculoDeLaCotizacion: (id: string) => leerVehiculo(id),
  TOPE_DE_FOTOS_PARA_COMPARTIR: 24,
}))
const leerGaleria = vi.fn()
vi.mock('@/modules/vehiculos', () => ({ leerGaleria: (id: string) => leerGaleria(id) }))
vi.mock('@/shared/lib/almacen', () => ({
  urlPublica: (bucket: string, ruta: string) => `https://almacen.test/${bucket}/${ruta}`,
}))

import { GET } from './route'

const ID = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const foto = (n: number) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  ruta: `v/${String(n)}.webp`,
  rutaMiniatura: `v/${String(n)}-m.webp`,
})
const pedir = (id = ID) =>
  GET(new Request(`http://localhost/cotizaciones/${id}/compartir/fotos`), {
    params: Promise.resolve({ id }),
  })

beforeEach(() => {
  sesion.mockResolvedValue({ usuarioId: ID, estado: 'activa', permisos: [] })
  leerVehiculo.mockResolvedValue({ ok: true, data: VEHICULO })
  leerGaleria.mockResolvedValue({ ok: true, data: { fotos: [foto(1), foto(2)], version: 'v' } })
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /cotizaciones/[id]/compartir/fotos', () => {
  it('sin sesión no lee nada', async () => {
    sesion.mockResolvedValue(null)
    await expect(pedir()).rejects.toThrow('redirigido')
    expect(leerVehiculo).not.toHaveBeenCalled()
  })

  it('da la miniatura y la completa de cada foto, del bucket público, sin guardar en caché', async () => {
    const r = await pedir()
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(await r.json()).toEqual({
      fotos: [
        {
          id: foto(1).id,
          miniatura: 'https://almacen.test/vehiculos/v/1-m.webp',
          completa: 'https://almacen.test/vehiculos/v/1.webp',
        },
        {
          id: foto(2).id,
          miniatura: 'https://almacen.test/vehiculos/v/2-m.webp',
          completa: 'https://almacen.test/vehiculos/v/2.webp',
        },
      ],
    })
    expect(leerGaleria).toHaveBeenCalledWith(VEHICULO)
  })

  it('sin vehículo, o una cotización que no se ve, ninguna foto', async () => {
    leerVehiculo.mockResolvedValue({ ok: true, data: null })
    expect(await (await pedir()).json()).toEqual({ fotos: [] })
    expect(await (await pedir('no-es-un-id')).json()).toEqual({ fotos: [] })
    expect(leerGaleria).not.toHaveBeenCalled()
  })

  it('nunca más de 24', async () => {
    leerGaleria.mockResolvedValue({
      ok: true,
      data: { fotos: Array.from({ length: 30 }, (_, i) => foto(i + 1)), version: 'v' },
    })
    expect(((await (await pedir()).json()) as { fotos: unknown[] }).fotos).toHaveLength(24)
  })

  it('una lectura que falla es un 500', async () => {
    leerGaleria.mockResolvedValue({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect((await pedir()).status).toBe(500)
  })
})
