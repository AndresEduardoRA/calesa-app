'use client'

import type { ComponentProps } from 'react'
import { useALaVista } from '@/shared/ui/use-a-la-vista'
import type { DeEsteVehiculo } from './de-este-vehiculo'
import { DeEsteVehiculoDiferido } from './diferidos'
import { EsqueletoDeEsteVehiculo } from './esqueleto-de-este-vehiculo'

// «De este vehículo» en una página larga (bajo la hoja de la guardada, la ficha del vehículo): un nodo que se observa y, la primera vez que está a 200 px de la
// vista, el código y la lectura. Hasta entonces, el título del servidor (si lo trae) y el esqueleto: las casillas y «Comparar» viajan sólo en el código del bloque.
export function DeEsteVehiculoAlAcercarse(props: ComponentProps<typeof DeEsteVehiculo>) {
  const [observar, visto] = useALaVista<HTMLDivElement>()
  return (
    <div ref={observar} className="grid min-w-0 gap-3">
      {visto ? (
        <DeEsteVehiculoDiferido {...props} />
      ) : (
        <>
          {props.titulo}
          <EsqueletoDeEsteVehiculo />
        </>
      )}
    </div>
  )
}
