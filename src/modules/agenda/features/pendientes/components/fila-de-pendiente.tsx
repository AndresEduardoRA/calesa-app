'use client'

import type { Route } from 'next'
import { CheckIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/shared/ui/button'
import {
  cuandoDelPendiente,
  type GrupoDePendientes,
  type PendienteDeAgenda,
} from '../../../entities/pendientes'
import { enlaceDePanel, type BaseDeEnlace } from '../../calendario/enlace-de-panel'
import type { CompletarPendiente } from '../hooks/use-completar-pendiente'

type Props = {
  grupo: GrupoDePendientes
  pendiente: PendienteDeAgenda
  base: BaseDeEnlace
  ahora: string
  zona: string
  completar: CompletarPendiente
}

// Un pendiente: su título enlaza a su panel (en esta vista y fecha), cuándo en texto suave y «Completar» en un toque (44 px en el celular). Completado, se
// oculta al instante hasta que llega la relectura.
export function FilaDePendiente({ grupo, pendiente, base, ahora, zona, completar }: Props) {
  if (completar.oculto(pendiente.id)) {
    return null
  }
  const cuando = cuandoDelPendiente(grupo, pendiente.instante, { ahora, zona })
  return (
    <li className="flex min-w-0 items-start gap-2 py-1">
      <Link
        href={enlaceDePanel(base, pendiente.clase, pendiente.id) as Route}
        className="grid min-h-11 min-w-0 flex-1 content-center rounded-md px-2 py-1 hover:bg-(--color-paper-dim) md:min-h-9"
      >
        <span className="break-words text-(--color-ink)">{pendiente.titulo}</span>
        {cuando ? (
          <span
            className={`text-(length:--text-xs) break-words ${
              cuando.vencido ? 'text-(--color-peligro-ink)' : 'text-(--color-ink-soft)'
            }`}
          >
            {cuando.texto}
          </span>
        ) : null}
      </Link>
      <Button
        variant="outline"
        size="sm"
        aria-label={`Completar: ${pendiente.titulo}`}
        disabled={completar.enCurso(pendiente.id)}
        className="h-11 shrink-0 md:h-8"
        onClick={() => {
          completar.completar(pendiente)
        }}
      >
        <CheckIcon aria-hidden />
        <span className="max-md:sr-only">Completar</span>
      </Button>
    </li>
  )
}
