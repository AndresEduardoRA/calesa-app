// El «⋯» de un lead, dicho una sola vez: qué acciones tiene, en qué orden y quién las ve. La fila del listado, la tarjeta de la lista, la
// tarjeta del kanban y la ficha dibujan esta lista (`features/marcas/components/menu-de-lead.tsx`); ninguna escribe la suya. Lo que una
// persona no puede hacer no aparece, y los permisos son los de siempre: esta lista no decide nada nuevo.
import { ETIQUETA_DE_FAVORITO, ETIQUETA_DE_TACHADO } from './marcas'
import { ETIQUETA_DE_ENVIAR } from './papelera'

export type ClaveDeAccionDeLead =
  | 'cotizar'
  | 'agendar'
  | 'anotar'
  | 'oportunidad'
  | 'oportunidades'
  | 'editar'
  | 'actividad'
  | 'etiquetas'
  | 'favorito'
  | 'tachado'
  | 'papelera'

// El texto de cada una. Las que abren algo encima (un modal, el selector de etiquetas) llevan «…»; «Favorito» y «Tachado» son casillas.
export const ETIQUETA_DE_ACCION_DE_LEAD: Readonly<Record<ClaveDeAccionDeLead, string>> = {
  // Lleva a otra página (la hoja de cotizar con este lead elegido): sin «…».
  cotizar: 'Cotizar lead',
  agendar: 'Agendar recordatorio…',
  anotar: 'Anotar seguimiento…',
  oportunidad: 'Nueva oportunidad…',
  // Lleva a otra página (la sección «Oportunidades» de la ficha): sin «…».
  oportunidades: 'Ver oportunidades',
  // Con `leads.editar`; con sólo los teléfonos extra dice `ETIQUETA_DE_EDITAR_TELEFONOS`. Es el panel de edición de siempre (`?panel=editar-lead`),
  // el mismo nombre que el «Editar» del vehículo: sin «…».
  editar: 'Editar lead',
  // Lleva a otra página (`/actividad` de este lead): sin «…».
  actividad: 'Ver actividad',
  etiquetas: 'Etiquetas…',
  favorito: ETIQUETA_DE_FAVORITO,
  tachado: ETIQUETA_DE_TACHADO,
  papelera: ETIQUETA_DE_ENVIAR,
}

// «Editar lead» de quien sólo administra los teléfonos extra (sin `leads.editar`): abre el mismo panel en modo teléfonos.
export const ETIQUETA_DE_EDITAR_TELEFONOS = 'Editar teléfonos'

// La acción principal del «⋯» (destacada y sola en su bloque, `principal` de `AccionDeMenu`), como «Cotizar vehículo» en el del vehículo.
export const ACCION_PRINCIPAL_DEL_LEAD: ClaveDeAccionDeLead = 'cotizar'

// El orden, en bloques: la acción principal sola arriba; lo que se hace seguido (agendar, anotar, crear una oportunidad e ir a las que ya
// tiene); editar el lead; ver su actividad; lo que se marca (etiquetas, favorito y tachado) y lo destructivo al final y separado (la
// papelera). Entre dos bloques con algo va un separador.
export const BLOQUES_DEL_MENU_DE_LEAD: readonly (readonly ClaveDeAccionDeLead[])[] = [
  ['cotizar'],
  ['agendar', 'anotar', 'oportunidad', 'oportunidades'],
  ['editar'],
  ['actividad'],
  ['etiquetas', 'favorito', 'tachado'],
  ['papelera'],
]

// Qué edita quien mira desde el «⋯»: todo el lead (cartera y `leads.editar`) o sólo los teléfonos (cartera y
// `leads.telefonos_extra.editar`, sin `leads.editar`). Nulo: no edita nada.
export type EdicionDelMenu = 'lead' | 'telefonos'

// Con lo que quien mira puede sobre este lead (ya combinado con la cartera: `puedeEditarLead()` y `puedeEditarTelefonosExtra()`).
export function edicionDelMenu(puede: {
  editar: boolean
  telefonos: boolean
}): EdicionDelMenu | null {
  if (puede.editar) {
    return 'lead'
  }
  return puede.telefonos ? 'telefonos' : null
}

// El texto de una acción: el de la lista, salvo «Editar teléfonos» para quien sólo edita los teléfonos.
export function etiquetaDeAccionDeLead(
  clave: ClaveDeAccionDeLead,
  edicion: EdicionDelMenu | null = null,
): string {
  return clave === 'editar' && edicion === 'telefonos'
    ? ETIQUETA_DE_EDITAR_TELEFONOS
    : ETIQUETA_DE_ACCION_DE_LEAD[clave]
}

export type PermisosDelMenuDeLead = {
  // Con `cotizaciones.crear` en algún origen (el destino lo arma `src/app` una vez por página): «Cotizar lead».
  cotizar?: boolean
  // Con el lead en la cartera y `leads.editar`: agendar un recordatorio, anotar un seguimiento y crear una oportunidad.
  actuar: boolean
  // Con el lead en la cartera de quien mira (la única que ve oportunidades): ir a las que ya tiene. No pide `leads.editar`; si no tiene
  // ninguna, la sección lo dice con su estado vacío.
  verOportunidades?: boolean
  // «Editar lead» o «Editar teléfonos» (`edicionDelMenu()`); nulo o sin decir, no se ofrece.
  editar?: EdicionDelMenu | null
  // Con `actividad.ver`.
  actividad?: boolean
  // Con `leads.eliminar` sobre este lead (`puedeEnviarLead()`).
  enviar: boolean
}

// Las acciones que quien mira tiene sobre este lead, en su orden y por bloques (sin bloques vacíos). Marcar (etiquetas, favorito y
// tachado) basta con ver el lead: no pide poder editarlo.
export function accionesDeLead(puede: PermisosDelMenuDeLead): ClaveDeAccionDeLead[][] {
  const visible: Readonly<Record<ClaveDeAccionDeLead, boolean>> = {
    cotizar: puede.cotizar === true,
    agendar: puede.actuar,
    anotar: puede.actuar,
    oportunidad: puede.actuar,
    oportunidades: puede.verOportunidades === true,
    editar: puede.editar !== undefined && puede.editar !== null,
    actividad: puede.actividad === true,
    etiquetas: true,
    favorito: true,
    tachado: true,
    papelera: puede.enviar,
  }
  return BLOQUES_DEL_MENU_DE_LEAD.map((bloque) => bloque.filter((clave) => visible[clave])).filter(
    (bloque) => bloque.length > 0,
  )
}
