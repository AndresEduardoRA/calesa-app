import { act, cleanup, render } from '@testing-library/react'
import { createElement, useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEscalaDeLaTarjeta } from './use-escala-de-la-tarjeta'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// Las veces que React confirmó un dibujo de `Medida` (llamar al componente y descartar un estado igual no cuenta).
let dibujos = 0

function Medida({ ancho, reservado }: { ancho: number; reservado?: number }) {
  const { ref, escala } = useEscalaDeLaTarjeta(ancho, reservado)
  useEffect(() => {
    dibujos += 1
  })
  return createElement('div', { ref, 'data-escala': String(escala) })
}

const leida = (container: HTMLElement) =>
  Number(container.querySelector('[data-escala]')?.getAttribute('data-escala'))

// La escala con un contenedor de ese ancho (jsdom no mide: se fija `clientWidth`).
function escalaCon(disponible: number, ancho: number, reservado?: number): number {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(disponible)
  const { container } = render(
    createElement(Medida, { ancho, ...(reservado === undefined ? {} : { reservado }) }),
  )
  return leida(container)
}

// Un `ResizeObserver` que guarda su callback para dispararlo a mano con un ancho.
function observadorFalso() {
  let avisar: ((ancho: number) => void) | null = null
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        avisar = (ancho) => {
          callback(
            [{ contentRect: { width: ancho } } as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          )
        }
      }
      observe() {}
      disconnect() {}
    },
  )
  return (ancho: number) => {
    act(() => {
      avisar?.(ancho)
    })
  }
}

describe('useEscalaDeLaTarjeta', () => {
  it('achica para caber en el contenedor: min(1, contenedor / tarjeta)', () => {
    expect(escalaCon(325, 650)).toBe(0.5)
  })

  it('nunca agranda: con más lugar que la tarjeta, 1', () => {
    expect(escalaCon(1200, 650)).toBe(1)
  })

  it('redondea hacia abajo el ancho medido: con fracciones, la tarjeta no queda más ancha que su lugar', () => {
    expect(escalaCon(612.7, 1224)).toBe(612 / 1224)
  })

  it('reserva lo que no es de la tarjeta (el margen de la capa)', () => {
    expect(escalaCon(652, 1200, 52)).toBe(0.5)
  })

  it('el ResizeObserver con el mismo ancho entero no vuelve a dibujar', () => {
    const avisar = observadorFalso()
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
    const { container } = render(createElement(Medida, { ancho: 1224 }))
    expect(leida(container)).toBe(600 / 1224)
    dibujos = 0
    avisar(612.2)
    expect(leida(container)).toBe(612 / 1224)
    expect(dibujos).toBe(1)
    avisar(612.9)
    expect(dibujos).toBe(1)
  })
})
