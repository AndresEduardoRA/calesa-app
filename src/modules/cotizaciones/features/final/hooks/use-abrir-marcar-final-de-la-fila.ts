'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_LA_FILA } from '../../../entities/accion-de-fila-en-la-url'
import { PANEL_MARCAR_FINAL } from '../../../entities/final/url'

// «Marcar final…» desde el «⋯» de una fila: abre el mismo `<Confirmar>` de la guardada (`?panel=marcar-final`) sobre esa cotización (`?para=<id>`).
export function useAbrirMarcarFinalDeLaFila() {
  const url = usePanelPorUrl(PANEL_MARCAR_FINAL, [CLAVE_DE_LA_FILA])
  return (id: string) => {
    url.abrir({ [CLAVE_DE_LA_FILA]: id })
  }
}
