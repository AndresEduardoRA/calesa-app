import {
  CLAVE_DE_LEAD,
  CLAVE_DE_VEHICULO,
  origenesParaCotizar,
  rutaDeLaCotizacion,
  rutaDeLaHoja,
} from '@/modules/cotizaciones'
import type { ParaRelacionados } from '@/modules/vehiculos'
import { puede, type Permisos } from '@/shared/lib/permisos'

// Lo que las acciones del bloque «Relacionados» necesitan de `cotizaciones` y de `leads` (`vehiculos` no los conoce): dónde se cotiza (la hoja de cada origen donde la persona tiene
// `cotizaciones.crear` y `.ver`), las claves de la URL de la hoja, la ruta de una cotización si se ven (`:id` donde va el id) y `leads.editar`. La base vuelve a exigir cada permiso.
export function paraRelacionadosDe(
  permisos: Permisos,
  origenes: readonly { id: string; activo: boolean }[],
): ParaRelacionados {
  return {
    cotizarEn: origenesParaCotizar(permisos, origenes).map((origen) => ({
      origenId: origen.id,
      ruta: rutaDeLaHoja({ origen: origen.id, lead: null }),
    })),
    claveDelVehiculo: CLAVE_DE_VEHICULO,
    claveDelLead: CLAVE_DE_LEAD,
    rutaDeCotizacion: puede(permisos, 'cotizaciones.ver') ? rutaDeLaCotizacion(':id') : null,
    editarLeads: puede(permisos, 'leads.editar'),
  }
}

// Para el resumen del inventario: sin `leads.ver` el bloque no se dibuja (nulo).
export function paraElResumenDe(
  permisos: Permisos,
  origenes: readonly { id: string; activo: boolean }[],
): ParaRelacionados | null {
  return puede(permisos, 'leads.ver') ? paraRelacionadosDe(permisos, origenes) : null
}
