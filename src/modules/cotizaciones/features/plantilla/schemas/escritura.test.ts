import { describe, expect, it } from 'vitest'
import { esquemaDeDescartar, esquemaDeGuardar, esquemaDePublicar } from './escritura'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const FDO = '44444444-4444-4444-8444-444444444444'
const HORA = '2026-11-07T15:00:00.123456+00:00'

describe('la versión esperada', () => {
  it('pasa con 6 decimales y +00:00, con menos decimales, con Z y con otra zona', () => {
    for (const esperada of [
      HORA,
      '2026-11-07T15:00:00.5+00:00',
      '2026-11-07T15:00:00Z',
      '2026-11-07T11:00:00.123456-04:00',
    ]) {
      expect(
        esquemaDeDescartar.safeParse({ origenId: ORIGEN, formulaDelOrigenId: FDO, esperada })
          .success,
      ).toBe(true)
    }
  })

  it('sin zona, un `Date`, un número o vacía, no', () => {
    for (const esperada of ['2026-11-07T15:00:00', new Date(), 1794000000000, '', 'ayer']) {
      expect(
        esquemaDeDescartar.safeParse({ origenId: ORIGEN, formulaDelOrigenId: FDO, esperada })
          .success,
      ).toBe(false)
    }
  })

  it('nula sólo al guardar: publicar y descartar la piden siempre', () => {
    expect(
      esquemaDeGuardar.safeParse({
        origenId: ORIGEN,
        formulaDelOrigenId: FDO,
        esperada: null,
        definicion: {},
      }).success,
    ).toBe(true)
    expect(
      esquemaDePublicar.safeParse({
        origenId: ORIGEN,
        formulaDelOrigenId: FDO,
        esperada: null,
        nota: 'x',
      }).success,
    ).toBe(false)
    expect(
      esquemaDeDescartar.safeParse({ origenId: ORIGEN, formulaDelOrigenId: FDO, esperada: null })
        .success,
    ).toBe(false)
  })
})

describe('el origen y la nota', () => {
  it('un origen que no es guid no pasa', () => {
    expect(
      esquemaDeDescartar.safeParse({ origenId: 'x', formulaDelOrigenId: FDO, esperada: HORA })
        .success,
    ).toBe(false)
  })

  it('la fórmula del origen va siempre: la de lo leído, nunca nula', () => {
    for (const formulaDelOrigenId of [null, undefined, 'x']) {
      expect(
        esquemaDeDescartar.safeParse({ origenId: ORIGEN, formulaDelOrigenId, esperada: HORA })
          .success,
      ).toBe(false)
    }
  })

  it('la nota de publicar va sin los espacios de los bordes y no puede quedar vacía', () => {
    const r = esquemaDePublicar.safeParse({
      origenId: ORIGEN,
      formulaDelOrigenId: FDO,
      esperada: HORA,
      nota: '  Hola ',
    })
    expect(r.success && r.data.nota).toBe('Hola')
    expect(
      esquemaDePublicar.safeParse({
        origenId: ORIGEN,
        formulaDelOrigenId: FDO,
        esperada: HORA,
        nota: '  ',
      }).success,
    ).toBe(false)
  })
})
