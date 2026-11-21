// La API de servidor del área `formulas-del-origen` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta.
//
// `leerFormulasDelOrigen(origenId)`: la lista de la pestaña «Fórmulas». `leerLaFormulaDelOrigen(origenId, id)`: la fórmula que abre su editor (`[formula]/layout.tsx`),
// nula si no es de ese origen o no se ve.
export { leerFormulasDelOrigen, leerLaFormulaDelOrigen } from './composicion'
export type { FormulaAbierta, ActivaDelOrigen } from '../../infra/formulas-del-origen/formula'
export type { ListaDeFormulasDelOrigen } from '../../infra/formulas-del-origen/lista'
export type { FormulaDeLaLista } from '../../entities/formulas-del-origen/lista'
export { estadoDeLaFormula } from '../../entities/formulas-del-origen/lista'
export { CLAVE_DE_LA_COPIA, PANEL_NUEVA_FORMULA } from '../../entities/formulas-del-origen/rutas'
