import { describe, expect, it } from 'vitest'
import { esperaAlRecalculo, motivoParaNoGuardar } from './se-puede-guardar'

const LIBRE = {
  estado: { tipo: 'al_dia' } as const,
  falta: null,
  total: { tipo: 'valor', usd: 10 } as const,
  descartoLoTipeado: false,
}

describe('motivoParaNoGuardar', () => {
  it('al día, sin nada que falte y con total, se guarda', () => {
    expect(motivoParaNoGuardar(LIBRE)).toBeNull()
  })

  it('no se guarda con un total viejo: el recálculo falló', () => {
    expect(motivoParaNoGuardar({ ...LIBRE, estado: { tipo: 'fallo', recargar: false } })).toMatch(
      /recalcular/,
    )
  })

  it('sin la variante elegida, sin el cliente o sin el vehículo que el rol pide, tampoco', () => {
    expect(motivoParaNoGuardar({ ...LIBRE, estado: { tipo: 'sin_variante' } })).not.toBeNull()
    expect(motivoParaNoGuardar({ ...LIBRE, falta: 'lead' })).toBe(
      'Para guardar, elige el cliente en «Cliente».',
    )
    expect(motivoParaNoGuardar({ ...LIBRE, falta: 'vehiculo' })).toBe(
      'Para guardar, elige el vehículo en «Vehículo».',
    )
    expect(motivoParaNoGuardar({ ...LIBRE, falta: 'titulo' })).toBe(
      'Escribe el título de la cotización.',
    )
  })

  it('con el total nulo dice el motivo del resumen, y un valor descartado el suyo (P9)', () => {
    expect(
      motivoParaNoGuardar({
        ...LIBRE,
        total: { tipo: 'faltante', motivo: 'Revisa las celdas con aviso.' },
      }),
    ).toBe('Revisa las celdas con aviso.')
    expect(motivoParaNoGuardar({ ...LIBRE, descartoLoTipeado: true })).toMatch(/no acepta/)
  })

  it('mientras recalcula no es un motivo: se espera (P8)', () => {
    expect(motivoParaNoGuardar({ ...LIBRE, estado: { tipo: 'esperando' } })).toBeNull()
    expect(motivoParaNoGuardar({ ...LIBRE, estado: { tipo: 'recalculando' } })).toBeNull()
  })
})

describe('esperaAlRecalculo', () => {
  it('espera mientras se espera o se recalcula; al día o en fallo, no', () => {
    expect(esperaAlRecalculo({ tipo: 'esperando' })).toBe(true)
    expect(esperaAlRecalculo({ tipo: 'recalculando' })).toBe(true)
    expect(esperaAlRecalculo({ tipo: 'al_dia' })).toBe(false)
    expect(esperaAlRecalculo({ tipo: 'fallo', recargar: false })).toBe(false)
  })
})

describe('motivoParaNoGuardar de una cotización guardada (4.15-3)', () => {
  it('sin nada que falte (una guardada no pide lo que no cambia) no hay motivo', () => {
    expect(motivoParaNoGuardar({ ...LIBRE, falta: null })).toBeNull()
  })

  it('lo que falta va antes que el resto de las guardas; sin él, el recálculo que falló no deja guardar', () => {
    expect(
      motivoParaNoGuardar({ ...LIBRE, falta: 'lead', estado: { tipo: 'fallo', recargar: false } }),
    ).toBe('Para guardar, elige el cliente en «Cliente».')
    expect(motivoParaNoGuardar({ ...LIBRE, estado: { tipo: 'fallo', recargar: false } })).toMatch(
      /recalcular/,
    )
  })
})
