'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useEffect, useEffectEvent } from 'react'
import { Button } from '@/shared/ui/button'
import { rutaDelListado } from '../../../entities/ruta-de-la-hoja'
import { usePaginasDelHistorial } from '../hooks/use-paginas-del-historial'
import { FilaDelHistorial } from './fila-del-historial'
import { EsqueletoDeLasCotizaciones } from './lead/esqueleto-de-las-cotizaciones'

// Cuántas se ven en el bloque de la ficha del lead: lo demás, en «Ver todas» (el listado filtrado por el lead, con su cursor).
export const COTIZACIONES_RECIENTES_DEL_LEAD = 3

// El bloque «Cotizaciones» de la ficha de un lead (debajo del título, que dibuja el servidor con «Cotizar»): las 3 más recientes que quien mira ve
// (con la RLS de quien mira, desde el navegador y al montarse: nunca con la ficha) y «Ver todas» (`/cotizaciones?lead=`) si hay más, sin número.
// Quien la monta pone `key={leadId}`: pasar de un lead a otro empieza de cero.
export function CotizacionesRecientesDelLead({ leadId }: { leadId: string }) {
  const historial = usePaginasDelHistorial(
    { lead: leadId },
    { tamano: COTIZACIONES_RECIENTES_DEL_LEAD },
  )
  // Una sola guardia de descarte: el `ultimo` de las páginas (también en el doble montaje de desarrollo).
  const leerAlMontar = useEffectEvent(historial.leerLaPrimera)
  useEffect(() => {
    leerAlMontar()
  }, [])
  if (!historial.leido) {
    if (historial.error) {
      return (
        <div role="alert" className="grid gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink)">
            No pudimos cargar «Cotizaciones».
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-fit md:min-h-9"
            disabled={historial.cargando}
            onClick={historial.reintentar}
          >
            Reintentar
          </Button>
        </div>
      )
    }
    return <EsqueletoDeLasCotizaciones />
  }
  if (historial.filas.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Sin cotizaciones que puedas ver.
      </p>
    )
  }
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
      <ul
        aria-label="Cotizaciones del lead"
        className="grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line)"
      >
        {historial.filas.slice(0, COTIZACIONES_RECIENTES_DEL_LEAD).map((cotizacion) => (
          <FilaDelHistorial key={cotizacion.id} cotizacion={cotizacion} />
        ))}
      </ul>
      {historial.siguiente === null ? null : (
        <Link
          href={rutaDelListado({ lead: leadId }) as Route}
          className="inline-flex min-h-11 w-fit items-center text-(length:--text-sm) font-medium text-(--color-primario) underline-offset-2 hover:underline md:min-h-8"
        >
          Ver todas
        </Link>
      )}
    </div>
  )
}
