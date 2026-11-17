'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_OPORTUNIDAD_RAPIDA } from '../../../entities/oportunidad-rapida'

// «Nueva oportunidad…» en la ficha (`?panel=oportunidad-rapida`). Comparte la clave con los demás paneles: nunca se apilan. Abrir suma al historial
// (tras recargar, «atrás» devuelve el foco al «⋯»). Sin `shallow: false`: abrirlo no necesita al servidor.
export function usePanelDeOportunidadRapida() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const abierto = panel === PANEL_OPORTUNIDAD_RAPIDA
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return {
    abierto,
    abrir: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setPanel(PANEL_OPORTUNIDAD_RAPIDA, { history: 'push' }),
        abierto,
      )
    },
    cerrar: () => {
      void setPanel(null)
    },
  }
}
