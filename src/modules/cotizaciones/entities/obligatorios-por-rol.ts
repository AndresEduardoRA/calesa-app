import { pedidoDe } from '@/shared/lib/acciones-del-aviso'
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { EleccionesDeLaHoja, ObligatoriosAlCotizar } from './obligatorios-al-cotizar'

// Qué pide la hoja de ese origen a quien tiene esos permisos: lo que no puede dejar sin elegir (sin la clave del origen, obligatorio). Corre en el servidor, en la página, con
// `sesion.permisos`: con «Ver como» son los de quien mira recortados al rol elegido, un subconjunto de los reales, así que la hoja nunca afloja lo que la base exige (la
// base decide con los permisos reales). Al navegador viajan los booleanos.
export function obligatoriosAlCotizar(permisos: Permisos, origenId: string): ObligatoriosAlCotizar {
  return {
    lead: !puede(permisos, 'cotizaciones.crear.sin_lead', origenId),
    vehiculo: !puede(permisos, 'cotizaciones.crear.sin_vehiculo', origenId),
  }
}

// Cómo se elige cada cosa: el panel que abre el botón (los nombres los pasa `src/app`: `cotizaciones` no importa `leads` ni `vehiculos`) si quien mira ve los leads, o los
// vehículos de ese origen; si no, a quién pedirlo.
export function eleccionesDeLaHoja(
  permisos: Permisos,
  origenId: string,
  paneles: { cliente: string; vehiculo: string },
): EleccionesDeLaHoja {
  return {
    lead: puede(permisos, 'leads.ver')
      ? { panel: paneles.cliente }
      : { pedido: pedidoDe('elegir el cliente') },
    vehiculo: puede(permisos, 'vehiculos.ver', origenId)
      ? { panel: paneles.vehiculo }
      : { pedido: pedidoDe('elegir el vehículo') },
  }
}
