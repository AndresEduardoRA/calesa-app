'use client'

import { useMemo } from 'react'
import { indexarFlujo, type IndiceDelFlujo } from '../../../entities/flujo/pasos'
import type { LecturaDeLosPasos } from '../../../entities/flujo/pasos-del-flujo'

/** El flujo de los pasos listo para preguntarle (una vez por lectura); nulo si no se pudo leer, no tiene fases o pasa un tope. */
export function useIndiceDelFlujo(lectura: LecturaDeLosPasos): IndiceDelFlujo | null {
  return useMemo(() => (lectura.estado === 'listo' ? indexarFlujo(lectura.flujo) : null), [lectura])
}
