import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VISTOS_POR_DEFECTO, type LecturaDeVistos } from '../../../entities/vistos'
import { ProveedorDeVistos } from '../components/proveedor-de-vistos'
import { useVistos } from './use-vistos'

const pedidos = vi.hoisted(() => ({
  leerVistosAlUsar: vi.fn<(...args: unknown[]) => Promise<LecturaDeVistos | null>>(),
  registrarVistoAlUsar: vi.fn<(...args: unknown[]) => Promise<void>>(),
}))
vi.mock('../pedidos-de-vistos', () => pedidos)

const A = '0b1c2d3e-0000-4000-8000-00000000000a'
const B = '0b1c2d3e-0000-4000-8000-00000000000b'

function conPreferencia(preferencia = VISTOS_POR_DEFECTO) {
  return function Envoltorio({ children }: { children: ReactNode }) {
    return <ProveedorDeVistos preferencia={preferencia}>{children}</ProveedorDeVistos>
  }
}

describe('useVistos', () => {
  beforeEach(() => {
    pedidos.leerVistosAlUsar.mockReset()
    pedidos.registrarVistoAlUsar.mockReset()
    pedidos.registrarVistoAlUsar.mockResolvedValue(undefined)
  })

  it('apagado no lee, no registra y no marca', () => {
    const { result } = renderHook(() => useVistos('leads', [{ tipo: 'lead', ids: [A] }]), {
      wrapper: conPreferencia({ ...VISTOS_POR_DEFECTO, activado: false }),
    })
    act(() => {
      result.current.abrir('lead', A)
    })
    expect(pedidos.leerVistosAlUsar).not.toHaveBeenCalled()
    expect(pedidos.registrarVistoAlUsar).not.toHaveBeenCalled()
    expect(result.current.marca(A)).toBeNull()
  })

  it('una lectura nula deja todo sin marcas', async () => {
    pedidos.leerVistosAlUsar.mockResolvedValue(null)
    const { result } = renderHook(() => useVistos('leads', [{ tipo: 'lead', ids: [A, B] }]), {
      wrapper: conPreferencia(),
    })
    await waitFor(() => {
      expect(pedidos.leerVistosAlUsar).toHaveBeenCalledTimes(1)
    })
    expect(result.current.marca(A)).toBeNull()
    expect(result.current.marca(B)).toBeNull()
  })

  it('marca lo leído y abrir deja el abierto como último al instante, y registra', async () => {
    pedidos.leerVistosAlUsar.mockResolvedValue({ vistos: new Set([A]), ultimo: A })
    const { result } = renderHook(() => useVistos('agenda', [{ tipo: 'evento', ids: [A, B] }]), {
      wrapper: conPreferencia(),
    })
    await waitFor(() => {
      expect(result.current.marca(A)).toBe('ultimo')
    })
    act(() => {
      result.current.abrir('tarea', B)
    })
    expect(result.current.marca(B)).toBe('ultimo')
    expect(result.current.marca(A)).toBe('visto')
    expect(pedidos.registrarVistoAlUsar).toHaveBeenCalledWith('agenda', 'tarea', B)
  })

  it('reordenar los ids no vuelve a leer, pero otros ids sí', async () => {
    pedidos.leerVistosAlUsar.mockResolvedValue({ vistos: new Set(), ultimo: null })
    const { rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useVistos('leads', [{ tipo: 'lead', ids }]),
      { wrapper: conPreferencia(), initialProps: { ids: [A, B] } },
    )
    await waitFor(() => {
      expect(pedidos.leerVistosAlUsar).toHaveBeenCalledTimes(1)
    })
    rerender({ ids: [B, A, A] })
    expect(pedidos.leerVistosAlUsar).toHaveBeenCalledTimes(1)
    rerender({ ids: [A] })
    await waitFor(() => {
      expect(pedidos.leerVistosAlUsar).toHaveBeenCalledTimes(2)
    })
  })
})

describe('useVistos: lo no visto', () => {
  beforeEach(() => {
    pedidos.leerVistosAlUsar.mockReset()
    pedidos.registrarVistoAlUsar.mockReset()
    pedidos.registrarVistoAlUsar.mockResolvedValue(undefined)
  })

  it('lo que la lectura cubre y no se abrió es «nuevo»; antes de leer o al fallar, sin marca', async () => {
    let llegar: (lectura: LecturaDeVistos) => void = () => undefined
    pedidos.leerVistosAlUsar.mockReturnValue(
      new Promise<LecturaDeVistos>((resolver) => {
        llegar = resolver
      }),
    )
    const { result } = renderHook(() => useVistos('leads', [{ tipo: 'lead', ids: [A, B] }]), {
      wrapper: conPreferencia(),
    })
    expect(result.current.marca(A)).toBeNull()
    await act(async () => {
      llegar({ vistos: new Set([A]), ultimo: null })
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(result.current.marca(A)).toBe('visto')
    })
    expect(result.current.marca(B)).toBe('nuevo')
    // Un id que no se pidió (pasó el tope) no se sabe: sin marca.
    expect(result.current.marca('otro')).toBeNull()
    act(() => {
      result.current.abrir('lead', B)
    })
    expect(result.current.marca(B)).toBe('ultimo')
    expect(result.current.marca(A)).toBe('visto')
  })

  it('otra página no hereda lo «nuevo» de la anterior hasta que llega su lectura', async () => {
    pedidos.leerVistosAlUsar.mockResolvedValueOnce({ vistos: new Set(), ultimo: null })
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useVistos('leads', [{ tipo: 'lead', ids }]),
      { wrapper: conPreferencia(), initialProps: { ids: [A] } },
    )
    await waitFor(() => {
      expect(result.current.marca(A)).toBe('nuevo')
    })
    pedidos.leerVistosAlUsar.mockReturnValueOnce(new Promise(() => undefined))
    rerender({ ids: [B] })
    expect(result.current.marca(B)).toBeNull()
  })
})
