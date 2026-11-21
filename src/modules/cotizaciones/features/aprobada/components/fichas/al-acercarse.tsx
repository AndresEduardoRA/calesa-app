'use client'

import type { ComponentProps } from 'react'
import { useALaVista } from '@/shared/ui/use-a-la-vista'
import { EsqueletoDeLasTarjetas } from '../../../fichas/components/esqueleto-de-las-tarjetas'
import { TarjetasDelVehiculoDiferido } from './diferidos'

// Las tarjetas del vehículo bajo el título que dibuja el servidor: un nodo que se observa y, la primera vez que está a 200 px de la vista, el código y la lectura. Hasta entonces, el
// esqueleto. Quien las monta pone `key` con el id (pasar de una ficha a otra empieza de cero).
export function TarjetasDelVehiculoAlAcercarse(
  props: ComponentProps<typeof TarjetasDelVehiculoDiferido>,
) {
  const [observar, visto] = useALaVista<HTMLDivElement>()
  return (
    <div ref={observar} className="min-w-0">
      {visto ? <TarjetasDelVehiculoDiferido {...props} /> : <EsqueletoDeLasTarjetas />}
    </div>
  )
}
