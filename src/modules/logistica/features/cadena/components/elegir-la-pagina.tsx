'use client'

import { Checkbox } from '@/shared/ui/checkbox'

type Props = {
  // Los de la página ya están todos elegidos.
  completa: boolean
  alElegir: () => void
}

// La casilla de la cabecera de la tabla (y el botón de las tarjetas, con el mismo nombre): elige los vehículos de ESTA página, hasta el tope de la selección; no los de la fase entera.
export function ElegirLaPagina({ completa, alElegir }: Props) {
  return (
    <Checkbox
      data-casilla
      aria-label="Elegir los de esta página"
      checked={completa}
      onCheckedChange={alElegir}
    />
  )
}
