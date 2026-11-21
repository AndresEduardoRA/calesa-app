'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  PANEL_COPIAR_FASES,
  motivoParaNoAbrirCopiarFases,
} from '../../../entities/fases/copiar-fases'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { useFlujosParaCopiar } from '../../configuracion/hooks/use-flujos-para-copiar'

// El modal de «Empezar con las fases de…», en la URL (`?panel=copiar-fases`). Se revisa una vez, al llegar: con el flujo que ya tiene fases o sin
// ningún origen de donde copiar no abre (se avisa y la URL se limpia). Después de copiar sigue abierto aunque el flujo ya tenga fases: muestra qué no
// se copió.
export function useModalDeCopiarFases(flujo: Pick<FlujoParaConfigurar, 'fases'>) {
  const desde = useFlujosParaCopiar()
  const url = usePanelPorUrl(PANEL_COPIAR_FASES)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? String(apertura) : null,
    url.abierto ? motivoParaNoAbrirCopiarFases(flujo, desde.length) : null,
    url.cerrar,
  )
  return {
    abierto: url.abierto && !rechazada,
    apertura,
    alCerrar: url.cerrar,
    abrir: () => {
      url.abrir()
    },
  }
}
