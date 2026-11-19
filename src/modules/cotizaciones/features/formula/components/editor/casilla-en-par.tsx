'use client'

import { useId } from 'react'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  admiteEnPar,
  estaEnPar,
  MOTIVO_SIN_DOS_OPCIONES,
} from '../../../../entities/formula/en-par-del-editor'
import type { NodoOpcion } from '../../../../entities/nodos'

type Props = {
  nodo: NodoOpcion
  // Otra cosa abierta o un guardado en curso: la casilla espera, como «Editar».
  bloqueada: boolean
  alCambiar: (nodoId: string, enPar: boolean) => void
}

// «Se cotiza en par» en la fila de la variante (glosario: «Variante en par»): cambia la fórmula de trabajo, que se guarda en el borrador y se publica como siempre.
// Con tres o más opciones va apagada y dice por qué; una que vino marcada con tres se puede desmarcar. 44 px de alto en el celular.
export function CasillaEnPar({ nodo, bloqueada, alCambiar }: Props) {
  const id = useId()
  const marcada = estaEnPar(nodo)
  const admite = admiteEnPar(nodo)
  const motivo = admite ? null : MOTIVO_SIN_DOS_OPCIONES
  return (
    <div className="grid gap-1">
      <label
        htmlFor={id}
        className="flex min-h-11 items-center gap-2 text-(--color-ink) md:min-h-0"
      >
        <Checkbox
          id={id}
          checked={marcada}
          disabled={bloqueada || (!admite && !marcada)}
          aria-describedby={motivo === null ? undefined : `${id}-motivo`}
          onCheckedChange={(valor) => {
            alCambiar(nodo.id, valor === true)
          }}
        />
        Se cotiza en par
      </label>
      {motivo === null ? null : (
        <p id={`${id}-motivo`} className="text-(--color-ink-soft)">
          {motivo}
        </p>
      )}
    </div>
  )
}
