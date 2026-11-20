'use client'

import { useState } from 'react'
import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { configDeWebPublica, type Integracion } from '../../../entities/integraciones'
import { guardarWebPublica } from '../actions/guardar-web-publica'
import { esquemaGuardarWebPublica } from '../schemas/integraciones'

type Opciones = {
  abierto: boolean
  alCerrar: () => void
  // La fila de la web pública con su versión: llega por props al abrir y nunca va en la `key`.
  webPublica: Integracion
}

// La dirección de revalidación de la web pública en su modal: a dónde avisa la base qué cambió. Vacía, se borra.
export function useModalDeWebPublica({ abierto, alCerrar, webPublica }: Opciones) {
  const guardada = configDeWebPublica(webPublica.config).revalidar_url ?? ''
  const [direccion, setDireccion] = useState(guardada)
  const entrada = { actualizadoEnEsperado: webPublica.actualizadoEn, revalidarUrl: direccion }
  const hayCambios = direccion.trim() !== guardada

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: webPublica.actualizadoEn,
    validar: () => {
      if (!hayCambios) {
        return null
      }
      const leido = esquemaGuardarWebPublica.safeParse(entrada)
      return leido.success ? null : motivosPorCampo(leido.error.issues)
    },
    pedir: async () =>
      hayCambios
        ? enviarAccion(guardarWebPublica(entrada), 'No se pudo guardar la dirección.')
        : { ok: true, data: { actualizadoEn: webPublica.actualizadoEn } },
    alGuardar: () => {
      avisarExito('Dirección de revalidación guardada')
      alCerrar()
    },
  })

  return {
    formulario,
    direccion,
    cambiarDireccion: (valor: string) => {
      setDireccion(valor)
      formulario.quitarMotivo('revalidarUrl')
    },
  }
}
