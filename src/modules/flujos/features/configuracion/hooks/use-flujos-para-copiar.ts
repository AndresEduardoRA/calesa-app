'use client'

import { createContext, use } from 'react'
import type { FlujoParaCopiar } from '../../../entities/selector-de-flujos'

// De dónde puede copiar las fases el flujo abierto («Empezar con las fases de…»). Lo calcula el servidor sólo para el flujo vacío de un origen; en los
// demás, vacío. Lo leen el vacío del flujo y la barra (que monta el modal de la copia), ambos del área `fases`.
export const ContextoDeFlujosParaCopiar = createContext<readonly FlujoParaCopiar[]>([])

export function useFlujosParaCopiar(): readonly FlujoParaCopiar[] {
  return use(ContextoDeFlujosParaCopiar)
}
