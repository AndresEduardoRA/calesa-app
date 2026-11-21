'use client'

import { useId } from 'react'
import { TODOS_LOS_ORIGENES, type OrigenDeLaMatriz } from '../../../../entities/matriz'

type Props = {
  origenes: readonly OrigenDeLaMatriz[]
  // `null`: «Todos los orígenes».
  valor: string | null
  alCambiar: (origenId: string | null) => void
}

// Dónde se mira y se cambia el cuadro: «Todos los orígenes» o un origen. Un `<select>` nativo, como el «Rol a la vista» de la matriz.
export function SelectorDelLugar({ origenes, valor, alCambiar }: Props) {
  const id = useId()
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 md:max-w-80">
      <label htmlFor={id} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Origen
      </label>
      <select
        id={id}
        className="h-11 w-full min-w-0 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2.5 text-(length:--text-sm) text-(--color-ink) md:h-9"
        value={valor ?? ''}
        onChange={(evento) => {
          alCambiar(evento.target.value === '' ? null : evento.target.value)
        }}
      >
        <option value="">{TODOS_LOS_ORIGENES}</option>
        {origenes.map((origen) => (
          <option key={origen.id} value={origen.id}>
            {origen.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
