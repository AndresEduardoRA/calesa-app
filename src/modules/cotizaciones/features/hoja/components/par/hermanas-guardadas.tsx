'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Button, buttonVariants } from '@/shared/ui/button'
import type { CotizacionGuardada } from '../../../../entities/guardado'
import type { ParDeHoja } from '../../../../entities/hoja-en-par'
import { rutaDeLaCotizacion } from '../../../../entities/ruta-de-la-hoja'

// Lo guardado de una hoja en par (glosario: «Cotizaciones hermanas»): las dos, cada una con su número y su opción, y un enlace a cada una.
export function HermanasGuardadas({
  cotizacion,
  par,
  fueReenvio,
  alCotizarOtra,
}: {
  cotizacion: CotizacionGuardada
  par: ParDeHoja
  fueReenvio: boolean
  alCotizarOtra: () => void
}) {
  const hermana = cotizacion.hermana
  const [a, b] = par.opciones
  return (
    <section
      aria-labelledby="hermanas-guardadas"
      data-cotizacion-guardada=""
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line-strong) bg-(--color-surface) p-4"
    >
      <h2
        id="hermanas-guardadas"
        className="text-(length:--text-lg) font-semibold text-(--color-ink)"
      >
        {hermana
          ? `Se guardaron las dos: n.º ${String(cotizacion.numero)} (${a.etiqueta}) y n.º ${String(hermana.numero)} (${b.etiqueta}).`
          : `Cotización n.º ${String(cotizacion.numero)} guardada`}
      </h2>
      <div role="status">
        {cotizacion.repetido ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Estas cotizaciones ya se habían guardado antes de que se cortara la conexión. Lo que ves
            es lo guardado; lo que tipeaste después no se guardó.
          </p>
        ) : fueReenvio ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Se guardó el pedido que había quedado sin confirmar. Lo que tipeaste después no se
            guardó.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11 md:min-h-8" onClick={alCotizarOtra}>
          Cotizar otra
        </Button>
        <Link
          href={rutaDeLaCotizacion(cotizacion.id) as Route}
          className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-8' })}
        >
          Abrir la de {a.etiqueta}
        </Link>
        {hermana ? (
          <Link
            href={rutaDeLaCotizacion(hermana.id) as Route}
            className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-8' })}
          >
            Abrir la de {b.etiqueta}
          </Link>
        ) : null}
      </div>
    </section>
  )
}
