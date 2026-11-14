import { ChevronLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'

type Props = {
  nombre: string
  jubilada: boolean
  // A dónde lleva «La cadena»: `/logistica?origen=<id>`.
  hrefDeLaCadena: string
  // El nombre del origen, si hay más de uno (para saber de cuál es la lista).
  origen: string | null
}

// El encabezado de la lista de una fase: el camino de vuelta a la cadena, el nombre de la fase (el `h1` de la página) y, si ya no es destino, «Jubilada» en texto.
export function EncabezadoDeLaFase({ nombre, jubilada, hrefDeLaCadena, origen }: Props) {
  return (
    <header className="grid gap-1">
      <Link
        href={hrefDeLaCadena as Route}
        className="inline-flex min-h-11 w-fit items-center gap-1 rounded-(--radius-input) text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) md:min-h-0"
      >
        <ChevronLeftIcon aria-hidden className="size-4" />
        La cadena
      </Link>
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
        {nombre}
        {jubilada ? (
          <span className="ml-2 text-(length:--text-sm) font-normal text-(--color-ink-soft)">
            Jubilada
          </span>
        ) : null}
      </h1>
      {origen ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{origen}</p> : null}
    </header>
  )
}
