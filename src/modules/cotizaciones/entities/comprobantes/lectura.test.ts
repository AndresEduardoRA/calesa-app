import { describe, expect, it } from 'vitest'
import { comprobantesDesde } from './lectura'

const ID = '11111111-1111-4111-8111-111111111111'

const fila = (parcial: Record<string, unknown> = {}) => ({
  id: ID,
  serie: 'A',
  numero: 3,
  emitido_en: '2026-11-14T10:00:00+00:00',
  anulado_en: null,
  motivo_anulacion: null,
  emisor: { nombre: 'Ana' },
  anulador: null,
  ...parcial,
})

describe('comprobantesDesde', () => {
  it('lee las filas con quién emitió y quién anuló', () => {
    expect(
      comprobantesDesde([
        fila(),
        fila({
          numero: 2,
          anulado_en: '2026-11-14T11:00:00+00:00',
          motivo_anulacion: 'Error',
          anulador: { nombre: 'Luis' },
        }),
      ]),
    ).toEqual([
      {
        id: ID,
        serie: 'A',
        numero: 3,
        emitidoEn: '2026-11-14T10:00:00+00:00',
        emitidoPor: 'Ana',
        anuladoEn: null,
        anuladoPor: null,
        motivo: null,
      },
      {
        id: ID,
        serie: 'A',
        numero: 2,
        emitidoEn: '2026-11-14T10:00:00+00:00',
        emitidoPor: 'Ana',
        anuladoEn: '2026-11-14T11:00:00+00:00',
        anuladoPor: 'Luis',
        motivo: 'Error',
      },
    ])
  })

  it('una persona sin nombre queda nula; una lista vacía es válida', () => {
    expect(comprobantesDesde([fila({ emisor: null })])?.[0]?.emitidoPor).toBeNull()
    expect(comprobantesDesde([])).toEqual([])
  })

  it('una forma que no cuadra es nula, nunca una lista vacía', () => {
    expect(comprobantesDesde([fila({ numero: 0 })])).toBeNull()
    expect(comprobantesDesde([fila({ id: 'x' })])).toBeNull()
    expect(comprobantesDesde(null)).toBeNull()
    expect(comprobantesDesde({})).toBeNull()
  })
})
