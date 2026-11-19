'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// Las casillas y «Comparar» de un grupo desplegado llegan con el despliegue (el listado sólo paga esta cáscara, que `src/app` pasa como hueco). Mientras, las líneas en
// su lugar; sin red, el aviso va en el lugar.
export const CompararDelGrupoDiferido = diferido(
  () => import('./comparar-del-grupo').then((modulo) => modulo.CompararDelGrupo),
  {
    esqueleto: (
      <div className="grid gap-2" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    ),
    aviso: 'aqui',
  },
)
