import { describe, expect, it } from 'vitest'
import { destinoDeLaFormulaVieja } from './url-vieja'

const ORIGEN = '00000000-0000-4000-8000-000000000001'
const TRABAJO = '00000000-0000-4000-8000-0000000000aa'
const BASE = `/configuracion/origenes/${ORIGEN}`

describe('destinoDeLaFormulaVieja', () => {
  it('con fórmula de trabajo, cada parte va a la suya con toda su consulta', () => {
    expect(destinoDeLaFormulaVieja(ORIGEN, 'planilla', TRABAJO, {})).toBe(
      `${BASE}/formulas/${TRABAJO}/planilla`,
    )
    expect(destinoDeLaFormulaVieja(ORIGEN, 'hoja', TRABAJO, { vista: '412' })).toBe(
      `${BASE}/formulas/${TRABAJO}/hoja?vista=412`,
    )
    expect(
      destinoDeLaFormulaVieja(ORIGEN, 'tarjeta', TRABAJO, {
        panel: 'publicar-tarjeta',
        x: ['1', '2'],
      }),
    ).toBe(`${BASE}/formulas/${TRABAJO}/tarjeta?panel=publicar-tarjeta&x=1&x=2`)
  })

  it('el panel del Modo avanzado, que ya no existe, no sigue: la planilla llega en un solo salto', () => {
    expect(
      destinoDeLaFormulaVieja(ORIGEN, 'planilla', TRABAJO, {
        panel: 'editar-formula',
        version: 'v-2',
      }),
    ).toBe(`${BASE}/formulas/${TRABAJO}/planilla?version=v-2`)
    expect(
      destinoDeLaFormulaVieja(ORIGEN, 'planilla', TRABAJO, {
        panel: ['editar-formula', 'publicar'],
      }),
    ).toBe(`${BASE}/formulas/${TRABAJO}/planilla?panel=publicar`)
  })

  it('sin fórmula de trabajo, cada parte va a la lista, sin consulta', () => {
    for (const [parte, parametros] of [
      ['planilla', {}],
      ['hoja', { vista: '412' }],
      ['tarjeta', { panel: 'publicar-tarjeta' }],
    ] as const) {
      expect(destinoDeLaFormulaVieja(ORIGEN, parte, null, parametros)).toBe(`${BASE}/formulas`)
    }
  })
})
