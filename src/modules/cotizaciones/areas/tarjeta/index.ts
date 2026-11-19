// La API de servidor del área `tarjeta` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// `leerAsesorDeLaCotizacion(id)` (4.18-2): a quien creó una cotización guardada, para el «Asesor:» de su tarjeta; la lee `/cotizaciones/[id]`. La tarjeta en pantalla
// (`<ProveedorDeLaTarjeta>`) sale por `pantallas/tarjeta.ts`.
//
// `pdfDeUnaGuardada({ lectura, contexto, locale, empresa, topeDelLogo })` (4.18-3a): los bytes y el nombre del PDF de una guardada, de lo guardado; lo pide
// `GET /cotizaciones/[id]/pdf`, que arma el contexto con `contextoDeLaPagina()` (puro).
//
// `paraCompartirDeUnaGuardada({ lectura, contexto, locale })`: las cifras de «Compartir la cotización» (conceptos y total de la tarjeta de lo guardado, y el modo); lo
// pide `GET /cotizaciones/[id]/compartir`, que suma el vehículo y arma `DatosParaCompartir`. `leerVehiculoDeLaCotizacion(id)`: el vehículo por clave primaria, para
// `GET /cotizaciones/[id]/compartir/fotos`.
//
// `imagenDeUnaGuardada(entrada)`: la misma tarjeta como PNG (`{ bytes, ancho, alto }`), la base de la portada.
//
// La portada de la cotización (`docs/COTIZADOR.md` › «La portada de la cotización»), para `GET /cotizaciones/[id]/portada`: `leerLaPortada(id)` (el estado para quien
// pide), `queHacerConLaPortada(estado, pedido)` (304, bajar la guardada o armarla), `bajarLaPortada(ruta)`, `armarLaPortada(id, contextoDe)` (el WebP de lo guardado
// con el contexto que le den; `guardable` sin el primer recálculo es falso), `guardarLaPortada({ id, bytes, clave })` y `miniaturaDeLaPortada(bytes, ancho)` (la de
// `?ancho=480`, que piden las listas; `anchoDeLaPortada()` lee el parámetro). El componente sale por `pantallas/tarjeta-portada.ts`.
export {
  bajarLaPortada,
  guardarLaPortada,
  miniaturaDeLaPortada,
  imagenDeUnaGuardada,
  leerAsesorDeLaCotizacion,
  leerLaPortada,
  leerVehiculoDeLaCotizacion,
  paraCompartirDeUnaGuardada,
  pdfDeUnaGuardada,
  type EntradaDelPdf,
} from './composicion'
export {
  enlaceParaCompartir,
  esquemaDeLasFotos,
  TOPE_DE_FOTOS_PARA_COMPARTIR,
  type DatosParaCompartir,
  type FotoParaCompartir,
} from '../../entities/tarjeta/compartir/datos-para-compartir'
export { armarLaPortada, type PortadaArmada } from '../../features/tarjeta/armar-la-portada'
export {
  contextoDeLaPagina,
  type ContextoDeLaCotizacion,
  type PaginaDeLaTarjeta,
} from '../../entities/tarjeta/contexto-de-la-cotizacion'
export {
  etiquetaDeLaPortada,
  queHacerConLaPortada,
  type ContextoCompartido,
  type EstadoDeLaPortada,
  type QueHacerConLaPortada,
} from '../../entities/tarjeta/portada'
