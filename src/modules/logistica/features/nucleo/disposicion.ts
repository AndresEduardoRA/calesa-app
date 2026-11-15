'use client'

import { createContext, use } from 'react'

// ¿Los huecos están en las zonas de la página (escritorio) o en bloques (celular, drawers y la ficha)? Un área lo pregunta para cambiar cómo se ofrece algo (Documentos sube en un drawer sólo en zonas).
// No sale por `index.ts`: lo da `DisposicionEnZonas` a sus huecos y fuera de él vale `false`.
const ContextoDeZonas = createContext(false)

export const ProveedorDeZonas = ContextoDeZonas.Provider

export function useEnZonas(): boolean {
  return use(ContextoDeZonas)
}
