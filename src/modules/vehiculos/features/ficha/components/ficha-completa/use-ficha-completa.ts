'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_FICHA_COMPLETA, FICHA_COMPLETA } from './claves'

// La ficha completa abierta o no, en la URL (`?ver=ficha`): abrir suma al historial, «atrás» y Esc la cierran y el foco vuelve a «Ver más». Un solo
// llamado por pantalla (lo hace «Datos principales» y le pasa `abierto` y `cerrar` al modal).
export function useFichaCompleta() {
  return usePanelPorUrl(FICHA_COMPLETA, [], { clave: CLAVE_DE_FICHA_COMPLETA })
}
