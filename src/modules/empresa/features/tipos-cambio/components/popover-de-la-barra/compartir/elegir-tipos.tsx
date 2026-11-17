'use client'

import { useId } from 'react'
import { Checkbox } from '@/shared/ui/checkbox'
import type { TipoCambioVigente } from '../../../../../entities/tipos-cambio-vigentes'
import { ValorDeCambio } from '../../valor-de-cambio'

type Props = {
  filas: readonly TipoCambioVigente[]
  elegidos: ReadonlySet<string>
  alMarcar: (id: string, marcado: boolean) => void
}

// Las casillas de qué tipos de cambio van en lo que se comparte: sólo para este envío (no cambian lo que la empresa puso en la barra).
export function ElegirTipos({ filas, elegidos, alMarcar }: Props) {
  const id = useId()
  return (
    <fieldset className="grid min-w-0 gap-1">
      <legend className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Qué tipos de cambio van
      </legend>
      <ul className="grid max-h-40 min-w-0 grid-cols-[minmax(0,1fr)] overflow-y-auto">
        {filas.map((tipo) => (
          <li key={tipo.id}>
            <label
              htmlFor={`${id}-${tipo.id}`}
              className="flex min-h-11 min-w-0 items-center gap-2 text-(length:--text-sm) md:min-h-8"
            >
              <Checkbox
                id={`${id}-${tipo.id}`}
                checked={elegidos.has(tipo.id)}
                onCheckedChange={(marcado) => {
                  alMarcar(tipo.id, marcado)
                }}
              />
              <span className="min-w-0 flex-1 break-words text-(--color-ink)">{tipo.nombre}</span>
              <ValorDeCambio tipo={tipo} className="shrink-0 text-(--color-ink-soft)" />
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
