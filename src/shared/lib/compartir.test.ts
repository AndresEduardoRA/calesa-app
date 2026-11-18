import { afterEach, describe, expect, it, vi } from 'vitest'
import { capacidadesDelNavegador, compartirConElSistema, pngDesde } from './compartir'

// jsdom no trae `matchMedia`: se pone el que diga si el puntero es táctil.
const tactil = (coarse: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ matches: coarse }),
    configurable: true,
  })
}

function conNavegador(extra: Record<string, unknown>) {
  for (const [clave, valor] of Object.entries(extra)) {
    Object.defineProperty(navigator, clave, { value: valor, configurable: true })
  }
  return () => {
    for (const clave of Object.keys(extra)) {
      Reflect.deleteProperty(navigator, clave)
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('capacidadesDelNavegador', () => {
  it('en el celular con menú del sistema que acepta archivos', () => {
    tactil(true)
    const quitar = conNavegador({ share: vi.fn(), canShare: () => true })
    expect(capacidadesDelNavegador()).toMatchObject({
      compartirDelSistema: true,
      compartirArchivos: true,
    })
    quitar()
  })

  it('el menú del sistema sin archivos: comparte sólo el texto', () => {
    tactil(true)
    const quitar = conNavegador({ share: vi.fn(), canShare: () => false })
    expect(capacidadesDelNavegador()).toMatchObject({
      compartirDelSistema: true,
      compartirArchivos: false,
    })
    quitar()
  })

  it('en el escritorio no se ofrece el menú del sistema aunque exista', () => {
    tactil(false)
    const quitar = conNavegador({ share: vi.fn(), canShare: () => true })
    expect(capacidadesDelNavegador()).toMatchObject({
      compartirDelSistema: false,
      compartirArchivos: false,
    })
    quitar()
  })
})

describe('compartirConElSistema', () => {
  const archivo = new File(['x'], 'a.png', { type: 'image/png' })

  it('con archivos que el menú acepta, los manda con el texto', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const quitar = conNavegador({ share, canShare: () => true })
    await expect(compartirConElSistema('hola', [archivo])).resolves.toEqual({ conArchivos: true })
    expect(share).toHaveBeenCalledWith({ files: [archivo], text: 'hola' })
    quitar()
  })

  it('sin `canShare` de archivos manda sólo el texto', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const quitar = conNavegador({ share, canShare: () => false })
    await expect(compartirConElSistema('hola', [archivo])).resolves.toEqual({ conArchivos: false })
    expect(share).toHaveBeenCalledWith({ text: 'hola' })
    quitar()
  })

  it('cerrar el menú es `null`, no un error', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cerró', 'AbortError'))
    const quitar = conNavegador({ share, canShare: () => true })
    await expect(compartirConElSistema('hola', [])).resolves.toBeNull()
    quitar()
  })
})

describe('pngDesde', () => {
  it('un PNG vuelve tal cual, sin pasar por un lienzo', async () => {
    const png = new Blob(['x'], { type: 'image/png' })
    await expect(pngDesde(png)).resolves.toBe(png)
  })
})
