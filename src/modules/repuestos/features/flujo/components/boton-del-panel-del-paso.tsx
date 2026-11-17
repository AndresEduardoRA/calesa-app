'use client'

import { Button } from '@/shared/ui/button'
import { TITULO_DEL_PANEL, type PanelDelPaso } from '../../../entities/flujo/pasos-del-flujo'

/** El id de la sección donde se abre el panel de un paso (la dibuja `src/app`). */
export const ID_DEL_PANEL_DEL_PASO = 'panel-del-paso'

type Props = {
  panel: PanelDelPaso
  abierto: PanelDelPaso | null
  alElegir: (panel: PanelDelPaso | null) => void
}

// Abre (o cierra, si ya está abierto) el panel de un paso bajo los pasos: Cotizaciones, Pagos o Compras. Dice si está abierto con `aria-pressed`.
export function BotonDelPanelDelPaso({ panel, abierto, alElegir }: Props) {
  const presionado = abierto === panel
  return (
    <Button
      type="button"
      size="sm"
      variant={presionado ? 'secondary' : 'outline'}
      aria-pressed={presionado}
      aria-controls={presionado ? ID_DEL_PANEL_DEL_PASO : undefined}
      data-panel-del-paso={panel}
      className="min-h-11 md:min-h-9"
      onClick={() => {
        alElegir(presionado ? null : panel)
      }}
    >
      {TITULO_DEL_PANEL[panel]}
    </Button>
  )
}
