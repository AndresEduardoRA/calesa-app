'use client'

import { cn } from 'cn'
import { Button } from '@/shared/ui/button'

type Props<T extends string> = {
  etiqueta: string
  opciones: readonly { clave: T; etiqueta: string }[]
  elegida: T
  alElegir: (clave: T) => void
}

// Una elección de una entre pocas, como botones juntos (`aria-pressed`): la imagen («Cotización | Fotos»), el formato y la zona del texto. Se parte en renglones si
// no cabe (el texto al 200 %).
export function GrupoDeOpciones<T extends string>({
  etiqueta,
  opciones,
  elegida,
  alElegir,
}: Props<T>) {
  return (
    <div role="group" aria-label={etiqueta} className="flex min-w-0 flex-wrap gap-1">
      {opciones.map((opcion) => {
        const activa = opcion.clave === elegida
        return (
          <Button
            key={opcion.clave}
            type="button"
            variant={activa ? 'secondary' : 'ghost'}
            aria-pressed={activa}
            className={cn('min-h-11 md:min-h-8', activa && 'font-medium')}
            onClick={() => {
              alElegir(opcion.clave)
            }}
          >
            {opcion.etiqueta}
          </Button>
        )
      })}
    </div>
  )
}
