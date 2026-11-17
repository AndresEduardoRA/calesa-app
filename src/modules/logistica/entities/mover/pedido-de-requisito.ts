// «Pedirlo» (`docs/GLOSARIO.md`): lo que falta para mover se le pide a quien puede con una tarea de agenda, vinculada al vehículo. Las claves que se piden
// (a quién se le busca), el verbo con que se nombra cada una y el título de la tarea. Puro, sin I/O.
import { pedidoDe } from '@/shared/lib/acciones-del-aviso'

/** Las claves por las que se busca a quién pedírselo (`agenda_quienes_reciben` con `p_permiso`, que acepta sólo éstas: la misma lista en la base). Una tupla: el esquema de la action la usa en `z.enum`. */
export const CLAVES_QUE_SE_PIDEN = [
  'logistica.documentos.subir',
  'logistica.documentos.aprobar',
  'logistica.transporte.editar',
  'logistica.aduana.gestionar',
  'logistica.pagos.confirmar',
  'vehiculos.editar',
  'cotizaciones.final.gestionar',
  'repuestos.mover',
] as const

export type ClaveQueSePide = (typeof CLAVES_QUE_SE_PIDEN)[number]

/** Lo que puede hacer quien tiene cada clave, para «Nadie … tiene permiso para <verbo> en este origen.» y «Para <verbo>, pídeselo…». */
export const VERBO_DE_LA_CLAVE: Record<ClaveQueSePide, string> = {
  'logistica.documentos.subir': 'subir documentos',
  'logistica.documentos.aprobar': 'aprobar documentos',
  'logistica.transporte.editar': 'editar el transporte',
  'logistica.aduana.gestionar': 'gestionar la aduana',
  'logistica.pagos.confirmar': 'confirmar pagos',
  'vehiculos.editar': 'editar vehículos',
  'cotizaciones.final.gestionar': 'gestionar la cotización final',
  'repuestos.mover': 'mover repuestos',
}

/** Sin poder dar tareas (o en un ítem, que no admite tareas), lo que falta se pide a quien administra los roles. */
export const PEDIDO_A_ADMIN = 'Pídeselo a quien administra los roles.'

/** Cuánto admite el título de una tarea (`_agenda_tarea_datos`: de 1 a 120). */
export const LARGO_DEL_TITULO_DEL_PEDIDO = 120

export function esClaveQueSePide(clave: string): clave is ClaveQueSePide {
  return (CLAVES_QUE_SE_PIDEN as readonly string[]).includes(clave)
}

/** «Falta: BL aprobado para pasar a «Embarcado»», recortado a 120 caracteres con «…» (la base corta en 120). */
export function tituloDelPedido(falta: string, fase: string): string {
  const titulo = `Falta: ${falta} para pasar a «${fase}»`
  const letras = [...titulo]
  return letras.length <= LARGO_DEL_TITULO_DEL_PEDIDO
    ? titulo
    : `${letras.slice(0, LARGO_DEL_TITULO_DEL_PEDIDO - 1).join('')}…`
}

/** Cuando nadie que recibe tareas tiene la clave: a quién pedírselo, con el verbo de la clave. */
export function nadieTieneLaClave(clave: ClaveQueSePide): { texto: string; pedido: string } {
  const verbo = VERBO_DE_LA_CLAVE[clave]
  return {
    texto: `Nadie que pueda recibir tareas tiene permiso para ${verbo} en este origen.`,
    pedido: pedidoDe(verbo),
  }
}
