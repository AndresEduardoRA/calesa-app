'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/shared/ui/button'
import { CLASES_DE_VISTO, useVistoDeLista } from '@/shared/ui/lista'
import type { AccionDeLaFila } from '../accion-de-la-fila'
import type { FilaDeLaBandeja } from '../../../entities/alertas/grupo-leido'
import { EnlaceALaUnidad } from '../../nucleo/components/enlace-a-la-unidad'
import { ResolverLaSubasta } from './resolver-la-subasta'

type Props = {
  fila: FilaDeLaBandeja
  // «“Tránsito” · Desde hace 9 días en esta fase», ya armado en el servidor con la zona de la empresa.
  detalle: string
  // La acción principal, si quien mira la puede hacer; sin ella queda el nombre, que lleva al detalle.
  accion: AccionDeLaFila | null
  // El nombre del origen, sólo si la persona tiene más de uno (para saber de cuál es la fila).
  origen: string | null
}

// Una fila de la bandeja del día: el nombre del vehículo (enlace a su página, con el «visto» enchufado en `EnlaceALaUnidad`), su origen si hay varios, el detalle y a la derecha la acción a un
// toque. Una fila de lista densa: no hay drawer ni resumen, el nombre es el camino al detalle.
export function FilaDeLaBandeja({ fila, detalle, accion, origen }: Props) {
  const visto = useVistoDeLista(fila.vehiculoId)
  return (
    <li
      data-visto={visto ?? undefined}
      className={`flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-(--color-line) py-2 last:border-b-0 ${CLASES_DE_VISTO}`}
    >
      <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <EnlaceALaUnidad id={fila.vehiculoId} nombre={fila.nombre} />
          {origen ? (
            <span className="text-(length:--text-xs) text-(--color-ink-soft)">{origen}</span>
          ) : null}
        </span>
        <span className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
          {detalle}
        </span>
      </div>
      {accion?.tipo === 'enlace' ? (
        <Link
          href={accion.href as Route}
          prefetch={false}
          aria-label={`${accion.texto}: ${fila.nombre}`}
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'h-11 md:h-8' })}
        >
          {accion.texto}
        </Link>
      ) : null}
      {accion?.tipo === 'resolver' ? (
        <ResolverLaSubasta
          vehiculoId={accion.vehiculoId}
          origenId={accion.origenId}
          nombre={fila.nombre}
          hrefDeLaGanamos={accion.hrefDeLaGanamos}
        />
      ) : null}
    </li>
  )
}
