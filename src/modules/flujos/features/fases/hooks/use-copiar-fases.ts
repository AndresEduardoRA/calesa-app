'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { RespuestaDeCopiarFases } from '../../../entities/fases/copiar-fases'
import type { FlujoParaCopiar } from '../../../entities/selector-de-flujos'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { useFlujosParaCopiar } from '../../configuracion/hooks/use-flujos-para-copiar'
import { useVersionDelFlujo } from '../../configuracion/hooks/use-version-del-flujo'
import { copiarFases } from '../actions/copiar-fases'

type Args = {
  flujo: Pick<FlujoParaConfigurar, 'id' | 'origenId'>
  alCerrar: () => void
  // Cerrado, lo que esperaba la red no sale.
  abierto: boolean
}

const ELIGE_UN_ORIGEN = 'Elige un origen.'

// El estado de «Empezar con las fases de…»: el origen elegido y el envío. Copiado sin nada saltado, avisa y cierra; con algo saltado, el modal pasa a
// decir qué no se copió (`resultado`). Un conflicto (`PT409`) cierra y lo dice el aviso de arriba del flujo, con «Recargar»; sin conexión, sale solo al
// volver; otro rechazo queda en el modal.
export function useCopiarFases({ flujo, alCerrar, abierto }: Args) {
  const desde = useFlujosParaCopiar()
  const { avisarConflicto } = useVersionDelFlujo()
  const { pedir, enCurso } = usePedidoDeCopia(flujo)
  const [elegido, setElegido] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<{ desde: number } | null>(null)
  const [resultado, setResultado] = useState<RespuestaDeCopiarFases | null>(null)

  function elegir(flujoId: string) {
    setElegido(flujoId)
    setError(undefined)
  }

  async function enviar(): Promise<boolean> {
    const origen = desde.find((d) => d.flujoId === elegido)
    if (!origen) {
      setError(ELIGE_UN_ORIGEN)
      return false
    }
    setAviso(null)
    const envio = await pedir(origen)
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      if (envio.data.saltado.length === 0) {
        avisarExito(`Fases de ${origen.titulo} copiadas.`)
        alCerrar()
      } else {
        setResultado(envio.data)
      }
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      alCerrar()
      avisarConflicto(envio.error.mensaje)
      return false
    }
    setAviso(envio.error.mensaje)
    return false
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    desde,
    elegido,
    error,
    resultado,
    elegir,
    // Lo que pide `ModalDeFormulario`. Sin campos escritos que perder: elegir un origen no es algo que preguntar antes de cerrar.
    formulario: {
      enCurso,
      hayCambios: false,
      conflicto: null,
      aviso,
      enLinea,
      esperandoConexion: pendiente !== null,
      enviar,
      reintentar: () => {
        void enviar()
      },
    },
  }
}

// La action, un envío a la vez, con la versión del flujo de ahora. Nulo si ya había uno en vuelo o si el flujo no es de un origen (sólo ahí hay un
// flujo vacío para copiar).
function usePedidoDeCopia(flujo: Args['flujo']) {
  const { version } = useVersionDelFlujo()
  const accion = useAction(copiarFases)
  const unaVez = useUnEnvioALaVez()
  async function pedir(origen: FlujoParaCopiar) {
    const { origenId } = flujo
    if (origenId === null) {
      return null
    }
    return unaVez.mandar(() =>
      enviarAccion<RespuestaDeCopiarFases>(
        accion.executeAsync({
          flujoId: flujo.id,
          origenId,
          desdeFlujoId: origen.flujoId,
          desdeOrigenId: origen.origenId,
          actualizadoEnEsperado: version,
        }),
        'Revisa el origen elegido.',
      ),
    )
  }
  return { pedir, enCurso: unaVez.enCurso }
}
