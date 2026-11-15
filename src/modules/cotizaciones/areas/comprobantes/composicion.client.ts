// Composición del área `comprobantes` de `cotizaciones` en el navegador: leer los comprobantes de una cotización para el resumen de `/cotizaciones`. La importa sólo su feature y ningún
// barril la reexporta (`src/modules/cotizaciones/CLAUDE.md` › «Áreas»).
export {
  leerComprobantesDelResumen,
  NO_SE_CARGARON_LOS_COMPROBANTES,
} from '../../infra/comprobantes/leer.client'
