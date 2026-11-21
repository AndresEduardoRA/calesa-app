'use client'

import { createContext, use } from 'react'
import type { EstadoDeLaEdicion } from '@/shared/lib/edicion'

// Lo que un editor le cuenta a la barra de la edición: su estado, si tiene cambios sin guardar y cómo se tiran.
export type Registro = {
  estado: EstadoDeLaEdicion
  hayCambios: boolean
  alDescartar: () => void
}

export type ContextoDeLaEdicion = {
  // El lugar de la barra donde van las acciones del editor; nulo hasta que la barra se montó.
  ranura: HTMLElement | null
  registrar: (registro: Registro | null) => void
}

export const ContextoDeLaEdicion = createContext<ContextoDeLaEdicion | null>(null)

// El contexto del modo; nulo fuera de él (la puesta en marcha dibuja los mismos editores en su lugar de siempre).
export function useContextoDeLaEdicion(): ContextoDeLaEdicion | null {
  return use(ContextoDeLaEdicion)
}

// ¿Esto se dibuja dentro de la edición a pantalla completa?
export function useEnLaEdicion(): boolean {
  return use(ContextoDeLaEdicion) !== null
}
