import { describe, expect, it } from 'vitest'
import { dondeEstaDesde, paginaDeLaFaseDesde } from './leer'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

const tarjeta = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  titulo: 'Toyota Hilux',
  vin: 'VIN1',
  lote: null,
  fase_desde: '2026-11-01T10:00:00+00:00',
  situacion: 'fase',
  demorada: false,
  contenedor: null,
  booking: null,
  eta_el: null,
  ...extra,
})

describe('paginaDeLaFaseDesde', () => {
  it('lee los vehículos, con el título como nombre, y si hay más', () => {
    const leida = paginaDeLaFaseDesde({
      tarjetas: [tarjeta(A, { demorada: true, situacion: 'sin_resolver' }), tarjeta(C)],
      hay_mas: true,
    })
    expect(leida.ok).toBe(true)
    if (!leida.ok) return
    expect(leida.data.hayMas).toBe(true)
    expect(leida.data.vehiculos.map((v) => v.id)).toEqual([A, C])
    expect(leida.data.vehiculos[0]).toMatchObject({
      nombre: 'Toyota Hilux',
      demorada: true,
      situacion: 'sin_resolver',
    })
  })

  it('una página vacía es válida', () => {
    expect(paginaDeLaFaseDesde({ tarjetas: [], hay_mas: false })).toEqual({
      ok: true,
      data: { vehiculos: [], hayMas: false },
    })
  })

  it('una forma ajena es «inesperado», nunca una fila cortada', () => {
    for (const mala of [
      null,
      {},
      { tarjetas: 'x', hay_mas: false },
      { tarjetas: [tarjeta('no-es-guid')], hay_mas: false },
      { tarjetas: [tarjeta(A)], hay_mas: 'sí' },
    ]) {
      const leida = paginaDeLaFaseDesde(mala)
      expect(leida.ok).toBe(false)
      if (!leida.ok) expect(leida.error.codigo).toBe('inesperado')
    }
  })
})

describe('dondeEstaDesde', () => {
  const unidad = {
    id: A,
    origen_id: B,
    titulo: 'Hilux',
    vin: 'VIN1',
    lote: null,
    fase_id: C,
    fase_nombre: 'En puerto',
    fase_color: null,
    fase_desde: '2026-11-01T10:00:00+00:00',
    eta_el: null,
  }

  it('lee las unidades con su fase y su origen', () => {
    const leida = dondeEstaDesde({ unidades: [unidad], hay_mas: false })
    expect(leida.ok && leida.data.unidades[0]).toMatchObject({
      id: A,
      origenId: B,
      faseNombre: 'En puerto',
    })
  })

  it('un vehículo sin fase llega con fase nula', () => {
    const leida = dondeEstaDesde({
      unidades: [{ ...unidad, fase_id: null, fase_nombre: null }],
      hay_mas: true,
    })
    expect(leida.ok && leida.data.unidades[0]?.faseId).toBeNull()
    expect(leida.ok && leida.data.hayMas).toBe(true)
  })

  it('una forma ajena es «inesperado»', () => {
    expect(dondeEstaDesde({ unidades: [{ ...unidad, origen_id: 'x' }], hay_mas: false }).ok).toBe(
      false,
    )
    expect(dondeEstaDesde(undefined).ok).toBe(false)
  })
})
