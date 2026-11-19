'use client'

import { ChevronDownIcon } from 'lucide-react'
import { cn } from 'cn'

type Props = {
  // «3 cotizaciones de este vehículo» (`textoDelConteo()`).
  texto: string
  abierto: boolean
  // El id de lo que despliega.
  controla: string
  alAlternar: () => void
}

// «N cotizaciones de este vehículo»: despliega las demás del grupo en el lugar, debajo de la tarjeta o de la fila, sin salir de la lista. Liviano: lo que despliega
// llega recién al primer clic (`DespliegueDelGrupoDiferido`). No abre el resumen (`data-no-abre`).
export function BotonDelConteo({ texto, abierto, controla, alAlternar }: Props) {
  return (
    <button
      type="button"
      data-no-abre=""
      data-conteo-del-grupo=""
      aria-expanded={abierto}
      aria-controls={controla}
      onClick={alAlternar}
      className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-(--radius-sm) text-left text-(length:--text-sm) font-medium text-(--color-ink) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-8"
    >
      <ChevronDownIcon aria-hidden className={cn('size-4 shrink-0', abierto && 'rotate-180')} />
      <span className="truncate">{texto}</span>
    </button>
  )
}
