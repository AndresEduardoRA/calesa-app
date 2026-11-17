'use client'

import { useUltimo } from '@/shared/ui/use-ultimo'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerRelacionadosDelVehiculoEnElNavegador } from '../../../composicion.client'
import type { ParaRelacionados } from '../../../entities/acciones-de-relacionados'
import type { RelacionadosDelVehiculo } from '../../../entities/relacionados'
import { ErrorDeRelacionados } from './error-de-relacionados'
import { EsqueletoDeRelacionados } from './esqueleto-de-relacionados'
import { RelacionadosDeUnVehiculo } from './relacionados-de-un-vehiculo'

type Props = { vehiculoId: string; para: ParaRelacionados }

// «Relacionados» en el resumen del inventario: se lee al abrir (una RPC `security definer`, con la sesión de quien mira) y otra vez tras cada acción lograda; mientras vuelve a leer
// se sigue viendo lo anterior. «Quitar interés» y «Cotizar» se hacen en el lugar; lo que abre un panel o «Ver todos» lleva a la ficha con eso abierto.
export function RelacionadosDelResumen({ vehiculoId, para }: Props) {
  const { lectura, reintentar } = useLecturaAlMontar(
    () => leerRelacionadosDelVehiculoEnElNavegador(vehiculoId),
    vehiculoId,
  )
  const anterior = useUltimo<RelacionadosDelVehiculo>(
    lectura.estado === 'leido' ? lectura.dato : null,
  )
  const datos = lectura.estado === 'leido' ? lectura.dato : anterior
  if (datos !== null && datos.vehiculoId === vehiculoId) {
    return (
      <div aria-busy={lectura.estado === 'leyendo'}>
        <RelacionadosDeUnVehiculo
          datos={datos}
          vehiculoId={vehiculoId}
          lugar="resumen"
          para={para}
          presentacion="linea"
          alCambiar={reintentar}
        />
      </div>
    )
  }
  return lectura.estado === 'fallo' ? (
    <ErrorDeRelacionados presentacion="linea" alReintentar={reintentar} />
  ) : (
    <EsqueletoDeRelacionados presentacion="linea" />
  )
}
