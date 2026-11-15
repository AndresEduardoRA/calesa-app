// Lo que la hoja de cotizar exige elegir antes de guardar (docs/GLOSARIO.md › «Obligatorios al cotizar»): el lead y el vehículo, según las claves
// `cotizaciones.crear.sin_lead` y `cotizaciones.crear.sin_vehiculo` de quien cotiza en ese origen. Este archivo es puro y viaja al navegador (sin
// `permisos.ts`); quien los calcula con los permisos es `obligatorios-por-rol.ts`, en el servidor.

export type ObligatoriosAlCotizar = { lead: boolean; vehiculo: boolean }

export type LoQueFalta = 'lead' | 'vehiculo'

// Qué falta elegir, el lead primero: es el orden en que lo mira la base (`cotizacion_crear`), así el motivo de la hoja es el mismo que daría el rechazo.
export function loQueFalta(
  obligatorios: ObligatoriosAlCotizar,
  elegidos: { leadId: string | null; vehiculoId: string | null },
): LoQueFalta | null {
  if (obligatorios.lead && elegidos.leadId === null) {
    return 'lead'
  }
  if (obligatorios.vehiculo && elegidos.vehiculoId === null) {
    return 'vehiculo'
  }
  return null
}

// Cómo se elige lo que falta: con el botón que abre su panel de la URL, o, sin permiso para verlo, el pedido a quien administra los roles.
export type EleccionDeLoQueFalta = { panel: string } | { pedido: string }

export type EleccionesDeLaHoja = Record<LoQueFalta, EleccionDeLoQueFalta>

// Sin nada obligatorio (una guardada, o la hoja de una prueba): nada que elegir.
export const SIN_OBLIGATORIOS: ObligatoriosAlCotizar = { lead: false, vehiculo: false }

// Lo que ofrece una hoja que no pide nada (nunca se dibuja): sin botón y sin texto.
export const SIN_ELECCIONES: EleccionesDeLaHoja = { lead: { pedido: '' }, vehiculo: { pedido: '' } }
