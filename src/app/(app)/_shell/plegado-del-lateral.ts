'use client'

import { createContext, use } from 'react'

// Si quien lo lee está dentro de la barra lateral de escritorio y esta se ve plegada. El menú del celular (que dibuja las mismas entradas) queda fuera de
// la barra: ahí es siempre falso y no cambia.
const ContextoPlegadoDelLateral = createContext(false)

export const ProveedorPlegadoDelLateral = ContextoPlegadoDelLateral

export function usePlegadoDelLateral(): boolean {
  return use(ContextoPlegadoDelLateral)
}
