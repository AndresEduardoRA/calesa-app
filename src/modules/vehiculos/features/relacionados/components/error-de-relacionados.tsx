'use client'

import { Button } from '@/shared/ui/button'
import { TEXTO_DE_ERROR, type PresentacionDeRelacionados } from '../../../entities/relacionados'

type Props = {
  alReintentar: () => void
  // En una línea (la unidad de logística) no hay encabezado: la misma frase y su botón.
  presentacion?: 'bloque' | PresentacionDeRelacionados
}

// Un error de lectura deja el bloque en error con «Reintentar» y la pantalla sigue: es un bloque de arriba, no tumba la ficha.
export function ErrorDeRelacionados({ alReintentar, presentacion = 'bloque' }: Props) {
  return (
    <section aria-label="Relacionados" className="grid min-w-0 gap-2">
      {presentacion === 'linea' ? null : (
        <h2 className="text-(length:--text-sm) font-medium text-(--color-ink)">Relacionados</h2>
      )}
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink)">{TEXTO_DE_ERROR}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 md:min-h-8"
          onClick={alReintentar}
        >
          Reintentar
        </Button>
      </div>
    </section>
  )
}
