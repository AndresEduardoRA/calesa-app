import type { EntradasDelPedido } from './entradas'

// Guardar una cotización guardada es UNA llamada a `cotizacion_guardar()` (4.15-3). `intento` es uno nuevo por guardado, reusado sólo para reenviar **el mismo** pedido (4-21:
// la base devuelve lo guardado con `repetido`). `actualizadoEn` es la versión que vio quien edita, **el texto de la base tal cual**, con sus microsegundos: un `Date` de JS los
// pierde y la versión daría siempre conflicto. El título y si es manual son los del campo «Título de la cotización» (T307; automático: la base pone el del vehículo); las notas
// son las de la cotización, sin tocarlas (ninguna pantalla las escribe todavía); el vehículo es el de la hoja (el guardado, o el elegido en una preventa: T315) y
// `cambiaElVehiculo` dice si es otro (no va a la base: dice cómo leer su rechazo); el modo y «Ver total Bs» son los de la hoja, y las entradas, las que calculó el recálculo al día.
export type PedidoDeEdicion = {
  intento: string
  cotizacionId: string
  actualizadoEn: string
  entradas: EntradasDelPedido
  modoTc: string | null
  verTotalBs: boolean
  titulo: string | null
  tituloManual: boolean
  notas: string | null
  vehiculoId: string | null
  cambiaElVehiculo: boolean
}

// Lo que arma la hoja con el total al día: todo menos el intento, que pone el guardado.
export type ArmadoDeEdicion = Omit<PedidoDeEdicion, 'intento'>

// Las diez claves, siempre (`cambiaElVehiculo` no es de la RPC): la RPC no tiene valores por defecto (salvo `p_titulo_manual`, que también va) y lee el nulo como «sin modo», «sin título», «sin notas» y «sin vehículo» (que, con el que ya tiene, es no tocarlo).
// Los tipos generados no admiten el nulo en un argumento sin defecto: de ahí los `as string`.
export function argumentosDeGuardar(p: PedidoDeEdicion) {
  return {
    p_id: p.cotizacionId,
    p_intento: p.intento,
    p_actualizado_en_esperado: p.actualizadoEn,
    p_entradas: p.entradas,
    p_modo_tc: p.modoTc as string,
    p_titulo: p.titulo as string,
    p_notas: p.notas as string,
    p_vehiculo: p.vehiculoId as string,
    p_ver_total_bs: p.verTotalBs,
    p_titulo_manual: p.tituloManual,
  }
}
