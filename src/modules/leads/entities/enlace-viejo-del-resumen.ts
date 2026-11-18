// Un enlace viejo al resumen del listado (`/leads?lead=<id>`): la lista ya no tiene resumen y abre la ficha, así que el enlace guardado
// redirige a `/leads/<id>` con lo que pedía y la ficha sabe abrir. Lo llama `src/app/(app)/leads/page.tsx` con `redirigir()`, sin leer el
// lead: si no es de la cartera de quien mira, la ficha no abre el panel (como con un `?panel=` directo).
import { z } from 'zod'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { RUTAS } from '@/shared/lib/rutas'
import { PANEL_EDITAR_LEAD } from './edicion'
import {
  CLAVE_DE_SEGUIMIENTO,
  PANEL_ANOTAR_SEGUIMIENTO,
  PANEL_EDITAR_SEGUIMIENTO,
} from './edicion-de-seguimiento'
import { CLAVE_DE_SECCION } from './ficha'
import { PANEL_OPORTUNIDAD_RAPIDA } from './oportunidad-rapida'
import {
  CLAVE_DE_RECORDATORIO,
  PANEL_AGENDAR_RECORDATORIO,
  PANEL_EDITAR_RECORDATORIO,
} from './recordatorios'
import { CLAVE_DE_EXTRA_EN_PANEL, PANEL_AGREGAR_TELEFONO, VALOR_DE_EXTRA_NUEVO } from './telefonos'

export const CLAVE_DEL_ENLACE_VIEJO = 'lead'
// El resumen tuvo pestañas (`?pestana=seguimientos|recordatorios`): llevan al bloque «Seguimientos y recordatorios» de la ficha.
export const CLAVE_DE_PESTANA_VIEJA = 'pestana'
const PESTANAS_VIEJAS: ReadonlySet<string> = new Set(['seguimientos', 'recordatorios'])

// Con una pestaña vieja, los modales que traía (con su id), como siempre.
const PANELES_DE_LA_PESTANA: ReadonlySet<string> = new Set([
  PANEL_ANOTAR_SEGUIMIENTO,
  PANEL_EDITAR_SEGUIMIENTO,
  PANEL_AGENDAR_RECORDATORIO,
  PANEL_EDITAR_RECORDATORIO,
])

// Sin pestaña, los modales que el resumen abría desde su «⋯»: piden poder editar el lead.
const PANELES_DE_EDICION: ReadonlySet<string> = new Set([
  PANEL_ANOTAR_SEGUIMIENTO,
  PANEL_AGENDAR_RECORDATORIO,
  PANEL_OPORTUNIDAD_RAPIDA,
])

const ES_GUID = z.guid()

export type EnlaceViejo = {
  lead: string | undefined
  pestana?: string | undefined
  panel?: string | undefined
  extra?: string | undefined
  seguimiento?: string | undefined
  recordatorio?: string | undefined
}

// Lo que la sesión puede abrir, de sus permisos ya leídos (con la cartera supuesta: la ficha la vuelve a exigir).
export type LoQuePuedeAbrir = {
  // `puedeEditarLead(permisos, true)`.
  editar: boolean
  // `puedeEditarTelefonosExtra(permisos, true)`.
  telefonos: boolean
}

function esGuid(valor: string | undefined): valor is string {
  return valor !== undefined && ES_GUID.safeParse(valor).success
}

function consultaDeLaPestana({ panel, seguimiento, recordatorio }: EnlaceViejo): URLSearchParams {
  const consulta = new URLSearchParams({ [CLAVE_DE_SECCION]: 'seguimientos' })
  if (panel !== undefined && PANELES_DE_LA_PESTANA.has(panel)) {
    consulta.set(CLAVE_DE_PANEL, panel)
  }
  if (esGuid(seguimiento)) {
    consulta.set(CLAVE_DE_SEGUIMIENTO, seguimiento)
  }
  if (esGuid(recordatorio)) {
    consulta.set(CLAVE_DE_RECORDATORIO, recordatorio)
  }
  return consulta
}

function consultaDelPanel({ panel, extra }: EnlaceViejo, puede: LoQuePuedeAbrir): URLSearchParams {
  const consulta = new URLSearchParams()
  const editaAlgo = puede.editar || puede.telefonos
  if (extra === VALOR_DE_EXTRA_NUEVO || panel === PANEL_AGREGAR_TELEFONO) {
    if (editaAlgo) {
      consulta.set(CLAVE_DE_PANEL, PANEL_EDITAR_LEAD)
      consulta.set(CLAVE_DE_EXTRA_EN_PANEL, VALOR_DE_EXTRA_NUEVO)
    }
    return consulta
  }
  if (panel === PANEL_EDITAR_LEAD && editaAlgo) {
    consulta.set(CLAVE_DE_PANEL, panel)
  } else if (panel !== undefined && PANELES_DE_EDICION.has(panel) && puede.editar) {
    consulta.set(CLAVE_DE_PANEL, panel)
  }
  return consulta
}

/**
 * A dónde lleva un enlace viejo: la ficha del lead con lo que pedía y la sesión puede abrir. Una pestaña vieja va al bloque de seguimientos con
 * su modal; sin pestaña, el `?panel=` del resumen (anotar, agendar, oportunidad, editar) y `?extra=nuevo` (la edición con «Agregar teléfono»).
 * Lo demás (filtros, cursor, `para`, otro panel) se quita. Sin `?lead=`, null: no es un enlace viejo. Un valor que no es un id redirige igual,
 * codificado: la ficha dice que no está disponible.
 */
export function destinoDelEnlaceViejo(enlace: EnlaceViejo, puede: LoQuePuedeAbrir): string | null {
  const { lead, pestana } = enlace
  if (lead === undefined || lead === '') {
    return null
  }
  const consulta =
    pestana !== undefined && PESTANAS_VIEJAS.has(pestana)
      ? consultaDeLaPestana(enlace)
      : consultaDelPanel(enlace, puede)
  const ficha = `${RUTAS.leads}/${encodeURIComponent(lead)}`
  return consulta.size === 0 ? ficha : `${ficha}?${consulta.toString()}`
}
