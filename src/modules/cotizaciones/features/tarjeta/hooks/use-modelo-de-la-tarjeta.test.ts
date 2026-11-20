import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { tarjetaDesde } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { calculoDePrueba, crudaDeLaTarjeta } from '../../../entities/tarjeta/tarjeta.soporte'

let respuesta: Resultado<LecturaDeLaTarjeta> = {
  ok: false,
  error: { codigo: 'inesperado', mensaje: 'x' },
}
vi.mock('../../../areas/tarjeta/composicion.client', () => ({
  leerTarjeta: () => Promise.resolve(respuesta),
}))

import { useModeloDeLaTarjeta, type PaginaDelModelo } from './use-modelo-de-la-tarjeta'

const pagina: PaginaDelModelo = {
  titulo: null,
  cliente: null,
  vehiculo: { titulo: 'Toyota Hilux 2020', lote: null, vin: null },
  asesor: 'Ana Pérez',
  numero: 7,
  vencida: true,
  venceEl: '2026-10-20',
  guardadaEl: '2026-10-11T14:00:00.000000+00:00',
  empresa: null,
  logo: null,
}
const entrada = {
  formulaId: '00000000-0000-4000-8000-0000000000aa',
  calculo: calculoDePrueba(),
  monedaBs: 'BOB',
  pagina,
}

describe('useModeloDeLaTarjeta', () => {
  it('con la lectura arma el contexto con lo que la página sabe (las fechas en la zona) y la geometría', async () => {
    const lectura = tarjetaDesde(crudaDeLaTarjeta())
    if (lectura === null) {
      throw new Error('no se lee')
    }
    respuesta = { ok: true, data: lectura }
    const { result } = renderHook(() => useModeloDeLaTarjeta(entrada))
    expect(result.current.geometria).toBeNull()
    await waitFor(() => {
      expect(result.current.geometria).not.toBeNull()
    })
    expect(result.current.lectura).toBe(lectura)
    expect(result.current.contexto).toMatchObject({
      asesor: 'Ana Pérez',
      numero: '7',
      fecha: '11 oct 2026',
      venceEl: '20 oct 2026',
    })
    const total = result.current.geometria?.celdas.find((c) => c.marca.total === true)
    expect(total?.contenido).toMatchObject({ tipo: 'monto', valor: 1355 })
  })

  it('sin lectura la geometría es nula y el estado dice el error', async () => {
    respuesta = { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }
    const { result } = renderHook(() => useModeloDeLaTarjeta(entrada))
    await waitFor(() => {
      expect(result.current.estado.tipo).toBe('error')
    })
    expect(result.current.geometria).toBeNull()
    expect(result.current.lectura).toBeNull()
  })
})
