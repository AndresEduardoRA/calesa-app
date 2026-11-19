'use client'

import { diferido } from '@/shared/ui/diferido'

// Las filas del Modo avanzado (el editor en texto, `?panel=editar-formula`): su código se pide al abrirlo, no con la planilla. La fórmula de trabajo sigue en la
// sesión: abrirlo y volver no la pierde.
export const ListaDeFilasDiferida = diferido(
  () => import('../editor/lista-de-filas').then((modulo) => modulo.ListaDeFilas),
  { aviso: 'aqui' },
)
