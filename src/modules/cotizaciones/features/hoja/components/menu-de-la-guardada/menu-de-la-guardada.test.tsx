import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AporteAlMenu } from './contexto'
import { MenuDeLaGuardada } from './menu-de-la-guardada'
import { ProveedorDelMenuDeLaGuardada } from './proveedor-del-menu-de-la-guardada'
import { useAporteAlMenu } from './use-aporte-al-menu'
import { useRanuraDeGuardar } from './use-ranura-de-guardar'

afterEach(cleanup)

function Aporte({ aporte }: { aporte: AporteAlMenu | null }) {
  useAporteAlMenu(aporte)
  return null
}

async function abrir() {
  const boton = screen.getByRole('button', { name: 'Más acciones de N.º 12' })
  act(() => {
    fireEvent.pointerDown(boton)
    fireEvent.mouseDown(boton)
    fireEvent.click(boton)
  })
  await waitFor(() => {
    expect(document.querySelectorAll('[role^="menuitem"]').length).toBeGreaterThan(0)
  })
}

const lineas = () =>
  [
    ...document.querySelectorAll(
      '[role="menuitem"], [role="menuitemcheckbox"], [role="separator"], [role="menu"] p',
    ),
  ].map((nodo) => (nodo.getAttribute('role') === 'separator' ? '---' : nodo.textContent))

const accion = (alElegir = vi.fn()) => ({ tipo: 'accion' as const, alElegir })

describe('MenuDeLaGuardada', () => {
  it('lo que suman varios sale en el orden de la lista única, con separadores, sin lo que está a la vista', async () => {
    render(
      <ProveedorDelMenuDeLaGuardada>
        <Aporte
          aporte={{
            papelera: accion(),
            favorita: { tipo: 'casilla', marcada: true, alCambiar: vi.fn() },
          }}
        />
        <Aporte aporte={{ revisiones: accion(), compartir: accion(), aprobar: accion() }} />
        <Aporte
          aporte={{
            'vista-previa': accion(),
            final: { ...accion(), motivo: 'Falta el vehículo.' },
          }}
        />
        <MenuDeLaGuardada cotizacionId="c1" numero={12} />
      </ProveedorDelMenuDeLaGuardada>,
    )
    await abrir()
    expect(lineas()).toEqual([
      'Vista previa',
      'Revisiones',
      '---',
      'Marcar final…',
      'Falta el vehículo.',
      '---',
      'Favorita',
      '---',
      'Enviar a la papelera',
    ])
    expect(
      screen.getByRole('menuitem', { name: 'Marcar final…' }).getAttribute('aria-disabled'),
    ).toBe('true')
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Favorita' }).getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('elegir llama a quien la sumó, con lo último que dibujó', async () => {
    const primera = vi.fn()
    const segunda = vi.fn()
    function Cambia() {
      const [cual, setCual] = useState(0)
      useAporteAlMenu({ revisiones: accion(cual === 0 ? primera : segunda) })
      return (
        <button
          type="button"
          onClick={() => {
            setCual(1)
          }}
        >
          cambiar
        </button>
      )
    }
    render(
      <ProveedorDelMenuDeLaGuardada>
        <Cambia />
        <MenuDeLaGuardada cotizacionId="c1" numero={12} />
      </ProveedorDelMenuDeLaGuardada>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'cambiar' }))
    await abrir()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Revisiones' }))
    expect(segunda).toHaveBeenCalledTimes(1)
    expect(primera).not.toHaveBeenCalled()
  })
})

describe('MenuDeLaGuardada: quien suma', () => {
  it('al desmontarse quien la sumó, su línea se va', async () => {
    function Alterna() {
      const [con, setCon] = useState(true)
      return (
        <>
          {con ? <Aporte aporte={{ papelera: accion() }} /> : null}
          <button
            type="button"
            onClick={() => {
              setCon(false)
            }}
          >
            quitar
          </button>
        </>
      )
    }
    render(
      <ProveedorDelMenuDeLaGuardada>
        <Aporte aporte={{ revisiones: accion() }} />
        <Alterna />
        <MenuDeLaGuardada cotizacionId="c1" numero={12} />
      </ProveedorDelMenuDeLaGuardada>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'quitar' }))
    await abrir()
    expect(lineas()).toEqual(['Revisiones'])
  })

  it('sin el proveedor (la hoja nueva) no hay «⋯», nadie suma y «Guardar» queda en su lugar', () => {
    function Lee() {
      const ranura = useRanuraDeGuardar()
      const { enElMenu } = useAporteAlMenu({ revisiones: accion() })
      return (
        <p>
          {enElMenu ? 'en el menú' : 'sin menú'}, {ranura === undefined ? 'en su lugar' : 'arriba'}
        </p>
      )
    }
    render(
      <>
        <Lee />
        <MenuDeLaGuardada cotizacionId="c1" numero={12} />
      </>,
    )
    expect(screen.queryByRole('button', { name: /Más acciones/ })).toBeNull()
    expect(screen.getByText('sin menú, en su lugar')).toBeTruthy()
  })
})
