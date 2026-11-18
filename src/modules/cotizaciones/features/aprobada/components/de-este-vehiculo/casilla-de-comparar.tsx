'use client'

import { Checkbox } from '@/shared/ui/checkbox'

type Props = {
  numero: number
  elegida: boolean
  // Ya hay 3 elegidas y ésta no: no entra (el aviso «Puedes comparar hasta 3.» la describe).
  apagada: boolean
  idDelAviso: string
  alAlternar: () => void
}

// La casilla de comparar de una fila de «De este vehículo»: de 44 px para el dedo, con el número para quien lee en voz alta.
export function CasillaDeComparar({ numero, elegida, apagada, idDelAviso, alAlternar }: Props) {
  return (
    <div className="flex min-h-11 min-w-11 shrink-0 items-start justify-center pt-3 md:min-h-0 md:min-w-6 md:pt-1">
      <Checkbox
        data-casilla-de-comparar=""
        aria-label={`Comparar la n.º ${String(numero)}`}
        aria-describedby={apagada ? idDelAviso : undefined}
        checked={elegida}
        disabled={apagada}
        onCheckedChange={alAlternar}
      />
    </div>
  )
}
