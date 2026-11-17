import { Suspense, type ReactNode } from 'react'
import type { LayoutDeOrigen, OrigenResumen } from '@/modules/origenes'
import type { Vehiculo } from '@/modules/vehiculos'
import { DatosPrincipalesDelVehiculo } from '@/modules/vehiculos/pantallas/ficha'
import { BloqueSubasta } from './bloque-subasta'

type Props = {
  // La cabecera (`Encabezado`): carrusel, título, número, origen, situación y acciones.
  encabezado: ReactNode
  vehiculo: Vehiculo
  origen: OrigenResumen
  layout: LayoutDeOrigen
  editable: boolean
}

// La columna izquierda de la ficha, pegajosa en escritorio: lo que identifica al vehículo de un vistazo. La subasta va sin título de bloque
// ni entrada en el índice: si no tiene nada que mostrar no se dibuja, y la entrada no llevaría a ningún lado.
export function LateralDeLaFicha({ encabezado, vehiculo, origen, layout, editable }: Props) {
  return (
    <>
      {encabezado}
      <DatosPrincipalesDelVehiculo
        vehiculo={vehiculo}
        origen={origen}
        categorias={layout.categorias}
      />
      {origen.tipo === 'subasta' ? (
        <Suspense fallback={null}>
          <BloqueSubasta vehiculo={vehiculo} editable={editable} />
        </Suspense>
      ) : null}
    </>
  )
}
