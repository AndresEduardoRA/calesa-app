// Los params como los recibe `validarFormula()` y como se guardan: planos (`{ flete: 900, tablas: {…} }`), no partidos en constantes y tablas. Puro.
import type { Formula } from '../formula'

export const paramsParaValidar = (formula: Pick<Formula, 'params'>): Record<string, unknown> => ({
  ...formula.params.constantes,
  tablas: formula.params.tablas,
})
