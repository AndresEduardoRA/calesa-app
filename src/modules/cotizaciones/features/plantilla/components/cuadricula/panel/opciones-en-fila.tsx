'use client'

import type { ReactNode } from 'react'

type Props<V extends string> = {
  etiqueta: string
  valor: V | null
  opciones: readonly { valor: V; texto: string; icono?: ReactNode }[]
  alElegir: (valor: V) => void
  deshabilitado?: boolean
}

// Una elección corta a la vista, como botones en fila (`radiogroup`): «Texto | Dato | Logo | Vacío», la alineación. Ocupa todo el ancho del panel, sin huecos.
export function OpcionesEnFila<V extends string>({
  etiqueta,
  valor,
  opciones,
  alElegir,
  deshabilitado = false,
}: Props<V>) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="flex min-w-0 flex-wrap rounded-(--radius-md) border border-(--color-line) p-0.5"
    >
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          aria-label={o.icono === undefined ? undefined : o.texto}
          disabled={deshabilitado}
          onClick={() => {
            alElegir(o.valor)
          }}
          className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-(--radius-sm) px-2 text-(length:--text-sm) outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) disabled:opacity-50 aria-checked:bg-(--color-primario-soft) aria-checked:font-medium md:min-h-8"
        >
          {o.icono ?? o.texto}
        </button>
      ))}
    </div>
  )
}
