// Dónde se editan las tablas de referencia (4.23-3): la pestaña «Tablas» de un origen (las suyas y las compartidas que usa) o Catálogos › Tablas
// compartidas (sólo las de origen nulo), y sus URL.
import type { Route } from 'next'
import { RUTAS, rutaDeConfiguracionDeCotizacion } from '@/shared/lib/rutas'

export type OrigenDeLasTablas = { id: string; nombre: string; activo: boolean }

// El origen abierto (la página ya comprobó `cotizaciones.configurar` en él) o las compartidas, sin origen.
export type DestinoDeLasTablas = { origen: OrigenDeLasTablas } | 'compartidas'

export function origenIdDelDestino(destino: DestinoDeLasTablas): string | null {
  return destino === 'compartidas' ? null : destino.origen.id
}

// `/configuracion/origenes/<origen>/tablas` o, sin origen, `/configuracion/catalogos/tablas`; con `tablaId`, `?tabla=<id>` (abre su editor).
export function rutaDeLasTablas(origenId: string | null, tablaId?: string): Route {
  const consulta = tablaId ? { tabla: tablaId } : undefined
  if (origenId === null) {
    const parametros = new URLSearchParams(consulta).toString()
    return (
      parametros === '' ? RUTAS.tablasCompartidas : `${RUTAS.tablasCompartidas}?${parametros}`
    ) as Route
  }
  return rutaDeConfiguracionDeCotizacion(origenId, 'tablas', consulta)
}
