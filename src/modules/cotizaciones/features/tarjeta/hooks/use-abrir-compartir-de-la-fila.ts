'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_LA_FILA } from '../../../entities/accion-de-fila-en-la-url'
import {
  CLAVE_DE_LA_PESTANA_DE_COMPARTIR,
  PANEL_DE_COMPARTIR,
} from '../../../entities/tarjeta/compartir/url'

// Abre «Compartir cotización» de una cotización que no es la de la página (`?panel=compartir&para=<id>`): lo usan el «⋯» de la lista y quien lo ofrezca después.
export function useAbrirCompartirDeLaFila() {
  const url = usePanelPorUrl(PANEL_DE_COMPARTIR, [
    CLAVE_DE_LA_FILA,
    CLAVE_DE_LA_PESTANA_DE_COMPARTIR,
  ])
  return (id: string) => {
    url.abrir({ [CLAVE_DE_LA_FILA]: id })
  }
}
