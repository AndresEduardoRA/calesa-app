// La API de servidor del área `comentarios` de `cotizaciones` (4.15-4). Sale por el `index.ts` de la raíz.
//
// Las marcas de las cotizaciones de una página del listado (el «⋯» de cada fila) y lo que decide quién modera y qué: lo une la página de `src/app`.
export { leerMarcasDeLaPagina } from './composicion'
export { accionesDeModerar, puedeModerarLaCotizacion } from '../../entities/comentarios/moderacion'
export type { MarcasDeUnaFila } from '../../entities/comentarios/marcas-de-la-pagina'
export type { AccionDeModerar } from '../../entities/comentarios/moderacion'
