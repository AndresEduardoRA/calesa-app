import type { ComponentType } from 'react'
import type { CotizacionDeLaHoja } from '../../../entities/hoja-de-una-guardada'

// La clase de la cotización (preventa o final), como la nombra el núcleo: `listado` tiene la suya y un área no importa otra.
export type ClaseDelResumen = CotizacionDeLaHoja['clase']

// Los huecos del resumen de una cotización (`?cotizacion=` de `/cotizaciones`): lo que un área llena sin que `listado` la importe. Son tipos y nada más (como `huecos.ts`):
// `src/app` los une por `pantallas/<área>-resumen.ts`. Sin hueco, el resumen es lo que trae la fila.

// La cotización abierta, con lo que el servidor ya calculó de lo que quien mira puede hacer con ella. `puedeAdjuntar` espeja `cotizacion_puede_adjuntar()` y `puedeModerar`,
// `cotizacion_moderar`: sólo eligen qué se dibuja; la base decide al actuar.
export type PropsDeLasPestanasDelResumen = {
  cotizacion: { id: string; numero: number; clase: ClaseDelResumen }
  puedeAdjuntar: boolean
  puedeModerar: boolean
  // El resumen está abierto: mientras se cierra, las pestañas dejan de leer y se quedan como estaban.
  abierto: boolean
  // Lo que llena el área `comprobantes` bajo los adjuntos, o nada.
  Comprobantes?: ComponentType<PropsDeLosComprobantesDelResumen>
}

export type PropsDeLosComprobantesDelResumen = {
  cotizacionId: string
  clase: ClaseDelResumen
}

export type HuecosDelResumen = {
  // «Todo», «Adjuntos», «Revisiones» y «Comentarios» bajo el detalle de la cotización (`pantallas/comentarios-resumen.ts`).
  Pestanas?: ComponentType<PropsDeLasPestanasDelResumen>
  // La lista de comprobantes de «Adjuntos» (`pantallas/comprobantes-resumen.ts`).
  Comprobantes?: ComponentType<PropsDeLosComprobantesDelResumen>
}

// Lo que sabe el servidor de cada cotización de la página (y de la que abrió la URL): quién puede adjuntar y quién modera.
export type QuienDelResumen = { puedeAdjuntar: boolean; puedeModerar: boolean }
