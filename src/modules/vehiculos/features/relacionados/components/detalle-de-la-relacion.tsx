'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import type { DetalleDeRelacion } from '../../../entities/relacionados'

const DETALLE = 'text-(length:--text-xs) text-(--color-ink-soft)'

// Lo propio de cada tipo de relación, en una línea o dos: desde cuándo es el vínculo, la nota del interés y quién lo marcó, o la cotización activa.
export function DetalleDeLaRelacion({ detalle }: { detalle: DetalleDeRelacion }) {
  const { zonaHoraria: zona } = useRegional()
  if (detalle.tipo === 'vinculado') {
    return detalle.desde ? (
      <span className={DETALLE}>Desde el {formatearFecha(detalle.desde, { zona })}</span>
    ) : null
  }
  if (detalle.tipo === 'interesado') {
    return (
      <>
        {detalle.nota ? (
          <span className="min-w-0 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink)">
            {detalle.nota}
          </span>
        ) : null}
        <span className={DETALLE}>
          {formatearFecha(detalle.creadoEn, { zona })}
          {detalle.porNombre ? ` · lo marcó ${detalle.porNombre}` : null}
        </span>
      </>
    )
  }
  return (
    <span className={DETALLE}>
      Cotización N.º {detalle.cotizacion.numero} ·{' '}
      {formatearFecha(detalle.cotizacion.creadoEn, { zona })}
    </span>
  )
}
