'use client'

import { PhoneIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

// «Cambiar el principal» en el panel de edición: pasa al panel del cambio. Con algo escrito en el formulario se apaga y dice por qué:
// cambiar el número mueve la versión del lead y dejaría esa edición con la vieja.
export function CambiarElPrincipal({
  hayCambios,
  alCambiar,
}: {
  hayCambios: boolean
  alCambiar: () => void
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 md:min-h-7"
        disabled={hayCambios}
        aria-describedby={hayCambios ? 'cambiar-telefono-motivo' : undefined}
        onClick={alCambiar}
      >
        <PhoneIcon aria-hidden />
        Cambiar el principal
      </Button>
      {hayCambios ? (
        <span
          id="cambiar-telefono-motivo"
          className="text-(length:--text-xs) text-(--color-ink-soft)"
        >
          Guarda o descarta los cambios para cambiarlo.
        </span>
      ) : null}
    </span>
  )
}
