'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'

export type PanelDeIntegracion = 'apibara' | 'clave-apibara' | 'web-publica' | 'secreto-web-publica'

// Por qué un panel no se puede abrir (o `null`): sin permiso, o una integración que la instalación no tiene.
export type MotivosDeLosPaneles = Record<PanelDeIntegracion, string | null>

function useEstadoDelPanel(
  panel: PanelDeIntegracion,
  rechazado: boolean,
  panelAbierto: PanelDeIntegracion | null,
  abrir: () => void,
) {
  const abierto = panelAbierto === panel && !rechazado
  return { abrir, abierto, montar: useAbiertoAlgunaVez(abierto) }
}

// Los cuatro paneles de Integraciones en la URL (`?panel=`): cuál está abierto, cuál ya se montó y el cierre. Uno que no se puede abrir se
// avisa y se limpia: no abre el modal.
export function usePanelesDeIntegraciones(motivos: MotivosDeLosPaneles) {
  const apibara = usePanelPorUrl('apibara')
  const claveApibara = usePanelPorUrl('clave-apibara')
  const webPublica = usePanelPorUrl('web-publica')
  const secretoWeb = usePanelPorUrl('secreto-web-publica')

  const enUrl: [PanelDeIntegracion, boolean][] = [
    ['apibara', apibara.abierto],
    ['clave-apibara', claveApibara.abierto],
    ['web-publica', webPublica.abierto],
    ['secreto-web-publica', secretoWeb.abierto],
  ]
  const panelAbierto = enUrl.find(([, abierto]) => abierto)?.[0] ?? null
  const motivoDelPanel = panelAbierto === null ? null : motivos[panelAbierto]
  const rechazado = useRevisionAlAbrir(panelAbierto, motivoDelPanel, apibara.cerrar)

  return {
    cerrar: apibara.cerrar,
    apibara: useEstadoDelPanel('apibara', rechazado, panelAbierto, apibara.abrir),
    claveApibara: useEstadoDelPanel('clave-apibara', rechazado, panelAbierto, claveApibara.abrir),
    webPublica: useEstadoDelPanel('web-publica', rechazado, panelAbierto, webPublica.abrir),
    secretoWeb: useEstadoDelPanel('secreto-web-publica', rechazado, panelAbierto, secretoWeb.abrir),
  }
}

export type PanelesDeIntegraciones = ReturnType<typeof usePanelesDeIntegraciones>
