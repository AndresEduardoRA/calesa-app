'use client'

import type { ReactNode } from 'react'
import { SufijoDeVisto, EnlaceDeLaFila, TarjetaDeLista } from '@/shared/ui/lista'
import type { CampoDeVehiculo } from '../../../entities/campo'
import type { CotizacionAprobadaDeLaFila } from '../../../entities/cotizacion-aprobada-de-la-fila'
import type { Vehiculo } from '../../../entities/vehiculo'
import { useIdentidad } from '../hooks/use-identidad'
import { BadgeDeSituacion } from './badge-de-situacion'
import { DatosDeLaTarjeta, type FilasDeLaTarjeta } from './datos-de-la-tarjeta'
import { FotoDeLaTarjeta } from './foto-de-la-tarjeta'

type Props = {
  vehiculo: Vehiculo
  // El layout del origen del vehículo: de ahí sale lo que lo nombra.
  campos: readonly CampoDeVehiculo[]
  // Las filas de datos de la pestaña, resueltas una vez por página.
  filas: FilasDeLaTarjeta
  fase: { nombre: string; color: string } | null
  // Su ficha (`/vehiculos/<id>`): un clic en cualquier parte de la tarjeta la abre, o Enter sobre su nombre, que es el enlace.
  ficha: string
  // El «⋯» del vehículo, sobre la foto (arriba a la derecha).
  acciones?: ReactNode
  // Lo que va al lado de la fase (si está en la vitrina).
  insignias?: ReactNode
  // La casilla para elegirlo, sobre la foto (arriba a la izquierda, espejo del «⋯»).
  seleccion?: ReactNode
  // Su cotización aprobada (el «Costo estimado»); nulo = no hay o no se ve.
  aprobada: CotizacionAprobadaDeLaFila | null
}

// Un vehículo en una tarjeta de la lista (`@/shared/ui/lista`), la misma en escritorio y en el celular. Todas miden lo mismo: se estiran a su fila de la grilla
// (`auto-rows-fr`), el título ocupa siempre dos líneas (cortado con «…»; entero en el `title` y el nombre accesible del enlace), la línea de datos una (con
// «…») y las filas de datos van pegadas abajo, fijas y con «—» (`DatosDeLaTarjeta`). Sin medir nada con JS.
export function TarjetaVehiculo(props: Props) {
  const { vehiculo, campos, filas, fase, ficha, acciones, insignias, seleccion, aprobada } = props
  const identidad = useIdentidad(campos)(vehiculo)
  return (
    <TarjetaDeLista href={ficha} idDeVisto={vehiculo.id} estirada>
      <div className="flex min-w-0 flex-col gap-2">
        <FotoDeLaTarjeta vehiculo={vehiculo} seleccion={seleccion} acciones={acciones} />
        <h3 className="line-clamp-2 min-h-[2lh] text-(length:--text-base) font-medium [overflow-wrap:anywhere] text-(--color-ink)">
          <EnlaceDeLaFila href={ficha} nombre={identidad.nombre}>
            {identidad.nombre}
          </EnlaceDeLaFila>
        </h3>
        <p className="truncate text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
          {identidad.titulo === null ? '' : `${identidad.titulo} · `}#{vehiculo.numero}
          {vehiculo.anio ? ` · ${String(vehiculo.anio)}` : ''}
          {vehiculo.vin ? ` · ${vehiculo.vin}` : ''}
          <SufijoDeVisto id={vehiculo.id} />
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <BadgeDeSituacion situacion={vehiculo.situacion} fase={fase} />
          {insignias}
        </div>
        <DatosDeLaTarjeta {...filas} vehiculo={vehiculo} aprobada={aprobada} />
      </div>
    </TarjetaDeLista>
  )
}
