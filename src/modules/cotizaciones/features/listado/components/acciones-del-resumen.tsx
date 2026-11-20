'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button, buttonVariants } from '@/shared/ui/button'
import { conVuelta } from '@/shared/lib/rutas'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'

type Props = {
  cotizacionId: string
  // «Compartir cotización» (abre el panel de compartir), o nulo: sin la oferta del «⋯» o en Modo Live.
  compartir: (() => void) | null
  // El «⋯» de la fila sin «Compartir» (ya dibujado, con borde), o nulo si no hay qué ofrecer.
  menu: ReactNode
  // Desde una ficha (la del lead o la del vehículo): la página de la cotización lleva «Volver» a esa ficha. En el listado, nulo.
  volverA?: string | null
}

// Los dos botones crecen por igual desde una base en rem: al 100 % van los tres en una fila (en el celular, mitad y mitad con el «⋯» a 44 px); con el texto al
// 200 % la base se duplica y se parten en filas sin salirse. Un texto que no entra baja a dos líneas.
const BOTON =
  'h-auto min-h-11 min-w-0 flex-1 basis-[7rem] leading-tight whitespace-normal md:min-h-9'

// La barra de arriba del resumen: «Abrir cotización» (la acción principal, a su página), «Compartir cotización» y, al final, el «⋯» con el resto de la lista única.
export function AccionesDelResumen({ cotizacionId, compartir, menu, volverA = null }: Props) {
  return (
    <div data-acciones-del-resumen="" className="flex flex-wrap items-stretch gap-2">
      <Link
        href={conVuelta(rutaDeLaCotizacion(cotizacionId), volverA) as Route}
        className={buttonVariants({ className: BOTON })}
      >
        Abrir cotización
      </Link>
      {compartir === null ? null : (
        <Button type="button" variant="outline" className={BOTON} onClick={compartir}>
          Compartir cotización
        </Button>
      )}
      {menu}
    </div>
  )
}
