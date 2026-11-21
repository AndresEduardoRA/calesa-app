'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRef, type ReactNode } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'

type Props = {
  // Qué lista es, para quien la lee en voz alta («Cotizaciones del lead»).
  etiqueta: string
  // Las tarjetas (`<TarjetaEnLaLista>`, cada una su `<li>`).
  children: ReactNode
  // A dónde lleva la última tarjeta, «Ver más» (el listado filtrado); nulo si no hay más que ver.
  verMas: string | null
}

// Las flechas van a la altura de la imagen de la tarjeta (no al centro de la fila): ahí tapan sólo la imagen y no el número ni el total.
const FLECHA =
  'absolute top-19 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-(--color-line) bg-(--color-surface) text-(--color-ink) shadow-sm outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) md:flex'

// La fila de tarjetas de una ficha (`docs/GLOSARIO.md` › «Fila de tarjetas»): las cotizaciones una al lado de la otra, que se desliza de costado con el dedo o la rueda (con
// `snap`, cada tarjeta se detiene al empezar), con flechas ‹ › en escritorio y un degradado en el borde que dice que sigue (`useDesborde`). Sin barra visible que robe alto. Al
// final, la tarjeta «Ver más». Es una lista: cada tarjeta es un ítem y su botón es la parada de Tab; el foco desplaza la fila hasta la tarjeta.
export function FilaDeTarjetas({ etiqueta, children, verMas }: Props) {
  const fila = useRef<HTMLUListElement>(null)
  const desborde = useDesborde(fila)
  const mover = (sentido: -1 | 1) => {
    const el = fila.current
    if (el === null) {
      return
    }
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({
      left: sentido * el.clientWidth * 0.8,
      behavior: sinMovimiento ? 'auto' : 'smooth',
    })
  }
  return (
    <div data-fila-de-tarjetas="" className="relative min-w-0">
      <ul
        ref={fila}
        aria-label={etiqueta}
        className="flex snap-x snap-mandatory [scrollbar-width:thin] items-stretch gap-3 overflow-x-auto overscroll-x-contain pb-3 [&>li]:w-68 [&>li]:shrink-0 [&>li]:snap-start"
      >
        {children}
        {verMas === null ? null : (
          <li className="flex">
            <Link
              href={verMas as Route}
              className="flex min-h-11 w-full items-center justify-center rounded-(--radius-card) border border-dashed border-(--color-line) p-4 text-center font-medium text-(--color-primario) outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus)"
            >
              Ver más
            </Link>
          </li>
        )}
      </ul>
      <PistaDeDesborde {...desborde} />
      {desborde.izquierda ? (
        <button
          type="button"
          aria-label="Ver las cotizaciones anteriores"
          className={`${FLECHA} left-1`}
          onClick={() => {
            mover(-1)
          }}
        >
          <ChevronLeftIcon aria-hidden />
        </button>
      ) : null}
      {desborde.derecha ? (
        <button
          type="button"
          aria-label="Ver las cotizaciones siguientes"
          className={`${FLECHA} right-1`}
          onClick={() => {
            mover(1)
          }}
        >
          <ChevronRightIcon aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
