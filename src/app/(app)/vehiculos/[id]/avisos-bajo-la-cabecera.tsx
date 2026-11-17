import { Suspense, type ReactNode } from 'react'
import type { Permisos } from '@/modules/equipo'
import type { Vehiculo } from '@/modules/vehiculos'
import { AvisoLimpieza } from './aviso-limpieza'
import { AvisoSituacion } from './aviso-situacion'

type Props = {
  vehiculo: Vehiculo
  origen: { id: string; nombre: string; tipo: string }
  fase: { nombre: string } | null
  permisos: Permisos
  editable: boolean
  // «Volver» al inventario del origen, arriba de los avisos.
  volver?: ReactNode
}

// Los avisos que van arriba de las dos columnas de la ficha (con «Volver» antes), cada uno tras su `<Suspense>` (leen sesión o base): la limpieza automática (sólo en un origen de
// subasta) y la situación de la subasta (sólo «Sin resolver» o «No ganada»).
export function AvisosBajoLaCabecera({
  vehiculo,
  origen,
  fase,
  permisos,
  editable,
  volver,
}: Props) {
  return (
    <>
      {volver}
      {origen.tipo === 'subasta' ? (
        <Suspense fallback={null}>
          <AvisoLimpieza vehiculo={vehiculo} editable={editable} />
        </Suspense>
      ) : null}
      {vehiculo.situacion === 'sin_resolver' || vehiculo.situacion === 'no_ganada' ? (
        <Suspense fallback={null}>
          <AvisoSituacion vehiculo={vehiculo} origen={origen} fase={fase} permisos={permisos} />
        </Suspense>
      ) : null}
    </>
  )
}
