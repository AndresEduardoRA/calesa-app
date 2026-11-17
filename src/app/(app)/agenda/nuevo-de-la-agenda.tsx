'use client'

import { PlusIcon } from 'lucide-react'
import { useAtajo } from '@/shared/ui/atajos'
import { Button } from '@/shared/ui/button'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { adelantarElModalDeNuevo } from '../_shell/nuevo/diferidos'
import { PANEL_NUEVO_EN_LA_AGENDA } from '../_shell/nuevo/panel'

type Props = {
  // La copia del día vacío no registra la tecla: la tiene el botón de la barra.
  atajo?: boolean
}

// «Nuevo» de la agenda: abre el modal «Nuevo» del shell filtrado a lo que se agenda (evento, tarea y recordatorio) por `?panel=nuevo-en-la-agenda`. El modal vive en el
// layout; por eso este botón se compone en `src/app` y llega a la barra de la agenda como un nodo. La tecla N lo abre mientras la agenda esté a la vista.
export function NuevoDeLaAgenda({ atajo = true }: Props) {
  const panel = usePanelPorUrl(PANEL_NUEVO_EN_LA_AGENDA)
  const abrir = () => {
    adelantarElModalDeNuevo()
    panel.abrir()
  }
  // Con otro diálogo abierto (un panel, la paleta) la tecla no abre «Nuevo» encima.
  useAtajo(
    'nuevo',
    () => {
      if (!panel.abierto && document.querySelector('[role="dialog"][data-open]') === null) {
        abrir()
      }
    },
    atajo,
  )
  return (
    <Button
      // La copia del día vacío se nombra aparte: dos botones con el mismo nombre en la pantalla confunden al lector.
      aria-label={atajo ? 'Nuevo en la agenda' : 'Nuevo en este día'}
      aria-haspopup="dialog"
      aria-keyshortcuts={atajo ? 'N' : undefined}
      className="h-11 md:h-9"
      onClick={abrir}
      onPointerEnter={adelantarElModalDeNuevo}
      onFocus={adelantarElModalDeNuevo}
    >
      <PlusIcon aria-hidden />
      Nuevo
    </Button>
  )
}
