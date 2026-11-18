'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelDeFila } from '@/shared/ui/use-panel-de-fila'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { CLAVE_DE_LA_FILA } from '../../../../entities/accion-de-fila-en-la-url'
import {
  CLAVE_DE_LA_PESTANA_DE_COMPARTIR,
  PANEL_DE_COMPARTIR,
} from '../../../../entities/tarjeta/compartir/url'
import { PanelDeCompartirDiferido } from './diferidos'

// Nunca rechaza al llegar: lo que no se ve lo dice el panel («No tienes acceso a esta cotización.» con «Cerrar»), no un aviso que cierra.
const sinMotivo = () => null

// «Compartir cotización» fuera del detalle (el «⋯» de la lista y, después, las tarjetas, el resumen y la ficha del vehículo): uno por pantalla, en
// `?panel=compartir&para=<id>`. Se pide al abrirse por primera vez; cada apertura empieza de cero y lo último nombrado se conserva mientras se cierra. Al cerrar, el foco
// vuelve al «⋯» de esa fila si se ve.
export function DialogoDeCompartirDeLaFila() {
  const panel = usePanelDeFila(
    PANEL_DE_COMPARTIR,
    CLAVE_DE_LA_FILA,
    [CLAVE_DE_LA_PESTANA_DE_COMPARTIR],
    sinMotivo,
  )
  const apertura = useApertura(panel.abierto)
  const idMostrado = useUltimo(panel.abierto ? (panel.fila ?? '') : null)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  if (!montar || idMostrado === null) {
    return null
  }
  return (
    <PanelDeCompartirDiferido
      key={apertura}
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      cotizacionId={idMostrado}
      focoAlCerrar={() => menuDeLaFila(idMostrado)}
    />
  )
}

// El «⋯» de esa fila (la tabla y las tarjetas lo dibujan las dos: se busca el que se ve); si no hay, el foco vuelve a quien lo tenía.
function menuDeLaFila(id: string): HTMLElement | boolean {
  const menus = document.querySelectorAll<HTMLElement>(`[data-mas-acciones="${CSS.escape(id)}"]`)
  return Array.from(menus).find((menu) => menu.offsetParent !== null) ?? true
}
