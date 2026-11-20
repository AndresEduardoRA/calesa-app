'use client'

import { Button } from '../button'
import { usePanelPorUrl } from '../use-panel-por-url'

type Props = {
  // El `?panel=` del modal que abre.
  panel: string
  etiqueta: string
  deshabilitado?: boolean
}

// La acción principal de una tarjeta: abre su modal por la URL (`?panel=<tarjeta>`). 44 px en el celular; el texto parte si no cabe.
export function BotonDeLaTarjeta({ panel, etiqueta, deshabilitado = false }: Props) {
  const { abrir } = usePanelPorUrl(panel)
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto min-h-[44px] whitespace-normal md:min-h-8"
      disabled={deshabilitado}
      onClick={() => {
        abrir()
      }}
    >
      {etiqueta}
    </Button>
  )
}
