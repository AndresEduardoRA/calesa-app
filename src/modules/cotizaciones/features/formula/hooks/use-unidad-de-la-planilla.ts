'use client'

import { useMemo } from 'react'
import type { Formula, ModoDeCambio } from '../../../entities/formula'
import type { UnidadDeEjemplo } from '../../../entities/formula/unidad-de-ejemplo'
import {
  calcularLaVistaPrevia,
  cifraDeLaFila,
  type CifraDeLaFila,
  type VistaPrevia,
} from '../../../entities/formula/vista-previa'
import type { FilaParaDibujar } from './use-editor-de-la-formula.soporte'
import type { LecturaDelTerreno } from './use-terreno-de-prueba'

const SIN_CIFRA: CifraDeLaFila = { tipo: 'nada' }

type Args = {
  // La fórmula de trabajo validada (nula si no valida) y sus filas.
  validada: Formula | null
  filas: readonly FilaParaDibujar[]
  lectura: LecturaDelTerreno
  unidad: UnidadDeEjemplo
  // El modo elegido como lo recibe el motor; sin él, los `buckets` y `total_en` de la fórmula.
  modo: ModoDeCambio | undefined
}

// El cálculo de la planilla con la unidad de ejemplo y el modo elegido: `evaluar()` (lineal) y la cifra de cada fila en un `Map`, una vez por cambio de la unidad, del
// modo o de la fórmula de trabajo. Tipear en una celda no lo corre (la celda guarda lo tipeado hasta confirmarlo) y las filas (`filasParaDibujar`) no se recalculan.
export function useUnidadDeLaPlanilla({ validada, filas, lectura, unidad, modo }: Args) {
  const vista = useMemo(
    (): VistaPrevia | null =>
      lectura.tipo === 'lista'
        ? calcularLaVistaPrevia(validada, lectura.terreno, unidad, modo)
        : null,
    [validada, lectura, unidad, modo],
  )
  const cifras = useMemo(
    () =>
      new Map(filas.map((f) => [f.id, vista === null ? SIN_CIFRA : cifraDeLaFila(vista, f.nodo)])),
    [filas, vista],
  )
  return { vista, cifras }
}
