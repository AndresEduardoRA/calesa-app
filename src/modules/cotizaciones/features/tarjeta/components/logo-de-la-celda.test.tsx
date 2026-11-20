import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LogoDeLaCelda } from './logo-de-la-celda'

afterEach(cleanup)

const LOGO = { nombre: 'Calesa', url: 'https://ejemplo.com/logo.png' }

describe('<LogoDeLaCelda>', () => {
  it('sólo el logo, entero en la caja interior y alineado como la celda', () => {
    const { container } = render(
      <LogoDeLaCelda
        logo={LOGO}
        ancho={200}
        alto={42}
        estilo={{ alinear: 'derecha', alinearVertical: 'abajo' }}
      />,
    )
    const img = container.querySelector<HTMLImageElement>('img[data-logo-de-la-celda]')
    expect(img?.alt).toBe('Calesa')
    expect(img?.style.objectFit).toBe('contain')
    expect(img?.style.objectPosition).toBe('100% 100%')
    const marco = img?.parentElement
    expect(marco?.style.width).toBe('200px')
    expect(marco?.style.height).toBe('42px')
    expect(container.textContent).toBe('')
  })

  it('al centro, al medio de la caja', () => {
    const { container } = render(
      <LogoDeLaCelda
        logo={LOGO}
        ancho={100}
        alto={40}
        estilo={{ alinear: 'centro', alinearVertical: 'centro' }}
      />,
    )
    expect(
      container.querySelector<HTMLImageElement>('img[data-logo-de-la-celda]')?.style.objectPosition,
    ).toBe('50% 50%')
  })

  it('si no carga, la celda queda vacía y avisa', () => {
    const alFallar = vi.fn()
    const { container } = render(
      <LogoDeLaCelda
        logo={LOGO}
        ancho={100}
        alto={40}
        estilo={{ alinear: 'izquierda', alinearVertical: 'arriba' }}
        alFallar={alFallar}
      />,
    )
    const img = container.querySelector('img[data-logo-de-la-celda]')
    expect(img).not.toBeNull()
    fireEvent.error(img as Element)
    expect(container.querySelector('img')).toBeNull()
    expect(alFallar).toHaveBeenCalledTimes(1)
  })

  it('sin URL (las cifras de ejemplo), la muestra «Logo» del tamaño de la caja', () => {
    const { container } = render(
      <LogoDeLaCelda
        logo={{ nombre: 'Tu empresa', url: '' }}
        ancho={100}
        alto={40}
        estilo={{ alinear: 'izquierda', alinearVertical: 'arriba' }}
      />,
    )
    const muestra = container.querySelector<HTMLElement>('[data-logo-de-ejemplo]')
    expect(muestra?.textContent).toBe('Logo')
    expect(muestra?.style.width).toBe('100px')
    expect(container.querySelector('img')).toBeNull()
  })
})
