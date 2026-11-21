import { describe, expect, it } from 'vitest'
import { esperadasDeActivar, loQueCambia, loQueSePublica } from './activar'

const H1 = '2026-11-20 10:00:00.123456+00'
const H2 = '2026-11-20 11:00:00.654321+00'

const formula = {
  id: 'f',
  actualizadoEn: H1,
  formula: { publicada: { id: 'p', version: 2 }, borrador: { id: 'b', actualizadoEn: H2 } },
  tarjeta: { publicada: { id: 't', version: 1 }, borrador: null },
}

describe('esperadasDeActivar', () => {
  it('lleva la hora de la fila y la de cada borrador tal cual, y el id de cada publicada', () => {
    expect(esperadasDeActivar(formula, 'vieja')).toEqual({
      id: 'f',
      esperada: H1,
      activaEsperada: 'vieja',
      borradorEsperado: H2,
      publicadaEsperada: 'p',
      plantillaBorradorEsperado: null,
      plantillaPublicadaEsperada: 't',
    })
  })
})

describe('loQueSePublica', () => {
  it('el borrador como N+1, o la publicada', () => {
    expect(loQueSePublica(formula)).toEqual([
      { pieza: 'formula', publica: true, version: 3 },
      { pieza: 'tarjeta', publica: false, version: 1 },
    ])
  })
})

describe('loQueCambia', () => {
  it('con y sin activa', () => {
    expect(loQueCambia('USA', 'Flete', 'Planilla')).toEqual([
      'Las cotizaciones nuevas de USA usarán «Flete».',
      '«Planilla» deja de usarse para cotizar.',
      'Las cotizaciones ya guardadas no cambian.',
    ])
    expect(loQueCambia('USA', 'Flete', null)[1]).toBe('Hasta ahora USA no se podía cotizar.')
  })
})
