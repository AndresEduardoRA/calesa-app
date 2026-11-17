'use client'

import { GripVerticalIcon } from 'lucide-react'
import type { FilaOrdenable } from '../../hooks/use-fila-ordenable'

type Props = {
  // «Mover «Precio»» o «Mover la sección «Base»».
  etiqueta: string
  asa: FilaOrdenable['asa']
}

// El asa de una fila: lo que se arrastra o se toma con el teclado (Espacio). 44 px en px; mientras el editor guarda queda `aria-disabled` (lo pone dnd-kit).
export function AsaDeOrden({ etiqueta, asa: { alMontar, atributos, oyentes } }: Props) {
  return (
    <button
      type="button"
      ref={alMontar}
      {...atributos}
      {...oyentes}
      aria-label={etiqueta}
      className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-grab touch-none items-center justify-center rounded-(--radius-md) text-(--color-ink-soft) outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) active:cursor-grabbing aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
    >
      <GripVerticalIcon aria-hidden className="size-4" />
    </button>
  )
}
