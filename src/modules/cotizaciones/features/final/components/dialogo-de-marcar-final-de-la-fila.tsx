'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelDeFila } from '@/shared/ui/use-panel-de-fila'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_LA_FILA,
  MENSAJE_DE_LA_FILA_NO_DISPONIBLE,
} from '../../../entities/accion-de-fila-en-la-url'
import { PANEL_MARCAR_FINAL } from '../../../entities/final/url'
import { ConfirmarMarcarFinalDiferido } from './diferidos'

type Props = {
  // Lo que se sabe de la cotización nombrada en `?para=`: su número y, si la acción está apagada, por qué. Nulo si no está en la página o no se ofrece.
  de: (id: string) => { numero: number; motivo: string | null } | null
}

// La confirmación de «Marcar final» del listado: uno por pantalla, en `?panel=marcar-final&para=<id>`. Se revisa una vez al llegar (una cotización que no está en la página, que ya
// no se ofrece o apagada: avisa y limpia la URL, `useRevisionAlAbrir`) y se pide al abrirse por primera vez. Es el mismo diálogo de la guardada: al entrar, `marcarFinal` revalida
// `/cotizaciones` y la lista se vuelve a dibujar.
export function DialogoDeMarcarFinalDeLaFila({ de }: Props) {
  const panel = usePanelDeFila(PANEL_MARCAR_FINAL, CLAVE_DE_LA_FILA, [], (fila) => {
    const cotizacion = fila === null ? null : de(fila)
    return cotizacion === null ? MENSAJE_DE_LA_FILA_NO_DISPONIBLE : cotizacion.motivo
  })
  const numero = panel.fila === null ? null : (de(panel.fila)?.numero ?? null)
  // Lo último nombrado se conserva mientras el diálogo se cierra (valores primitivos: `useUltimo` pide un dato estable).
  const idMostrado = useUltimo(panel.abierto ? panel.fila : null)
  const numeroMostrado = useUltimo(panel.abierto ? numero : null)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  if (!montar || idMostrado === null || numeroMostrado === null) {
    return null
  }
  return (
    <ConfirmarMarcarFinalDiferido
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      id={idMostrado}
      numero={numeroMostrado}
      focoAlCerrar={() => menuDeLaFila(idMostrado)}
    />
  )
}

// El «⋯» de esa fila (la tabla y las tarjetas lo dibujan las dos: se busca el que se ve): a él vuelve el foco al cerrar.
function menuDeLaFila(id: string): HTMLElement | boolean {
  const menus = document.querySelectorAll<HTMLElement>(`[data-mas-acciones="${id}"]`)
  return Array.from(menus).find((menu) => menu.offsetParent !== null) ?? true
}
