'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useNoGanada } from '@/modules/vehiculos/client'
import { Button, buttonVariants } from '@/shared/ui/button'

type Props = {
  vehiculoId: string
  origenId: string
  nombre: string
  // «La ganamos» lleva a la página del vehículo en su modo de «ganada» (`?ganada=si`): ahí se elige a dónde pasa.
  hrefDeLaGanamos: string
}

// Resolver una subasta sin resolver desde su fila: «La ganamos» (a la página del vehículo, que ofrece los destinos) y «No la ganamos», que se hace aquí con su «Deshacer» de 10 s. Al lograrlo
// la lista se vuelve a leer (la fila ya no es de este grupo). Un conflicto (otra persona la resolvió) o un error se dicen en la fila.
export function ResolverLaSubasta({ vehiculoId, origenId, nombre, hrefDeLaGanamos }: Props) {
  const router = useRouter()
  const { marcar, enviando, conflicto, error } = useNoGanada({
    vehiculoId,
    origenId,
    alLograrlo: () => {
      router.refresh()
    },
  })
  const problema = conflicto ?? error
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={hrefDeLaGanamos as Route}
        prefetch={false}
        aria-label={`La ganamos: ${nombre}`}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        La ganamos
      </Link>
      <Button
        variant="outline"
        size="sm"
        disabled={enviando}
        aria-label={`No la ganamos: ${nombre}`}
        onClick={() => {
          void marcar(true)
        }}
      >
        No la ganamos
      </Button>
      {problema ? (
        <p role="alert" className="basis-full text-(length:--text-xs) text-(--color-peligro-ink)">
          {problema}
        </p>
      ) : null}
    </div>
  )
}
