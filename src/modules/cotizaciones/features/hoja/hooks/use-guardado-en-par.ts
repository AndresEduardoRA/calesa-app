'use client'

import { useAction } from 'next-safe-action/hooks'
import { useCallback } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import {
  claveDelPendiente,
  claveEnPar,
  type DeLaPestana,
} from '../../../entities/claves-de-la-hoja'
import { textoDelFallo, textoDelRechazo } from '../../../entities/guardado'
import type { PedidoDeGuardado } from '../../../entities/pedido-de-guardado'
import {
  leerPendienteDeCrearEnPar,
  serializarPendienteEnPar,
  type ArmadoDeCrearEnPar,
  type PedidoDeCrearEnPar,
} from '../../../entities/pedido-en-par'
import { crearCotizacionesEnPar } from '../actions/crear-cotizaciones-en-par'
import { usePendienteEnLaPestana, type CodecDelPendiente } from './pendiente-en-la-pestana'
import {
  MENSAJE_DE_VALIDACION,
  RESPUESTA_PERDIDA,
  useNucleoDelGuardado,
  type EnvioDeGuardado,
  type EstadoDelGuardado,
  type GuardadoDe,
} from './use-nucleo-del-guardado'

export type GuardadoEnPar = GuardadoDe<ArmadoDeCrearEnPar>

const CODEC: CodecDelPendiente<PedidoDeCrearEnPar> = {
  leer: leerPendienteDeCrearEnPar,
  serializar: serializarPendienteEnPar,
}

// El aviso D2 lleva el pedido que lo recibió; el núcleo lo tipa como el de una sola, y «Guardar con la N» lo vuelve a leer como par.
function avisoDe(envio: EnvioDeGuardado, pedido: PedidoDeCrearEnPar): EstadoDelGuardado {
  if (!envio.ok) return { tipo: 'aviso', aviso: textoDelFallo(envio), d2: null }
  const r = envio.data
  if (r.tipo !== 'rechazo') return { tipo: 'aviso', aviso: RESPUESTA_PERDIDA, d2: null }
  const aviso = textoDelRechazo(r.motivo, r.mensaje)
  const por = r.motivo === 'desactualizada_tipo_cambio' ? 'tipo_cambio' : 'formula'
  const d2 = aviso.salida === 'd2' ? { pedido: pedido as unknown as PedidoDeGuardado, por } : null
  return { tipo: 'aviso', aviso, d2 } as EstadoDelGuardado
}

// Cada guardado nuevo lleva dos ids nuevos (el intento), sin «Guardar con la abierta».
const completar = (armado: ArmadoDeCrearEnPar): PedidoDeCrearEnPar => ({
  ...armado,
  intentos: [crypto.randomUUID(), crypto.randomUUID()],
  conLaAbierta: false,
})

// El guardado de la hoja nueva en par: el núcleo (el pendiente 4-21, un envío a la vez, el reintento al volver la red) sobre `cotizacion_crear_en_par`, más D2:
// «Guardar con la versión N» manda el par que recibió la hoja desactualizada, con dos ids nuevos y con la abierta.
export function useGuardadoEnPar({
  hoja,
  alGuardar,
}: {
  hoja: DeLaPestana
  alGuardar: () => void
}) {
  const pendiente = usePendienteEnLaPestana(claveEnPar(claveDelPendiente(hoja)), CODEC)
  const crear = useAction(crearCotizacionesEnPar)
  const enviar = useCallback(
    (pedido: PedidoDeCrearEnPar) => enviarAccion(crear.executeAsync(pedido), MENSAJE_DE_VALIDACION),
    [crear],
  )
  const { publico, mandar, ocupadoRef } = useNucleoDelGuardado({
    pendiente,
    enviar,
    completar,
    avisoDe,
    alGuardar,
    olvidaLoGuardado: false,
  })
  const { estado } = publico
  const guardarConLaAbierta = useCallback(() => {
    if (ocupadoRef.current || estado.tipo !== 'aviso' || estado.d2 === null) return
    ocupadoRef.current = true
    const pedido = estado.d2.pedido as unknown as PedidoDeCrearEnPar
    void mandar(
      { ...pedido, intentos: [crypto.randomUUID(), crypto.randomUUID()], conLaAbierta: true },
      false,
    )
  }, [estado, mandar, ocupadoRef])
  return { ...publico, guardarConLaAbierta } satisfies GuardadoEnPar
}
