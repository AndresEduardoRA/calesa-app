'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'

type Props = {
  // Cada uno, sólo si se ofrece: «Publicar…» (al día, 4.20-2b) y «Descartar…» (4.20-2c).
  alPublicar?: () => void
  alDescartar?: () => void
  // Hay cambios aplicados sin guardar: «Publicar…» espera, con su motivo a la vista.
  publicarEspera?: boolean
}

export const MOTIVO_DE_PUBLICAR = 'Guarda el borrador antes de publicar: se publica lo guardado.'

// Los botones de la tarjeta del borrador, en su orden; sin ninguno, nada. «Publicar…» apagado lleva su motivo en texto (`aria-describedby`).
export function BotonesDelBorrador({ alPublicar, alDescartar, publicarEspera = false }: Props) {
  const idDelMotivo = useId()
  if (!alPublicar && !alDescartar) {
    return null
  }
  const espera = alPublicar !== undefined && publicarEspera
  return (
    <div className="mt-1 grid gap-1">
      <div className="flex flex-wrap gap-2">
        {alPublicar ? (
          <Button
            type="button"
            className="min-h-11 md:min-h-9"
            disabled={espera}
            aria-describedby={espera ? idDelMotivo : undefined}
            onClick={alPublicar}
          >
            Publicar…
          </Button>
        ) : null}
        {alDescartar ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={alDescartar}
          >
            Descartar…
          </Button>
        ) : null}
      </div>
      {espera ? (
        <p id={idDelMotivo} className="text-(--color-ink-soft)">
          {MOTIVO_DE_PUBLICAR}
        </p>
      ) : null}
    </div>
  )
}
