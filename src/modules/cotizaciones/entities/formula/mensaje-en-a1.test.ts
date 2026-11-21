import { describe, expect, it } from 'vitest'
import { FORMULA_A1 } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { mensajeEnA1 } from './mensaje-en-a1'

describe('mensajeEnA1', () => {
  it('nombra cada fila por su celda y su concepto; lo demás queda', () => {
    const hoja = hojaDeLaPlanilla(FORMULA_A1)
    expect(mensajeEnA1('«cif» usa «remate», no «oficial» ni «agencia_pct».', hoja)).toBe(
      'C7 (CIF) usa C2 (Remate), no «oficial» ni B5 (% de Agencia).',
    )
  })
})
