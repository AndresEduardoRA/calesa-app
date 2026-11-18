import { afterEach, describe, expect, it, vi } from 'vitest'
import { pedirLaPortada } from './portada.client'

const ID = '00000000-0000-4000-8000-000000000001'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pedirLaPortada', () => {
  it('pide la ruta de la portada sin caché ni seguir una redirección', () => {
    const pedir = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', pedir)
    pedirLaPortada(ID)
    expect(pedir).toHaveBeenCalledWith(`/cotizaciones/${ID}/portada`, {
      cache: 'no-store',
      redirect: 'manual',
    })
  })

  it('un fallo de la red no sale de ahí', async () => {
    const pedir = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', pedir)
    expect(() => {
      pedirLaPortada(ID)
    }).not.toThrow()
    await Promise.resolve()
    expect(pedir).toHaveBeenCalledTimes(1)
  })
})
