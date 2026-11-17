'use client'

import { useId } from 'react'
import { cn } from 'cn'
import type { GrupoDeVistaYOpciones } from './tipos'

// Los grupos del panel: cada uno una sección con su título. Sin red, los que navegarían a medias quedan `inert` (también sus enlaces) y
// atenuados.
export function SeccionesDeVistaYOpciones(props: {
  grupos: readonly GrupoDeVistaYOpciones[]
  enLinea: boolean
}) {
  const id = useId()
  return (
    <div className="divide-y divide-(--color-line)">
      {props.grupos.map((grupo) => {
        const apagado = !props.enLinea && (grupo.sinRed ?? 'apagar') === 'apagar'
        const titulo = `${id}-${grupo.clave}`
        return (
          <section
            key={grupo.clave}
            aria-labelledby={titulo}
            data-grupo={grupo.clave}
            className="grid gap-2 p-3"
          >
            <h3 id={titulo} className="text-(length:--text-sm) font-medium text-(--color-ink-soft)">
              {grupo.titulo}
            </h3>
            <div
              inert={apagado}
              className={cn('grid min-w-0 justify-items-start gap-1', apagado && 'opacity-60')}
            >
              {grupo.contenido}
            </div>
          </section>
        )
      })}
    </div>
  )
}
