// La API de servidor del área `tarjeta` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// `leerAsesorDeLaCotizacion(id)` (4.18-2): a quien creó una cotización guardada, para el «Asesor:» de su tarjeta; la lee `/cotizaciones/[id]`. La tarjeta en pantalla
// (`<ProveedorDeLaTarjeta>`) sale por `pantallas/tarjeta.ts`.
//
// `pdfDeUnaGuardada({ lectura, contexto, locale, empresa, topeDelLogo })` (4.18-3a): los bytes y el nombre del PDF de una guardada, de lo guardado; lo pide
// `GET /cotizaciones/[id]/pdf`, que arma el contexto con `contextoDeLaPagina()` (puro).
//
// `imagenDeUnaGuardada(entrada)`: la misma tarjeta como PNG (`{ bytes, ancho, alto }`), para la portada de la cotización. Sin ruta todavía: quien la sirva suma
// las fuentes de `infra/tarjeta/pdf/fuentes/` a `outputFileTracingIncludes` de su ruta.
export {
  imagenDeUnaGuardada,
  leerAsesorDeLaCotizacion,
  pdfDeUnaGuardada,
  type EntradaDelPdf,
} from './composicion'
export {
  contextoDeLaPagina,
  type ContextoDeLaCotizacion,
  type PaginaDeLaTarjeta,
} from '../../entities/tarjeta/contexto-de-la-cotizacion'
