import 'server-only'
import { CLAVE_DE_VEHICULO, origenesParaCotizar, rutaDeLaHoja } from '@/modules/cotizaciones'
import type { OrigenResumen } from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'

// «Cotizar vehículo» del «⋯» (la lista y la ficha): la hoja de cotizar de este origen si la persona tiene las dos claves y el origen está activo; si no,
// la línea no está (la base vuelve a exigirlas). `vehiculos` no conoce `cotizaciones`: lo arma la página.
export function paraCotizarDe(permisos: Permisos, origen: OrigenResumen) {
  return origenesParaCotizar(permisos, [origen]).length === 1
    ? { ruta: rutaDeLaHoja({ origen: origen.id, lead: null }), claveDelVehiculo: CLAVE_DE_VEHICULO }
    : null
}
