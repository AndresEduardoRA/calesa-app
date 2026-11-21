import type { AccionesDeUnAviso } from '@/shared/lib/acciones-del-aviso'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA, type ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { avisoDePrivada, type ResultadoDePrivada } from '../../../entities/privada'
import { cambiarPrivadaDeLaCotizacion } from '../actions/cambiar-privada'

// «Hacer privada» / «Hacer pública» desde el «⋯» (la guardada y el listado). Llama a la action directo, sin `useAction` (el JS en frío de la guardada está al tope:
// `e2e/presupuesto-js.spec.ts`). Quien llama vuelve a leer: la versión de la cotización se movió.

const NO_SE_CAMBIO = 'No se pudo cambiar la cotización.'
const SIN_RED = 'Sin conexión: no se cambió. Reintenta cuando vuelva.'
const NO_SABEMOS = 'No sabemos si se cambió: recarga para verlo.'
const SIN_LLEGAR = new Set([MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA])
const RECARGAR: AccionesDeUnAviso = {
  acciones: [{ tipo: 'recargar', etiqueta: 'Recargar' }],
  pedido: null,
}

export type PedidoDePrivada = {
  id: string
  numero: number
  privada: boolean
  actualizadoEn: string
}

// Lo que se dice: el texto de la base si lo escribió para la persona; si no llegó al servidor, que no se cambió; si llegó y no sabemos cómo terminó, que recargue.
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

// Devuelve lo que quedó (o nulo si no entró, ya dicho en un aviso); nunca lanza.
export async function cambiarLaPrivada(
  pedido: PedidoDePrivada,
): Promise<ResultadoDePrivada | null> {
  const resultado = await enviarAccion<ResultadoDePrivada>(
    cambiarPrivadaDeLaCotizacion({
      id: pedido.id,
      privada: pedido.privada,
      actualizadoEn: pedido.actualizadoEn,
    }),
    NO_SE_CAMBIO,
  )
  if (!resultado.ok) {
    const { error, recargar } = falloDe(resultado.error, 'sinRed' in resultado)
    avisarError(error, recargar ? { acciones: RECARGAR } : {})
    return null
  }
  avisarExito(avisoDePrivada(pedido.numero, resultado.data.privada))
  return resultado.data
}
