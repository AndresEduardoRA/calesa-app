'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'

export type PanelDeLaEmpresa = 'identidad' | 'region' | 'datos-legales' | 'politicas' | 'iconos'

// Por qué un panel no se puede abrir (o `null`): sin permiso, o íconos sin logo.
export type MotivosDeLosPaneles = Record<PanelDeLaEmpresa, string | null>

type EstadoDelPanel = {
  abrir: () => void
  abierto: boolean
  // Se monta al abrirse la primera vez y ya no se desmonta: el cierre se desliza.
  montar: boolean
}

function useEstadoDelPanel(
  panel: PanelDeLaEmpresa,
  rechazado: boolean,
  panelAbierto: PanelDeLaEmpresa | null,
  abrir: () => void,
): EstadoDelPanel {
  const abierto = panelAbierto === panel && !rechazado
  return { abrir, abierto, montar: useAbiertoAlgunaVez(abierto) }
}

// Los cinco paneles de Datos de la empresa en la URL (`?panel=`): cuál está abierto, cuál ya se montó y el cierre. Un `?panel=` que no
// se puede abrir (sin permiso, íconos sin logo) se avisa y se limpia: no abre el modal.
export function usePanelesDeLaEmpresa(motivos: MotivosDeLosPaneles) {
  const identidad = usePanelPorUrl('identidad')
  const region = usePanelPorUrl('region')
  const legales = usePanelPorUrl('datos-legales')
  const politicas = usePanelPorUrl('politicas')
  const iconos = usePanelPorUrl('iconos')

  const enUrl: [PanelDeLaEmpresa, boolean][] = [
    ['identidad', identidad.abierto],
    ['region', region.abierto],
    ['datos-legales', legales.abierto],
    ['politicas', politicas.abierto],
    ['iconos', iconos.abierto],
  ]
  const panelAbierto = enUrl.find(([, abierto]) => abierto)?.[0] ?? null
  const motivoDelPanel = panelAbierto === null ? null : motivos[panelAbierto]
  const rechazado = useRevisionAlAbrir(panelAbierto, motivoDelPanel, identidad.cerrar)

  return {
    cerrar: identidad.cerrar,
    identidad: useEstadoDelPanel('identidad', rechazado, panelAbierto, identidad.abrir),
    region: useEstadoDelPanel('region', rechazado, panelAbierto, region.abrir),
    legales: useEstadoDelPanel('datos-legales', rechazado, panelAbierto, legales.abrir),
    politicas: useEstadoDelPanel('politicas', rechazado, panelAbierto, politicas.abrir),
    iconos: useEstadoDelPanel('iconos', rechazado, panelAbierto, iconos.abrir),
  }
}
