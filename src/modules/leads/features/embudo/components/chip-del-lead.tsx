'use client'

import { XIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type Props = {
  nombre: string
  // Quita el filtro: «×» y «Ver todas» hacen lo mismo.
  alQuitar: () => void
}

// El embudo filtrado por un lead (`?lead=`): el chip «De <nombre>» con su «×» y «Ver todas». Ocupa el lugar de la búsqueda. El nombre cede con
// «…» (el `title` lo trae entero) antes de empujar la página, y en el celular cada blanco mide 44 px.
export function ChipDelLead({ nombre, alQuitar }: Props) {
  return (
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-label={`Quitar el filtro de ${nombre}`}
        className="inline-flex min-h-11 max-w-full min-w-0 items-center gap-1 rounded-full border border-(--color-line-strong) bg-(--color-surface) px-3 text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus) md:min-h-7 md:px-2.5"
        onClick={alQuitar}
      >
        <span title={`De ${nombre}`} className="max-w-56 min-w-0 truncate">
          De {nombre}
        </span>
        <XIcon aria-hidden className="size-3.5 shrink-0 text-(--color-ink-faint)" />
      </button>
      <Button variant="ghost" size="sm" className="min-h-11 md:min-h-7" onClick={alQuitar}>
        Ver todas
      </Button>
    </div>
  )
}
