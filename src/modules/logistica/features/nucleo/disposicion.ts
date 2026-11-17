'use client'

import { createContext, use } from 'react'

// ¿Los huecos están en las zonas de la página (escritorio) o en bloques (celular, drawers y la ficha)? Un área lo pregunta para cambiar cómo se ofrece algo (Documentos sube en un drawer sólo en zonas).
// No sale por `index.ts`: lo da `DisposicionEnZonas` a sus huecos y fuera de él vale `false`.
const ContextoDeZonas = createContext(false)

export const ProveedorDeZonas = ContextoDeZonas.Provider

export function useEnZonas(): boolean {
  return use(ContextoDeZonas)
}

// ¿Los huecos están en la página de la unidad (en zonas o en bloques) o en un drawer (gastos, el ítem de repuestos)? «Qué falta» lo pregunta: en un drawer, lo
// que sacaría de la pantalla lleva a la página de la unidad. Lo da `DisposicionDeLaPagina`; fuera de él vale `false`.
const ContextoDeLaPagina = createContext(false)

export const ProveedorDeLaPagina = ContextoDeLaPagina.Provider

export function useEnLaPagina(): boolean {
  return use(ContextoDeLaPagina)
}
