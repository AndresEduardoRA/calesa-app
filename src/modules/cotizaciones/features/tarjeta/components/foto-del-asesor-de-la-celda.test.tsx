import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { EstiloDibujado } from '../../../entities/tarjeta/estilo-de-la-celda'
import { FotoDelAsesorDeLaCelda } from './foto-del-asesor-de-la-celda'

afterEach(cleanup)

const celda = (alinear: EstiloDibujado['alinear'] = 'derecha') => ({
  ancho: 108,
  alto: 58,
  estilo: { alinear, alinearVertical: 'abajo' } as EstiloDibujado,
})
const FOTO = { url: 'https://x.test/avatares/luis.webp', iniciales: 'LR', nombre: 'Luis Rojas' }

describe('<FotoDelAsesorDeLaCelda>', () => {
  it('la foto entera en la caja interior y alineada como la celda', () => {
    const { container } = render(<FotoDelAsesorDeLaCelda celda={celda()} foto={FOTO} />)
    const img = container.querySelector<HTMLImageElement>('img[data-foto-del-asesor]')
    expect(img?.alt).toBe('Luis Rojas')
    expect(img?.style.objectFit).toBe('contain')
    expect(img?.style.objectPosition).toBe('100% 100%')
    expect(img?.parentElement?.style.width).toBe('100px')
    expect(img?.parentElement?.style.height).toBe('50px')
  })

  it('sin foto, las iniciales en un círculo del lado menor, alineado como la celda', () => {
    const { container } = render(
      <FotoDelAsesorDeLaCelda celda={celda('izquierda')} foto={{ ...FOTO, url: null }} />,
    )
    const circulo = container.querySelector<HTMLElement>('[data-iniciales-del-asesor]')
    expect(circulo?.textContent).toBe('LR')
    expect(circulo?.getAttribute('aria-label')).toBe('Luis Rojas')
    expect(circulo?.style.width).toBe('50px')
    expect(circulo?.style.left).toBe('0px')
    expect(circulo?.style.fontSize).toBe('20px')
  })

  it('si la foto no carga, el círculo con las iniciales', () => {
    const { container } = render(<FotoDelAsesorDeLaCelda celda={celda()} foto={FOTO} />)
    const img = container.querySelector('img[data-foto-del-asesor]')
    if (img === null) throw new Error('sin la foto')
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-iniciales-del-asesor]')?.textContent).toBe('LR')
  })

  it('sin URL (las cifras de ejemplo), la muestra punteada «Foto»', () => {
    const { container } = render(
      <FotoDelAsesorDeLaCelda celda={celda()} foto={{ ...FOTO, url: '' }} />,
    )
    expect(container.querySelector('[data-foto-de-ejemplo]')?.textContent).toBe('Foto')
  })
})
