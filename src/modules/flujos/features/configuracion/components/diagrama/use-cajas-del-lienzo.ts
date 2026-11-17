'use client'

import { applyNodeChanges, type NodeChange } from '@xyflow/react'
import { useCallback, useState } from 'react'
import type { NodoDeFase } from './datos-del-diagrama'

// Las cajas en estado (React Flow las mueve al arrastrar), sólo de costado: la altura es la de la fila. Vuelven a la disposición cuando ésta cambia y al
// soltar (`aLaBase`).
export function useCajasDelLienzo(base: NodoDeFase[], altura: number) {
  const [nodos, setNodos] = useState(base)
  const [deLaBase, setDeLaBase] = useState(base)
  if (deLaBase !== base) {
    setDeLaBase(base)
    setNodos(base)
  }
  const alCambiar = useCallback(
    (cambios: NodeChange<NodoDeFase>[]) => {
      const deCostado = cambios.map((c) =>
        c.type === 'position' && c.position
          ? { ...c, position: { x: c.position.x, y: altura } }
          : c,
      )
      setNodos((actuales) => applyNodeChanges(deCostado, actuales))
    },
    [altura],
  )
  return {
    nodos,
    alCambiar,
    aLaBase: () => {
      setNodos(base)
    },
  }
}
