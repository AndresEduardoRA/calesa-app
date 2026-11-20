import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CondicionDeLaTarjeta } from '../../../entities/cuadricula-de-la-tarjeta'
import { completarSi } from '../../../entities/plantilla/edicion/borradores-de-la-celda'
import {
  borradorDeLaCondicion,
  CONDICION_VACIA,
  type CondicionEnBorrador,
} from '../../../entities/plantilla/edicion/condiciones'
import { useBorradorDeLaRegla } from './use-borrador-de-la-regla'

afterEach(cleanup)

const L = 'es-BO'
const REMATE = { tipo: 'dato', nodo: 'remate', mostrar: 'monto' } as const
type Si = readonly CondicionDeLaTarjeta[]

function montar(inicial: Si) {
  const alCompletar = vi.fn()
  const hook = renderHook(
    ({ valor }: { valor: Si }) =>
      useBorradorDeLaRegla<readonly CondicionEnBorrador[], Si>({
        valor,
        derivar: (v) =>
          v.length === 0 ? [CONDICION_VACIA] : v.map((c) => borradorDeLaCondicion(c, L)),
        completar: (b) => completarSi(b, L),
        alCompletar,
      }),
    { initialProps: { valor: inicial } },
  )
  return { ...hook, alCompletar }
}

describe('useBorradorDeLaRegla', () => {
  it('lo incompleto queda con sus motivos y no se manda; lo entero se manda con su clave', () => {
    const { result, alCompletar } = montar([])
    expect(result.current.completo).toBe(false)
    act(() => {
      result.current.cambiar([{ sobre: REMATE, es: 'mayor', numero: '', opcion: null }])
    })
    expect(result.current.motivos.get('si.0.numero')).toBe('Falta el número.')
    expect(alCompletar).not.toHaveBeenCalled()
    act(() => {
      result.current.cambiar(
        [{ sobre: REMATE, es: 'mayor', numero: '1.000,50', opcion: null }],
        'k',
      )
    })
    expect(alCompletar).toHaveBeenCalledWith([{ es: 'mayor', nodo: 'remate', a: 1000.5 }], 'k')
  })

  it('lo que vuelve igual a lo mandado no reescribe lo tipeado; lo que cambia afuera se trae', () => {
    const { result, rerender, alCompletar } = montar([{ es: 'mayor', nodo: 'remate', a: 1 }])
    act(() => {
      result.current.cambiar([{ sobre: REMATE, es: 'mayor', numero: '1.000,50', opcion: null }])
    })
    const mandado = alCompletar.mock.calls[0]?.[0] as Si
    rerender({ valor: mandado })
    expect(result.current.borrador[0]?.numero).toBe('1.000,50')
    rerender({ valor: [{ es: 'cero', nodo: 'remate' }] })
    expect(result.current.borrador).toEqual([{ ...CONDICION_VACIA, sobre: REMATE, es: 'cero' }])
  })

  it('a medio armar, lo de afuera no lo pisa', () => {
    const { result, rerender } = montar([{ es: 'cero', nodo: 'remate' }])
    act(() => {
      result.current.cambiar([{ sobre: REMATE, es: 'menor', numero: '', opcion: null }])
    })
    rerender({ valor: [{ es: 'no_cero', nodo: 'remate' }] })
    expect(result.current.borrador[0]?.es).toBe('menor')
  })
})
