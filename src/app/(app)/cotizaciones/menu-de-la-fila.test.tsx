import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MenuDeUnaFila } from '@/modules/cotizaciones/client'
import { MenuDeLaFila, type AccionesDeLaFila } from './menu-de-la-fila'

afterEach(cleanup)

const acciones = (): AccionesDeLaFila => ({
  aprobar: vi.fn(),
  marcarFinal: vi.fn(),
  favorita: vi.fn(),
  reportar: vi.fn(),
  moderar: vi.fn(),
  enviarALaPapelera: vi.fn(),
})

const menu = (extra: Partial<MenuDeUnaFila> = {}): MenuDeUnaFila => ({
  actualizadoEn: '2026-11-14T10:00:00.123456+00:00',
  favorita: false,
  miMotivo: null,
  ofertas: {
    aprobar: { motivo: null },
    final: { motivo: 'Para marcarla final, elige el vehículo y guarda.' },
    favorita: { motivo: null },
    reportar: { motivo: null },
    invalidar: { motivo: null },
    papelera: { motivo: null },
  },
  ...extra,
})

async function abrir(props: Partial<Parameters<typeof MenuDeLaFila>[0]> = {}) {
  const a = acciones()
  render(
    <MenuDeLaFila
      cotizacion={{ id: 'c1', numero: 12 }}
      menu={menu()}
      favorita={false}
      enCurso={{ general: false, favorita: false }}
      acciones={a}
      {...props}
    />,
  )
  const boton = screen.getByRole('button', { name: 'Más acciones de N.º 12' })
  act(() => {
    fireEvent.pointerDown(boton)
    fireEvent.mouseDown(boton)
    fireEvent.click(boton)
  })
  await waitFor(() => {
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0)
  })
  return a
}

const lineas = () =>
  [
    ...document.querySelectorAll(
      '[role="menuitem"], [role="menuitemcheckbox"], [role="separator"]',
    ),
  ].map((nodo) => (nodo.getAttribute('role') === 'separator' ? '---' : nodo.textContent))

describe('MenuDeLaFila', () => {
  it('dibuja la lista única: por bloques, con un separador entre ellos y la papelera al final', async () => {
    await abrir()
    expect(lineas()).toEqual([
      'Aprobar',
      'Marcar final…',
      '---',
      'Favorita',
      'Reportar…',
      '---',
      'Invalidar…',
      '---',
      'Enviar a la papelera',
    ])
  })

  it('lo apagado dice por qué, y no se puede elegir', async () => {
    const a = await abrir()
    expect(screen.getByText('Para marcarla final, elige el vehículo y guarda.')).toBeTruthy()
    const final = screen.getByRole('menuitem', { name: 'Marcar final…' })
    expect(
      final.getAttribute('aria-disabled') ?? final.getAttribute('data-disabled'),
    ).not.toBeNull()
    act(() => {
      fireEvent.click(final)
    })
    expect(a.marcarFinal).not.toHaveBeenCalled()
  })

  it('«Aprobar» llama a su acción', async () => {
    const a = await abrir()
    act(() => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Aprobar' }))
    })
    expect(a.aprobar).toHaveBeenCalledTimes(1)
  })

  it('con algo en vuelo, aprobar y la papelera quedan apagadas', async () => {
    await abrir({ enCurso: { general: true, favorita: false } })
    for (const nombre of ['Aprobar', 'Enviar a la papelera']) {
      const linea = screen.getByRole('menuitem', { name: nombre })
      expect(
        linea.getAttribute('aria-disabled') ?? linea.getAttribute('data-disabled'),
      ).not.toBeNull()
    }
  })

  it('«Reportar…» dice que ya se reportó cuando hay un motivo propio', async () => {
    await abrir({ menu: menu({ miMotivo: 'El precio no cuadra' }) })
    expect(screen.getByRole('menuitem', { name: 'Reportaste esta cotización…' })).toBeTruthy()
  })

  it('«Favorita» es una casilla que refleja la marca (tocarla lo prueba el e2e)', async () => {
    await abrir({ favorita: true })
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Favorita' }).getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('sin nada que ofrecer no dibuja el botón', () => {
    render(
      <MenuDeLaFila
        cotizacion={{ id: 'c1', numero: 12 }}
        menu={menu({ ofertas: {} })}
        favorita={false}
        enCurso={{ general: false, favorita: false }}
        acciones={acciones()}
      />,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })
})
