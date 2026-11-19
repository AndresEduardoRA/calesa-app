import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePedidoAlServidor } from './use-pedido-al-servidor'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const OTRO = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

// Cada pedido es una escritura de la URL que va al servidor (`shallow: false`), con la cotización ya en ella.
const escrituras = vi.fn<(evento: UrlUpdateEvent) => void>()
const pedidos = () =>
  escrituras.mock.calls.filter(([evento]) => !evento.options.shallow).map(([e]) => e.queryString)

function envoltorio(busqueda: string) {
  return function Envoltorio({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams={busqueda} onUrlUpdate={escrituras} hasMemory>
        {children}
      </NuqsTestingAdapter>
    )
  }
}

afterEach(() => {
  cleanup()
  escrituras.mockClear()
})

describe('usePedidoAlServidor', () => {
  it('sin necesitarlo no pide, y nada está pedido', async () => {
    const { result } = renderHook(() => usePedidoAlServidor(ID, false), {
      wrapper: envoltorio(`?cotizacion=${ID}`),
    })
    await act(async () => {
      await new Promise((listo) => setTimeout(listo, 10))
    })
    expect(result.current.yaPedido).toBe(false)
    expect(pedidos()).toEqual([])
  })

  it('pide una vez por id, con la cotización en la URL, aunque se vuelva a dibujar', async () => {
    const { result, rerender } = renderHook(() => usePedidoAlServidor(ID, true), {
      wrapper: envoltorio(`?cotizacion=${ID}`),
    })
    await waitFor(() => {
      expect(result.current.yaPedido).toBe(true)
    })
    rerender()
    rerender()
    expect(pedidos()).toEqual([`?cotizacion=${ID}`])
  })

  it('otro id pide de nuevo y no hereda lo pedido', async () => {
    const { result, rerender } = renderHook(({ id }) => usePedidoAlServidor(id, true), {
      initialProps: { id: ID },
      wrapper: envoltorio(`?cotizacion=${ID}`),
    })
    await waitFor(() => {
      expect(pedidos()).toHaveLength(1)
    })
    rerender({ id: OTRO })
    await waitFor(() => {
      expect(pedidos()).toHaveLength(2)
    })
    await waitFor(() => {
      expect(result.current.yaPedido).toBe(true)
    })
  })

  it('pedir() de «Reintentar» pide aunque ya se haya pedido', async () => {
    const { result } = renderHook(() => usePedidoAlServidor(ID, true), {
      wrapper: envoltorio(`?cotizacion=${ID}`),
    })
    await waitFor(() => {
      expect(result.current.yaPedido).toBe(true)
    })
    act(() => {
      result.current.pedir()
    })
    await waitFor(() => {
      expect(pedidos()).toHaveLength(2)
    })
  })

  it('sin id no pide nada', async () => {
    const { result } = renderHook(() => usePedidoAlServidor(null, true), {
      wrapper: envoltorio(''),
    })
    act(() => {
      result.current.pedir()
    })
    await act(async () => {
      await new Promise((listo) => setTimeout(listo, 10))
    })
    expect(pedidos()).toEqual([])
    expect(result.current.yaPedido).toBe(false)
  })
})
