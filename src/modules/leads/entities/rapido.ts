// Qué muestra el drawer rápido de un lead (el resumen del listado, la versión corta de su ficha): los datos clave y lo último que pasó,
// sin pestañas. «Editar» abre el panel de la ficha encima (9i) y vuelve al resumen; anotar y agendar abren su modal adentro.
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
import type { FilaDeLead } from './listado'

// Cómo está la lectura del lead abierto. `no_disponible` junta lo que no existe, lo que está en la
// papelera o en el limbo y lo que quien mira ya no ve: no se distingue nada (no es un oráculo).
export type LecturaDelRapido =
  | { id: string; estado: 'listo'; lead: FilaDeLead }
  | { id: string; estado: 'no_disponible' }
  | { id: string; estado: 'error' }

export type VistaDelRapido =
  // Hay que decir que ya no está: no existe, está en la papelera o en el limbo, o ya no lo ve.
  | { tipo: 'no_disponible' }
  // No se pudo leer y no hay nada que mostrar todavía.
  | { tipo: 'error' }
  // El lead: `completo` cuando ya llegó la lectura (antes sólo se sabe lo de la fila de la página);
  // `fallo` si la última relectura no pudo.
  | { tipo: 'lead'; lead: FilaDeLead; completo: boolean; fallo: boolean }
  | { tipo: 'cargando' }

type EntradaDeVista = {
  // El valor de `?lead=` y si es un id válido.
  id: string | null
  idValido: boolean
  lectura: LecturaDelRapido | null
  // La fila de la página, si el lead está en ella.
  delListado: FilaDeLead | null
  // Quien mira sólo ve su cartera: un lead que no es de ella no se muestra aunque llegue.
  soloMios: boolean
}

// Qué dibuja el drawer según lo que se sabe. Un lead que desaparece o deja de ser visible
// mientras está abierto cae en `no_disponible`, con el mismo texto sea cual sea el motivo.
export function vistaDelRapido(entrada: EntradaDeVista): VistaDelRapido {
  const { id, idValido, lectura, delListado, soloMios } = entrada
  if (id === null) {
    return { tipo: 'cargando' }
  }
  if (!idValido || lectura?.estado === 'no_disponible') {
    return { tipo: 'no_disponible' }
  }
  if (lectura?.estado === 'listo') {
    return soloMios && !lectura.lead.enCartera
      ? { tipo: 'no_disponible' }
      : { tipo: 'lead', lead: lectura.lead, completo: true, fallo: false }
  }
  const fallo = lectura?.estado === 'error'
  if (delListado !== null) {
    return { tipo: 'lead', lead: delListado, completo: false, fallo }
  }
  return fallo ? { tipo: 'error' } : { tipo: 'cargando' }
}

// Lo que el resumen abre encima (con sus ids en la URL): el panel de edición y los modales del «⋯». Mientras uno está abierto, el drawer no
// vuelve a leer su lead; al cerrarlo, se van con él.
const PANELES_DEL_RESUMEN: ReadonlySet<string> = new Set([
  PANEL_EDITAR_LEAD,
  PANEL_OPORTUNIDAD_RAPIDA,
  PANEL_ANOTAR_SEGUIMIENTO,
  PANEL_AGENDAR_RECORDATORIO,
])

export function hayModalEnElResumen(panel: string | null): boolean {
  return panel !== null && PANELES_DEL_RESUMEN.has(panel)
}

// El resumen tenía pestañas (`?lead=<id>&pestana=seguimientos|recordatorios`); un enlace guardado, una recarga o un `<Link>` de entonces lleva a
// la ficha en el bloque «Seguimientos y recordatorios», con el modal que traía (anotar, editar, agendar) y su id. Nulo: no es una pestaña
// de antes (o el lead no es un id), no se redirige.
export const CLAVE_DE_PESTANA_VIEJA = 'pestana'
const PESTANAS_VIEJAS = new Set(['seguimientos', 'recordatorios'])
const PANELES_QUE_SIGUEN = new Set([
  PANEL_ANOTAR_SEGUIMIENTO,
  PANEL_EDITAR_SEGUIMIENTO,
  PANEL_AGENDAR_RECORDATORIO,
  PANEL_EDITAR_RECORDATORIO,
])
const ES_GUID = z.guid()

export function destinoDeLaPestanaVieja(parametros: {
  lead: string | undefined
  pestana: string | undefined
  panel?: string | undefined
  seguimiento?: string | undefined
  recordatorio?: string | undefined
}): string | null {
  const { lead, pestana, panel, seguimiento, recordatorio } = parametros
  if (!lead || !ES_GUID.safeParse(lead).success || !pestana || !PESTANAS_VIEJAS.has(pestana)) {
    return null
  }
  const consulta = new URLSearchParams({ [CLAVE_DE_SECCION]: 'seguimientos' })
  if (panel && PANELES_QUE_SIGUEN.has(panel)) {
    consulta.set(CLAVE_DE_PANEL, panel)
  }
  if (seguimiento && ES_GUID.safeParse(seguimiento).success) {
    consulta.set(CLAVE_DE_SEGUIMIENTO, seguimiento)
  }
  if (recordatorio && ES_GUID.safeParse(recordatorio).success) {
    consulta.set(CLAVE_DE_RECORDATORIO, recordatorio)
  }
  return `${RUTAS.leads}/${lead}?${consulta.toString()}`
}
