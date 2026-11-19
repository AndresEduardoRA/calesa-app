'use client'

import { useId } from 'react'
import { Label } from '@/shared/ui/label'

export const CLASE_DE_LA_ELECCION =
  'h-11 min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-base) text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) disabled:opacity-50 md:h-9 md:text-(length:--text-sm)'

type Props<V extends string> = {
  etiqueta: string
  valor: V | ''
  opciones: readonly { valor: V; texto: string; apagada?: boolean }[]
  alCambiar: (valor: V) => void
  // Sin valor común (un rango con valores distintos): una opción vacía con este texto.
  vacia?: string
  deshabilitada?: boolean
  // Lo que se dice debajo (el motivo de lo apagado).
  nota?: string | null
}

// Un `<select>` nativo con su etiqueta: lo más simple y accesible para elegir de una lista corta del panel del editor.
export function Eleccion<V extends string>({
  etiqueta,
  valor,
  opciones,
  alCambiar,
  vacia,
  deshabilitada = false,
  nota = null,
}: Props<V>) {
  const id = useId()
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id}>{etiqueta}</Label>
      <select
        id={id}
        className={`${CLASE_DE_LA_ELECCION} w-full`}
        value={valor}
        disabled={deshabilitada}
        aria-describedby={nota === null ? undefined : `${id}-nota`}
        onChange={(e) => {
          const elegida = opciones.find((o) => o.valor === e.target.value)
          if (elegida !== undefined) alCambiar(elegida.valor)
        }}
      >
        {valor === '' ? <option value="">{vacia ?? 'Elige'}</option> : null}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor} disabled={o.apagada}>
            {o.texto}
          </option>
        ))}
      </select>
      {nota === null ? null : (
        <p id={`${id}-nota`} className="text-(length:--text-xs) text-(--color-ink-soft)">
          {nota}
        </p>
      )}
    </div>
  )
}
