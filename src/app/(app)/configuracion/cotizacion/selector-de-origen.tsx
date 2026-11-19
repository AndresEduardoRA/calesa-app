'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useRef } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'

export type OrigenDelSelector = {
  id: string
  nombre: string
  color: string
  activo: boolean
  // La misma pestaña en este origen (la resuelve la página).
  href: string
}

// El selector de origen de una página por origen de Configuración › Cotización: una fila de chips con el punto del color de cada origen, como
// las pestañas de origen de la versión 1. Todos a la vista (también con uno solo: dice dónde estás); cada uno es un enlace a la misma pestaña
// en ese origen, sin los parámetros del de ahora. Como son enlaces, el freno de salida pregunta si hay cambios sin guardar anotados. Si no
// entran (celular, texto al 200 %), la fila se desplaza de costado y la pista dice por dónde sigue.
export function SelectorDeOrigen({
  origenes,
  abierto,
}: {
  origenes: readonly OrigenDelSelector[]
  abierto: string
}) {
  const fila = useRef<HTMLUListElement>(null)
  const desborde = useDesborde(fila)
  return (
    <nav aria-label="Origen" className="flex min-w-0 items-center gap-2">
      <span aria-hidden className="shrink-0 text-(length:--text-sm) text-(--color-ink-soft)">
        Origen
      </span>
      <div className="relative min-w-0">
        <ul ref={fila} className="flex min-w-0 gap-1.5 overflow-x-auto py-0.5">
          {origenes.map((origen) => (
            <li key={origen.id} className="shrink-0">
              <Link
                href={origen.href as Route}
                aria-current={origen.id === abierto ? 'page' : undefined}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-(--color-line) bg-(--color-surface) px-3 text-(length:--text-sm) whitespace-nowrap text-(--color-ink-soft) outline-none hover:bg-(--color-surface-3) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-[current=page]:border-(--color-primario) aria-[current=page]:bg-(--color-primario-soft) aria-[current=page]:font-medium aria-[current=page]:text-(--color-primario-ink) md:min-h-8"
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: origen.color }}
                />
                {origen.nombre}
                {origen.activo ? null : (
                  <span className="text-(--color-ink-faint)">(inactivo)</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <PistaDeDesborde {...desborde} />
      </div>
    </nav>
  )
}
