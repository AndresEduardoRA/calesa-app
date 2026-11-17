import { describe, expect, it } from 'vitest'
import { COLUMNAS_DE_PROYECTO, esIdDeProyecto, proyectoDetalladoDesde } from './detalle'

const ID = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const fila = {
  id: ID,
  numero: 12,
  vehiculo_id: null,
  vehiculo_etiqueta: 'E2E Hilux',
  vin: null,
  lead_id: null,
  cliente_nombre: 'Rosa',
  notas: null,
  cerrado_en: null,
  actualizado_en: '2026-11-12T10:00:00+00:00',
}

describe('proyectoDetalladoDesde', () => {
  it('arma el proyecto', () => {
    expect(proyectoDetalladoDesde(fila)).toEqual({
      id: ID,
      numero: 12,
      vehiculoId: null,
      vehiculoEtiqueta: 'E2E Hilux',
      vin: null,
      leadId: null,
      clienteNombre: 'Rosa',
      notas: null,
      cerradoEn: null,
      actualizadoEn: '2026-11-12T10:00:00+00:00',
    })
  })
  it('trae el id del lead del cliente', () => {
    const lead = '00000000-0000-4000-8000-000000000009'
    expect(proyectoDetalladoDesde({ ...fila, lead_id: lead })?.leadId).toBe(lead)
  })
  it('nunca pide el teléfono escrito a mano', () => {
    expect(COLUMNAS_DE_PROYECTO).not.toMatch(/telefono/)
  })
  it('una fila de otra forma es nula', () => {
    expect(proyectoDetalladoDesde({ ...fila, numero: 'doce' })).toBeNull()
    expect(proyectoDetalladoDesde(null)).toBeNull()
  })
})

describe('esIdDeProyecto', () => {
  it('sólo un guid se consulta', () => {
    expect(esIdDeProyecto(ID)).toBe(true)
    expect(esIdDeProyecto('12')).toBe(false)
  })
})
