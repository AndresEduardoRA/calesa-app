import type { AccionDeFila } from '../../../entities/acciones-de-fila'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import type { OrigenDeLead } from '../../../entities/alta'
import type { OrigenConEstado } from '../../../entities/ficha'
import type { CampoDeLead } from '../../../entities/campo'
import type { Etiqueta } from '../../../entities/etiqueta'
import type { FilaDeLead } from '../../../entities/listado'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { RUTAS } from '@/shared/lib/rutas'

// Lo que toda pieza del listado necesita para nombrar una fila.
export type DatosDeLaLista = {
  // Todo el layout: la tabla usa los de la tabla.
  campos: readonly CampoDeLead[]
  origenes: readonly OrigenConEstado[]
  // Los tipos de lead, también los apagados: nombran la columna «Tipo».
  tipos: readonly TipoDeLeadEnCatalogo[]
  // El código de país de la empresa, para mostrar un teléfono («+591 70011002»).
  codigoDePais: string | null
  // Las etiquetas de quien mira: nombran las de cada lead.
  etiquetas: readonly Etiqueta[]
  // El número que se buscó (`?q=30` o `?q=#30`), ya interpretado por el servidor: explica por qué coincide una fila (`CoincidenciaDelNumero`).
  numeroBuscado?: number | null
}

// Lo que necesita el «⋯» de cada fila: la lista de etiquetas (con crear), abrir «Gestionar», qué
// filas se pueden enviar a la papelera y anotar o agendar sobre una.
export type ParaMarcar = {
  etiquetas: Etiquetas
  alGestionar: () => void
  // Los de la página que quien mira puede enviar a la papelera.
  eliminables: readonly string[]
  // Con `leads.editar`: abrir el modal de anotar o agendar sobre un lead. Nulo sin el permiso.
  alAccion: ((accion: AccionDeFila, leadId: string) => void) | null
}

// Anotar, agendar y «Nueva oportunidad…» en el «⋯» de una fila: sólo con el permiso y el lead en la cartera.
export function accionesDelMenu(marcar: ParaMarcar, lead: FilaDeLead) {
  const { alAccion } = marcar
  if (alAccion === null || !lead.enCartera) {
    return undefined
  }
  return {
    alAnotar: () => {
      alAccion('anotar', lead.id)
    },
    alAgendar: () => {
      alAccion('agendar', lead.id)
    },
    alNuevaOportunidad: () => {
      alAccion('oportunidad', lead.id)
    },
  }
}

// «Ver oportunidades»: con el lead en la cartera de quien mira (la única que ve oportunidades), sin pedir `leads.editar`.
export function verOportunidadesDelMenu(irA: (leadId: string) => void, lead: FilaDeLead) {
  return lead.enCartera
    ? () => {
        irA(lead.id)
      }
    : undefined
}

// El origen de un lead tal como está en el catálogo (con su icono y si sigue activo); nulo si no tiene o ya no está.
export function origenDelCatalogo(
  origenes: readonly OrigenConEstado[],
  id: string | null,
): OrigenConEstado | null {
  return origenes.find((origen) => origen.id === id) ?? null
}

export function nombreDelOrigen(
  origenes: readonly OrigenDeLead[],
  id: string | null,
): string | null {
  return origenes.find((origen) => origen.id === id)?.nombre ?? null
}

// A dónde lleva la fila o la tarjeta (su enlace y un clic en cualquier parte): la ficha del lead.
export function rutaDeLaFicha(leadId: string): string {
  return `${RUTAS.leads}/${leadId}`
}
