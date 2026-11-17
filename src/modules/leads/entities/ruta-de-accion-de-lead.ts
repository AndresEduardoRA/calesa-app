// A dónde lleva «Nuevo» (la barra superior) para anotarle un seguimiento o agendarle un recordatorio a un lead que se eligió sin estar en su lista: su ficha, en la
// sección «Seguimientos», con el modal ya abierto (`?panel=anotar-seguimiento` o `?panel=agendar-recordatorio`). La ficha dice «lead no disponible» si ya no se ve. Puro.
// Sin importar `ficha.ts`, `recordatorios.ts` ni `edicion-de-seguimiento.ts`: esos arrastran zod y media ficha, y esto sale por `shell.client.ts`, que viaja con el
// marco de toda pantalla. Las claves se repiten acá y `ruta-de-accion-de-lead.test.ts` las compara con las de origen.
import { RUTAS } from '@/shared/lib/rutas'

export type AccionSobreUnLead = 'anotar-seguimiento' | 'agendar-recordatorio'

export function rutaDeAccionSobreUnLead(accion: AccionSobreUnLead, leadId: string): string {
  return `${RUTAS.leads}/${encodeURIComponent(leadId)}?seccion=seguimientos&panel=${accion}`
}
