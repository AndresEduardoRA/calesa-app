// Composición del área `formulas-del-origen` en el navegador: las archivadas («Ver más») y las fórmulas que se pueden copiar (el modal «Nueva fórmula»). La importa
// sólo su feature y ningún barril la reexporta (`src/modules/cotizaciones/CLAUDE.md` › «Áreas»).
export { leerArchivadas } from '../../infra/formulas-del-origen/archivadas.client'
export type {
  CursorDeArchivadas,
  PaginaDeArchivadas,
} from '../../infra/formulas-del-origen/archivadas.client'
export { leerFormulasParaCopiar } from '../../infra/formulas-del-origen/para-copiar.client'
export type { FormulasParaCopiar } from '../../infra/formulas-del-origen/para-copiar.client'
