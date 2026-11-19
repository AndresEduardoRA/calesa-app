'use client'

import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { Formula } from '../../../entities/formula'
import { ponerEnPar } from '../../../entities/formula/en-par-del-editor'

// «Se cotiza en par» (glosario: «Variante en par»): cambia la fórmula de trabajo como un «Aplicar», sólo con nada abierto ni guardándose; el rechazo de
// `validarFormula()`, si lo hay, cae en la fila de la variante. Estable mientras `libre` no cambia (cada `FilaDelEditor` es `memo`).
export function usePonerEnPar(libre: boolean, setTrabajo: Dispatch<SetStateAction<Formula>>) {
  return useCallback(
    (nodoId: string, enPar: boolean) => {
      if (!libre) return
      setTrabajo((actual) => ponerEnPar(actual, nodoId, enPar))
    },
    [libre, setTrabajo],
  )
}
