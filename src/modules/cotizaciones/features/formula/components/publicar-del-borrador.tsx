'use client'

import { Button } from '@/shared/ui/button'
import { AccionesDeLaEdicion } from '@/shared/ui/edicion-a-pantalla-completa'
import { ID_DEL_MOTIVO_DE_PUBLICAR_LA_FORMULA } from './botones-del-borrador'

type Props = {
  alPublicar: () => void
  // Hay cambios aplicados sin guardar: «Publicar…» espera (su motivo está escrito en la tarjeta del borrador).
  espera: boolean
}

// «Publicar…» del borrador en la barra de la edición a pantalla completa (fuera de ella lo dibuja la tarjeta del borrador).
export function PublicarDelBorrador({ alPublicar, espera }: Props) {
  return (
    <AccionesDeLaEdicion orden={2}>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        disabled={espera}
        aria-describedby={espera ? ID_DEL_MOTIVO_DE_PUBLICAR_LA_FORMULA : undefined}
        onClick={alPublicar}
      >
        Publicar…
      </Button>
    </AccionesDeLaEdicion>
  )
}
