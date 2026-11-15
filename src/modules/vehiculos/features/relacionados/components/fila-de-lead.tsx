'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { useNumerosEnTexto } from '@/shared/ui/numero-de-lead'
import type { AccionDeRelacionados } from '../../../entities/acciones-de-relacionados'
import {
  TEXTO_DE_FUERA_DE_CARTERA,
  type FilaRelacionada,
  type LeadRelacionado,
} from '../../../entities/relacionados'
import { AccionesDeLaFila } from './acciones-de-la-fila'
import { DetalleDeLaRelacion } from './detalle-de-la-relacion'

type Props = {
  fila: FilaRelacionada<LeadRelacionado>
  acciones: readonly AccionDeRelacionados[]
  enCurso: boolean
  alElegir: (accion: AccionDeRelacionados) => void
}

// Un lead relacionado a un vehículo: su nombre (enlace a su ficha), sus números, «Fuera de tu cartera» si se ve enmascarado (nunca su teléfono) y lo propio de la relación.
export function FilaDeLead({ fila, acciones, enCurso, alElegir }: Props) {
  const { contraparte: lead, detalle } = fila
  // «N.º 8 · Tu n.º 2»: los dos números que quien mira ve, en una línea.
  const numeros = useNumerosEnTexto(lead)
  return (
    <li className="flex min-w-0 items-start gap-2">
      <div className="grid min-w-0 flex-1 gap-0.5 text-(length:--text-sm)">
        <span className="min-w-0 [overflow-wrap:anywhere]">
          <Link
            href={`${RUTAS.leads}/${lead.leadId}` as Route}
            className="font-medium text-(--color-ink) underline-offset-2 hover:underline"
          >
            {lead.nombre}
          </Link>
          {numeros === '' ? null : (
            <span className="font-normal text-(--color-ink-soft) tabular-nums">{` · ${numeros}`}</span>
          )}
        </span>
        {lead.enCartera ? null : (
          <Badge variant="outline" className="w-fit">
            {TEXTO_DE_FUERA_DE_CARTERA}
          </Badge>
        )}
        <DetalleDeLaRelacion detalle={detalle} />
      </div>
      <AccionesDeLaFila
        nombre={lead.nombre}
        acciones={acciones}
        enCurso={enCurso}
        alElegir={alElegir}
      />
    </li>
  )
}
