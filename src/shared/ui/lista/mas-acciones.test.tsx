import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MasAcciones } from '.'

afterEach(cleanup)

describe('MasAcciones: la acción principal', () => {
  it('la acción principal va en negrita y marcada; las demás no', async () => {
    render(
      <MasAcciones
        nombre="Beto Paz"
        id="lead-2"
        acciones={[
          {
            tipo: 'accion',
            clave: 'p',
            etiqueta: 'Cotizar lead',
            principal: true,
            alElegir: vi.fn(),
          },
          { tipo: 'separador', clave: 's' },
          { tipo: 'accion', clave: 'o', etiqueta: 'Otra', alElegir: vi.fn() },
        ]}
      />,
    )
    const boton = screen.getByRole('button', { name: 'Más acciones de Beto Paz' })
    act(() => {
      fireEvent.pointerDown(boton)
      fireEvent.mouseDown(boton)
      fireEvent.click(boton)
    })
    const principal = await screen.findByRole('menuitem', { name: 'Cotizar lead' })
    expect(principal.hasAttribute('data-principal')).toBe(true)
    expect(principal.className).toContain('font-semibold')
    const otra = screen.getByRole('menuitem', { name: 'Otra' })
    expect(otra.hasAttribute('data-principal')).toBe(false)
    expect(otra.className).not.toContain('font-semibold')
  })
})
