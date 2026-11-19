'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// El despliegue de un grupo llega recién al primer clic en «N cotizaciones de este vehículo»: la lista no paga sus líneas, su lectura ni «Comparar». Mientras,
// tres líneas en su lugar; sin red, el aviso va en el lugar, con «Reintentar».
export const DespliegueDelGrupoDiferido = diferido(
  () => import('./despliegue-del-grupo').then((modulo) => modulo.DespliegueDelGrupo),
  {
    esqueleto: (
      <div
        className="grid gap-2 rounded-(--radius-card) border border-(--color-line) p-3"
        aria-busy="true"
      >
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    ),
    aviso: 'aqui',
  },
)
