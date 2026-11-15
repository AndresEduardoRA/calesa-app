'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// El panel del ítem se pide al abrirse: su código no viaja con la hoja (8.13-2, C13).
export const DrawerDelItemDiferido = diferido(() =>
  import('./drawer-del-item').then((modulo) => modulo.DrawerDelItem),
)

// El hueco «Repuestos» del panel del vehículo se pide recién al abrir su bloque (8.13-3, C14).
export const HuecoDeEsperasDiferido = diferido(
  () => import('./hueco-de-esperas').then((modulo) => modulo.HuecoDeEsperas),
  // Si el código no llega, el aviso queda en su zona; mientras llega, unas líneas en su lugar (`repuestos` no importa `logistica`: el esqueleto es de `shared`).
  {
    aviso: 'aqui',
    esqueleto: (
      <div role="status" aria-busy="true" aria-label="Cargando la sección" className="grid gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-9 w-full" />
      </div>
    ),
  },
)
