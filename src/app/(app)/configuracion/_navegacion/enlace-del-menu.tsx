'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { marcaDelEnlace } from './marca'

// Un renglón del menú de Configuración, con el estilo del de la barra lateral (`EnlaceNav`). Corre en el navegador sólo para marcarse
// con la ruta actual: `page` es la página que se ve; `true`, la sección de la sub-sección que se ve.
export function EnlaceDelMenu({
  ruta,
  subrutas,
  titulo,
}: {
  ruta: string
  subrutas?: readonly string[]
  titulo: string
}) {
  return (
    <Link
      // Las rutas del menú existen: lo garantiza secciones.test.ts contra el disco.
      href={ruta as Route}
      aria-current={marcaDelEnlace(usePathname(), ruta, subrutas)}
      className="flex min-h-9 items-center rounded-(--radius-md) px-2.5 py-1.5 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:bg-(--color-surface-3) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-[current=page]:bg-(--color-primario-soft) aria-[current=page]:font-medium aria-[current=page]:text-(--color-primario-ink) aria-[current=true]:font-medium aria-[current=true]:text-(--color-ink)"
    >
      {titulo}
    </Link>
  )
}
