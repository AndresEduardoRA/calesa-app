'use client'

import { useAction } from 'next-safe-action/hooks'
import { useCallback } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { claveDelPendienteDeUnaGuardada, claveEnPar } from '../../../entities/claves-de-la-hoja'
import { textoDelFallo, textoDelRechazo } from '../../../entities/guardado'
import {
  leerPendienteDeGuardarEnPar,
  serializarPendienteEnPar,
  type ArmadoDeGuardarEnPar,
  type PedidoDeGuardarEnPar,
} from '../../../entities/pedido-en-par'
import { guardarCotizacionesEnPar } from '../actions/guardar-cotizaciones-en-par'
import { usePendienteEnLaPestana, type CodecDelPendiente } from './pendiente-en-la-pestana'
import {
  MENSAJE_DE_VALIDACION,
  RESPUESTA_PERDIDA,
  useNucleoDelGuardado,
  type EnvioDeGuardado,
  type EstadoDelGuardado,
  type GuardadoDe,
} from './use-nucleo-del-guardado'

export type GuardadoDeUnPar = GuardadoDe<ArmadoDeGuardarEnPar>

const CODEC: CodecDelPendiente<PedidoDeGuardarEnPar> = {
  leer: leerPendienteDeGuardarEnPar,
  serializar: serializarPendienteEnPar,
}

function avisoDe(envio: EnvioDeGuardado): EstadoDelGuardado {
  if (!envio.ok) return { tipo: 'aviso', aviso: textoDelFallo(envio), d2: null }
  const r = envio.data
  const aviso = r.tipo === 'rechazo' ? textoDelRechazo(r.motivo, r.mensaje) : RESPUESTA_PERDIDA
  return { tipo: 'aviso', aviso, d2: null }
}

const completar = (armado: ArmadoDeGuardarEnPar): PedidoDeGuardarEnPar => ({
  ...armado,
  intentos: [crypto.randomUUID(), crypto.randomUUID()],
})

// El guardado de dos hermanas abiertas juntas (glosario: «Cotizaciones hermanas»): el núcleo sobre `cotizacion_guardar_en_par`; guardar cualquiera guarda las dos.
// El pendiente va por persona y por la cotización que se abrió.
export function useGuardadoDeUnPar({
  personaId,
  cotizacionId,
  etiquetas,
  alGuardar,
}: {
  personaId: string
  cotizacionId: string
  etiquetas: readonly [string, string]
  alGuardar: () => void
}): GuardadoDeUnPar {
  const pendiente = usePendienteEnLaPestana(
    claveEnPar(claveDelPendienteDeUnaGuardada({ personaId, cotizacionId })),
    CODEC,
  )
  const guardar = useAction(guardarCotizacionesEnPar)
  const [etiquetaA, etiquetaB] = etiquetas
  const enviar = useCallback(
    (pedido: PedidoDeGuardarEnPar) =>
      enviarAccion(
        guardar.executeAsync({ pedido, etiquetas: [etiquetaA, etiquetaB] }),
        MENSAJE_DE_VALIDACION,
      ),
    [guardar, etiquetaA, etiquetaB],
  )
  const { publico } = useNucleoDelGuardado({
    pendiente,
    enviar,
    completar,
    avisoDe,
    alGuardar,
    olvidaLoGuardado: true,
  })
  return { ...publico, guardarConLaAbierta: () => {} }
}
