import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFilaPedida } from './use-fila-pedida'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('useFilaPedida', () => {
  it('entrega la fila de ?fila= una vez y la borra de la URL, sin tocar lo demás', () => {
    window.history.replaceState(null, '', '/planilla?fila=costo&panel=x')
    const alPedir = vi.fn()
    const { rerender } = renderHook(() => {
      useFilaPedida(alPedir)
    })
    rerender()
    expect(alPedir).toHaveBeenCalledTimes(1)
    expect(alPedir).toHaveBeenCalledWith('costo')
    expect(window.location.search).toBe('?panel=x')
  })

  it('sin ?fila= (o vacía) no elige nada', () => {
    for (const busqueda of ['', '?fila=']) {
      window.history.replaceState(null, '', `/planilla${busqueda}`)
      const alPedir = vi.fn()
      renderHook(() => {
        useFilaPedida(alPedir)
      })
      expect(alPedir).not.toHaveBeenCalled()
    }
  })
})
