'use client'

import { Button } from '@/shared/ui/button'

// Lo que se dice en el lugar de una parte que no llegó (el texto, las fotos), con «Reintentar»: lo demás del panel sigue.
export function ErrorConReintentar({
  titulo,
  mensaje,
  alReintentar,
}: {
  titulo: string
  mensaje: string
  alReintentar: () => void
}) {
  return (
    <div
      role="alert"
      className="grid justify-items-start gap-2 rounded-(--radius-md) border border-(--color-line) p-3 text-(length:--text-sm)"
    >
      <p className="font-medium text-(--color-ink)">{titulo}</p>
      {mensaje === titulo ? null : <p className="text-(--color-ink-soft)">{mensaje}</p>}
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-8"
        onClick={alReintentar}
      >
        Reintentar
      </Button>
    </div>
  )
}
