'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { numeroDeComprobante } from '../../../entities/comprobantes/comprobante'
import { esquemaDeSerie, type SerieVigente } from '../../../entities/comprobantes/serie'
import { cambiarSerie } from '../actions/cambiar-serie'

type Opciones = {
  abierto: boolean
  alCerrar: () => void
  // La serie vigente con su versión: llega por props al abrir y nunca va en la `key`.
  vigente: SerieVigente
}

// Cambiar la serie vigente en su modal. Sin cambios, guardar cierra; un cambio ajeno da `PT409` con «Recargar» y lo tipeado queda.
export function useModalDeLaSerie({ abierto, alCerrar, vigente }: Opciones) {
  const [serie, setSerie] = useState(vigente.serie)
  const sinCambios = serie.trim().toUpperCase() === vigente.serie

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios: !sinCambios,
    version: vigente.actualizadoEn,
    validar: () => {
      const leida = esquemaDeSerie.safeParse(serie)
      return sinCambios || leida.success ? null : { serie: leida.error.issues[0]?.message ?? '' }
    },
    pedir: async () => {
      const leida = esquemaDeSerie.safeParse(serie)
      if (sinCambios || !leida.success) {
        return { ok: true, data: null }
      }
      const envio = await enviarAccion(
        cambiarSerie({ serie: leida.data, actualizadoEn: vigente.actualizadoEn }),
        'No se pudo cambiar la serie.',
      )
      return envio.ok ? { ok: true, data: envio.data } : envio
    },
    alGuardar: (cambiada) => {
      if (cambiada) {
        avisarExito(
          `La serie vigente es ${cambiada.serie}: el próximo comprobante es ${numeroDeComprobante(cambiada.serie, cambiada.siguiente)}.`,
        )
      }
      alCerrar()
    },
  })

  return {
    formulario,
    serie,
    cambiarSerie: (valor: string) => {
      setSerie(valor)
      formulario.quitarMotivo('serie')
    },
  }
}
