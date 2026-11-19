// Las URL de la pestaña «Tablas» de un origen en Configuración › Cotización (4.23-3): la lista del origen y el editor de una tabla.
import type { Route } from 'next'
import { rutaDeConfiguracionDeCotizacion } from '@/shared/lib/rutas'

// `/configuracion/cotizacion/<origen>/tablas` y, con `tablaId`, `?tabla=<id>` (abre su editor).
export function rutaDeLasTablas(origenId: string, tablaId?: string): Route {
  return rutaDeConfiguracionDeCotizacion(
    origenId,
    'tablas',
    tablaId ? { tabla: tablaId } : undefined,
  )
}
