'use client'

import { irAlBloque } from '@/shared/ui/ficha-en-bloques'
import { usePanelDeRecordatorio } from '../../recordatorios/hooks/use-panel-de-recordatorio'
import { usePanelDeSeguimiento } from '../../seguimientos/hooks/use-panel-de-seguimiento'

// Cuánto se espera, como mucho, a que el «⋯» termine de cerrarse (y devuelva el foco a su botón) antes de saltar.
const ESPERA_DEL_MENU_MS = 600

// Corre `hacer` cuando ya no queda un menú abierto: si saltara antes, el menú, al cerrarse, le devolvería el foco a su botón.
function trasCerrarElMenu(hacer: () => void) {
  const desde = performance.now()
  const mirar = () => {
    const abierto = document.querySelector('[role="menu"]') !== null
    if (abierto && performance.now() - desde < ESPERA_DEL_MENU_MS) {
      window.requestAnimationFrame(mirar)
      return
    }
    window.requestAnimationFrame(hacer)
  }
  window.requestAnimationFrame(mirar)
}

// Lo que el «⋯» de la cabecera abre en la misma ficha, sin navegar (un `router.push` volvería a leer todos los bloques): «Anotar
// seguimiento…» y «Agendar recordatorio…» escriben su `?panel=` (el modal es del bloque «Seguimientos y recordatorios», que lo atiende y
// vigila la vuelta del foco; éstos sólo abren: `atiendeLaUrl: false`) y llevan la página a ese bloque sin quitarle el foco al modal; «Ver
// oportunidades» e «Ir a «Vehículos»» saltan a su bloque. Si el bloque no está (sin permiso), navega a la ruta.
export function useAbrirEnLaFicha(navegar: (url: string) => void) {
  const seguimiento = usePanelDeSeguimiento({ atiendeLaUrl: false })
  const recordatorio = usePanelDeRecordatorio({ atiendeLaUrl: false })
  return {
    anotar: () => {
      seguimiento.abrirAnotar()
      irAlBloque('seguimientos', { enfocar: false })
    },
    agendar: () => {
      recordatorio.abrirAgendar()
      irAlBloque('seguimientos', { enfocar: false })
    },
    irA: (ancla: string, url: string) => {
      if (document.getElementById(ancla) === null) {
        navegar(url)
        return
      }
      trasCerrarElMenu(() => {
        irAlBloque(ancla)
      })
    },
  }
}
