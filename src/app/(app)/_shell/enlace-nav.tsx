'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { estaEn } from './navegacion'
import { usePlegadoDelLateral } from './plegado-del-lateral'

// Un renglón de la barra lateral. Es lo único de la barra que corre en el navegador: necesita
// la ruta actual para marcarse. La altura sale de la densidad (`--fila`), con piso táctil. Con la barra plegada (sólo en la de escritorio) queda el
// ícono y el nombre pasa a `title` (tooltip) y queda como texto sólo para el lector: así el nombre accesible lo da el contenido y conserva el contador de Chat («Chat 1 sin leer»). Un `aria-label` en el enlace lo taparía. En el menú del celular nunca.
export function EnlaceNav({
  ruta,
  titulo,
  children,
}: {
  ruta: string
  titulo: string
  children: ReactNode
}) {
  const actual = usePathname()
  const plegado = usePlegadoDelLateral()

  return (
    <Link
      // Las rutas de la navegación existen: lo garantiza navegacion.test.ts contra el disco.
      href={ruta as Route}
      aria-current={estaEn(actual, ruta) ? 'page' : undefined}
      title={plegado ? titulo : undefined}
      className="relative flex h-(--fila) min-h-9 items-center gap-2.5 rounded-(--radius-md) px-2.5 text-(length:--text-sm) text-(--color-ink-soft) outline-none group-data-plegado/lateral:justify-center group-data-plegado/lateral:px-0 hover:bg-(--color-surface-3) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-[current=page]:bg-(--color-primario-soft) aria-[current=page]:font-medium aria-[current=page]:text-(--color-primario-ink) [&_svg]:size-4 [&_svg]:shrink-0"
    >
      {children}
    </Link>
  )
}
