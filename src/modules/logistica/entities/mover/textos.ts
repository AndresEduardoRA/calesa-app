// Los textos del hueco «Qué falta» (6.04): lo que dice cuando no hay nada que mostrar y cómo se llama a dónde lleva el atajo de una falta. Sin I/O.
export const SIN_FASE = 'Todavía no tiene fase.'
export const SIN_DESTINOS = 'Desde esta fase no hay a dónde mover.'
export const HAY_MAS_DESTINOS = 'Hay más destinos de los que se muestran.'
export const NO_SE_LEYO_QUE_FALTA = 'No pudimos leer lo que falta para mover.'

// El nombre de cada hueco al que un requisito puede mandar (la clave es la de `ORDEN_DE_HUECOS`).
const TITULO_DEL_HUECO: Record<string, string> = {
  documentos: 'Documentos',
  transporte: 'Transporte',
  aduana: 'Aduana',
  pagos: 'Pagos',
}

/** El texto del atajo de una falta: «Ir a Documentos». */
export function textoDelAtajo(ancla: string): string {
  return `Ir a ${TITULO_DEL_HUECO[ancla] ?? ancla}`
}

/** Sin red, las acciones de «Qué falta» se dibujan apagadas y la línea viva lo dice. */
export const SIN_CONEXION_EN_QUE_FALTA = 'Sin conexión: las acciones vuelven con la red.'

/** «Pedirlo» en la URL: `?pedir=requisito&falta=<id del requisito>` (clave propia: `?panel=` cerraría el drawer del ítem y chocaría con los paneles de los huecos). */
export const CLAVE_DE_PEDIR = 'pedir'
export const PANEL_PEDIR = 'requisito'
export const CLAVE_DE_LA_FALTA = 'falta'

// El modal «Pedírselo a alguien».
export const TITULO_DEL_PEDIDO = 'Pedírselo a alguien'
export const QUIEN_PUEDE = 'Quién puede hacerlo'
export const BUSCAR_A_QUIEN = 'Busca por nombre'
export const NO_SE_LEYO_QUIEN = 'No pudimos leer quién puede hacerlo.'
export const SIN_PERMISO_DE_DAR_TAREAS = 'Necesitas permiso para dar tareas.'
/** La causa del rechazo cuando quien pide no puede dar tareas: el modal dice a quién pedírselo. */
export const CAUSA_SIN_ASIGNAR = 'asignar'
export const SIN_ACCESO_A_LA_UNIDAD = 'Ya no tienes acceso a esta unidad.'
export const YA_NO_FALTA = 'Eso ya no falta.'
export const YA_NO_RECIBE = 'Esa persona ya no puede recibir tareas. Elige otra.'
export const NO_SE_ENVIO = 'No pudimos enviarlo.'
export const PIDIENDO = 'Pidiendo…'

/** «Pedírselo a Ana» (el botón de enviar) y el aviso al lograrlo. */
export const pedirselo = (nombre: string) => `Pedírselo a ${nombre}`
export const seLoPediste = (nombre: string) =>
  `Se lo pediste a ${nombre}: tiene una tarea en su agenda.`
