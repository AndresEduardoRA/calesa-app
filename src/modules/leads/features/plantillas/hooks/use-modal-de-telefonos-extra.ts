'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { validarMaximoDeExtras, type AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { guardarTelefonosExtra } from '../actions/guardar-telefonos-extra'

type Opciones = {
  telefonos: AjustesDeLeads['telefonos']
  abierto: boolean
  alCerrar: () => void
}

// Los teléfonos extra en su modal: el máximo (de 0 a 20, escrito como texto: la regla se dice junto al campo antes de enviar) y si cuentan como el
// principal. Lo que la base rechaza vuelve con su motivo; un conflicto ofrece «Recargar». Sin cambios, guardar cierra.
export function useModalDeTelefonosExtra({ telefonos, abierto, alCerrar }: Opciones) {
  const [maximo, setMaximo] = useState(String(telefonos.maximo))
  const [comoPrincipal, setComoPrincipal] = useState(telefonos.comoPrincipal)
  const hayCambios =
    maximo.trim() !== String(telefonos.maximo) || comoPrincipal !== telefonos.comoPrincipal
  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: telefonos.actualizadoEn,
    validar: () => {
      const validado = hayCambios ? validarMaximoDeExtras(maximo) : { ok: true as const }
      return validado.ok ? null : { maximo: validado.motivo }
    },
    pedir: async () => {
      const validado = validarMaximoDeExtras(maximo)
      if (!hayCambios || !validado.ok) {
        return { ok: true, data: { actualizadoEn: telefonos.actualizadoEn } }
      }
      return enviarAccion(
        guardarTelefonosExtra({
          actualizadoEnEsperado: telefonos.actualizadoEn,
          maximo: validado.maximo,
          comoPrincipal,
        }),
        MENSAJE_DE_VALIDACION,
      )
    },
    alGuardar: () => {
      avisarExito('Teléfonos extra guardados.')
      alCerrar()
    },
    campoDelRechazo: (error) =>
      error.codigo === 'regla' || error.codigo === 'validacion' ? 'maximo' : null,
  })
  return {
    maximo,
    comoPrincipal,
    escribirMaximo: (valor: string) => {
      setMaximo(valor)
      formulario.quitarMotivo('maximo')
    },
    cambiarRegla: setComoPrincipal,
    motivo: formulario.errores['maximo'] ?? null,
    formulario,
  }
}
