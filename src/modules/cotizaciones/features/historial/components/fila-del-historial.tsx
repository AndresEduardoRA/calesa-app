'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import {
  ETIQUETA_DE_APROBADA,
  ETIQUETA_DE_CLASE,
  type CotizacionDelHistorial,
} from '../../../entities/historial-del-vehiculo'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'

// Una cotización del historial en una línea: el enlace (N.º · cuándo · quién) y, fuera de él, la clase y «Aprobada». La dibuja la lista larga
// (`ListaDelHistorial`).
export function FilaDelHistorial({ cotizacion }: { cotizacion: CotizacionDelHistorial }) {
  const { zonaHoraria } = useRegional()
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-(--radius-md) p-2 text-(length:--text-sm) text-(--color-ink)">
      <Link
        href={rutaDeLaCotizacion(cotizacion.id) as Route}
        className="min-w-0 flex-1 truncate hover:underline"
      >
        N.º {cotizacion.numero} · {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })} ·{' '}
        {cotizacion.autor}
      </Link>
      <Badge className="shrink-0">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
      {cotizacion.aprobada ? (
        <Badge variant="secondary" className="shrink-0">
          {ETIQUETA_DE_APROBADA}
        </Badge>
      ) : null}
    </li>
  )
}
