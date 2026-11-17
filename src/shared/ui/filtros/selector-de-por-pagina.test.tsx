import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SelectorDePorPagina } from './selector-de-por-pagina'
import type { PorPaginaDelListado } from './use-por-pagina-del-listado'

afterEach(cleanup)

function estado(sobre: Partial<PorPaginaDelListado> = {}): PorPaginaDelListado {
  return {
    visto: 10,
    esperandoRed: false,
    sinGuardar: false,
    elegir: vi.fn(),
    reintentarGuardado: vi.fn(),
    ...sobre,
  }
}

describe('SelectorDePorPagina', () => {
  it('elegir uno de la lista lo pide', () => {
    const e = estado()
    render(<SelectorDePorPagina opciones={[10, 25, 50]} estado={e} />)
    fireEvent.change(screen.getByLabelText('Ítems por página'), { target: { value: '25' } })
    expect(e.elegir).toHaveBeenCalledWith(25)
  })

  it('un tamaño que no es de la lista (un option agregado a mano) no se pide y el selector vuelve a lo que se ve', () => {
    const e = estado()
    render(<SelectorDePorPagina opciones={[10, 25, 50]} estado={e} />)
    const select = screen.getByLabelText<HTMLSelectElement>('Ítems por página')
    select.add(new Option('7', '7'))
    fireEvent.change(select, { target: { value: '7' } })
    expect(e.elegir).not.toHaveBeenCalled()
    expect(select.value).toBe('10')
  })

  it('Esc con un tamaño a medio elegir con flechas lo deshace y no sigue hacia el panel; sin nada a medio elegir, sí', () => {
    const e = estado()
    const alEsc = vi.fn()
    render(
      // El panel de «Vista y opciones» escucha Esc más arriba: el primero no le llega.
      <div onKeyDown={(evento) => evento.key === 'Escape' && alEsc()}>
        <SelectorDePorPagina opciones={[10, 25, 50]} estado={e} etiquetaOculta />
      </div>,
    )
    const select = screen.getByLabelText<HTMLSelectElement>('Ítems por página')
    fireEvent.keyDown(select, { key: 'ArrowDown' })
    fireEvent.change(select, { target: { value: '25' } })
    fireEvent.keyUp(select, { key: 'ArrowDown' })
    expect(select.value).toBe('25')
    fireEvent.keyDown(select, { key: 'Escape' })
    expect(alEsc).not.toHaveBeenCalled()
    expect(select.value).toBe('10')
    expect(e.elegir).not.toHaveBeenCalled()
    fireEvent.keyDown(select, { key: 'Escape' })
    expect(alEsc).toHaveBeenCalledTimes(1)
  })
})
