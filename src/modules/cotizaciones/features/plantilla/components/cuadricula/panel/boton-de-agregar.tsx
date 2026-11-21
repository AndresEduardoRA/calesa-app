'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'

// «Agregar un dato», «Y además…», «Agregar «si no, si…»»: a todo el ancho; en el tope, apagado con su motivo al lado.
export function BotonDeAgregar({
  texto,
  motivo,
  alAgregar,
}: {
  texto: string
  motivo: string | null
  alAgregar: () => void
}) {
  const id = useId()
  return (
    <div className="grid min-w-0 gap-1">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full md:min-h-9"
        disabled={motivo !== null}
        aria-describedby={motivo === null ? undefined : id}
        onClick={alAgregar}
      >
        {texto}
      </Button>
      {motivo === null ? null : (
        <p id={id} className="text-(length:--text-xs) text-(--color-ink-soft)">
          {motivo}
        </p>
      )}
    </div>
  )
}
