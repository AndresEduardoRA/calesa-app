// El embudo filtrado por lead (`/leads?vista=embudo&embudo=<id>&lead=<id>`): las oportunidades de quien mira sobre ese lead en ese embudo, en
// todas sus etapas (también ganadas y perdidas), con el chip «De <nombre>» y «Ver todas». Es la vista de todas las oportunidades de un lead.
// Un `lead=` que quien mira no ve (o que no existe, o en la papelera o el limbo) se ignora y se quita de la URL. Con lead, la búsqueda (`?q=`)
// no aplica.
import { z } from 'zod'
import { RUTAS } from '@/shared/lib/rutas'
import { CLAVE_DE_EMBUDO, CLAVE_DE_VISTA, VISTA_EMBUDO } from './tablero'

export const CLAVE_DE_LEAD_DEL_EMBUDO = 'lead'

export type LeadDelEmbudo = { id: string; nombre: string }

// El `lead=` de la URL si es un id; si no, nada (se ignora como uno que no se ve).
export function leadDelEmbudoPedido(valor: string | null | undefined): string | null {
  const leido = z.guid().safeParse(valor)
  return leido.success ? leido.data : null
}

// El embudo de un lead; sin embudo, el que la vista elija (el de por defecto).
export function rutaDelEmbudoDelLead(embudoId: string | null, leadId: string): string {
  const parametros = new URLSearchParams({ [CLAVE_DE_VISTA]: VISTA_EMBUDO })
  if (embudoId !== null) {
    parametros.set(CLAVE_DE_EMBUDO, embudoId)
  }
  parametros.set(CLAVE_DE_LEAD_DEL_EMBUDO, leadId)
  return `${RUTAS.leads}?${parametros.toString()}`
}

// El vacío del embudo de un lead.
export function vacioDelEmbudoDelLead(nombreDelLead: string, nombreDelEmbudo: string): string {
  return `${nombreDelLead} no tiene oportunidades en «${nombreDelEmbudo}».`
}
