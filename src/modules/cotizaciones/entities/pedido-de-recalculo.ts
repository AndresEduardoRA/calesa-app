import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { EntradasDelPedido } from './entradas'
import { recalculoDesde, type RespuestaDeRecalculo } from './recalculo'

// De dónde calcula una hoja (y de dónde lee la ayuda de una tabla): de su origen, o de una cotización guardada. Nunca de las dos: la base rechaza `p_abierta` con `p_cotizacion`.
// - `abierta`: la hoja nueva. La versión de la fórmula y los tipos de cambio son los de la hoja que se abrió (`abierta`, que firmó la base con `cotizacion_hoja()`: 4-28, el total
//   que se ve es el de la hoja que se dibujó) y, si hay, el vehículo.
// - `guardada`: SU versión y SUS tipos de cambio (`cotizacion_evaluar(p_cotizacion)`); el vehículo es el de la cotización (nulo, no se manda) o el elegido en una preventa
//   para cambiarlo (T315: `p_vehiculo`, lo que daría cambiarlo antes de guardar). Nunca `p_origen` ni `p_abierta`.
export type DeDondeCalcula =
  // `opcion`: la de su columna en una hoja en par (glosario: «Variante en par»); la pone la base, no la persona.
  | {
      tipo: 'abierta'
      origenId: string
      abierta: string
      vehiculoId: string | null
      opcion?: string
    }
  | { tipo: 'guardada'; cotizacionId: string; vehiculoId: string | null }

// Un recálculo de la hoja es UNA llamada a `cotizacion_evaluar()`. El modo de tipo de cambio va por su clave (`p_modo_tc`), nunca como objeto: sus buckets nombran tipos de
// cambio que un nivel puede esconder. En el 4.13-2 no hay modo.
export type PedidoDeRecalculo = {
  de: DeDondeCalcula
  entradas: EntradasDelPedido
  modoTc: string | null
}

export function argumentosDeEvaluar(p: PedidoDeRecalculo) {
  const modo = p.modoTc === null ? {} : { p_modo_tc: p.modoTc }
  if (p.de.tipo === 'guardada') {
    return {
      p_entradas: p.entradas,
      p_cotizacion: p.de.cotizacionId,
      ...(p.de.vehiculoId === null ? {} : { p_vehiculo: p.de.vehiculoId }),
      ...modo,
    }
  }
  return {
    p_entradas: p.entradas,
    p_origen: p.de.origenId,
    p_abierta: p.de.abierta,
    ...(p.de.vehiculoId === null ? {} : { p_vehiculo: p.de.vehiculoId }),
    ...(p.de.opcion === undefined ? {} : { p_opcion: p.de.opcion }),
    ...modo,
  }
}

// El mensaje de la base nunca se muestra (puede nombrar un nodo que quien mira no ve): la pantalla decide su texto con el código.
export function resultadoDeEvaluar(respuesta: {
  data: unknown
  error: { code?: string | null; message: string } | null
}): Resultado<RespuestaDeRecalculo> {
  if (respuesta.error) {
    return { ok: false, error: errorDePostgrest(respuesta.error) }
  }
  const leida = recalculoDesde(respuesta.data)
  return leida ? ok(leida) : fallo('inesperado', 'No pudimos leer el cálculo de la hoja.')
}
