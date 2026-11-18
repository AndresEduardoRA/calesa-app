import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { avisarAprobada, useAlCambiarLaAprobada } from './aprobada-del-vehiculo'

const V = '00000000-0000-4000-8000-0000000000aa'
const OTRO = '00000000-0000-4000-8000-0000000000bb'
const C = '00000000-0000-4000-8000-0000000000c1'

afterEach(cleanup)

describe('la aprobada entre islas', () => {
  it('avisa a las otras islas del mismo vehículo y no a la que avisó', () => {
    const cabecera = vi.fn()
    const bloque = vi.fn()
    renderHook(() => {
      useAlCambiarLaAprobada(V, 'cabecera', cabecera)
    })
    renderHook(() => {
      useAlCambiarLaAprobada(V, 'bloque', bloque)
    })
    avisarAprobada({ vehiculoId: V, aprobadaId: C, fuente: 'bloque' })
    expect(cabecera).toHaveBeenCalledWith(C)
    expect(bloque).not.toHaveBeenCalled()
  })

  it('no avisa por otro vehículo, sin vehículo no escucha y al desmontarse deja de escuchar', () => {
    const otra = vi.fn()
    const sinVehiculo = vi.fn()
    const montada = renderHook(() => {
      useAlCambiarLaAprobada(V, 'a', otra)
    })
    renderHook(() => {
      useAlCambiarLaAprobada(null, 'b', sinVehiculo)
    })
    avisarAprobada({ vehiculoId: OTRO, aprobadaId: C, fuente: 'x' })
    expect(otra).not.toHaveBeenCalled()
    montada.unmount()
    avisarAprobada({ vehiculoId: V, aprobadaId: C, fuente: 'x' })
    expect(otra).not.toHaveBeenCalled()
    expect(sinVehiculo).not.toHaveBeenCalled()
  })
})
