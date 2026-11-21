'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { TarjetaDelSitio } from '../../../../entities/sitio/tarjetas-del-sitio'

function useEstadoDelPanel(panel: TarjetaDelSitio) {
  const { abierto, abrir, cerrar } = usePanelPorUrl(panel)
  return { abrir, abierto, cerrar, montar: useAbiertoAlgunaVez(abierto) }
}

// Los cinco modales de «Ajustes» en la URL (`?panel=identidad|contacto|redes|seo|vitrina`): cuál está abierto, cuál ya se montó y el cierre. Se
// montan al abrirse la primera vez y ya no se desmontan: el cierre se desliza.
export function usePanelesDelSitio() {
  const identidad = useEstadoDelPanel('identidad')
  const contacto = useEstadoDelPanel('contacto')
  const redes = useEstadoDelPanel('redes')
  const seo = useEstadoDelPanel('seo')
  const vitrina = useEstadoDelPanel('vitrina')
  return { cerrar: identidad.cerrar, identidad, contacto, redes, seo, vitrina }
}
