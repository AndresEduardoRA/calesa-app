'use client'

import { diferido } from '@/shared/ui/diferido'

// La lista de comprobantes del resumen de una cotización se pide con la pestaña «Adjuntos», cuando ésta ya se eligió. Va aparte del `diferidos.tsx` de la guardada: lo que suma
// ese archivo lo paga el JS en frío de `/cotizaciones/[id]`, que está cerca de su tope.
export const ComprobantesDelResumenDiferido = diferido(
  () => import('./comprobantes-del-resumen').then((modulo) => modulo.ComprobantesDelResumen),
  { aviso: 'aqui' },
)
