// La API de cliente del área `listado` de `cotizaciones`. Sale por el `client.ts` de la raíz.
//
// La lista única del «⋯» de una fila (T15): qué acciones tiene, en qué orden y con qué texto. Quien compone el menú (`src/app/(app)/cotizaciones/menu-de-la-fila.tsx`) la dibuja y la llena
// con lo de cada área.
export {
  ETIQUETA_DE_ACCION_DE_COTIZACION,
  ETIQUETA_DE_REPORTAR_SI_YA_REPORTO,
  accionesDeCotizacion,
} from '../../entities/listado/acciones-de-cotizacion'
export type {
  ClaveDeAccionDeCotizacion,
  MenuDeUnaFila,
} from '../../entities/listado/acciones-de-cotizacion'
