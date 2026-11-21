'use client'

import { BadgeCheckIcon } from 'lucide-react'
import { useId } from 'react'
import { buttonVariants } from '@/shared/ui/button'

type Props = {
  // Por qué no se puede aprobar (sin permiso en el origen, inválida); nulo = se puede.
  motivo: string | null
  aprobando: boolean
  // Alguna del bloque se está aprobando o se relee: un envío a la vez.
  ocupado: boolean
  alAprobar: () => void
}

// «Aprobar esta» al pie de una tarjeta del vehículo (la aprobada no lo lleva). Apagado, dice su motivo debajo (`aria-describedby`).
export function AprobarEstaDeLaTarjeta({ motivo, aprobando, ocupado, alAprobar }: Props) {
  const idDelMotivo = useId()
  return (
    <div className="grid gap-1">
      <button
        type="button"
        className={buttonVariants({ variant: 'outline', className: 'min-h-11 w-full md:min-h-9' })}
        disabled={motivo !== null || ocupado}
        aria-describedby={motivo === null ? undefined : idDelMotivo}
        onClick={alAprobar}
      >
        <BadgeCheckIcon aria-hidden />
        {aprobando ? 'Aprobando…' : 'Aprobar esta'}
      </button>
      {motivo === null ? null : (
        <p id={idDelMotivo} className="text-(length:--text-xs) text-(--color-ink-soft)">
          {motivo}
        </p>
      )}
    </div>
  )
}
