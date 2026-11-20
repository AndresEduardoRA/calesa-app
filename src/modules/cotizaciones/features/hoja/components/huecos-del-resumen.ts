import type { ComponentType, ReactNode } from 'react'
import type { CotizacionDeLaHoja } from '../../../entities/hoja-de-una-guardada'
import type { AnchoDeLaImagen } from '../../../entities/ruta-de-la-hoja'

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
  // El bloque de la pestaña «De este vehículo» ya armado por el resumen (`DeEsteVehiculo` del hueco), o nada: sin él, la cotización no tiene vehículo que quien mira vea y no hay quinta
  // pestaña.
  deEsteVehiculo?: ReactNode
}

export type PropsDeLosComprobantesDelResumen = {
  cotizacionId: string
  clase: ClaseDelResumen
}

// Dónde aprueba quien mira (`origenesCon(permisos, 'cotizaciones.aprobar')`, del servidor): el núcleo lo nombra sin importar el área `aprobada`.
export type AprobarEnDelResumen = 'todos' | readonly string[]

// «De este vehículo» en el resumen: el vehículo de la cotización abierta (si quien mira lo ve), esa cotización («Esta»), dónde aprueba quien mira y qué hacer tras
// aprobar (refrescar el listado). Con `conTitulo`, dibuja su propio título; con `conCasillas`, las casillas y «Comparar», que vuelve a `volverA`; con `vacio`, ese texto si no hay otras.
export type PropsDeEsteVehiculoEnElResumen = {
  vehiculo: { id: string; titulo: string | null }
  cotizacionActual?: string
  aprobarEn: AprobarEnDelResumen
  conCasillas?: boolean
  volverA?: string
  alCambiar?: () => void
  conTitulo?: boolean
  vacio?: string
}

// La imagen de la tarjeta del resumen (la miniatura de su cabecera): la cotización, su número (para el texto alternativo), su total (el del recuadro mientras carga o si falla) y cómo se dibuja.
export type PropsDeLaImagenEnElResumen = {
  cotizacionId: string
  numero: number
  total: { valor: number; moneda?: string | null } | null
  // La miniatura (480 px) y su recorte; sin ellos, la grande entera.
  ancho?: AnchoDeLaImagen
  recorte?: 'contener' | 'cubrir'
  miniatura?: boolean
}

export type HuecosDelResumen = {
  // La imagen de la tarjeta, la miniatura de la cabecera (`pantallas/tarjeta-resumen.ts`).
  Imagen?: ComponentType<PropsDeLaImagenEnElResumen>
  // «Todo», «Adjuntos», «Revisiones», «Comentarios» y, con vehículo, «De este vehículo» bajo la cabecera de la cotización (`pantallas/comentarios-resumen.ts`).
  Pestanas?: ComponentType<PropsDeLasPestanasDelResumen>
  // La lista de comprobantes de «Adjuntos» (`pantallas/comprobantes-resumen.ts`).
  Comprobantes?: ComponentType<PropsDeLosComprobantesDelResumen>
  // «De este vehículo», la quinta pestaña (`pantallas/aprobada-resumen.ts`).
  DeEsteVehiculo?: ComponentType<PropsDeEsteVehiculoEnElResumen>
}

// Lo que sabe el servidor de cada cotización de la página (y de la que abrió la URL): quién puede adjuntar y quién modera.
export type QuienDelResumen = { puedeAdjuntar: boolean; puedeModerar: boolean }
