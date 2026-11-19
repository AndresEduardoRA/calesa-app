'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useAporteAlMenu } from '../../hoja/components/menu-de-la-guardada/use-aporte-al-menu'
import { PANEL_DE_REVISIONES } from '../hooks/urls-de-revisiones'
import { PanelDeRevisionesDiferido } from './diferidos'

type Props = {
  cotizacionId: string
  numero: number
  // La versión de la cotización (`actualizadoEn`).
  version: string
}

const SIN_BOTON = { current: null }

// «Revisiones» de una guardada: su línea en el «⋯» de la cabecera y su panel con URL (`?panel=revisiones`). Recargar lo abre, «atrás» lo cierra y el foco vuelve al «⋯»;
// el código del panel se pide la primera vez.
export function RevisionesDeLaCotizacion({ cotizacionId, numero, version }: Props) {
  const panel = usePanelPorUrl(PANEL_DE_REVISIONES)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  const { botonRef } = useAporteAlMenu({
    revisiones: {
      tipo: 'accion',
      abre: true,
      alElegir: () => {
        panel.abrir()
      },
    },
  })
  return montar ? (
    <PanelDeRevisionesDiferido
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      cotizacionId={cotizacionId}
      numero={numero}
      version={version}
      botonDeRevisiones={botonRef ?? SIN_BOTON}
    />
  ) : null
}
