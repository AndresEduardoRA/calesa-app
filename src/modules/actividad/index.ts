// Entrada del módulo para Server Components (sin componentes): las lecturas del servidor y lo puro que arma la página.
export { leerPaginaDeActividad, leerPersonasDeLaActividad } from './composicion'
export type { FilaDeActividad, PaginaDeActividad } from './entities/actividad'
export { ENTIDADES_DE_LA_ACTIVIDAD } from './entities/etiquetas'
export {
  CLAVE_DE_ENTIDAD,
  CLAVE_DE_REGISTRO,
  claveDelPedido,
  esquemaDeFiltrosDeActividad,
  opcionesDeEntidades,
  opcionesDePersonas,
  pedidoDeActividad,
  rutaDeActividadDe,
  type PedidoDeActividad,
} from './entities/filtros'
