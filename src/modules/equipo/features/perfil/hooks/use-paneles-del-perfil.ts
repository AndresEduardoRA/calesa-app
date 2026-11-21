'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'

export type TarjetaDelPerfil = 'tu' | 'preferencias'

function useEstadoDelPanel(panel: TarjetaDelPerfil) {
  const { abierto, abrir, cerrar } = usePanelPorUrl(panel)
  return { abrir, abierto, cerrar, montar: useAbiertoAlgunaVez(abierto) }
}

// Los dos modales de lo propio en la URL (`?panel=tu|preferencias`): cuál está abierto, cuál ya se montó y el cierre. Se montan al abrirse la primera vez y
// ya no se desmontan: el cierre se desliza.
export function usePanelesDelPerfil() {
  const tu = useEstadoDelPanel('tu')
  const preferencias = useEstadoDelPanel('preferencias')
  return { cerrar: tu.cerrar, tu, preferencias }
}
