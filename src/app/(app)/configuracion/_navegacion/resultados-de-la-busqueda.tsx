'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { KeyboardEvent } from 'react'
import { Button } from '@/shared/ui/button'
import type { ResultadoDeBusqueda } from './buscar'

// Lo que el buscador de Configuración responde: la lista de resultados, cada uno con su camino (lo último en negrita), o «Nada coincide con
// «x».» con «Limpiar». Las flechas se mueven entre resultados (`alMoverse`) y suben al campo desde el primero.
export function ResultadosDeLaBusqueda({
  resultados,
  texto,
  idDeLaLista,
  alMoverse,
  alLimpiar,
}: {
  resultados: readonly ResultadoDeBusqueda[]
  texto: string
  idDeLaLista: string
  alMoverse: (evento: KeyboardEvent<HTMLUListElement>) => void
  alLimpiar: () => void
}) {
  if (resultados.length === 0) {
    return (
      <div className="grid justify-items-start gap-2 p-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Nada coincide con «{texto.trim()}».
        </p>
        <Button variant="outline" className="min-h-11 md:min-h-8" onClick={alLimpiar}>
          Limpiar
        </Button>
      </div>
    )
  }
  return (
    <ul
      id={idDeLaLista}
      aria-label="Resultados de la búsqueda"
      onKeyDown={alMoverse}
      className="grid gap-0.5"
    >
      {resultados.map((resultado) => {
        const partes = resultado.camino.split(' › ')
        const ultima = partes.pop()
        return (
          <li key={resultado.clave}>
            <Link
              // Las rutas del registro existen: lo garantiza secciones.test.ts contra el disco.
              href={resultado.ruta as Route}
              className="flex min-h-[44px] items-center rounded-(--radius-md) px-2.5 py-1.5 text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:min-h-9"
            >
              <span>
                {partes.length > 0 ? (
                  <span className="text-(--color-ink-soft)">{`${partes.join(' › ')} › `}</span>
                ) : null}
                <span className="font-medium">{ultima}</span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
