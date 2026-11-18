'use client'

import { BadgeCheckIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useId } from 'react'
import { badgeVariants } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { ETIQUETA_DE_APROBADA } from '../../../../entities/historial-del-vehiculo'
import { rutaDeLaCotizacion } from '../../../../entities/ruta-de-la-hoja'

type Props = {
  id: string
  numero: number
  // Es la aprobada: la insignia en lugar del botón.
  aprobada: boolean
  // Por qué no se puede aprobar (sin permiso en el origen, inválida); nulo = se puede.
  motivo: string | null
  aprobando: boolean
  // Alguna de la página se está aprobando: un envío a la vez.
  ocupado: boolean
  alAprobar: () => void
}

const BOTON = 'min-h-11 w-full md:min-h-9'

// Lo de abajo de una columna: «Aprobar esta» (la acción principal; apagado con su motivo debajo, `aria-describedby`) o, en la aprobada, su insignia, y «Abrir». En la
// columna angosta van uno bajo el otro, a todo el ancho.
export function PieDeColumna({
  id,
  numero,
  aprobada,
  motivo,
  aprobando,
  ocupado,
  alAprobar,
}: Props) {
  const idDelMotivo = useId()
  return (
    <div className="grid min-w-0 content-start gap-2">
      {aprobada ? (
        <span
          data-insignia="aprobada"
          className={badgeVariants({ variant: 'secondary', className: 'min-h-9 w-full' })}
        >
          <BadgeCheckIcon aria-hidden />
          {ETIQUETA_DE_APROBADA}
        </span>
      ) : (
        <button
          type="button"
          className={buttonVariants({ variant: 'outline', className: BOTON })}
          disabled={motivo !== null || ocupado}
          aria-describedby={motivo === null ? undefined : idDelMotivo}
          onClick={alAprobar}
        >
          <BadgeCheckIcon aria-hidden />
          {aprobando ? 'Aprobando…' : 'Aprobar esta'}
        </button>
      )}
      <Link
        href={rutaDeLaCotizacion(id) as Route}
        aria-label={`Abrir la n.º ${String(numero)}`}
        className={buttonVariants({ variant: 'ghost', className: BOTON })}
      >
        Abrir
      </Link>
      {motivo === null || aprobada ? null : (
        <p id={idDelMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </p>
      )}
    </div>
  )
}
