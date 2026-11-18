import { describe, expect, it } from 'vitest'
import type { CotizacionDeLaHoja } from '../../../entities/hoja-de-una-guardada'
import { TITULO_AUTOMATICO } from '../../../entities/titulo-de-la-cotizacion'
import { tituloDeLaEdicion } from './titulo-de-la-edicion'
import type { TituloDeLaCotizacion } from './use-titulo-de-la-cotizacion'

const VEHICULO = '22222222-2222-4222-8222-222222222222'
const cotizacion = (vehiculoId: string | null): CotizacionDeLaHoja => ({
  id: '11111111-1111-4111-8111-111111111111',
  numero: 41,
  clase: 'preventa',
  version: 1,
  origenId: 'o',
  leadId: null,
  vehiculoId,
  modoTc: null,
  verTotalBs: false,
  titulo: null,
  tituloManual: false,
  notas: null,
  creadoEn: '2026-11-01T10:00:00Z',
  actualizadoEn: '2026-11-03T14:20:31.123456+00:00',
})
const automatico = (mostrado: string | null) =>
  ({
    estado: TITULO_AUTOMATICO,
    inicial: TITULO_AUTOMATICO,
    vehiculo: mostrado,
    mostrado,
  }) as TituloDeLaCotizacion

describe('tituloDeLaEdicion: el título en el guardado de una guardada', () => {
  it('sin vehículo y sin título, falta', () => {
    expect(tituloDeLaEdicion(automatico(null), cotizacion(null)).falta).toBe('titulo')
  })

  it('falta según el vehículo de la hoja (T315): una sin vehículo que toma uno ya no lo pide', () => {
    expect(tituloDeLaEdicion(automatico('Mazda 3'), cotizacion(null), VEHICULO).falta).toBeNull()
    expect(tituloDeLaEdicion(automatico(null), cotizacion(null), VEHICULO).falta).toBeNull()
  })

  it('sin decir el vehículo de la hoja, el guardado', () => {
    expect(tituloDeLaEdicion(automatico(null), cotizacion(VEHICULO)).falta).toBeNull()
  })

  it('sin el proveedor, el título guardado viaja sin tocar y no se pide', () => {
    expect(tituloDeLaEdicion(null, cotizacion(null))).toEqual({
      cambio: false,
      falta: null,
      paraGuardar: { titulo: null, tituloManual: false },
    })
  })
})
