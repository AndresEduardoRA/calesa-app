'use client'

import { Checkbox } from '@/shared/ui/checkbox'

type Props = {
  nombre: string
  elegida: boolean
  alAlternar: () => void
}

// La casilla para mover en lote: de 44 px para el dedo, con el nombre del vehículo para quien lee con el lector de pantalla. Elegir no abre la fila ni toca la URL.
export function CasillaDeLaFila({ nombre, elegida, alAlternar }: Props) {
  return (
    <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-center md:min-h-0 md:min-w-6">
      <Checkbox
        data-casilla
        aria-label={`Elegir ${nombre}`}
        checked={elegida}
        onCheckedChange={alAlternar}
      />
    </div>
  )
}
