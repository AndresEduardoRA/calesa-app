'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'

export type PanelDeMonedas = 'moneda-base' | 'monedas' | 'leyenda'

// Por qué un modal no se puede abrir (o `null`): la base es de `empresa.ajustes.gestionar`; la lista de monedas y la leyenda, de `empresa.tipos_cambio.gestionar`.
export type MotivosDeLosModales = Record<PanelDeMonedas, string | null>

type EstadoDelModal = {
  abrir: () => void
  abierto: boolean
  // Se monta al abrirse la primera vez y ya no se desmonta: el cierre se desliza.
  montar: boolean
}

function useEstadoDelModal(
  panel: PanelDeMonedas,
  rechazado: boolean,
  panelAbierto: PanelDeMonedas | null,
  abrir: () => void,
): EstadoDelModal {
  const abierto = panelAbierto === panel && !rechazado
  return { abrir, abierto, montar: useAbiertoAlgunaVez(abierto) }
}

// Los tres modales de Monedas y tipos de cambio en la URL (`?panel=moneda-base|monedas|leyenda`). Uno que no se puede abrir (sin permiso) se avisa y
// se limpia. Los paneles de un tipo de cambio o de una moneda (`?tc=`, `?moneda=`, `?panel=nuevo-tipo-cambio|nueva-moneda`) van aparte, con el servidor.
export function usePanelesDeMonedas(motivos: MotivosDeLosModales) {
  const base = usePanelPorUrl('moneda-base')
  const monedas = usePanelPorUrl('monedas')
  const leyenda = usePanelPorUrl('leyenda')
  const panelAbierto: PanelDeMonedas | null = base.abierto
    ? 'moneda-base'
    : monedas.abierto
      ? 'monedas'
      : leyenda.abierto
        ? 'leyenda'
        : null
  const rechazado = useRevisionAlAbrir(
    panelAbierto,
    panelAbierto === null ? null : motivos[panelAbierto],
    base.cerrar,
  )
  return {
    cerrar: base.cerrar,
    base: useEstadoDelModal('moneda-base', rechazado, panelAbierto, base.abrir),
    monedas: useEstadoDelModal('monedas', rechazado, panelAbierto, monedas.abrir),
    leyenda: useEstadoDelModal('leyenda', rechazado, panelAbierto, leyenda.abrir),
  }
}
