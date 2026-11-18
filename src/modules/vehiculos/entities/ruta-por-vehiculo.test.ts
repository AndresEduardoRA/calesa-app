import { describe, expect, it } from 'vitest'
import { MARCADOR_DE_VEHICULO, rutaDelVehiculo } from './ruta-por-vehiculo'

describe('rutaDelVehiculo', () => {
  it('pone el id del vehículo donde la plantilla tiene el marcador', () => {
    const id = '0b1c2d3e-0000-4000-8000-000000000001'
    expect(
      rutaDelVehiculo(`/actividad?entidad=vehiculos&registro=${MARCADOR_DE_VEHICULO}`, id),
    ).toBe(`/actividad?entidad=vehiculos&registro=${id}`)
  })

  it('el id va codificado: no rompe la consulta', () => {
    expect(rutaDelVehiculo(`/x?v=${MARCADOR_DE_VEHICULO}`, 'a&b=c')).toBe('/x?v=a%26b%3Dc')
  })
})
