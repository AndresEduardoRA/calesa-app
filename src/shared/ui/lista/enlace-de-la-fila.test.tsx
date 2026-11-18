import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnlaceDeLaFila, FilaDeLista, TarjetaDeLista } from '.'

// `next/link` sin el router de la app: un `<a>` con lo mismo (sin `prefetch`, que no es un atributo).
vi.mock('next/link', () => ({
  default: ({ prefetch: _p, ...props }: ComponentProps<'a'> & { prefetch?: boolean }) => (
    <a {...props} />
  ),
}))

const HREF = '/vehiculos/2b1c1f0e-3f7a-4c33-9a43-0d2f6b0e8a11'

// Cuántas veces navegó el enlace del nombre (un clic que le llega, propio o pasado por la fila). Se frena la navegación de jsdom.
let navegaciones = 0
function contarNavegaciones(evento: MouseEvent) {
  if (evento.target instanceof Element && evento.target.closest('a[data-enlace-de-la-fila]')) {
    navegaciones += 1
    evento.preventDefault()
  }
}

beforeEach(() => {
  navegaciones = 0
  document.addEventListener('click', contarNavegaciones)
  vi.stubGlobal('open', vi.fn())
})

afterEach(() => {
  document.removeEventListener('click', contarNavegaciones)
  window.getSelection()?.removeAllRanges()
  cleanup()
  vi.unstubAllGlobals()
})

function contenido() {
  return (
    <>
      <EnlaceDeLaFila href={HREF} nombre="Kia Seltos 2022">
        Kia Seltos 2022
      </EnlaceDeLaFila>
      <span data-testid="celda">KNDPB3AC1N7000001</span>
      <input type="checkbox" aria-label="Seleccionar Kia Seltos 2022" />
      <button type="button">Más acciones de Kia Seltos 2022</button>
    </>
  )
}

function enUnaFila() {
  return (
    <table>
      <tbody>
        <FilaDeLista href={HREF}>
          <td>{contenido()}</td>
        </FilaDeLista>
      </tbody>
    </table>
  )
}

function enUnaTarjeta() {
  return (
    <ul>
      <TarjetaDeLista href={HREF}>{contenido()}</TarjetaDeLista>
    </ul>
  )
}

describe('EnlaceDeLaFila', () => {
  it('es un enlace con el nombre, a la ficha, sin «Abrir» delante, y lleva la marca del nombre de la fila', () => {
    render(enUnaFila())
    const enlace = screen.getByRole('link', { name: 'Kia Seltos 2022' })
    expect(enlace).toHaveAttribute('href', HREF)
    expect(enlace).toHaveAttribute('title', 'Kia Seltos 2022')
    expect(enlace).toHaveAttribute('data-abre-resumen')
    expect(document.querySelector('tr')?.className).toContain('cursor-pointer')
  })
})

describe.each([
  ['FilaDeLista', enUnaFila],
  ['TarjetaDeLista', enUnaTarjeta],
])('%s con href', (_nombre, dibujar) => {
  it('un clic en el resto navega una vez, como el enlace', () => {
    render(dibujar())
    fireEvent.click(screen.getByTestId('celda'))
    expect(navegaciones).toBe(1)
    expect(window.open).not.toHaveBeenCalled()
  })

  it('un clic en el enlace navega sólo él: la fila no lo repite', () => {
    render(dibujar())
    fireEvent.click(screen.getByRole('link', { name: 'Kia Seltos 2022' }))
    expect(navegaciones).toBe(1)
  })

  it('Ctrl, Cmd o Shift + clic y el botón del medio abren otra pestaña, sin navegar esta', () => {
    render(dibujar())
    const celda = screen.getByTestId('celda')
    fireEvent.click(celda, { ctrlKey: true })
    fireEvent.click(celda, { metaKey: true })
    fireEvent.click(celda, { shiftKey: true })
    fireEvent(celda, new MouseEvent('auxclick', { bubbles: true, button: 1 }))
    expect(window.open).toHaveBeenCalledTimes(4)
    expect(window.open).toHaveBeenCalledWith(HREF, '_blank', 'noopener')
    expect(navegaciones).toBe(0)
  })

  it('el botón del medio no arranca el desplazamiento automático', () => {
    render(dibujar())
    const evento = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 1 })
    fireEvent(screen.getByTestId('celda'), evento)
    expect(evento.defaultPrevented).toBe(true)
  })

  it('la casilla y un botón propio no navegan', () => {
    render(dibujar())
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Kia Seltos 2022' }))
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de Kia Seltos 2022' }))
    fireEvent(
      screen.getByRole('button', { name: 'Más acciones de Kia Seltos 2022' }),
      new MouseEvent('auxclick', { bubbles: true, button: 1 }),
    )
    expect(navegaciones).toBe(0)
    expect(window.open).not.toHaveBeenCalled()
  })

  it('con texto elegido en el ítem (copiar el VIN) el clic no navega', () => {
    render(dibujar())
    const celda = screen.getByTestId('celda')
    window.getSelection()?.selectAllChildren(celda)
    fireEvent.click(celda)
    expect(navegaciones).toBe(0)
  })
})
