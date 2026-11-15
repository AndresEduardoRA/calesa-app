'use client'

import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { Skeleton } from '@/shared/ui/skeleton'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerVinculosDelVehiculo } from '../../../composicion.client'
import { TEXTO_DE_ERROR } from '../../../entities/relacionados'
import { VinculoEHistorial } from '../../vinculo/components/vinculo-e-historial'

type Props = { abierto: boolean; alCerrar: () => void; vehiculoId: string }

function Contenido({ vehiculoId }: { vehiculoId: string }) {
  const { lectura, reintentar } = useLecturaAlMontar(
    () => leerVinculosDelVehiculo(vehiculoId),
    vehiculoId,
  )
  if (lectura.estado === 'leyendo') {
    return (
      <div aria-busy="true" aria-label="Cargando" className="grid gap-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }
  if (lectura.estado === 'fallo') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink)">{TEXTO_DE_ERROR}</p>
        <Button type="button" variant="outline" size="sm" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  return <VinculoEHistorial vinculos={lectura.dato} />
}

// «Ver todos» de Vinculado en un vehículo: el vínculo vigente y los anteriores (`vehiculo_vinculos()`, hasta 50). Sólo muestra.
export function DrawerDeVinculos({ abierto, alCerrar, vehiculoId }: Props) {
  return (
    <Drawer abierto={abierto} alCerrar={alCerrar} titulo="Vinculado · todos">
      {abierto ? <Contenido vehiculoId={vehiculoId} /> : null}
    </Drawer>
  )
}
