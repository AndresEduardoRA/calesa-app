import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { TituloDeBloqueConAccion } from '@/shared/ui/ficha-en-bloques/titulo-con-accion'
import { rutaDeActividadDe } from '../../../entities/filtros'

const ID_DEL_TITULO_DE_ACTIVIDAD = 'actividad-reciente'

// La región de la «Actividad reciente»: el título con «Ver toda la actividad» (al filtro del registro) y lo de abajo. Sin hooks: lo comparten la pieza del servidor y la isla que lee al acercarse.
export function MarcoDeActividadReciente({
  tabla,
  registroId,
  children,
}: {
  tabla: string
  registroId: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={ID_DEL_TITULO_DE_ACTIVIDAD} className="grid min-w-0 gap-2">
      <TituloDeBloqueConAccion
        id={ID_DEL_TITULO_DE_ACTIVIDAD}
        titulo="Actividad reciente"
        accion={
          <Link
            href={rutaDeActividadDe(tabla, registroId) as Route}
            className="min-h-11 content-center text-(length:--text-sm) text-(--color-primario-ink) underline underline-offset-2 md:min-h-0"
          >
            Ver toda la actividad
          </Link>
        }
      />
      {children}
    </section>
  )
}
