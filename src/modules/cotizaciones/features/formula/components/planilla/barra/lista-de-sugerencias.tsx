'use client'

import { cn } from '@/shared/lib/utils'
import type { SugerenciasDeLaCelda } from '../../../hooks/use-sugerencias'

type Props = {
  sugerencias: SugerenciasDeLaCelda
  ids: { lista: string; opcion: (indice: number) => string }
}

// El autocompletar de lo que se escribe (D17): funciones, filas, tablas y columnas para lo que va en el cursor. `role="listbox"` con un id por opción (la entrada lo
// nombra en `aria-activedescendant`); ↑/↓ eligen, Enter o Tab aceptan y Esc cierra (en la entrada). Tocar una la acepta sin sacar el foco de la entrada.
export function ListaDeSugerencias({ sugerencias, ids }: Props) {
  if (sugerencias.lista.length === 0) return null
  return (
    <ul
      id={ids.lista}
      role="listbox"
      aria-label="Sugerencias"
      className="grid max-h-72 min-w-0 overflow-y-auto rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) py-1 shadow-(--shadow-md)"
    >
      {sugerencias.lista.map((s, i) => (
        <li
          key={`${s.clase}:${s.texto}`}
          id={ids.opcion(i)}
          role="option"
          aria-selected={i === sugerencias.indice}
          className={cn(
            'grid min-h-[44px] cursor-pointer content-center gap-0.5 px-3 py-1 md:pointer-fine:min-h-8',
            i === sugerencias.indice && 'bg-(--color-surface-3)',
          )}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
          onClick={() => {
            sugerencias.aceptar(s)
          }}
        >
          <span className="font-mono text-(length:--text-sm) break-words">{s.texto}</span>
          <span className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
            {s.detalle}
            {s.ejemplo === undefined ? null : <code className="ml-2">{s.ejemplo}</code>}
          </span>
        </li>
      ))}
    </ul>
  )
}
