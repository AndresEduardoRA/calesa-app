import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useVistaYOpciones } from './contexto'
import type { GrupoDeVistaYOpciones } from './tipos'
import { VistaYOpciones } from './vista-y-opciones'

vi.mock('next/navigation', () => ({ usePathname: () => '/leads' }))
// El panel sin `lazy`: en jsdom basta con el componente directo.
vi.mock('./diferidos', async () => {
  const { PanelDeVistaYOpciones } = await import('./panel-de-vista-y-opciones')
  return { PanelDeVistaYOpcionesDiferido: PanelDeVistaYOpciones }
})

let ancha = false
beforeEach(() => {
  ancha = false
  vi.stubGlobal('matchMedia', () => ({
    matches: ancha,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(cleanup)

function Exportar({ alExportar }: { alExportar: () => void }) {
  const panel = useVistaYOpciones()
  return (
    <button
      type="button"
      onClick={() => {
        panel.cerrarYLuego(alExportar)
      }}
    >
      Exportar…
    </button>
  )
}

const grupos = (alExportar = vi.fn()): GrupoDeVistaYOpciones[] => [
  {
    clave: 'vista',
    titulo: 'Vista',
    contenido: <a href="#embudo">Embudo</a>,
    resumen: 'Lista',
  },
  {
    clave: 'alcance',
    titulo: 'Qué leads ver',
    contenido: <button type="button">Todos</button>,
    resumen: 'Míos',
  },
  { clave: 'mas', titulo: 'Más', contenido: <Exportar alExportar={alExportar} /> },
]

// Con la hoja (modal) abierta, lo de atrás sale del árbol de accesibilidad: el botón se busca igual.
const boton = () => screen.getByRole('button', { name: /^Vista y opciones/, hidden: true })

// Un clic como el de una persona: el puntero baja (Base UI mira ahí el «clic afuera»), el foco va al elemento y recién entonces el clic.
function clic(elemento: HTMLElement) {
  fireEvent.pointerDown(elemento)
  fireEvent.mouseDown(elemento)
  elemento.focus()
  fireEvent.pointerUp(elemento)
  fireEvent.mouseUp(elemento)
  fireEvent.click(elemento)
}

describe('VistaYOpciones', () => {
  it('sin grupos no dibuja el botón', () => {
    render(<VistaYOpciones grupos={[]} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('el botón nombra lo activo, y los separadores no se leen', () => {
    render(<VistaYOpciones grupos={grupos()} />)
    expect(boton().textContent).toBe('Vista y opciones · Lista · Míos')
    expect(boton()).toHaveAccessibleName('Vista y opciones Lista Míos')
    expect(boton()).toHaveAttribute('aria-haspopup', 'dialog')
    expect(boton()).toHaveAttribute('data-hidratado', 'true')
  })

  it('al abrir trae el panel con sus secciones y `aria-expanded` cambia', async () => {
    render(<VistaYOpciones grupos={grupos()} />)
    expect(boton()).toHaveAttribute('aria-expanded', 'false')
    clic(boton())
    expect(boton()).toHaveAttribute('aria-expanded', 'true')
    const panel = await screen.findByRole('dialog', { name: 'Vista y opciones' })
    expect(panel).toHaveTextContent('Qué leads ver')
    expect(screen.getByRole('region', { name: 'Más' })).toBeInTheDocument()
  })
})

describe('VistaYOpciones: cerrar', () => {
  it('Esc lo cierra y el foco vuelve al botón', async () => {
    render(<VistaYOpciones grupos={grupos()} />)
    clic(boton())
    await screen.findByRole('dialog', { name: 'Vista y opciones' })
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Vista y opciones' })).toBeNull()
    })
    expect(boton()).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => {
      expect(boton()).toHaveFocus()
    })
  })

  it('`cerrarYLuego` corre la acción después de cerrarse, con el foco ya en el botón', async () => {
    const alExportar = vi.fn(() => document.activeElement)
    render(<VistaYOpciones grupos={grupos(alExportar)} />)
    clic(boton())
    clic(await screen.findByRole('button', { name: 'Exportar…' }))
    await waitFor(() => {
      expect(alExportar).toHaveBeenCalledTimes(1)
    })
    expect(alExportar.mock.results[0]?.value).toBe(boton())
    expect(screen.queryByRole('dialog', { name: 'Vista y opciones' })).toBeNull()
  })

  it('un clic en un enlace del panel lo cierra', async () => {
    render(<VistaYOpciones grupos={grupos()} />)
    clic(boton())
    const enlace = await screen.findByRole('link', { name: 'Embudo' })
    fireEvent.click(enlace)
    await waitFor(() => {
      expect(boton()).toHaveAttribute('aria-expanded', 'false')
    })
  })

  it('en escritorio, el clic en el botón con el popover abierto lo cierra y no lo vuelve a abrir', async () => {
    ancha = true
    const alCambiar = vi.fn()
    render(<VistaYOpciones grupos={grupos()} alCambiarAbierto={alCambiar} />)
    clic(boton())
    await screen.findByRole('dialog', { name: 'Vista y opciones' })
    clic(boton())
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Vista y opciones' })).toBeNull()
    })
    expect(boton()).toHaveAttribute('aria-expanded', 'false')
    expect(alCambiar.mock.calls).toEqual([[true], [false]])
  })

  it('sin red lo dice y apaga los grupos que navegan', async () => {
    render(
      <VistaYOpciones
        grupos={[
          ...grupos(),
          {
            clave: 'por-pagina',
            titulo: 'Ítems por página',
            contenido: <select aria-label="Tamaño" />,
            sinRed: 'sigue',
          },
        ]}
      />,
    )
    clic(boton())
    await screen.findByRole('dialog', { name: 'Vista y opciones' })
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(
      await screen.findByText('Sin conexión: lo que necesita la red se activa cuando vuelva.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Todos', hidden: true }).closest('[inert]'),
    ).not.toBeNull()
    expect(screen.getByLabelText('Tamaño').closest('[inert]')).toBeNull()
    vi.restoreAllMocks()
  })
})
