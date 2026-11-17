'use client'

import { createContext, use } from 'react'
import type { useAvisosDeRevisar } from './use-avisos-de-revisar'

export type RevisarDelFlujo = ReturnType<typeof useAvisosDeRevisar>

// La única lectura de «Revisar» de la pantalla (`<ProveedorDeRevisar>`): la usan la franja y las marcas del diagrama.
export const ContextoDeRevisar = createContext<RevisarDelFlujo | null>(null)

export function useRevisarDelFlujo(): RevisarDelFlujo {
  const revisar = use(ContextoDeRevisar)
  if (!revisar) {
    throw new Error('useRevisarDelFlujo() sólo se usa dentro de <ProveedorDeRevisar>.')
  }
  return revisar
}
