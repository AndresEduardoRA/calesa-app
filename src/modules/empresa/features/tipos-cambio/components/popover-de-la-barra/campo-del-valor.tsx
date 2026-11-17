'use client'

import { Input } from '@/shared/ui/input'

type Props = {
  id: string
  texto: string
  alEscribir: (texto: string) => void
  // Esc en el campo: cancela la edición y deja el popover abierto (el evento no llega al popover).
  alCancelar: () => void
  // Lo que no se lee o no se guardó, junto al campo.
  motivo: string | null
  // Guardando o esperando la red: no se edita, pero se lee.
  soloLectura: boolean
}

// El campo del valor del editor del popover: decimal, sin autocompletar, con su motivo enlazado.
export function CampoDelValor({ id, texto, alEscribir, alCancelar, motivo, soloLectura }: Props) {
  return (
    <>
      <Input
        id={id}
        name="valor"
        inputMode="decimal"
        autoComplete="off"
        autoFocus
        value={texto}
        readOnly={soloLectura}
        aria-invalid={motivo ? true : undefined}
        aria-describedby={motivo ? `${id}-motivo` : undefined}
        className="h-11 tabular-nums md:h-9"
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') {
            evento.preventDefault()
            evento.stopPropagation()
            alCancelar()
          }
        }}
      />
      {motivo ? (
        <p id={`${id}-motivo`} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {motivo}
        </p>
      ) : null}
    </>
  )
}
