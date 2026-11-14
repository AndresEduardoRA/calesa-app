'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_LA_FILA } from '../../../entities/accion-de-fila-en-la-url'
import {
  CLAVE_DE_ACCION,
  PANEL_MODERAR,
  PANEL_REPORTAR,
} from '../../../entities/comentarios/marcas-url'
import type { AccionDeModerar } from '../../../entities/comentarios/moderacion'

// «Reportar…» y las acciones de moderar desde el «⋯» de una fila: abren el mismo modal y el mismo `<Confirmar>` de la guardada (`?panel=reportar`,
// `?panel=moderar&accion=…`) sobre esa cotización (`?para=<id>`).
export function useAbrirMarcasDeLaFila() {
  const reportar = usePanelPorUrl(PANEL_REPORTAR, [CLAVE_DE_LA_FILA])
  const moderar = usePanelPorUrl(PANEL_MODERAR, [CLAVE_DE_ACCION, CLAVE_DE_LA_FILA])
  return {
    reportar: (id: string) => {
      reportar.abrir({ [CLAVE_DE_LA_FILA]: id })
    },
    moderar: (id: string, accion: AccionDeModerar) => {
      moderar.abrir({ [CLAVE_DE_LA_FILA]: id, [CLAVE_DE_ACCION]: accion })
    },
  }
}
