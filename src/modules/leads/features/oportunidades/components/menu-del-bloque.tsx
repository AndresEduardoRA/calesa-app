'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

type Props = {
  // «Ver en el embudo»: el embudo elegido filtrado por este lead (todas sus oportunidades, también las que no entran aquí).
  verEnElEmbudo: string
}

// El «⋯» del bloque «Oportunidades», arriba a la derecha junto a «Nueva»: lo que no es la acción principal del bloque.
export function MenuDelBloque({ verEnElEmbudo }: Props) {
  const router = useRouter()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Más acciones de «Oportunidades»"
        className="flex size-[44px] shrink-0 items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-8"
      >
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 max-w-(--available-width)">
        <DropdownMenuItem
          className="min-h-11 md:min-h-8"
          onClick={() => {
            router.push(verEnElEmbudo as Route)
          }}
        >
          Ver en el embudo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
