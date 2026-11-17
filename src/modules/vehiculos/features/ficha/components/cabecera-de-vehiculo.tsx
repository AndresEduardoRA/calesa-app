import type { ReactNode } from 'react'
import type { FaseResumen } from '@/modules/flujos/client'
import type { OrigenResumen } from '@/modules/origenes/client'
import type { Vehiculo } from '../../../entities/vehiculo'
import { BadgeDeSituacion } from '../../listado/components/badge-de-situacion'
import { FotosEnElLugar } from '../../fotos/components/fotos-en-el-lugar'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  // La fase actual, entre las del flujo del origen; null = sin fase.
  fase: FaseResumen | null
  // «Editar», el «⋯» y lo demás que la persona puede hacer.
  acciones?: ReactNode
  // Lo que va al lado de la fase (si está en la vitrina).
  insignias?: ReactNode
}

// La cabecera de la ficha de un vehículo, arriba de la columna izquierda: el carrusel a todo el ancho de la tarjeta, su título, su
// número, su origen y su situación, y debajo las acciones. La fase se muestra y no se cambia acá (se mueve desde logística).
export function CabeceraDeVehiculo({ vehiculo, origen, fase, acciones, insignias }: Props) {
  return (
    <header className="grid min-w-0 gap-3">
      <FotosEnElLugar vehiculo={vehiculo} className="w-full" />
      <div className="grid min-w-0 gap-1.5">
        <h1 className="text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
          {vehiculo.titulo}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-(length:--text-sm) text-(--color-ink-soft)">
          <span className="tabular-nums">#{vehiculo.numero}</span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: origen.color }}
            />
            {origen.nombre}
          </span>
          <BadgeDeSituacion situacion={vehiculo.situacion} fase={fase} />
          {insignias}
        </div>
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </header>
  )
}
