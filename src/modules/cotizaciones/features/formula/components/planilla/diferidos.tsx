'use client'

import { diferido } from '@/shared/ui/diferido'

// La planilla de la fórmula (la vista por defecto de la pestaña): su código se pide al dibujarla. La fórmula de trabajo vive en la sesión, no aquí: si el código no
// llega, el aviso va en su lugar y lo aplicado no se pierde.
export const PlanillaDiferida = diferido(
  () => import('./planilla-de-la-formula').then((modulo) => modulo.PlanillaDeLaFormula),
  { aviso: 'aqui' },
)
