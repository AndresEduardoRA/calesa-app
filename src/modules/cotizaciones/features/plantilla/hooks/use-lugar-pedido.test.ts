import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useLugarPedido } from './use-lugar-pedido'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('useLugarPedido', () => {
  it('da el lugar de ?lugar= y lo borra de la URL, sin tocar lo demás', () => {
    window.history.replaceState(null, '', '/tarjeta?lugar=celdas.titulo&vista=1')
    const { result, rerender } = renderHook(() => useLugarPedido())
    rerender()
    expect(result.current).toBe('celdas.titulo')
    expect(window.location.search).toBe('?vista=1')
  })

  it('lo que no es un lugar de la tarjeta no se usa, pero se borra', () => {
    window.history.replaceState(null, '', '/tarjeta?lugar=nota')
    const { result } = renderHook(() => useLugarPedido())
    expect(result.current).toBeNull()
    expect(window.location.search).toBe('')
  })
})
