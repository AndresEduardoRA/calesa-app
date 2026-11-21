'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { PANEL_DE_NUMEROS_REPETIDOS } from '../../../entities/paneles-de-la-configuracion'

export const MOTIVO_SIN_REGLA_DE_NUMEROS = 'Los números repetidos se miran con la regla encendida.'

// El modal de «Números repetidos» en la URL (`?panel=numeros-repetidos`). Sólo hay qué mirar con la regla guardada encendida: escrito a mano con
// la regla apagada no abre, se avisa y se limpia la URL.
export function useNumerosRepetidosPorUrl(reglaEncendida: boolean) {
  const url = usePanelPorUrl(PANEL_DE_NUMEROS_REPETIDOS)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? String(apertura) : null,
    url.abierto && !reglaEncendida ? MOTIVO_SIN_REGLA_DE_NUMEROS : null,
    url.cerrar,
  )
  const abierto = url.abierto && !rechazada
  return {
    abierto,
    montar: useAbiertoAlgunaVez(abierto),
    abrir: () => {
      url.abrir()
    },
    cerrar: url.cerrar,
  }
}
