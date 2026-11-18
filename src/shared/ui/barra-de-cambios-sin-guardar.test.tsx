import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarraDeCambiosSinGuardar } from './barra-de-cambios-sin-guardar'
import { salirSinPerder } from './salida-con-cambios'

const empujar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: empujar }) }))

afterEach(() => {
  cleanup()
  empujar.mockReset()
})

function Pantalla({
  hayCambios,
  alDescartar = vi.fn(),
}: {
  hayCambios: boolean
  alDescartar?: () => void
}) {
  return (
    <>
      <form id="datos" />
      <a href="/configuracion/leads">Leads</a>
      <a href="#abajo">Abajo</a>
      <BarraDeCambiosSinGuardar
        hayCambios={hayCambios}
        formulario="datos"
        alDescartar={alDescartar}
      />
    </>
  )
}

// Un clic que llega a la página (y no lo frena la barra) se ve con `defaultPrevented` en false.
function tocar(nombre: string) {
  const evento = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
  act(() => {
    screen.getByRole('link', { name: nombre }).dispatchEvent(evento)
  })
  return evento
}

describe('BarraDeCambiosSinGuardar', () => {
  it('sin cambios no se ve; con cambios, sí', () => {
    const { rerender } = render(<Pantalla hayCambios={false} />)
    expect(screen.queryByRole('region', { name: 'Cambios sin guardar' })).toBeNull()
    rerender(<Pantalla hayCambios />)
    expect(screen.getByRole('region', { name: 'Cambios sin guardar' })).toBeTruthy()
    expect(screen.getByText('Tienes cambios sin guardar')).toBeTruthy()
  })

  it('«Descartar» llama a alDescartar; «Guardar» envía el formulario indicado', () => {
    const alDescartar = vi.fn()
    render(<Pantalla hayCambios alDescartar={alDescartar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(alDescartar).toHaveBeenCalledOnce()
    const guardar = screen.getByRole('button', { name: 'Guardar' })
    expect(guardar.getAttribute('type')).toBe('submit')
    expect(guardar.getAttribute('form')).toBe('datos')
  })

  it('con cambios, un enlace a otra pantalla no navega y pregunta; «Descartar» descarta y navega', () => {
    const alDescartar = vi.fn()
    render(<Pantalla hayCambios alDescartar={alDescartar} />)
    expect(tocar('Leads').defaultPrevented).toBe(true)
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeTruthy()
    expect(empujar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(alDescartar).toHaveBeenCalledOnce()
    expect(empujar).toHaveBeenCalledWith('/configuracion/leads')
  })

  it('«Seguir editando» se queda en la pantalla', () => {
    const alDescartar = vi.fn()
    render(<Pantalla hayCambios alDescartar={alDescartar} />)
    tocar('Leads')
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(empujar).not.toHaveBeenCalled()
    expect(alDescartar).not.toHaveBeenCalled()
    expect(screen.getByText('Tienes cambios sin guardar')).toBeTruthy()
  })

  it('un ancla de la misma página no pregunta, ni nada sin cambios', () => {
    const { rerender } = render(<Pantalla hayCambios />)
    tocar('Abajo')
    expect(screen.queryByText('Tienes cambios sin guardar.')).toBeNull()
    rerender(<Pantalla hayCambios={false} />)
    tocar('Leads')
    expect(screen.queryByText('Tienes cambios sin guardar.')).toBeNull()
  })

  it('recargar o cerrar pregunta sólo con cambios', () => {
    const { rerender } = render(<Pantalla hayCambios={false} />)
    const sin = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(sin)
    expect(sin.defaultPrevented).toBe(false)
    rerender(<Pantalla hayCambios />)
    const con = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(con)
    expect(con.defaultPrevented).toBe(true)
  })

  it('una salida por salirSinPerder (un aviso, el selector de sección) también pregunta', () => {
    const salir = vi.fn()
    render(<Pantalla hayCambios />)
    act(() => {
      salirSinPerder(salir)
    })
    expect(salir).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(salir).toHaveBeenCalledOnce()
  })
})
