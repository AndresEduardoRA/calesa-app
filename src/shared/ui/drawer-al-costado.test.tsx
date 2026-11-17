import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Drawer } from './drawer'

afterEach(cleanup)

function conPagina(alCostado: boolean, alCerrar = vi.fn()) {
  render(
    <>
      <button type="button">Algo de la página</button>
      <Drawer abierto alCerrar={alCerrar} titulo="Panel" alCostado={alCostado}>
        <p>Adentro</p>
      </Drawer>
    </>,
  )
  return alCerrar
}

// Base UI cierra con Esc en `keydown` del documento y con el clic afuera en `pointerdown`.
const tocarAfuera = () => {
  act(() => {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Algo de la página', hidden: true }))
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Algo de la página', hidden: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Algo de la página', hidden: true }))
  })
}

describe('un Drawer al costado', () => {
  it('no dibuja el fondo: lo de la página sigue en el árbol y se puede tocar', () => {
    conPagina(true)
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Panel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Algo de la página' })).toBeInTheDocument()
  })

  it('tocar afuera no lo cierra', () => {
    const alCerrar = conPagina(true)
    tocarAfuera()
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('Esc lo cierra', () => {
    const alCerrar = conPagina(true)
    act(() => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    })
    expect(alCerrar).toHaveBeenCalled()
  })

  it('sin `alCostado` sigue siendo modal, con su fondo', () => {
    conPagina(false)
    expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeNull()
  })
})
