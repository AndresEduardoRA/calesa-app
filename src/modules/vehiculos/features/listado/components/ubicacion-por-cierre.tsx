'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'

// Arriba de la lista con «Cierre más próximo»: al principio lo dice; más adelante, «Volver al principio», que quita el cursor y conserva filtros, búsqueda y
// tamaño. Sin fecha (`UbicacionDeLaPagina` dice «Creados hasta…»): la página camina por tramos y la primera fila puede ordenar por su cierre o por su alta.
export function UbicacionPorCierre({ alPrincipio }: { alPrincipio: boolean }) {
  const ruta = usePathname()
  const parametros = useSearchParams()
  if (alPrincipio) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">Cierre más próximo primero</p>
    )
  }
  const sinCursor = new URLSearchParams(parametros)
  sinCursor.delete(CLAVE_DE_CURSOR)
  const texto = sinCursor.toString()
  return (
    <p className="text-(length:--text-sm) text-(--color-ink-soft)">
      <Link
        href={(texto === '' ? ruta : `${ruta}?${texto}`) as Route}
        className="inline-flex min-h-11 items-center font-medium text-(--color-primario) underline-offset-4 hover:underline md:min-h-0"
      >
        Volver al principio
      </Link>
    </p>
  )
}
