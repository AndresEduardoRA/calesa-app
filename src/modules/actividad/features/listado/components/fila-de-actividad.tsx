'use client'

import { ChevronDownIcon } from 'lucide-react'
import { cn } from 'cn'
import { formatearHora } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import type { FilaDeActividad as Fila } from '../../../entities/actividad'
import { fraseDeActividad } from '../../../entities/frase'
import { DetalleDelCambioDiferido } from '../../diff/components/diferidos'
import { FraseDeActividad } from '../../frase/components/frase-de-actividad'
import { IconoDeEntidad } from '../../frase/components/icono-de-entidad'

type Props = { fila: Fila; zona: string; abierta: boolean; alternar: (id: number) => void }

export const idDeLaFila = (id: number) => `cambio-${String(id)}`

// Un cambio: su icono, la frase y la hora. Una fila visible despliega ahí mismo todo su detalle («Ver detalle», `?cambio=<id>`); una que quien
// mira no ve no promete nada que abrir.
export function FilaDeActividad({ fila, zona, abierta, alternar }: Props) {
  const frase = fraseDeActividad(fila)
  const idDelDetalle = `detalle-${idDeLaFila(fila.id)}`
  return (
    <li
      id={idDeLaFila(fila.id)}
      className={cn(
        'grid min-w-0 scroll-mt-24 gap-2 px-3 py-2.5',
        abierta && 'bg-(--color-surface-2)',
      )}
    >
      <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1">
        <IconoDeEntidad icono={frase.icono} />
        <div className="grid min-w-0 flex-1 basis-48 gap-0.5">
          <FraseDeActividad frase={frase} zona={zona} />
          <time
            dateTime={fila.creadoEn}
            className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums"
          >
            {formatearHora(fila.creadoEn, { zona })}
          </time>
        </div>
        {fila.visible ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={abierta}
            aria-controls={abierta ? idDelDetalle : undefined}
            className="ml-auto min-h-11 shrink-0 md:min-h-8"
            onClick={() => {
              alternar(fila.id)
            }}
          >
            {abierta ? 'Ocultar detalle' : 'Ver detalle'}
            <ChevronDownIcon
              aria-hidden
              className={cn('transition-transform', abierta && 'rotate-180')}
            />
          </Button>
        ) : null}
      </div>
      {abierta && fila.visible ? (
        <div
          id={idDelDetalle}
          role="region"
          aria-label="Detalle del cambio"
          className="min-w-0 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 sm:ml-11"
        >
          <DetalleDelCambioDiferido id={fila.id} />
        </div>
      ) : null}
    </li>
  )
}
