'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_LA_FILA } from '../../../entities/accion-de-fila-en-la-url'
import {
  CLAVE_DE_DESDE,
  PANEL_APROBAR_PRIVADA,
  type DesdeDondeSeAprueba,
} from '../../../entities/aprobada/url'

// La pregunta de aprobar una privada en la URL (`PANEL_APROBAR_PRIVADA`): abrirla sobre una cotización, desde una pantalla, y si está abierta para esta pantalla, sobre cuál.
export function useAprobarPrivadaPorUrl(desde: DesdeDondeSeAprueba) {
  const url = usePanelPorUrl(PANEL_APROBAR_PRIVADA, [CLAVE_DE_LA_FILA, CLAVE_DE_DESDE])
  const deEsta = url.abierto && url.valor(CLAVE_DE_DESDE) === desde
  return {
    id: deEsta ? url.valor(CLAVE_DE_LA_FILA) : null,
    abrir: (id: string) => {
      url.abrir({ [CLAVE_DE_LA_FILA]: id, [CLAVE_DE_DESDE]: desde })
    },
    cerrar: url.cerrar,
  }
}
