'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import {
  MENSAJE_DE_FABRICA,
  MOTIVO_DE_MENSAJE_EN_BLANCO,
  validarMensajeDelPortal,
} from '../../../entities/portal-mensaje'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { guardarMensajeDelPortal } from '../actions/guardar-mensaje-del-portal'

type Opciones = {
  portal: AjustesDeLeads['portal']
  abierto: boolean
  alCerrar: () => void
}

// El mensaje del portal en su modal: el texto parte del guardado o, si no hay, del de fábrica con sus variables (se edita sobre lo de hoy).
// Las reglas se dicen junto al campo antes de enviar; lo que la base rechaza vuelve con su motivo, y un conflicto ofrece «Recargar». En blanco no
// se guarda: volver al de fábrica es «Restablecer», que confirma. Guardar el de fábrica tal cual lo deja nulo, así un cambio futuro del de fábrica
// le llega a la empresa. Sin cambios, guardar cierra.
export function useModalDelMensajeDelPortal({ portal, abierto, alCerrar }: Opciones) {
  const inicial = portal.mensaje ?? MENSAJE_DE_FABRICA
  const [texto, setTexto] = useState(inicial)
  const hayCambios = texto !== inicial
  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: portal.actualizadoEn,
    validar: () => {
      if (!hayCambios) {
        return null
      }
      const validado = validarMensajeDelPortal(texto)
      if (!validado.ok) {
        return { texto: validado.motivo }
      }
      return validado.texto === null ? { texto: MOTIVO_DE_MENSAJE_EN_BLANCO } : null
    },
    pedir: async () => {
      const validado = validarMensajeDelPortal(texto)
      if (!hayCambios || !validado.ok) {
        return { ok: true, data: { actualizadoEn: portal.actualizadoEn } }
      }
      return enviarAccion(
        guardarMensajeDelPortal({
          actualizadoEnEsperado: portal.actualizadoEn,
          texto: validado.texto === MENSAJE_DE_FABRICA ? null : validado.texto,
        }),
        MENSAJE_DE_VALIDACION,
      )
    },
    alGuardar: () => {
      avisarExito('Mensaje del portal guardado.')
      alCerrar()
    },
    campoDelRechazo: (error) =>
      error.codigo === 'regla' || error.codigo === 'validacion' ? 'texto' : null,
  })
  return {
    texto,
    escribir: (valor: string) => {
      setTexto(valor)
      formulario.quitarMotivo('texto')
    },
    motivo: formulario.errores['texto'] ?? null,
    // En blanco con el motivo a la vista: se ofrece volver al de fábrica.
    pideRestablecer: formulario.errores['texto'] === MOTIVO_DE_MENSAJE_EN_BLANCO,
    formulario,
  }
}
