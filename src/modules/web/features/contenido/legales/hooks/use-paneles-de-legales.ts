'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { ClaveDeLegal } from '../../../../entities/contenido/legales'

type EstadoDelPanel = { abrir: () => void; abierto: boolean; montar: boolean }

function useEstadoDelPanel(panel: ClaveDeLegal): EstadoDelPanel & { cerrar: () => void } {
  const { abierto, abrir, cerrar } = usePanelPorUrl(panel)
  return { abrir, abierto, cerrar, montar: useAbiertoAlgunaVez(abierto) }
}

// Los dos modales de Legales en la URL (`?panel=terminos|privacidad`): cuál está abierto, si ya se montó y cómo se abre. Se monta al abrirse la
// primera vez y ya no se desmonta: el cierre se desliza.
export function usePanelesDeLegales() {
  const terminos = useEstadoDelPanel('terminos')
  const privacidad = useEstadoDelPanel('privacidad')
  return { cerrar: terminos.cerrar, porClave: { terminos, privacidad } }
}
