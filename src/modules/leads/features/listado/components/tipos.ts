import type { AccionDeFila } from '../../../entities/acciones-de-fila'
import { edicionDelMenu } from '../../../entities/acciones-de-lead'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import type { OrigenDeLead } from '../../../entities/alta'
import type { OrigenConEstado } from '../../../entities/ficha'
import type { CampoDeLead } from '../../../entities/campo'
import type { Etiqueta } from '../../../entities/etiqueta'
import type { FilaDeLead } from '../../../entities/listado'
import { rutaDelLead } from '../../../entities/ruta-por-lead'
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
  // «Cotizar lead» y «Ver actividad»: la ruta de cada uno con `MARCADOR_DE_LEAD` (`entities/ruta-por-lead.ts`), armada una vez por página en
  // `src/app`; nula sin `cotizaciones.crear` en ningún origen o sin `actividad.ver`.
  paraCotizar: string | null
  paraActividad: string | null
  // «Editar lead» / «Editar teléfonos»: los permisos como si el lead estuviera en la cartera (cada fila los combina con la suya) y abrir el
  // panel de edición sobre un lead (`?panel=editar-lead&para=<id>`).
  edicion: { editar: boolean; telefonos: boolean; abrir: (leadId: string) => void }
}

// Las rutas del «⋯» de una fila, con su id.
export function rutasDelMenu(marcar: ParaMarcar, lead: FilaDeLead) {
  return {
    paraCotizar: marcar.paraCotizar === null ? null : rutaDelLead(marcar.paraCotizar, lead.id),
    paraActividad:
      marcar.paraActividad === null ? null : rutaDelLead(marcar.paraActividad, lead.id),
  }
}

// «Editar lead» o «Editar teléfonos» en el «⋯» de una fila: con el permiso y el lead en la cartera, como en la ficha.
export function editarDelMenu(marcar: ParaMarcar, lead: FilaDeLead) {
  const { edicion } = marcar
  const modo = edicionDelMenu({
    editar: edicion.editar && lead.enCartera,
    telefonos: edicion.telefonos && lead.enCartera,
  })
  return modo === null
    ? undefined
    : {
        modo,
        alEditar: () => {
          edicion.abrir(lead.id)
        },
      }
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
