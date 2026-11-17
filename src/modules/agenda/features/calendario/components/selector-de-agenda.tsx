'use client'

import { cn } from 'cn'
import { useParametrosDeAgenda } from '../hooks/use-parametros-de-agenda'

const OPCIONES = [
  { deTodos: false, etiqueta: 'Mi agenda' },
  { deTodos: true, etiqueta: 'De todos' },
] as const

// «Mi agenda | De todos»: sólo para quien tiene `agenda.ver_todo` (es un filtro de lectura: sin el permiso el grupo no existe). Escribe `?de=todos`.
export function SelectorDeAgenda({ deTodos }: { deTodos: boolean }) {
  const [, poner] = useParametrosDeAgenda()
  return (
    <div
      role="group"
      aria-label="Qué agenda ver"
      className="inline-flex flex-wrap rounded-(--radius-md) border border-(--color-line) p-0.5"
    >
      {OPCIONES.map((opcion) => (
        <button
          key={opcion.etiqueta}
          type="button"
          aria-pressed={deTodos === opcion.deTodos}
          className={cn(
            'min-h-10 rounded-(--radius-sm) px-3 text-(length:--text-sm) font-medium outline-none focus-visible:shadow-(--shadow-focus) md:min-h-8',
            deTodos === opcion.deTodos
              ? 'bg-primary text-primary-foreground'
              : 'text-(--color-ink-soft) hover:text-(--color-ink)',
          )}
          onClick={() => {
            void poner({ de: opcion.deTodos ? 'todos' : null })
          }}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )
}
