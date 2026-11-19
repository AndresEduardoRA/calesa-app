'use client'

import { useRouter } from 'next/navigation'
import { useTransition, type ComponentProps } from 'react'
import { DeEsteVehiculo } from '@/modules/cotizaciones/pantallas/aprobada-de-este-vehiculo'

type Props = {
  vehiculo: { id: string; titulo: string }
  // Los orígenes donde quien mira aprueba (`origenesCon(permisos, 'cotizaciones.aprobar')`, del servidor).
  aprobarEn: ComponentProps<typeof DeEsteVehiculo>['aprobarEn']
  volverA: string
}

// Las cotizaciones de este vehículo en la ficha: la isla «De este vehículo» (al acercarse, con su código por `diferido()`), con las casillas de
// «Comparar» y su vacío. Tras aprobar o deshacer refresca la página: «Cotización aprobada» de la izquierda se lee en el servidor y no escucha a las
// islas. En la ficha no hay nada tipeado que perder, y la isla no se vuelve a montar (ni su posición ni su `key` cambian).
export function CotizacionesDeEsteVehiculo({ vehiculo, aprobarEn, volverA }: Props) {
  const router = useRouter()
  const [, empezar] = useTransition()
  return (
    <DeEsteVehiculo
      vehiculo={vehiculo}
      aprobarEn={aprobarEn}
      conCasillas
      volverA={volverA}
      vacio="Sin cotizaciones que puedas ver."
      alCambiar={() => {
        empezar(() => {
          router.refresh()
        })
      }}
    />
  )
}
