'use client'

import { ChevronRightIcon } from 'lucide-react'

type Props = {
  // «3 cotizaciones de este vehículo» (`textoDelConteo()`).
  texto: string
  alAbrir: () => void
}

// «N cotizaciones de este vehículo»: abre el modal con las cotizaciones del vehículo (`?panel=cotizaciones-del-vehiculo`), sin salir de la lista. Liviano: lo que abre
// llega recién al primer clic (`ModalDelGrupoDiferido`). No abre el resumen (`data-no-abre`).
export function BotonDelConteo({ texto, alAbrir }: Props) {
  return (
    <button
      type="button"
      data-no-abre=""
      data-conteo-del-grupo=""
      aria-haspopup="dialog"
      onClick={alAbrir}
      className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-(--radius-sm) text-left text-(length:--text-sm) font-medium text-(--color-ink) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-8"
    >
      <span className="truncate">{texto}</span>
      <ChevronRightIcon aria-hidden className="size-4 shrink-0" />
    </button>
  )
}
