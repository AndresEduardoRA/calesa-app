'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { cn } from 'cn'
import { Monto } from '@/shared/ui/monto'
import {
  costoEstimadoDe,
  SIN_TOTAL,
  type CotizacionAprobadaDeLaFila,
} from '../../../entities/cotizacion-aprobada-de-la-fila'

const VACIO = <span className="text-(--color-ink-faint)">—</span>

// El primer resultado de la aprobada con su moneda congelada y, si lo hay, el modo de tipo de cambio («US$27.999 · Unificado»), todo dentro del enlace a la
// cotización (`data-no-abre`: el clic no abre la ficha del vehículo). Sin total, lo dice (sin modo). El monto nunca se corta: lo que se corta con «…» es el modo.
function Enlace({
  aprobada,
  className,
}: {
  aprobada: CotizacionAprobadaDeLaFila
  className?: string
}) {
  const costo = costoEstimadoDe(aprobada)
  return (
    <Link
      href={costo.ruta as Route}
      data-no-abre=""
      className={cn(
        'inline-flex max-w-full min-w-0 items-baseline rounded-(--radius-sm) text-(--color-ink) underline-offset-2 hover:underline',
        className,
      )}
    >
      {costo.tipo === 'sin_total' ? (
        SIN_TOTAL
      ) : (
        <>
          <Monto valor={costo.valor} moneda={costo.moneda} className="shrink-0" />
          {costo.modo === null ? null : (
            <span className="min-w-0 truncate text-(--color-ink-soft)">{` · ${costo.modo}`}</span>
          )}
        </>
      )}
    </Link>
  )
}

// La celda de la tabla: a la derecha, o «—» si el vehículo no tiene una aprobada que quien mira vea.
export function CeldaDeCostoEstimado({
  aprobada,
}: {
  aprobada: CotizacionAprobadaDeLaFila | null
}) {
  return aprobada === null ? VACIO : <Enlace aprobada={aprobada} className="max-w-64" />
}

// El dato de la tarjeta de la lista (su rótulo lo pone la fila): lo mismo, o «—».
export function CostoEstimado({ aprobada }: { aprobada: CotizacionAprobadaDeLaFila | null }) {
  return aprobada === null ? VACIO : <Enlace aprobada={aprobada} />
}
