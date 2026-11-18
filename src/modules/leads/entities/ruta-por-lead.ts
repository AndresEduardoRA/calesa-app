// Una ruta a otro módulo que lleva el id de cada lead («Cotizar lead» a la hoja de cotizar, «Ver actividad» a `/actividad`): `leads` no conoce
// esos módulos, así que `src/app` la arma una sola vez por página con `MARCADOR_DE_LEAD` en el lugar del id (`rutaDeLaHoja({ origen, lead:
// MARCADOR_DE_LEAD })`) y cada fila pone el suyo al elegir la acción. Ningún pedido por fila.

// Un uuid que no es de nadie (versión 4, todo ceros): pasa por `URLSearchParams` tal cual.
export const MARCADOR_DE_LEAD = '00000000-0000-4000-8000-000000000000'

// Las rutas del «⋯» de una página de leads (la lista o el kanban), con el marcador: «Cotizar lead» (nula sin `cotizaciones.crear` en ningún
// origen) y «Ver actividad» (nula sin `actividad.ver`).
export type RutasDelMenuDeLead = { paraCotizar: string | null; paraActividad: string | null }

// La ruta de este lead: la plantilla con su id donde estaba el marcador.
export function rutaDelLead(plantilla: string, leadId: string): string {
  return plantilla.replaceAll(MARCADOR_DE_LEAD, encodeURIComponent(leadId))
}
