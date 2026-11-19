'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_EMITIR_COMPROBANTE } from '../../../entities/comprobantes/url'
import { useAporteAlMenu } from '../../hoja/components/menu-de-la-guardada'
import { ConfirmarEmitirComprobanteDiferido } from './diferidos'

type Props = {
  cotizacionId: string
  numero: number
  // La versión de la cotización que se ve (el texto de la base, tal cual).
  actualizadoEn: string
}

// «Emitir comprobante…» (4.26-2): su línea en el «⋯» de la cabecera de la guardada y su confirmación en `?panel=emitir-comprobante`: recargar lo abre, «atrás» lo cierra y
// el foco vuelve al «⋯». El diálogo se pide al abrirse: el JS en frío de `/cotizaciones/[id]` está al tope.
export function EmitirComprobanteDelMenu({ cotizacionId, numero, actualizadoEn }: Props) {
  const url = usePanelPorUrl(PANEL_EMITIR_COMPROBANTE)
  const montar = useAbiertoAlgunaVez(url.abierto)
  const { botonRef } = useAporteAlMenu({
    comprobante: {
      tipo: 'accion',
      abre: true,
      alElegir: () => {
        url.abrir()
      },
    },
  })
  return montar ? (
    <ConfirmarEmitirComprobanteDiferido
      abierto={url.abierto}
      alCerrar={url.cerrar}
      cotizacionId={cotizacionId}
      numero={numero}
      actualizadoEn={actualizadoEn}
      focoAlCerrar={() => botonRef?.current ?? true}
    />
  ) : null
}
