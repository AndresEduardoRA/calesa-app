import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ValorCambiado } from '../../../../entities/formula/valor-en-la-planilla'
import { CeldaDeLaConstante } from './celda-de-la-constante'

afterEach(cleanup)

const montar = (alCambiar: (id: string, valor: number) => ValorCambiado, bloqueada = false) =>
  render(
    <>
      <p id="motivo">Aplica o descarta el texto de la barra de fórmula.</p>
      <CeldaDeLaConstante
        nodo="comision__1"
        concepto="Comisión"
        valor={0.04}
        formato="pct"
        bloqueada={bloqueada}
        idDelMotivo="motivo"
        alCambiar={alCambiar}
      />
    </>,
  )

const boton = () => screen.getByRole('button', { name: /^Comisión, valor/ })
const entrada = () => screen.getByRole('textbox', { name: 'Comisión, valor' })

describe('La celda de una constante en la planilla', () => {
  it('abre con el valor en puntos y Enter manda la fracción; el foco vuelve al botón', () => {
    const alCambiar = vi.fn((): ValorCambiado => ({ ok: true, formula: {} as never }))
    montar(alCambiar)
    fireEvent.click(boton())
    expect((entrada() as HTMLInputElement).value).toBe('4')
    fireEvent.change(entrada(), { target: { value: '5' } })
    fireEvent.keyDown(entrada(), { key: 'Enter' })
    expect(alCambiar).toHaveBeenCalledWith('comision__1', 0.05)
    expect(document.activeElement).toBe(boton())
  })

  it('lo que no se lee no llega: la entrada sigue abierta con el motivo y aria-invalid', () => {
    const alCambiar = vi.fn((): ValorCambiado => ({ ok: true, formula: {} as never }))
    montar(alCambiar)
    fireEvent.click(boton())
    fireEvent.change(entrada(), { target: { value: 'abc' } })
    fireEvent.keyDown(entrada(), { key: 'Enter' })
    expect(alCambiar).not.toHaveBeenCalled()
    expect(entrada().getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).not.toBe('')
  })

  it('un rechazo deja el valor anterior y dice por qué junto a la celda', () => {
    montar(() => ({ ok: false, mensaje: 'No entra.' }))
    fireEvent.click(boton())
    fireEvent.change(entrada(), { target: { value: '7' } })
    fireEvent.blur(entrada())
    expect(boton().textContent).toContain('4')
    expect(screen.getByRole('alert').textContent).toBe('No entra.')
    expect(boton().getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id)
  })

  it('Esc cancela sin mandar nada', () => {
    const alCambiar = vi.fn((): ValorCambiado => ({ ok: true, formula: {} as never }))
    montar(alCambiar)
    fireEvent.click(boton())
    fireEvent.change(entrada(), { target: { value: '9' } })
    fireEvent.keyDown(entrada(), { key: 'Escape' })
    expect(alCambiar).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('bloqueada no abre y dice por qué (aria-disabled y el motivo de la tabla)', () => {
    montar(vi.fn(), true)
    expect(boton().getAttribute('aria-disabled')).toBe('true')
    expect(boton().getAttribute('aria-describedby')).toBe('motivo')
    fireEvent.click(boton())
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
