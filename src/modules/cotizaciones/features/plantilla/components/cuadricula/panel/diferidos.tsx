'use client'

import { diferido } from '@/shared/ui/diferido'

// Lo que arma las reglas de una celda o de una fila (la lista de respaldo, las condiciones): el panel no carga su código hasta elegir «El primero con valor», «Según
// condiciones» o «Ocultar la fila: según condiciones». Si no llega, el aviso va en su lugar.
export const ListaDeRespaldoDiferida = diferido(
  () => import('./lista-de-respaldo').then((m) => m.ListaDeRespaldo),
  { aviso: 'aqui' },
)

export const ArmadorDeCondicionesDiferido = diferido(
  () => import('./armador-de-condiciones').then((m) => m.ArmadorDeCondiciones),
  { aviso: 'aqui' },
)

export const CondicionesDeLaFilaDiferidas = diferido(
  () => import('./condiciones-de-la-fila').then((m) => m.CondicionesDeLaFila),
  { aviso: 'aqui' },
)
