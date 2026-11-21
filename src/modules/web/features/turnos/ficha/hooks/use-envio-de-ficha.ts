'use client'

import { useState } from 'react'
import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import {
  escritoDeFicha,
  hayCambiosDeFicha,
  type EscritoDeFicha,
  type MiFichaEnLaWeb,
} from '../../../../entities/turnos/ficha'
import { guardarFicha } from '../actions/guardar-ficha'
import { esquemaFicha } from '../schemas/ficha'

type Opciones = {
  // Lo guardado al abrir el modal, con su versión: llega por props y nunca va en la `key`.
  ficha: MiFichaEnLaWeb
  abierto: boolean
  alCerrar: () => void
}

// El guardado del modal «Tu ficha en la web»: lo escrito parte de lo guardado, cambiar un campo quita su motivo y el guardado va con la versión del perfil
// (`useEnvioConVersion`: un `PT409` deja el aviso con «Recargar»). Sin cambios, guardar cierra. El rechazo de la base por campo (identificador en uso,
// WhatsApp) llega en `porCampo` y se escribe junto a su campo.
export function useEnvioDeFicha({ ficha, abierto, alCerrar }: Opciones) {
  const [escrito, setEscrito] = useState<EscritoDeFicha>(() => escritoDeFicha(ficha))
  const [publicoWeb, setPublicoWeb] = useState(ficha.publicoWeb)
  const hayCambios = hayCambiosDeFicha(ficha, escrito, publicoWeb)
  const entrada = { ...escrito, publicoWeb, actualizadoEnEsperado: ficha.actualizadoEn }

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: ficha.actualizadoEn,
    validar: () => {
      if (!hayCambios) {
        return null
      }
      const leido = esquemaFicha.safeParse(entrada)
      return leido.success ? null : motivosPorCampo(leido.error.issues)
    },
    pedir: async () =>
      hayCambios
        ? enviarAccion(guardarFicha(entrada), 'No se pudo guardar tu ficha.')
        : { ok: true, data: null },
    alGuardar: () => {
      if (hayCambios) {
        avisarExito('Tu ficha en la web quedó guardada')
      }
      alCerrar()
    },
  })
  return {
    formulario,
    escrito,
    publicoWeb,
    cambiar: (campo: keyof EscritoDeFicha, valor: string) => {
      setEscrito((antes) => ({ ...antes, [campo]: valor }))
      formulario.quitarMotivo(campo)
    },
    cambiarPublico: (valor: boolean) => {
      setPublicoWeb(valor)
      formulario.quitarMotivo('whatsapp')
    },
  }
}

export type FichaEnModal = ReturnType<typeof useEnvioDeFicha>
