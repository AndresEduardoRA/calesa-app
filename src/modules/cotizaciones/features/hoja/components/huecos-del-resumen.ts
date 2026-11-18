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

// Dónde aprueba quien mira (`origenesCon(permisos, 'cotizaciones.aprobar')`, del servidor): el núcleo lo nombra sin importar el área `aprobada`.
export type AprobarEnDelResumen = 'todos' | readonly string[]

// «De este vehículo» en el resumen: el vehículo de la cotización abierta (si quien mira lo ve), esa cotización («Esta»), dónde aprueba quien mira y qué hacer tras
// aprobar (refrescar el listado). Con `conTitulo`, dibuja su propio título; con `conCasillas`, las casillas y «Comparar», que vuelve a `volverA`.
export type PropsDeEsteVehiculoEnElResumen = {
  vehiculo: { id: string; titulo: string | null }
  cotizacionActual?: string
  aprobarEn: AprobarEnDelResumen
  conCasillas?: boolean
  volverA?: string
  alCambiar?: () => void
  conTitulo?: boolean
}

export type HuecosDelResumen = {
  // «Todo», «Adjuntos», «Revisiones» y «Comentarios» bajo el detalle de la cotización (`pantallas/comentarios-resumen.ts`).
  Pestanas?: ComponentType<PropsDeLasPestanasDelResumen>
  // La lista de comprobantes de «Adjuntos» (`pantallas/comprobantes-resumen.ts`).
  Comprobantes?: ComponentType<PropsDeLosComprobantesDelResumen>
  // «De este vehículo», entre los datos y las pestañas (`pantallas/aprobada-resumen.ts`).
  DeEsteVehiculo?: ComponentType<PropsDeEsteVehiculoEnElResumen>
}

// Lo que sabe el servidor de cada cotización de la página (y de la que abrió la URL): quién puede adjuntar y quién modera.
export type QuienDelResumen = { puedeAdjuntar: boolean; puedeModerar: boolean }
