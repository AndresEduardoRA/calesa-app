'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Button, buttonVariants } from '@/shared/ui/button'
import type { LecturaDeLosPasos } from '../../../entities/flujo/pasos-del-flujo'

type Props = {
  estado: Exclude<LecturaDeLosPasos['estado'], 'listo'>
  // `repuestos.configurar`: ofrece ir a configurar el flujo cuando no tiene fases.
  puedeConfigurar: boolean
  alReintentar: () => void
}

const CLASE = 'text-(length:--text-sm) text-(--color-ink-soft)'

// Por qué no se dibujan los pasos: el flujo de repuestos sin fases, ilegible o con más de lo que se puede mostrar. La hoja sigue debajo, sin botones del siguiente.
export function EstadoDeLosPasos({ estado, puedeConfigurar, alReintentar }: Props) {
  if (estado === 'sin_fases') {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={CLASE}>
          El flujo de repuestos todavía no tiene fases: los pasos aparecen cuando las tenga.
        </p>
        {puedeConfigurar ? (
          <Link
            href={RUTAS.flujoDeRepuestos as Route}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'min-h-11 md:min-h-9',
            })}
          >
            Configurar el flujo
          </Link>
        ) : null}
      </div>
    )
  }
  if (estado === 'ilegible') {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={CLASE}>No pudimos leer el flujo de repuestos: los pasos no se muestran.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 md:min-h-9"
          onClick={alReintentar}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  return (
    <p className={CLASE}>
      El flujo de repuestos tiene más fases o salidas de las que se pueden mostrar: los pasos no se
      dibujan.
    </p>
  )
}
