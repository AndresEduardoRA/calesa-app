// Lo que la hoja de cotizar exige elegir antes de guardar (docs/GLOSARIO.md › «Obligatorios al cotizar»): el lead y el vehículo, según las claves
// `cotizaciones.crear.sin_lead` y `cotizaciones.crear.sin_vehiculo` de quien cotiza en ese origen, y, sin vehículo, el título de la cotización (T307). Este archivo es puro y viaja al navegador (sin
// `permisos.ts`); quien los calcula con los permisos es `obligatorios-por-rol.ts`, en el servidor.

export type ObligatoriosAlCotizar = { lead: boolean; vehiculo: boolean }

export type LoQueFalta = 'lead' | 'vehiculo' | 'titulo'

// Qué falta elegir, el lead primero, después el vehículo y después el título: es el orden en que lo mira la base (`cotizacion_crear`), así el motivo de la hoja es el
// mismo que daría el rechazo. El título (el que se muestra: manual o el del vehículo) sólo falta sin vehículo, para cualquier rol; `undefined` = la hoja no lo
// conoce (sin `<ProveedorDelTitulo>`, una prueba): no se pide.
export function loQueFalta(
  obligatorios: ObligatoriosAlCotizar,
  elegidos: { leadId: string | null; vehiculoId: string | null; titulo?: string | null },
): LoQueFalta | null {
  if (obligatorios.lead && elegidos.leadId === null) {
    return 'lead'
  }
  if (obligatorios.vehiculo && elegidos.vehiculoId === null) {
    return 'vehiculo'
  }
  if (elegidos.vehiculoId === null && elegidos.titulo === null) {
    return 'titulo'
  }
  return null
}

// Cómo se elige lo que falta: con el botón que abre su panel de la URL, o, sin permiso para verlo, el pedido a quien administra los roles.
export type EleccionDeLoQueFalta = { panel: string } | { pedido: string }

export type EleccionesDeLaHoja = Record<LoQueFalta, EleccionDeLoQueFalta>

// Sin nada obligatorio (una guardada, o la hoja de una prueba): nada que elegir.
export const SIN_OBLIGATORIOS: ObligatoriosAlCotizar = { lead: false, vehiculo: false }

// Lo que ofrece una hoja que no pide nada (nunca se dibuja): sin botón y sin texto.
export const SIN_ELECCIONES: EleccionesDeLaHoja = {
  lead: { pedido: '' },
  vehiculo: { pedido: '' },
  titulo: { pedido: '' },
}

// Una guardada sólo puede pedir el título (sin vehículo): su panel es el del vehículo (el nombre lo pasa `src/app`). El rechazo de la base ofrece el mismo botón.
export const eleccionesDeUnaGuardada = (panelDelTitulo: string): EleccionesDeLaHoja => ({
  ...SIN_ELECCIONES,
  titulo: { panel: panelDelTitulo },
})
