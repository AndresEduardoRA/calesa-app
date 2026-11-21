import type { AccionesDeUnAviso } from '@/shared/lib/acciones-del-aviso'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA, type ErrorApp } from '@/shared/lib/errores'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { CotizacionAprobable, ResultadoDeAprobar } from '../../../entities/aprobada/tipos'
import { CAUSA_PRIVADA } from '../../../entities/privada'
import { aprobarCotizacion } from '../actions/aprobar'

// Aprobar desde la guardada. Llama a la action directo, sin `useAction` (el JS en frío de la guardada está al tope: `e2e/presupuesto-js.spec.ts`) y sin refrescar la
// página (remontaría lo tipeado en la hoja): quien llama aplica lo devuelto con `alCambiar`. Es reversible: se aprueba de una y el aviso ofrece «Deshacer» 10 s, que
// aprueba la anterior con la versión que devolvió la base. Una privada no se aprueba de una: quien llama pregunta antes (`?panel=aprobar-privada`) y, confirmada,
// `aprobarHaciendolaPublica()`; si quien llama no sabía que era privada, la base lo dice y `alSerPrivada` abre la misma pregunta. «Deshacer» no la vuelve privada.

const NO_SE_APROBO = 'No se pudo aprobar la cotización.'
const SIN_RED = 'Sin conexión: no se aprobó. Reintenta cuando vuelva.'
const NO_SABEMOS = 'No sabemos si se aprobó: recarga para verlo.'
const SIN_LLEGAR = new Set([MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA])
const RECARGAR: AccionesDeUnAviso = {
  acciones: [{ tipo: 'recargar', etiqueta: 'Recargar' }],
  pedido: null,
}

export type PedidoDeAprobar = {
  id: string
  numero: number
  actualizadoEn: string
  // La cotización pasó a ser la aprobada (`true`) o dejó de serlo por «Deshacer» (`false`); `idAprobada` es la que lo es ahora (la pedida o, tras
  // «Deshacer», la anterior).
  alCambiar: (aprobada: boolean, idAprobada: string) => void
  // La base dijo que es privada (22023, `hint privada`): quien llama abre la pregunta. Sin él, se avisa con el texto de la base.
  alSerPrivada?: () => void
}

// Lo que no entró, para decirlo: el error y si ofrece «Recargar».
export type FalloDeAprobar = { error: ErrorApp; recargar: boolean }

// Lo que se dice: el texto de la base si lo escribió para la persona; si no llegó al servidor, que no se aprobó; si llegó y no sabemos cómo terminó, que recargue.
function falloDe(error: ErrorApp, sinRed: boolean): { error: ErrorApp; recargar: boolean } {
  if (error.codigo === 'conflicto') {
    return { error, recargar: true }
  }
  if (sinRed || (error.codigo === 'inesperado' && SIN_LLEGAR.has(error.mensaje))) {
    return { error: { codigo: 'inesperado', mensaje: SIN_RED }, recargar: false }
  }
  if (error.codigo === 'inesperado') {
    return { error: { codigo: 'inesperado', mensaje: NO_SABEMOS }, recargar: true }
  }
  return { error, recargar: false }
}

type Intento =
  { ok: true; data: ResultadoDeAprobar } | { ok: false; fallo: FalloDeAprobar; privada: boolean }

async function intentar(
  id: string,
  actualizadoEn: string,
  hacerlaPublica: boolean,
): Promise<Intento> {
  const resultado = await enviarAccion<ResultadoDeAprobar>(
    aprobarCotizacion({ id, actualizadoEn, ...(hacerlaPublica ? { hacerlaPublica } : {}) }),
    NO_SE_APROBO,
  )
  if (resultado.ok) {
    return { ok: true, data: resultado.data }
  }
  return {
    ok: false,
    fallo: falloDe(resultado.error, 'sinRed' in resultado),
    privada: resultado.error.causa === CAUSA_PRIVADA,
  }
}

const avisarFallo = ({ error, recargar }: FalloDeAprobar) => {
  avisarError(error, recargar ? { acciones: RECARGAR } : {})
}

async function enviar(id: string, actualizadoEn: string) {
  const intento = await intentar(id, actualizadoEn, false)
  if (intento.ok) {
    return intento.data
  }
  avisarFallo(intento.fallo)
  return null
}

async function deshacer(anterior: CotizacionAprobable, alCambiar: PedidoDeAprobar['alCambiar']) {
  if ((await enviar(anterior.id, anterior.actualizadoEn)) === null) {
    return
  }
  alCambiar(false, anterior.id)
  avisarExito(`Volvió a ser la aprobada la n.º ${String(anterior.numero)}.`)
}

// Lo que entró: la cotización pasó a ser la aprobada y el aviso, con «Deshacer» si había otra.
function alEntrar(pedido: PedidoDeAprobar, { anterior }: ResultadoDeAprobar, dicho: string) {
  pedido.alCambiar(true, pedido.id)
  if (anterior === null) {
    avisarExito(dicho)
    return
  }
  avisarConDeshacer(dicho, () => {
    void deshacer(anterior, pedido.alCambiar)
  })
}

const aprobadaDelVehiculo = (numero: number) =>
  `La n.º ${String(numero)} es la aprobada del vehículo.`

// Devuelve cuando terminó (entró, se dijo por qué no o se abrió la pregunta de una privada); nunca lanza.
export async function aprobarLaCotizacion(pedido: PedidoDeAprobar): Promise<void> {
  const intento = await intentar(pedido.id, pedido.actualizadoEn, false)
  if (intento.ok) {
    alEntrar(pedido, intento.data, aprobadaDelVehiculo(pedido.numero))
    return
  }
  if (intento.privada && pedido.alSerPrivada) {
    pedido.alSerPrivada()
    return
  }
  avisarFallo(intento.fallo)
}

// Aprobar una privada ya confirmada: la base la hace pública (con su hermana) y la aprueba. Lo que no entra se devuelve para decirlo en la pregunta; nunca lanza.
export async function aprobarHaciendolaPublica(
  pedido: Omit<PedidoDeAprobar, 'alSerPrivada'>,
): Promise<FalloDeAprobar | null> {
  const intento = await intentar(pedido.id, pedido.actualizadoEn, true)
  if (!intento.ok) {
    return intento.fallo
  }
  alEntrar(pedido, intento.data, `${aprobadaDelVehiculo(pedido.numero)} Ya no es privada.`)
  return null
}
