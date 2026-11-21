// La API de servidor del área `plantilla` de `cotizaciones` (4.15-4). Sale por el `index.ts` de la raíz.
//
// La tarjeta de una fórmula del origen, para la tarjeta en vivo de su planilla: `src/app` la pide sin esperarla y la pasa a la sección de la fórmula, que no importa
// esta área.
export { leerLaTarjetaDeLaFormula } from './composicion'

// Las plantillas de V1 para el modal «Empezar desde una plantilla»: las pide la ruta `GET /configuracion/cotizacion/<origen>/plantillas-de-v1`, que suma los tipos
// de cambio de la empresa y los campos del origen (módulos que `cotizaciones` no importa).
export { leerPlantillasDeV1 } from './composicion'
export type { DatosDePlantillasDeV1 } from '../../entities/plantilla/datos-de-plantillas-de-v1'
