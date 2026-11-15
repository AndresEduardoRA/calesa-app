'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { RespuestaDeInteres, RespuestaDeVinculo } from '../../../entities/vehiculos-del-lead'
import { marcarInteres } from '../actions/marcar-interes'
import { quitarInteres } from '../actions/quitar-interes'
import { MENSAJE_DE_VALIDACION } from '../actions/resultado'
import { vincularVehiculo } from '../actions/vincular-vehiculo'

// Los tres pedidos de siempre (vincular o desvincular, marcar y quitar interés) contra sus actions, sin avisos: `useVinculo` dice cada resultado. `alCambiar` corre tras todo envío logrado,
// también el de «Deshacer»: el resumen, que lee en el navegador, vuelve a leer.
export function usePedidosDeVinculo(alCambiar?: () => void) {
  const acciones = {
    vincular: useAction(vincularVehiculo),
    marcar: useAction(marcarInteres),
    quitar: useAction(quitarInteres),
  }
  const logrado = <Dato extends { ok: boolean }>(envio: Dato): Dato => {
    if (envio.ok) {
      alCambiar?.()
    }
    return envio
  }
  return {
    enCurso: Object.values(acciones).some((accion) => accion.isPending),
    pedirVinculo: async (
      vehiculoId: string,
      actualizadoEnEsperado: string,
      leadId: string | null,
    ) =>
      logrado(
        await enviarAccion<RespuestaDeVinculo>(
          acciones.vincular.executeAsync({ vehiculoId, actualizadoEnEsperado, leadId }),
          MENSAJE_DE_VALIDACION,
        ),
      ),
    pedirInteres: async (vehiculoId: string, leadId: string, nota: string | null) =>
      logrado(
        await enviarAccion<RespuestaDeInteres>(
          acciones.marcar.executeAsync({ vehiculoId, leadId, nota }),
          MENSAJE_DE_VALIDACION,
        ),
      ),
    pedirQuitar: async (vehiculoId: string, leadId: string) =>
      logrado(
        await enviarAccion<RespuestaDeInteres>(
          acciones.quitar.executeAsync({ vehiculoId, leadId }),
          MENSAJE_DE_VALIDACION,
        ),
      ),
  }
}
