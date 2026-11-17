'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'

export const VISTAS_DEL_FLUJO = ['diagrama', 'lista'] as const
export type VistaDelFlujo = (typeof VISTAS_DEL_FLUJO)[number]

const VISTA = parseAsStringLiteral(VISTAS_DEL_FLUJO)
  .withDefault('diagrama')
  // El servidor no depende de la vista: cambiarla no lo llama ni suma al historial (`docs/DECISIONES.md` › «Flujos»).
  .withOptions({ shallow: true, history: 'replace' })

// Cómo se ven las fases (`?vista=diagrama|lista`): desde 768 px el diagrama primero y «Ver como lista» alterna; más angosto, sólo la lista (el diagrama no
// cabe y la lista es la versión navegable).
export function useVistaDelFlujo() {
  const [elegida, setElegida] = useQueryState('vista', VISTA)
  const puedeDiagrama = useAlMenos(CORTE_DE_LA_TABLA)
  const vista: VistaDelFlujo = puedeDiagrama ? elegida : 'lista'
  return {
    vista,
    puedeDiagrama,
    alternar: () => {
      void setElegida(vista === 'diagrama' ? 'lista' : 'diagrama')
    },
  }
}
