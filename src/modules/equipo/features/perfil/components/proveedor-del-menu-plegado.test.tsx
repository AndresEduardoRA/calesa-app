import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMenuPlegado } from '../hooks/use-menu-plegado'
import { ProveedorDelMenuPlegado } from './proveedor-del-menu-plegado'

afterEach(cleanup)

function Boton() {
  const { plegado, alternar } = useMenuPlegado()
  return (
    <button type="button" onClick={alternar}>
      {plegado ? 'plegado' : 'desplegado'}
    </button>
  )
}

describe('<ProveedorDelMenuPlegado>', () => {
  it('arranca como lo dejó la persona y cambia al instante', () => {
    const alGuardar = vi.fn().mockResolvedValue(true)
    render(
      <ProveedorDelMenuPlegado inicial alGuardar={alGuardar}>
        <Boton />
      </ProveedorDelMenuPlegado>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'plegado' }))
    expect(screen.getByRole('button', { name: 'desplegado' })).toBeTruthy()
    expect(alGuardar).toHaveBeenCalledWith(false)
  })

  it('dos toques seguidos no mandan dos pedidos a la vez: al terminar el primero sale el último valor', async () => {
    const respuestas: ((guardado: boolean) => void)[] = []
    const alGuardar = vi.fn(
      () =>
        new Promise<boolean>((resolver) => {
          respuestas.push(resolver)
        }),
    )
    render(
      <ProveedorDelMenuPlegado inicial={null} alGuardar={alGuardar}>
        <Boton />
      </ProveedorDelMenuPlegado>,
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    expect(alGuardar).toHaveBeenCalledTimes(1)
    expect(alGuardar).toHaveBeenLastCalledWith(true)

    await act(() => Promise.resolve(respuestas[0]?.(true)))
    expect(alGuardar).toHaveBeenCalledTimes(2)
    expect(alGuardar).toHaveBeenLastCalledWith(false)
    await act(() => Promise.resolve(respuestas[1]?.(true)))
    expect(alGuardar).toHaveBeenCalledTimes(2)
  })
})
