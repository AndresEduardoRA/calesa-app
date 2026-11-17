'use client'

import { createContext, use } from 'react'
import type { MedidasDelDiagrama } from '../../../../entities/disposicion-del-diagrama'

// Lo que las cajas y las flechas necesitan del lienzo y no viaja en los datos de cada una (así no cambian de identidad en cada dibujo).
export type Lienzo = {
  medidas: MedidasDelDiagrama
  alAbrir: (faseId: string) => void
  // Un `mouseup` tras arrastrar no abre la fase.
  vieneDeArrastrar: () => boolean
}

export const ContextoDelLienzo = createContext<Lienzo | null>(null)

export function useLienzo(): Lienzo {
  const lienzo = use(ContextoDelLienzo)
  if (!lienzo) throw new Error('useLienzo() sólo se usa dentro del diagrama del flujo.')
  return lienzo
}
