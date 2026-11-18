import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { ParametrosDeUrl } from '@/shared/lib/filtros'
import { TAMANO_DE_COLUMNA } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { alcanceDe, puede, type Permisos } from '@/shared/lib/permisos'
import { leerEmbudos, leerEtiquetas, leerLeadParaEnlazar, leerTablero } from '../../composicion'
import type { Embudo } from '../../entities/embudo'
import {
  CLAVE_DE_LEAD_DEL_EMBUDO,
  leadDelEmbudoPedido,
  type LeadDelEmbudo,
} from '../../entities/embudo-del-lead'
import type { Etiqueta } from '../../entities/etiqueta'
import { puedeEditarLead } from '../../entities/edicion'
import { puedeEditarTelefonosExtra } from '../../entities/telefonos'
import {
  CLAVE_DE_BUSQUEDA_DEL_EMBUDO,
  CLAVE_DE_EMBUDO,
  busquedaDelEmbudo,
  type Tablero,
} from '../../entities/tablero'

// Lo que el «⋯» de cada tarjeta necesita saber de quien mira (el kanban no lleva los permisos al navegador): sus etiquetas, si puede editar
// (agendar y anotar, con el lead en su cartera), hasta dónde puede enviar a la papelera y quién es (con «propios», sólo lo suyo).
export type ParaElMenuDelEmbudo = {
  etiquetas: Etiqueta[]
  // Como si el lead estuviera en la cartera (cada tarjeta lo combina con la del lead leído al abrir su «⋯»): `leads.editar`,
  // `leads.telefonos_extra.editar` y `leads.configurar`.
  editar: boolean
  telefonos: boolean
  configurar: boolean
  eliminar: 'todos' | 'propios' | null
  usuarioId: string
}

export type DatosDelEmbudo = {
  // Los de quien mira (vacío la primera vez: la vista crea el de por defecto).
  embudos: Embudo[]
  // El kanban del embudo elegido (el de la URL si es suyo; si no, el de por defecto).
  tablero: Tablero | null
  paraElMenu: ParaElMenuDelEmbudo
  // Se pidió `?lead=` y no se aceptó (no existe, no se ve, en la papelera o el limbo): la vista lo quita de la URL.
  leadIgnorado: boolean
}

// El lead de `?lead=`, validado como cualquier enlace a un lead (`leerLeadParaEnlazar`): el que no se ve, `null`.
async function leerLeadDelEmbudo(pedido: string | null) {
  if (pedido === null) {
    return ok<LeadDelEmbudo | null>(null)
  }
  const lead = await leerLeadParaEnlazar(pedido)
  return lead.ok
    ? ok<LeadDelEmbudo | null>(lead.data ? { id: lead.data.id, nombre: lead.data.nombre } : null)
    : lead
}

// `/leads?vista=embudo`: los embudos de quien mira y el kanban del elegido, con la búsqueda de `?q=` (cierre 1) o filtrado por `?lead=` (que
// gana a la búsqueda). Los filtros del listado no aplican acá. Sólo las oportunidades propias sobre leads vivos de la cartera (lo decide la RLS).
export async function leerVistaDeEmbudo(
  parametros: ParametrosDeUrl,
  quien: { permisos: Permisos; usuarioId: string },
): Promise<Resultado<DatosDelEmbudo>> {
  const crudo = unParametro(parametros[CLAVE_DE_LEAD_DEL_EMBUDO] ?? undefined)
  const [embudos, etiquetas, lead] = await Promise.all([
    leerEmbudos(),
    leerEtiquetas(),
    leerLeadDelEmbudo(leadDelEmbudoPedido(crudo)),
  ])
  if (!embudos.ok) {
    return embudos
  }
  if (!etiquetas.ok) {
    return etiquetas
  }
  if (!lead.ok) {
    return lead
  }
  const leadIgnorado = crudo !== undefined && lead.data === null
  const paraElMenu: ParaElMenuDelEmbudo = {
    etiquetas: etiquetas.data,
    editar: puedeEditarLead(quien.permisos, true),
    telefonos: puedeEditarTelefonosExtra(quien.permisos, true),
    configurar: puede(quien.permisos, 'leads.configurar'),
    eliminar: alcanceDe(quien.permisos, 'leads.eliminar'),
    usuarioId: quien.usuarioId,
  }
  const pedido = unParametro(parametros[CLAVE_DE_EMBUDO] ?? undefined)
  const elegido = embudos.data.find((e) => e.id === pedido) ?? embudos.data[0]
  if (!elegido) {
    return ok({ embudos: [], tablero: null, paraElMenu, leadIgnorado })
  }
  const buscar = lead.data
    ? null
    : busquedaDelEmbudo(unParametro(parametros[CLAVE_DE_BUSQUEDA_DEL_EMBUDO] ?? undefined))
  const tablero = await leerTablero({
    embudoId: elegido.id,
    tope: TAMANO_DE_COLUMNA,
    buscar,
    lead: lead.data,
  })
  if (!tablero.ok) {
    return tablero
  }
  return ok({ embudos: embudos.data, tablero: tablero.data, paraElMenu, leadIgnorado })
}
