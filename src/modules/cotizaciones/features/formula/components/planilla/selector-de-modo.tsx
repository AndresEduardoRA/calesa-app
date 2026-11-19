'use client'

import { useId } from 'react'

type Props = {
  modos: readonly { clave: string; nombre: string }[]
  elegido: string | null
  alElegir: (clave: string) => void
}

// El modo de tipo de cambio de «Totales» y de la tarjeta en vivo (sólo con dos o más modos en el diseño): radios nativos como chips, las flechas eligen.
export function SelectorDeModo({ modos, elegido, alElegir }: Props) {
  const nombre = useId()
  if (modos.length < 2) return null
  return (
    <fieldset className="flex flex-wrap gap-1.5">
      <legend className="mb-1 text-(length:--text-sm) text-(--color-ink-soft)">
        Tipo de cambio
      </legend>
      {modos.map((m) => (
        <label
          key={m.clave}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-(--color-line-strong) px-3 text-(length:--text-sm) has-[:checked]:border-(--color-primario-ink) has-[:checked]:bg-(--color-primario-soft) has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-(--color-primario-ink) md:pointer-fine:min-h-8"
        >
          <input
            type="radio"
            className="sr-only"
            name={nombre}
            value={m.clave}
            checked={elegido === m.clave}
            onChange={() => {
              alElegir(m.clave)
            }}
          />
          {m.nombre}
        </label>
      ))}
    </fieldset>
  )
}
