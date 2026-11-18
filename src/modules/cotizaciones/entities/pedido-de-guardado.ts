import type { EntradasDelPedido } from './entradas'

// Un guardado de la hoja es UNA llamada a `cotizacion_crear()` (paso 4.13-3b), siempre como preventa. `intento` es el id de la cotización: un uuid por guardado, reusado sólo
// para reenviar **el mismo** pedido (4-21: la base devuelve lo guardado con `repetido`). `abierta` es la hoja abierta que firmó la base, la misma del recálculo (D2, 4-27).
// `conLaAbierta` es «Guardar con la versión N». `modoTc` es el modo que calculó el total que se ve (nulo: el de la fórmula, y no se manda). Sin vehículo cargado a mano (4.14).
export type PedidoDeGuardado = {
  intento: string
  origenId: string
  // Nulo con `cotizaciones.crear.sin_lead` del origen: la base lo acepta (y sin esa clave lo rechaza).
  leadId: string | null
  vehiculoId: string | null
  abierta: string
  entradas: EntradasDelPedido
  modoTc: string | null
  // «Ver total Bs»: lo que quien cotiza dejó encendido, y sólo si la hoja lo ofrecía (la base lo rechaza si no).
  verTotalBs: boolean
  conLaAbierta: boolean
  // El título de la cotización (T307): el texto sólo si es manual (`tituloParaGuardar()`); automático, la base pone el del vehículo. Sin vehículo, la base lo exige.
  titulo: string | null
  tituloManual: boolean
}

export function argumentosDeCrear(p: PedidoDeGuardado) {
  return {
    p_id: p.intento,
    p_origen: p.origenId,
    // El tipo generado dice `string`, pero la base acepta nulo con `cotizaciones.crear.sin_lead` (como `p_padre` de los comentarios).
    p_lead: p.leadId as string,
    p_entradas: p.entradas,
    p_abierta: p.abierta,
    ...(p.vehiculoId === null ? {} : { p_vehiculo: p.vehiculoId }),
    ...(p.modoTc === null ? {} : { p_modo_tc: p.modoTc }),
    p_ver_total_bs: p.verTotalBs,
    p_clase: 'preventa' as const,
    p_con_la_abierta: p.conLaAbierta,
    ...(p.titulo === null ? {} : { p_titulo: p.titulo }),
    p_titulo_manual: p.tituloManual,
  }
}
