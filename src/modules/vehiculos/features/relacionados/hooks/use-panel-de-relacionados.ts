'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { TIPOS_DE_RELACION, type TipoDeRelacion } from '../../../entities/relacionados'

// El «Ver todos» de un grupo vive en la URL (`?relacionados=interesado`): se puede recargar, «atrás» lo cierra y se comparte. Abrirlo no pide nada al servidor (sin `shallow: false`).
export const CLAVE_DE_RELACIONADOS = 'relacionados'

export function usePanelDeRelacionados() {
  const opciones = { clave: CLAVE_DE_RELACIONADOS }
  const paneles = {
    vinculado: usePanelPorUrl('vinculado', [], opciones),
    interesado: usePanelPorUrl('interesado', [], opciones),
    cotizado: usePanelPorUrl('cotizado', [], opciones),
  }
  const tipo: TipoDeRelacion | null = TIPOS_DE_RELACION.find((uno) => paneles[uno].abierto) ?? null
  return {
    tipo,
    abrir: (que: TipoDeRelacion) => {
      paneles[que].abrir()
    },
    cerrar: () => {
      paneles[tipo ?? 'vinculado'].cerrar()
    },
  }
}
