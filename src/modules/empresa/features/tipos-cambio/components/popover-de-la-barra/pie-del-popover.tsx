'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'

type Props = {
  puedeGestionar: boolean
  alCerrar: () => void
}

// El pie del popover de tipos de cambio: las acciones sobre todos, a lo ancho y separadas de la lista. Hoy, para quien los gestiona, ir
// a configurarlos; acá van también las que se sumen (compartir).
export function PieDelPopover({ puedeGestionar, alCerrar }: Props) {
  if (!puedeGestionar) {
    return null
  }
  return (
    <div
      data-pie-del-popover=""
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-(--color-line) pt-2"
    >
      <Link
        href={`${RUTAS.empresa}?seccion=monedas` as Route}
        onClick={alCerrar}
        className="inline-flex min-h-11 items-center text-(length:--text-sm) font-medium text-(--color-primario-ink) underline-offset-4 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-0"
      >
        Configurar los tipos de cambio
      </Link>
    </div>
  )
}
