'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/shared/ui/button'
import {
  ayudaDeComparar,
  puedeComparar,
} from '../../../../entities/aprobada/eleccion-para-comparar'
import { rutaDeComparar } from '../../../../entities/ruta-de-comparar'

type Props = {
  // Las elegidas en el orden de la lista: así salen las columnas.
  elegidas: readonly string[]
  // La página de donde se vino (`returnTo`).
  volverA?: string
  idDelAviso: string
}

const BOTON = 'min-h-11 md:min-h-9'

// «Comparar», la acción del título de «De este vehículo»: apagado hasta tener 2, con «Elige 2 o 3 para comparar.» a su lado; con 3, «Puedes comparar hasta 3.».
// Encendido es un enlace a «Comparar cotizaciones».
export function BotonComparar({ elegidas, volverA, idDelAviso }: Props) {
  const ayuda = ayudaDeComparar(elegidas.length)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ayuda === null ? null : (
        <p id={idDelAviso} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {ayuda}
        </p>
      )}
      {puedeComparar(elegidas.length) ? (
        <Link
          href={rutaDeComparar(elegidas, volverA) as Route}
          className={buttonVariants({ className: BOTON })}
        >
          Comparar
        </Link>
      ) : (
        <button
          type="button"
          disabled
          aria-describedby={idDelAviso}
          className={buttonVariants({ className: BOTON })}
        >
          Comparar
        </button>
      )}
    </div>
  )
}
