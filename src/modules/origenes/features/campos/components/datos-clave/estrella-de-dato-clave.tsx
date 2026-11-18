'use client'

import { StarIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type Props = {
  etiqueta: string
  marcado: boolean
  // Apagada: no hace nada y el lector oye el motivo visible del bloque (`idDelMotivo`).
  apagada: boolean
  idDelMotivo?: string | undefined
  alAlternar: () => void
}

// La estrella que marca o desmarca un dato como dato clave. Apagada sigue enfocable (`aria-disabled`, no `disabled`) para que el motivo
// se pueda leer; el clic sale temprano.
export function EstrellaDeDatoClave({
  etiqueta,
  marcado,
  apagada,
  idDelMotivo,
  alAlternar,
}: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 md:size-8"
      aria-label={
        marcado ? `Quitar «${etiqueta}» de los datos clave` : `Marcar «${etiqueta}» como dato clave`
      }
      aria-pressed={marcado}
      aria-disabled={apagada || undefined}
      aria-describedby={apagada ? idDelMotivo : undefined}
      onClick={() => {
        if (!apagada) {
          alAlternar()
        }
      }}
    >
      <StarIcon
        aria-hidden
        className={marcado ? 'fill-current text-(--color-aviso)' : 'text-(--color-ink-soft)'}
      />
    </Button>
  )
}
