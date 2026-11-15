import type { TotalDelResumen } from './binding'
import { FALTA_EL_LEAD, FALTA_EL_VEHICULO, VALOR_DESCARTADO } from './guardado'
import type { LoQueFalta } from './obligatorios-al-cotizar'
import type { EstadoDeRecalculo } from './recalculo'

// Cuándo «Guardar» no guarda, y lo dice (`docs/UX.md` › «Cotizar»: no deja guardar con un total viejo). Mientras se recalcula no es un motivo: se espera al total al día y
// se guarda con lo que ese recálculo calculó (P8). Nada de esto aplica al reenvío de un pendiente (4-21): ese pedido ya se armó.
export function motivoParaNoGuardar(h: {
  estado: EstadoDeRecalculo
  // Lo que la hoja pide y falta elegir (`loQueFalta()`, según las claves del rol en ese origen). Una cotización guardada ya tiene lo suyo (o nunca lo tuvo) y guardar no lo
  // cambia (4.15-3): nulo.
  falta: LoQueFalta | null
  total: TotalDelResumen
  // El último recálculo descartó un valor que la persona escribió: la base lo rechaza siempre.
  descartoLoTipeado: boolean
}): string | null {
  if (h.falta !== null) {
    return h.falta === 'lead' ? FALTA_EL_LEAD : FALTA_EL_VEHICULO
  }
  if (h.estado.tipo === 'fallo') {
    return 'No se puede guardar hasta volver a recalcular.'
  }
  if (h.estado.tipo === 'sin_variante') {
    return 'Elige una opción para calcular antes de guardar.'
  }
  if (esperaAlRecalculo(h.estado)) {
    return null
  }
  if (h.total.tipo === 'faltante') {
    return h.total.motivo
  }
  return h.descartoLoTipeado ? VALOR_DESCARTADO : null
}

export const esperaAlRecalculo = (estado: EstadoDeRecalculo): boolean =>
  estado.tipo === 'esperando' || estado.tipo === 'recalculando'
