import { CircleCheckIcon, CircleDashedIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { contados } from '../../../entities/nombre'
import { ETIQUETA_DE_TIPO_DE_ORIGEN, type OrigenConUso } from '../../../entities/origen'

type Props = {
  origen: OrigenConUso
  // Lo que le falta, en corto (`faltasDeLaTarjeta()`): vacío = nada pendiente.
  faltas: readonly string[]
}

// Un origen en la lista: entera es el enlace a sus datos. Dice su tipo, si está activo, lo que le falta para funcionar y lo que lo ata.
// No es la «tarjeta de la lista» del patrón `ui/lista` (no hay resumen ni «⋯»: abrirla es entrar al origen).
export function TarjetaDeOrigen({ origen, faltas }: Props) {
  return (
    <li className="min-w-0">
      <Link
        href={`${RUTAS.origenes}/${origen.id}/datos` as Route}
        className="grid h-full content-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 outline-none hover:border-(--color-line-strong) hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)"
      >
        <span className="grid gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: origen.color }}
            />
            <span className="min-w-0 truncate text-(length:--text-base) font-medium text-(--color-ink)">
              {origen.nombre}
            </span>
          </span>
          <span className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{ETIQUETA_DE_TIPO_DE_ORIGEN[origen.tipo]}</Badge>
            {origen.activo ? (
              <Badge className="bg-(--color-positivo-soft) text-(--color-positivo-ink)">
                Activo
              </Badge>
            ) : (
              <Badge variant="outline">Inactivo</Badge>
            )}
          </span>
        </span>
        {faltas.length > 0 ? (
          <span className="grid gap-1">
            {faltas.map((falta) => (
              <span
                key={falta}
                className="flex items-start gap-1.5 text-(length:--text-sm) text-(--color-aviso-ink)"
              >
                <CircleDashedIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                {falta}
              </span>
            ))}
          </span>
        ) : origen.activo ? (
          <span className="flex items-center gap-1.5 text-(length:--text-sm) text-(--color-positivo-ink)">
            <CircleCheckIcon aria-hidden className="size-4 shrink-0" />
            Nada pendiente
          </span>
        ) : null}
        <span className="text-(length:--text-sm) text-(--color-ink-soft)">
          {contados(origen.uso.vehiculos, origen.sustantivo)} ·{' '}
          {contados(origen.uso.cotizaciones, 'cotización')}
        </span>
      </Link>
    </li>
  )
}
