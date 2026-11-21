'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { PANEL_MARCAR_FINAL } from '../../../entities/final/url'
import { useAporteAlMenu } from '../../hoja/components/menu-de-la-guardada'
import { ConfirmarMarcarFinalDiferido } from './diferidos'

type Props = {
  id: string
  numero: number
  // Por qué no se puede marcar todavía (falta el vehículo o el cliente); nulo = se puede.
  motivo: string | null
  // Una privada: la confirmación dice que deja de serlo.
  privada: boolean
}

// «Marcar final…» (4.25-2): su línea en el «⋯» de la cabecera de la guardada y su confirmación en `?panel=marcar-final`: recargar lo abre, «atrás» lo cierra y el foco vuelve
// al «⋯». Apagada, dice su motivo debajo; la URL escrita a mano no abre el diálogo: avisa el motivo y se limpia. El diálogo se pide al abrirse: el JS en frío de
// `/cotizaciones/[id]` está al tope (`e2e/presupuesto-js.spec.ts`).
export function MarcarFinalDelMenu({ id, numero, motivo, privada }: Props) {
  const url = usePanelPorUrl(PANEL_MARCAR_FINAL)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(url.abierto ? String(apertura) : null, motivo, url.cerrar)
  const abierto = url.abierto && !rechazada && motivo === null
  const montar = useAbiertoAlgunaVez(abierto)
  const { botonRef } = useAporteAlMenu({
    final: {
      tipo: 'accion',
      motivo,
      abre: true,
      alElegir: () => {
        url.abrir()
      },
    },
  })
  return montar ? (
    <ConfirmarMarcarFinalDiferido
      abierto={abierto}
      alCerrar={url.cerrar}
      id={id}
      numero={numero}
      privada={privada}
      focoAlCerrar={() => botonRef?.current ?? true}
    />
  ) : null
}
