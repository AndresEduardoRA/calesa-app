import { describe, expect, it } from 'vitest'
import { eleccionesDeUnaGuardada, loQueFalta, SIN_OBLIGATORIOS } from './obligatorios-al-cotizar'

const LOS_DOS = { lead: true, vehiculo: true }
const LEAD = '11111111-1111-4111-8111-111111111111'
const VEHICULO = '22222222-2222-4222-8222-222222222222'

describe('loQueFalta', () => {
  it('con los dos obligatorios, el lead primero (como la base) y después el vehículo', () => {
    expect(loQueFalta(LOS_DOS, { leadId: null, vehiculoId: null })).toBe('lead')
    expect(loQueFalta(LOS_DOS, { leadId: null, vehiculoId: VEHICULO })).toBe('lead')
    expect(loQueFalta(LOS_DOS, { leadId: LEAD, vehiculoId: null })).toBe('vehiculo')
    expect(loQueFalta(LOS_DOS, { leadId: LEAD, vehiculoId: VEHICULO })).toBeNull()
  })

  it('lo que no es obligatorio no falta aunque no esté elegido', () => {
    expect(loQueFalta({ lead: false, vehiculo: true }, { leadId: null, vehiculoId: null })).toBe(
      'vehiculo',
    )
    expect(loQueFalta({ lead: true, vehiculo: false }, { leadId: null, vehiculoId: null })).toBe(
      'lead',
    )
    expect(
      loQueFalta({ lead: true, vehiculo: false }, { leadId: LEAD, vehiculoId: null }),
    ).toBeNull()
    expect(loQueFalta(SIN_OBLIGATORIOS, { leadId: null, vehiculoId: null })).toBeNull()
  })

  it('sin vehículo, el título falta (para cualquier rol), después del lead y del vehículo; con vehículo o con título, no', () => {
    expect(loQueFalta(SIN_OBLIGATORIOS, { leadId: null, vehiculoId: null, titulo: null })).toBe(
      'titulo',
    )
    expect(loQueFalta(LOS_DOS, { leadId: null, vehiculoId: null, titulo: null })).toBe('lead')
    expect(loQueFalta(LOS_DOS, { leadId: LEAD, vehiculoId: null, titulo: null })).toBe('vehiculo')
    expect(
      loQueFalta(SIN_OBLIGATORIOS, { leadId: null, vehiculoId: null, titulo: 'Para Ana' }),
    ).toBeNull()
    expect(
      loQueFalta(SIN_OBLIGATORIOS, { leadId: null, vehiculoId: VEHICULO, titulo: null }),
    ).toBeNull()
    // Sin el proveedor del título (`undefined`), la hoja no lo pide.
    expect(loQueFalta(SIN_OBLIGATORIOS, { leadId: null, vehiculoId: null })).toBeNull()
  })
})

describe('eleccionesDeUnaGuardada', () => {
  it('sólo el título, en el panel del vehículo; lo demás no se ofrece', () => {
    const e = eleccionesDeUnaGuardada('vehiculo')
    expect(e.titulo).toEqual({ panel: 'vehiculo' })
    expect(e.vehiculo).toEqual({ pedido: '' })
    expect(e.lead).toEqual({ pedido: '' })
  })

  it('si quien mira puede cambiar el vehículo (T315), también «Elegir otro vehículo» en el mismo panel', () => {
    const e = eleccionesDeUnaGuardada('vehiculo', { cambiaVehiculo: true })
    expect(e.vehiculo).toEqual({ panel: 'vehiculo', texto: 'Elegir otro vehículo' })
    expect(e.titulo).toEqual({ panel: 'vehiculo' })
  })
})
