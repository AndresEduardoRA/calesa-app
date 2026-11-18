import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const rpc = vi.fn()
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ rpc })),
}))

import {
  crudaDeUnaGuardada,
  ID_DE_LA_COTIZACION,
} from '../../entities/hoja-de-una-guardada.soporte'
import { getHojaDeUnaGuardada } from './hoja-de-una-guardada'

const evaluada = (usd: number | null = 2350) => ({
  valores: { remate: 1000 },
  estados: {},
  fuentes: { remate: 'input' },
  totales: { usd, bs: null, suma_usd: null },
  faltantes: [],
})
const responder = (hoja: unknown, evaluar: unknown) => {
  rpc.mockImplementation((nombre: string) =>
    Promise.resolve(nombre === 'cotizacion_hoja_guardada' ? hoja : evaluar),
  )
}
const pedidoDeEvaluar = () => {
  const llamada = rpc.mock.calls.find((c) => c[0] === 'cotizacion_evaluar')
  return llamada?.[1] as Record<string, unknown>
}

describe('getHojaDeUnaGuardada: la lectura que abre una cotización guardada', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('lee la hoja con UNA llamada y calcula con otra, por la cotización y sin hoja abierta', async () => {
    responder({ data: crudaDeUnaGuardada(), error: null }, { data: evaluada(), error: null })
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[0]).toEqual(['cotizacion_hoja_guardada', { p_id: ID_DE_LA_COTIZACION }])
    expect(rpc.mock.calls[1]?.[0]).toBe('cotizacion_evaluar')
    const pedido = pedidoDeEvaluar()
    expect(pedido['p_cotizacion']).toBe(ID_DE_LA_COTIZACION)
    expect(pedido).not.toHaveProperty('p_origen')
    expect(pedido).not.toHaveProperty('p_abierta')
    expect(pedido).not.toHaveProperty('p_vehiculo')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.hoja.cotizacion.numero).toBe(41)
      expect(r.data.inicial.estado).toEqual({ tipo: 'al_dia' })
      expect(r.data.inicial.respuesta?.totales.usd).toBe(2350)
    }
  })

  it('calcula con lo guardado como entradas (C4) y con su modo de tipo de cambio', async () => {
    responder(
      {
        data: crudaDeUnaGuardada({
          cotizacion: { ...crudaDeUnaGuardada().cotizacion, modo_tc: 'unificado' },
          valores: { remate: 1000, variante: 'moto', cuenta: 1, iva_c: 0.13 },
          fuentes: { remate: 'input', iva_c: 'override' },
        }),
        error: null,
      },
      { data: evaluada(), error: null },
    )
    await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(pedidoDeEvaluar()).toEqual({
      p_entradas: {
        inputs: { remate: 1000 },
        banderas: { cuenta: true },
        overrides: { iva_c: 0.13 },
        variante: 'moto',
      },
      p_cotizacion: ID_DE_LA_COTIZACION,
      p_modo_tc: 'unificado',
    })
  })

  it('sin modo guardado no manda p_modo_tc', async () => {
    responder({ data: crudaDeUnaGuardada(), error: null }, { data: evaluada(), error: null })
    await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(pedidoDeEvaluar()).not.toHaveProperty('p_modo_tc')
  })
})

describe('getHojaDeUnaGuardada: lo que sale mal', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('con 42501 la cotización no está disponible y no se calcula nada', async () => {
    responder(
      { data: null, error: { code: '42501', message: 'No tienes acceso a esta cotización.' } },
      { data: evaluada(), error: null },
    )
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(!r.ok && r.error.codigo).toBe('sin_permiso')
  })

  it('otro error de la lectura es un error, no «no disponible»', async () => {
    responder(
      { data: null, error: { code: 'XX000', message: 'boom' } },
      { data: null, error: null },
    )
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error.codigo).not.toBe('sin_permiso')
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('una respuesta que no es lo que promete la base es un error inesperado', async () => {
    responder({ data: { estado: 'lista' }, error: null }, { data: evaluada(), error: null })
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(!r.ok && r.error.codigo).toBe('inesperado')
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('si el recálculo falla la hoja abre igual, con «No se pudo recalcular»', async () => {
    responder(
      { data: crudaDeUnaGuardada(), error: null },
      { data: null, error: { code: '42501', message: 'No tienes acceso a este vehículo.' } },
    )
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.inicial.respuesta).toBeNull()
      expect(r.data.inicial.estado).toEqual({ tipo: 'fallo', recargar: true })
    }
  })

  it('un id que no es un uuid no llega a la base', async () => {
    const r = await getHojaDeUnaGuardada('cotizacion-41')
    expect(rpc).not.toHaveBeenCalled()
    expect(!r.ok && r.error.codigo).toBe('validacion')
  })
})

