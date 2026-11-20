'use client'

import type { ComponentProps } from 'react'
import {
  DialogoDeCompartirDeLaFila,
  useAbrirCompartirDeLaFila,
} from '@/modules/cotizaciones/pantallas/tarjeta-compartir'
import { ListadoDeVehiculos } from '@/modules/vehiculos/pantallas/listado'

type Props = Omit<ComponentProps<typeof ListadoDeVehiculos>, 'compartirAprobada'>

// El inventario con «Compartir la cotización» de la aprobada: el «Costo estimado» de cada tarjeta y fila abre ese panel sobre la lista (`?panel=compartir&para=<id>`) y el diálogo se monta
// una vez. `vehiculos` no conoce `cotizaciones`: lo une esta pantalla, como la ficha. Sin `cotizaciones.ver` (`aprobadas` nulo) no hay costo ni diálogo; en Modo Live el costo no es botón.
export function ListadoConCompartir(props: Props) {
  const abrir = useAbrirCompartirDeLaFila()
  return (
    <>
      <ListadoDeVehiculos
        {...props}
        compartirAprobada={props.aprobadas === null ? undefined : abrir}
      />
      {props.aprobadas === null ? null : <DialogoDeCompartirDeLaFila />}
    </>
  )
}
