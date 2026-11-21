import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import type { Categoria } from '../entities/categoria'
import type { EdicionesDeCategorias } from './categorias/hooks/use-categorias'
import { PanelDeCategoria } from './categorias/components/panel-de-categoria'
import { FormularioDelOrigenNuevo } from './origenes/components/formulario-del-origen-nuevo'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('./origenes/actions/crear-origen', () => ({ crearOrigen: vi.fn() }))
vi.mock('./origenes/actions/eliminar-origen', () => ({ eliminarOrigen: vi.fn() }))
vi.mock('./origenes/actions/guardar-origen', () => ({ guardarOrigen: vi.fn() }))
vi.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ executeAsync: vi.fn(), isPending: false, result: {} }),
}))

afterEach(cleanup)

const edicionesDeCategorias = {
  enCurso: false,
  errores: { crear: undefined },
  crear: vi.fn(),
  renombrar: vi.fn(),
  cambiarActiva: vi.fn(),
  eliminar: vi.fn(),
} as unknown as EdicionesDeCategorias

const sedan: Categoria = {
  id: 'cat-1',
  origenId: 'o-1',
  padreId: null,
  nombre: 'Sedán',
  orden: 10,
  activa: true,
  actualizadoEn: '2026-10-17T10:00:00.000Z',
  vehiculos: 0,
}

// Lo que hace la acción de un aviso que sale de la pantalla: sigue directo, o pregunta en el pie del panel.
function pulsarAviso() {
  const salir = vi.fn()
  act(() => {
    salirSinPerder(salir)
  })
  return salir
}

const hayPregunta = () => screen.queryByText('Tienes cambios sin guardar.') !== null

// La página del alta (`/configuracion/origenes/nuevo`): sin un `<Drawer>`, la pregunta va en su pie (`useSalidaConCambios()`).
describe('FormularioDelOrigenNuevo', () => {
  const montar = () => render(<FormularioDelOrigenNuevo />)

  it('sin escribir nada, el aviso sale directo', () => {
    montar()
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
    expect(hayPregunta()).toBe(false)
  })

  it('con el nombre escrito, pregunta en el pie y «Seguir editando» no tira lo escrito', () => {
    montar()
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Subasta Texas' } })
    const salir = pulsarAviso()
    expect(salir).not.toHaveBeenCalled()
    expect(hayPregunta()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Nombre')).toHaveValue('Subasta Texas')
  })

  it('con el tipo cambiado a «subasta» también pregunta', () => {
    montar()
    fireEvent.click(screen.getByRole('radio', { name: /Subasta/ }))
    pulsarAviso()
    expect(hayPregunta()).toBe(true)
  })
})

describe('PanelDeCategoria', () => {
  function montar(categoria: Categoria | 'nueva', puedeGestionar = true) {
    render(
      <PanelDeCategoria
        categoria={categoria}
        origenId="o-1"
        raices={[sedan]}
        hijasDe={() => []}
        puedeGestionar={puedeGestionar}
        ediciones={edicionesDeCategorias}
        alCerrar={vi.fn()}
      />,
    )
  }

  it('una categoría que se edita, sin tocar, no pregunta; con el nombre cambiado, sí', () => {
    montar(sedan)
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Sedanes' } })
    expect(pulsarAviso()).not.toHaveBeenCalled()
    expect(hayPregunta()).toBe(true)
  })

  it('una categoría nueva con el nombre escrito pregunta', () => {
    montar('nueva')
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Camionetas' } })
    pulsarAviso()
    expect(hayPregunta()).toBe(true)
  })

  it('sin permiso no pregunta', () => {
    montar(sedan, false)
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
  })
})
