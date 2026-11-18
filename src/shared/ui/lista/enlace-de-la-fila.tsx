'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from 'cn'

type Props = {
  // La ficha del registro (`/vehiculos/<id>`).
  href: string
  // El nombre del registro («Kia Seltos 2022»): el lector anuncia el enlace con él, y el `title` lo muestra entero si se trunca.
  nombre: string
  className?: string
  children: ReactNode
}

// El nombre de una fila o una tarjeta de una lista sin resumen, como enlace a su ficha: la parada de Tab del ítem (una por ítem), y un enlace de
// verdad (Ctrl o Cmd + clic y el botón del medio abren otra pestaña, «Copiar enlace» funciona). El resto de la fila navega con `href` en
// `<FilaDeLista>` o `<TarjetaDeLista>` (`ir-desde-la-fila.ts`); un clic en el enlace navega sólo él (`data-enlace-de-la-fila`). Lleva
// `data-abre-resumen` como el botón del nombre: de ahí salen el peso de «visto» y el color de la fila con el foco. Sin prefetch: cien filas en
// pantalla serían cien pedidos de una ruta dinámica, y la ficha tiene su `loading.tsx`.
export function EnlaceDeLaFila({ href, nombre, className, children }: Props) {
  return (
    <Link
      href={href as Route}
      prefetch={false}
      data-abre-resumen=""
      data-enlace-de-la-fila=""
      title={nombre}
      className={cn(
        'text-left underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus)',
        className,
      )}
    >
      {children}
    </Link>
  )
}
