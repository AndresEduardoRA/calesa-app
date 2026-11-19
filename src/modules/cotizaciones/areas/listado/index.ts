// La API de servidor del área `listado` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// El listado `/cotizaciones` (4.16-1, la pantalla en el 4.16-4a): una página por cursor, con la RLS de quien mira, y su máximo medido; los autores de la página, por clave
// primaria; sus filtros y las filas con los nombres que la pantalla le suma. Los componentes salen por `pantallas/listado.ts`.
export {
  leerAutoresDeCotizaciones,
  leerListadoDeCotizaciones,
  leerListadoPorVehiculo,
  leerModosDeCotizaciones,
  leerUnaDelListado,
} from './composicion'
// `UNA`: el tamaño de la lectura de UNA cotización (el resumen fuera de la página, la referencia del lienzo de la tarjeta); no es un tamaño de página.
export {
  CLAVE_DE_AGRUPAR,
  agruparDelListado,
  agruparLaPagina,
  cotizacionDeLaEntrada,
  leerAgrupar,
} from '../../entities/listado/grupos-del-listado'
export type {
  EntradaDelListado,
  PaginaAgrupada,
  PedidoDelGrupo,
} from '../../entities/listado/grupos-del-listado'
export {
  CLAVE_DE_RESUMEN_DE_COTIZACION,
  UNA,
  idDelResumen,
} from '../../entities/listado/resumen-del-listado'
export type { LecturaDelServidor } from '../../entities/listado/resumen-del-listado'
export {
  entradasSinAgrupar,
  filasConNombres,
  idsDe,
} from '../../entities/listado/filas-del-listado'
export type { CotizacionDelListado } from '../../entities/listado/filas-del-listado'
export {
  esquemaDelListado,
  origenParaNueva,
  pedidoDelListado,
} from '../../entities/listado/filtros-del-listado'
export {
  MAXIMO_DE_PAGINA_DE_COTIZACIONES,
  TOPE_DE_COINCIDENCIAS,
} from '../../entities/listado/listado'
export { puedeGuardarDesdeElListado } from '../../entities/listado/acciones-de-cotizacion'
export type { MenuDeUnaFila } from '../../entities/listado/acciones-de-cotizacion'
export type {
  PaginaDelListado,
  ClaseDeCotizacion,
  EstadoDeCotizacion,
  FilaDelListado,
  PedidoDelListado,
} from '../../entities/listado/listado'
