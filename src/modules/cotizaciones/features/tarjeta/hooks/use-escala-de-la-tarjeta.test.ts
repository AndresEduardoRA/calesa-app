import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEscalaDeLaTarjeta } from './use-escala-de-la-tarjeta'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Medida({ ancho }: { ancho: number }) {
  const { ref, escala } = useEscalaDeLaTarjeta(ancho)
  return createElement('div', { ref, 'data-escala': String(escala) })
}

// La escala con un contenedor de ese ancho (jsdom no mide: se fija `clientWidth`).
function escalaCon(disponible: number, ancho: number): number {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(disponible)
  const { container } = render(createElement(Medida, { ancho }))
  return Number(container.querySelector('[data-escala]')?.getAttribute('data-escala'))
}

describe('useEscalaDeLaTarjeta', () => {
  it('achica para caber en el contenedor: min(1, contenedor / tarjeta)', () => {
    expect(escalaCon(325, 650)).toBe(0.5)
  })

  it('nunca agranda: con más lugar que la tarjeta, 1', () => {
    expect(escalaCon(1200, 650)).toBe(1)
  })
})
