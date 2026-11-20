import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PestanasDelResumen } from './pestanas-del-resumen'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const pestanas = [
  { clave: 'resumen', titulo: 'Resumen' },
  { clave: 'fotos', titulo: 'Fotos' },
] as const

function dibujar(
  alto?: 'contenido' | 'lleno',
  extra: { reparto?: 'compacto' | 'igual'; panelDesplazable?: boolean } = {},
) {
  return render(
    <PestanasDelResumen
      etiqueta="Secciones"
      pestanas={pestanas}
      activa="fotos"
      alElegir={() => {}}
      alto={alto}
      {...extra}
    >
      <p>contenido</p>
    </PestanasDelResumen>,
  )
}

describe('PestanasDelResumen › alto', () => {
  // La lista se desplaza con pista (`useDesborde`): jsdom no trae `ResizeObserver`.
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
  })

  it('deja a la vista la elegida moviendo sólo la lista, nunca lo que la contiene (`scrollIntoView` movía el cuerpo del panel)', () => {
    const mover = vi.fn()
    Element.prototype.scrollIntoView = mover
    dibujar()
    expect(mover).not.toHaveBeenCalled()
  })

  it('sin la prop, la raíz y el panel tienen el alto de su contenido', () => {
    const { container } = dibujar()
    expect(container.firstElementChild?.className).not.toContain('h-full')
    expect(screen.getByRole('tabpanel').className).not.toContain('min-h-0')
  })

  it('con alto «lleno» la raíz ocupa su alto y el panel puede encogerse', () => {
    const { container } = dibujar('lleno')
    expect(container.firstElementChild?.className).toContain('h-full')
    expect(container.firstElementChild?.className).toContain('grid-rows-[auto_minmax(0,1fr)]')
    expect(screen.getByRole('tabpanel').className).toContain('min-h-0')
  })

  it('con reparto «igual» la lista ocupa todo el ancho, en partes iguales y con desplazamiento; el panel se desplaza si se pide', () => {
    const { container } = dibujar('lleno', { reparto: 'igual', panelDesplazable: true })
    expect(screen.getByRole('tablist').className).toContain('grid-flow-col')
    expect(screen.getByRole('tablist').className).toContain('overflow-x-auto')
    expect(screen.getByRole('tablist').parentElement?.className).not.toContain('md:w-fit')
    expect(screen.getByRole('tabpanel').className).toContain('overflow-y-auto')
    expect(container.firstElementChild?.className).toContain('h-full')
  })

  it('sin reparto «igual», la lista mide lo que su contenido (desde 768 px) y el panel no se desplaza', () => {
    dibujar('lleno')
    expect(screen.getByRole('tablist').parentElement?.className).toContain('md:w-fit')
    expect(screen.getByRole('tabpanel').className).not.toContain('overflow-y-auto')
  })
})
