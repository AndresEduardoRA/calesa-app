'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { ItemDeOperacion } from '../item-de-operacion'

export type OperacionDelBloque = {
  readonly texto: string
  // Por qué no se puede, o nulo.
  readonly motivo: string | null
  readonly alHacer: () => void
}

// El «⋯» de un bloque del panel (una rama, un dato de la lista, las condiciones de una fila): lo que no es la acción principal, arriba a la derecha.
export function MenuDelBloque({
  etiqueta,
  operaciones,
}: {
  etiqueta: string
  operaciones: readonly OperacionDelBloque[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={etiqueta}
        className="flex size-[44px] shrink-0 items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-8"
      >
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-(--available-width)">
        {operaciones.map((o) => (
          <ItemDeOperacion key={o.texto} texto={o.texto} motivo={o.motivo} alHacer={o.alHacer} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
