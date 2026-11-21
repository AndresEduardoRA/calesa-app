import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ATRIBUTO_DE_COLUMNA } from './ficha-en-bloques/estilos'
import { useALaVista } from './use-a-la-vista'

const creados: { root: Element | Document | null | undefined; rootMargin: string | undefined }[] =
  []

beforeEach(() => {
  creados.length = 0
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(_alCambiar: unknown, opciones: IntersectionObserverInit = {}) {
        creados.push({ root: opciones.root, rootMargin: opciones.rootMargin })
      }
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Nodo() {
  const [observar] = useALaVista<HTMLDivElement>()
  return <div ref={observar} data-testid="nodo" />
}

describe('useALaVista', () => {
  it('dentro de una columna de ficha que se desplaza, su margen se cuenta desde la columna', () => {
    const { container } = render(
      <div {...{ [ATRIBUTO_DE_COLUMNA]: 'principal' }} style={{ overflowY: 'auto' }}>
        <Nodo />
      </div>,
    )
    expect(creados).toHaveLength(1)
    expect(creados[0]?.root).toBe(container.firstElementChild)
    expect(creados[0]?.rootMargin).toBe('200px')
  })

  it('si la columna no se desplaza (el celular) o no hay columna, la raíz es la ventana', () => {
    render(
      <div {...{ [ATRIBUTO_DE_COLUMNA]: 'principal' }} style={{ overflowY: 'visible' }}>
        <Nodo />
      </div>,
    )
    render(<Nodo />)
    expect(creados).toHaveLength(2)
    expect(creados.every((c) => c.root === null)).toBe(true)
  })
})
