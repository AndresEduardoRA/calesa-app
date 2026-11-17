import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AvisoDeVencidos, textoDeVencidos } from './aviso-de-vencidos'

describe('AvisoDeVencidos', () => {
  it('dice cuántos y salta al bloque de seguimientos; sin vencidos no ocupa lugar', () => {
    expect(textoDeVencidos(1)).toBe('Tienes 1 recordatorio vencido sobre este lead.')
    expect(textoDeVencidos(3)).toBe('Tienes 3 recordatorios vencidos sobre este lead.')
    expect(textoDeVencidos(20)).toBe('Tienes 20 recordatorios vencidos sobre este lead.')
    // La base cuenta hasta 21: no se dice un número que no sabe.
    expect(textoDeVencidos(21)).toBe('Tienes más de 20 recordatorios vencidos sobre este lead.')
    const { container, rerender } = render(<AvisoDeVencidos vencidos={2} />)
    // Un ancla de la misma página: sin JS igual salta.
    expect(screen.getByRole('link', { name: 'Verlos' }).getAttribute('href')).toBe('#seguimientos')
    rerender(<AvisoDeVencidos vencidos={0} />)
    expect(container.textContent).toBe('')
  })
})