describe('getHojaDeUnaGuardada › con un vehículo para cambiarlo (T315)', () => {
  const NUEVO = '4b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
  const GUARDADO = '5b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
  const conVehiculo = (mas: Record<string, unknown> = {}) =>
    crudaDeUnaGuardada({
      cotizacion: { ...crudaDeUnaGuardada().cotizacion, vehiculo_id: GUARDADO, ...mas },
    })
  const evaluaciones = () =>
    rpc.mock.calls
      .filter((c) => c[0] === 'cotizacion_evaluar')
      .map((c) => c[1] as Record<string, unknown>)

  beforeEach(() => {
    rpc.mockReset()
  })

  it('una preventa que se puede guardar calcula con el vehículo pedido, en la misma llamada', async () => {
    responder({ data: conVehiculo(), error: null }, { data: evaluada(), error: null })
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION, { vehiculo: NUEVO })
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(evaluaciones()[0]).toMatchObject({
      p_cotizacion: ID_DE_LA_COTIZACION,
      p_vehiculo: NUEVO,
    })
    expect(r.ok && r.data).toMatchObject({ vehiculoNuevo: NUEVO, vehiculoSoltado: false })
  })

  it('el mismo vehículo que el guardado, una final o sin poder guardar: con el suyo, sin p_vehiculo', async () => {
    for (const [cruda, pedido] of [
      [conVehiculo(), GUARDADO],
      [conVehiculo({ clase: 'final' }), NUEVO],
      [{ ...conVehiculo(), puede_guardar: false }, NUEVO],
    ] as const) {
      rpc.mockReset()
      responder({ data: cruda, error: null }, { data: evaluada(), error: null })
      const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION, { vehiculo: pedido })
      expect(evaluaciones()).toHaveLength(1)
      expect(evaluaciones()[0]).not.toHaveProperty('p_vehiculo')
      expect(r.ok && r.data).toMatchObject({ vehiculoNuevo: null, vehiculoSoltado: false })
    }
  })

  it('si la base rechaza el vehículo (no se ve, papelera, otro origen), calcula con el suyo y lo dice', async () => {
    rpc.mockImplementation((nombre: string, args: Record<string, unknown>) =>
      Promise.resolve(
        nombre === 'cotizacion_hoja_guardada'
          ? { data: conVehiculo(), error: null }
          : 'p_vehiculo' in args
            ? { data: null, error: { code: '42501', message: 'No tienes acceso a este vehículo.' } }
            : { data: evaluada(1800), error: null },
      ),
    )
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION, { vehiculo: NUEVO })
    expect(evaluaciones()).toHaveLength(2)
    expect(evaluaciones()[1]).not.toHaveProperty('p_vehiculo')
    expect(r.ok && r.data).toMatchObject({ vehiculoNuevo: null, vehiculoSoltado: true })
    expect(r.ok && r.data.inicial.respuesta?.totales.usd).toBe(1800)
  })

  it('si sin el vehículo también falla, no era el vehículo: la hoja abre con el primer fallo y el vehículo pedido', async () => {
    responder(
      { data: conVehiculo(), error: null },
      { data: null, error: { code: '42501', message: 'No tienes acceso a esta cotización.' } },
    )
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION, { vehiculo: NUEVO })
    expect(evaluaciones()).toHaveLength(2)
    expect(r.ok && r.data).toMatchObject({ vehiculoNuevo: NUEVO, vehiculoSoltado: false })
    expect(r.ok && r.data.inicial.respuesta).toBeNull()
  })

  it('otro error del cálculo con el vehículo no se reintenta: la hoja abre con el fallo', async () => {
    responder(
      { data: conVehiculo(), error: null },
      { data: null, error: { code: 'XX000', message: 'boom' } },
    )
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION, { vehiculo: NUEVO })
    expect(evaluaciones()).toHaveLength(1)
    expect(r.ok && r.data).toMatchObject({ vehiculoNuevo: NUEVO, vehiculoSoltado: false })
    expect(r.ok && r.data.inicial.respuesta).toBeNull()
  })
})
