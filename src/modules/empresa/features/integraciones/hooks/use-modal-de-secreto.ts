'use client'

import { useState } from 'react'
import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import type { Integracion } from '../../../entities/integraciones'
import { TEXTOS_DEL_SECRETO, type ClaveConSecreto } from '../../../entities/textos-del-secreto'
import { guardarSecreto } from '../actions/guardar-secreto'
import { esquemaGuardarSecreto } from '../schemas/integraciones'

type Opciones = {
  abierto: boolean
  alCerrar: () => void
  clave: ClaveConSecreto
  // La fila de la integración con su versión: llega por props al abrir y nunca va en la `key`.
  integracion: Integracion
}

// Cargar o reemplazar el secreto de una integración en su modal. Nace vacío siempre y va a Vault: no vuelve a mostrarse. Es su propia
// escritura: la dirección o las plataformas, en otro modal, usan la misma versión de la fila y encadenadas la segunda chocaría consigo misma.
export function useModalDeSecreto({ abierto, alCerrar, clave, integracion }: Opciones) {
  const [secreto, setSecreto] = useState('')
  const entrada = { clave, secreto, actualizadoEnEsperado: integracion.actualizadoEn }

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios: secreto !== '',
    version: integracion.actualizadoEn,
    validar: () => {
      const leido = esquemaGuardarSecreto.safeParse(entrada)
      return leido.success ? null : motivosPorCampo(leido.error.issues)
    },
    pedir: () => enviarAccion(guardarSecreto(entrada), 'No se pudo guardar el secreto.'),
    alGuardar: () => {
      avisarExito(TEXTOS_DEL_SECRETO[clave].exito)
      alCerrar()
    },
  })

  return {
    formulario,
    secreto,
    cambiarSecreto: (valor: string) => {
      setSecreto(valor)
      formulario.quitarMotivo('secreto')
    },
  }
}
