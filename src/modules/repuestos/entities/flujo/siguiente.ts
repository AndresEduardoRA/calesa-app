import type { FilaDeItem } from '../nucleo/item'
import type { IndiceDelFlujo } from './pasos'
import { ORDEN_DE_LOS_HITOS, type FaseDeLosPasos, type HitoDelPaso } from './pasos-del-flujo'

// El **siguiente** de un ítem (`docs/GLOSARIO.md` › «Siguiente (de un ítem)»): lo que toca hacer para que avance, con el botón que lo hace. Puro: lo calcula la hoja
// sobre la fila viva. La base vuelve a exigir todo: cada botón sale sólo con la clave que la base pide para eso.

export type SiguienteDelItem =
  // Nada que ofrecer: proyecto cerrado, fase final (también «Perdido»), sin salidas o sin fase inicial.
  | { tipo: 'ninguno' }
  // Abre el panel del ítem con ese destino ya elegido (nulo = elegir entre varias iniciales).
  | { tipo: 'mover'; faseId: string | null; texto: string }
  // Quien mira no puede hacer lo que toca: sólo se dice.
  | { tipo: 'informar'; texto: string }
  // El destino pide un hito bloqueante que falta y quien mira puede hacerlo.
  | { tipo: 'cotizacion'; texto: string }
  | { tipo: 'pago'; texto: string }

export const TEXTO_DE_ELEGIR_FASE = 'Elegir fase'
export const TEXTO_DE_NUEVA_COTIZACION = 'Nueva cotización'
export const TEXTO_DE_REGISTRAR_PAGO = 'Registrar pago'

export type ContextoDelSiguiente = {
  // Si hay un pago vivo del proyecto; nulo sin `repuestos.costos.ver` (no se sabe).
  pago: boolean | null
  cerrado: boolean
  // Lo calcula el servidor con `puede()`: `repuestos.mover`, `repuestos.cotizar` y `repuestos.costos.editar`.
  puede: { mover: boolean; cotizar: boolean; registrarPago: boolean }
}

type Fila = Pick<FilaDeItem, 'fase' | 'precioCliente'>

const NINGUNO: SiguienteDelItem = { tipo: 'ninguno' }

/** A dónde va el ítem: sin fase, la única inicial activa (varias = elegir); con fase, la salida hacia adelante más cercana o, si ninguna va hacia adelante, la primera. */
function destinoDe(
  indice: IndiceDelFlujo,
  fila: Fila,
): { fase: FaseDeLosPasos; accion: string | null } | 'elegir' | null {
  if (fila.fase === null) {
    const iniciales = indice.activas.filter((f) => f.esInicial)
    const [unica] = iniciales
    if (iniciales.length > 1) return 'elegir'
    return unica === undefined ? null : { fase: unica, accion: null }
  }
  const [primera] = indice.salidas.get(fila.fase.id) ?? []
  const fase = primera === undefined ? undefined : indice.porId.get(primera.a)
  return primera === undefined || fase === undefined ? null : { fase, accion: primera.accion }
}

/** El hito bloqueante que el destino pide y todavía falta, si quien mira puede hacerlo. Uno informativo no frena mover: no cambia el botón. */
function hitoQueFalta(
  indice: IndiceDelFlujo,
  faseId: string,
  fila: Fila,
  { pago, puede }: ContextoDelSiguiente,
): HitoDelPaso | null {
  const bloqueantes = new Set(
    (indice.pedidos.get(faseId) ?? []).filter((p) => p.bloqueante).map((p) => p.hito),
  )
  for (const hito of ORDEN_DE_LOS_HITOS) {
    if (!bloqueantes.has(hito)) continue
    if (hito === 'precio' && fila.precioCliente === null && puede.cotizar) return 'precio'
    if (hito === 'pago' && pago === false && puede.registrarPago) return 'pago'
  }
  return null
}

/** El siguiente del ítem. Sin permiso para lo que toca, sólo el texto «Sigue: «X»» (nunca un botón muerto). */
export function siguienteDelItem(
  indice: IndiceDelFlujo,
  fila: Fila,
  contexto: ContextoDelSiguiente,
): SiguienteDelItem {
  if (contexto.cerrado || fila.fase?.esFinal === true) return NINGUNO
  const destino = destinoDe(indice, fila)
  if (destino === null) return NINGUNO
  if (destino === 'elegir') {
    return contexto.puede.mover
      ? { tipo: 'mover', faseId: null, texto: TEXTO_DE_ELEGIR_FASE }
      : NINGUNO
  }
  const hito = hitoQueFalta(indice, destino.fase.id, fila, contexto)
  if (hito === 'precio') return { tipo: 'cotizacion', texto: TEXTO_DE_NUEVA_COTIZACION }
  if (hito === 'pago') return { tipo: 'pago', texto: TEXTO_DE_REGISTRAR_PAGO }
  if (!contexto.puede.mover) return { tipo: 'informar', texto: `Sigue: «${destino.fase.nombre}»` }
  const accion = destino.accion?.trim()
  return {
    tipo: 'mover',
    faseId: destino.fase.id,
    texto: accion ? accion : `Mover a «${destino.fase.nombre}»`,
  }
}
