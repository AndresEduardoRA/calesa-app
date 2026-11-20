'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { marcaDelEnlace } from './marca'

// Un renglón del menú de Configuración. Corre en el navegador sólo para marcarse con la ruta actual: `page` es la página que se ve; `true`,
// la sección de la sub-sección que se ve. Dos niveles que se distinguen de un vistazo: la sección (con su ícono, algo más grande) y la
// sub-sección (sin ícono, sangrada y con su línea guía, que la actual pinta con el acento).
const BASE =
  'flex items-center rounded-(--radius-md) text-(--color-ink-soft) outline-none hover:bg-(--color-surface-3) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus)'

const CLASE = {
  seccion: `${BASE} min-h-9 gap-2 px-2.5 py-1.5 text-(length:--text-sm) font-medium text-(--color-ink) aria-[current=page]:bg-(--color-primario-soft) aria-[current=page]:text-(--color-primario-ink) aria-[current=true]:font-semibold`,
  // `-ml-px` y el borde izquierdo de 2 px tapan la línea guía de la lista donde la sub-sección es la actual.
  sub: `${BASE} -ml-px min-h-8 rounded-l-none border-l-2 border-transparent py-1 pr-2 pl-3 text-(length:--text-sm) aria-[current=page]:border-(--color-primario) aria-[current=page]:bg-(--color-primario-soft) aria-[current=page]:font-medium aria-[current=page]:text-(--color-primario-ink)`,
} as const

export function EnlaceDelMenu({
  ruta,
  marca,
  subrutas,
  exacta,
  titulo,
  nivel,
  icono,
}: {
  ruta: string
  // El prefijo con que se marca, si no es su ruta (un origen, en todas sus pestañas).
  marca?: string | undefined
  subrutas?: readonly string[]
  // La sub-sección índice: se marca sólo en su ruta exacta (`marcaDelEnlace`).
  exacta?: boolean
  titulo: string
  nivel: 'seccion' | 'sub'
  // El ícono de la sección, dibujado en el servidor.
  icono?: ReactNode
}) {
  return (
    <Link
      // Las rutas del menú existen: lo garantiza secciones.test.ts contra el disco.
      href={ruta as Route}
      aria-current={marcaDelEnlace(usePathname(), marca ?? ruta, subrutas, exacta)}
      className={CLASE[nivel]}
    >
      {icono}
      {titulo}
    </Link>
  )
}
