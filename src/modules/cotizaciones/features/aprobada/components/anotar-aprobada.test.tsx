import { act, cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAprobadaAnotada } from '../../privada/hooks/aprobada-anotada'
import { avisarAprobada } from '../hooks/aprobada-del-vehiculo'
import { AnotarAprobada } from './anotar-aprobada'

const V = '00000000-0000-4000-8000-0000000000aa'
const C = '00000000-0000-4000-8000-0000000000c1'
const OTRA = '00000000-0000-4000-8000-0000000000c2'

afterEach(cleanup)

describe('la aprobada anotada para «Hacer privada»', () => {
  it('sin anotación es nula: la base decide al intentarlo', () => {
    const { result } = renderHook(() => useAprobadaAnotada(C))
    expect(result.current).toBeNull()
  })

  it('anota lo leído al montarse y lo olvida al desmontarse', () => {
    const { result } = renderHook(() => useAprobadaAnotada(C))
    const anotada = render(<AnotarAprobada id={C} aprobada vehiculoId={V} />)
    expect(result.current).toBe(true)
    anotada.unmount()
    expect(result.current).toBeNull()
  })

  it('se pone al día cuando otra isla del vehículo aprueba otra o la devuelve', () => {
    const { result } = renderHook(() => useAprobadaAnotada(C))
    render(<AnotarAprobada id={C} aprobada={false} vehiculoId={V} />)
    expect(result.current).toBe(false)
    act(() => {
      avisarAprobada({ vehiculoId: V, aprobadaId: C, fuente: 'cabecera' })
    })
    expect(result.current).toBe(true)
    act(() => {
      avisarAprobada({ vehiculoId: V, aprobadaId: OTRA, fuente: 'bloque' })
    })
    expect(result.current).toBe(false)
  })
})
