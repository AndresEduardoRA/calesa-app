'use client'

import { useState } from 'react'
import { PLATAFORMAS_APIBARA, type PlataformaApibara } from '@/shared/lib/apibara'
import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { configDeApibara, type Integracion } from '../../../entities/integraciones'
import { guardarApibara } from '../actions/guardar-apibara'
import { esquemaGuardarApibara } from '../schemas/integraciones'

type Opciones = {
  abierto: boolean
  alCerrar: () => void
  // La fila de apibara con su versión: llega por props al abrir y nunca va en la `key`.
  apibara: Integracion
}

// La configuración no secreta de apibara en su modal: a dónde se le pregunta y de qué plataformas. La clave es otro modal (otra escritura,
// con la misma versión de la fila).
export function useModalDeApibara({ abierto, alCerrar, apibara }: Opciones) {
  const guardada = configDeApibara(apibara.config)
  const [endpoint, setEndpoint] = useState(guardada.endpoint)
  const [plataformas, setPlataformas] = useState<readonly PlataformaApibara[]>(guardada.plataformas)
  // En el orden de siempre, sin repetidas: así se compara y así viaja.
  const orden = (lista: readonly PlataformaApibara[]) =>
    PLATAFORMAS_APIBARA.filter((plataforma) => lista.includes(plataforma))
  const elegidas = orden(plataformas)
  const entrada = {
    actualizadoEnEsperado: apibara.actualizadoEn,
    endpoint: endpoint.trim(),
    plataformas: elegidas,
  }
  const hayCambios =
    entrada.endpoint !== guardada.endpoint || elegidas.join() !== orden(guardada.plataformas).join()

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: apibara.actualizadoEn,
    validar: () => {
      if (!hayCambios) {
        return null
      }
      const leido = esquemaGuardarApibara.safeParse(entrada)
      return leido.success ? null : motivosPorCampo(leido.error.issues)
    },
    pedir: async () =>
      hayCambios
        ? enviarAccion(guardarApibara(entrada), 'No se pudo guardar la configuración de apibara.')
        : { ok: true, data: { actualizadoEn: apibara.actualizadoEn } },
    alGuardar: () => {
      avisarExito('Configuración de apibara guardada')
      alCerrar()
    },
  })

  return {
    formulario,
    endpoint,
    plataformas: elegidas,
    cambiarEndpoint: (valor: string) => {
      setEndpoint(valor)
      formulario.quitarMotivo('endpoint')
    },
    cambiarPlataformas: (lista: readonly PlataformaApibara[]) => {
      setPlataformas(lista)
      formulario.quitarMotivo('plataformas')
    },
  }
}
