'use client'

import { XIcon } from 'lucide-react'

type Props = { texto: string; quitar: string; alQuitar: () => void; ocupado?: boolean }

// Un filtro que no se elige en un chip pero se ve como uno y se quita con su «×»: el registro que trae «Ver actividad» de una ficha y la fecha
// de «Ir a una fecha».
export function ChipQuitable({ texto, quitar, alQuitar, ocupado }: Props) {
  return (
    <button
      type="button"
      aria-label={quitar}
      disabled={ocupado}
      onClick={alQuitar}
      className="inline-flex min-h-11 max-w-full min-w-0 items-center gap-1 rounded-full border border-(--color-primario) bg-(--color-primario-soft) px-3 text-(length:--text-sm) text-(--color-primario-ink) outline-none hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus) disabled:opacity-60 md:min-h-9"
    >
      <span title={texto} className="max-w-64 min-w-0 truncate font-medium">
        {texto}
      </span>
      <XIcon aria-hidden className="size-3.5 shrink-0" />
    </button>
  )
}
