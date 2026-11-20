import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const llamadas: unknown[][] = []
let respuesta: { data: unknown; error: unknown } = { data: null, error: null }
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

import { getHuellaDeLaImagen } from './huella-de-la-imagen'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'

describe('getHuellaDeLaImagen', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: null, error: null }
  })

  it('pide la huella por la RPC con el id y la devuelve', async () => {
    respuesta = { data: 'i-0123456789abcdef0123456789abcdef', error: null }
    expect(await getHuellaDeLaImagen(ID)).toEqual({
      ok: true,
      data: 'i-0123456789abcdef0123456789abcdef',
    })
    expect(llamadas).toEqual([['cotizacion_imagen_huella', { p_cotizacion: ID }]])
  })

  it('el 42501 (no existe, en la papelera o no se ve) es no_encontrado', async () => {
    respuesta = {
      data: null,
      error: { code: '42501', message: 'No tienes acceso a esta cotización.' },
    }
    const leida = await getHuellaDeLaImagen(ID)
    expect(leida.ok ? null : leida.error.codigo).toBe('no_encontrado')
  })

  it('otro error de la base no es no_encontrado; una respuesta sin forma es inesperado', async () => {
    respuesta = { data: null, error: { code: '57014', message: 'cancelada' } }
    const caida = await getHuellaDeLaImagen(ID)
    expect(caida.ok ? null : caida.error.codigo).not.toBe('no_encontrado')
    respuesta = { data: 42, error: null }
    const rara = await getHuellaDeLaImagen(ID)
    expect(rara.ok ? null : rara.error.codigo).toBe('inesperado')
  })
})
