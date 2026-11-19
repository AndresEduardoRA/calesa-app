import type { ReactNode } from 'react'
import type { FaseResumen } from '@/modules/flujos/client'
import type { OrigenResumen } from '@/modules/origenes/client'
import { EsquinaDeAcciones } from '@/shared/ui/lista'
import type { Vehiculo } from '../../../entities/vehiculo'
import { BadgeDeSituacion } from '../../listado/components/badge-de-situacion'
import { FotosDeLaFicha } from '../../fotos/components/fotos-de-la-ficha'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  // La fase actual, entre las del flujo del origen; null = sin fase.
  fase: FaseResumen | null
  // Lo que va sobre la esquina de la foto, como en la tarjeta de la lista: la vitrina y el «⋯».
  sobreLaFoto?: ReactNode
  // Lo que va al lado de la situación (si está en la vitrina).
  insignias?: ReactNode
  // Los enlaces cortos (logística, repuestos), en la línea de la situación.
  enlaces?: ReactNode
}

// La cabecera de la ficha de un vehículo, arriba de la columna izquierda: la foto con su tira de miniaturas y, sobre su esquina, la vitrina y el «⋯»
// (como en la tarjeta de la lista); debajo el título, el número, el origen, la situación y los enlaces cortos. La fase se muestra y no se cambia acá
// (se mueve desde logística).
export function CabeceraDeVehiculo({
  vehiculo,
  origen,
  fase,
  sobreLaFoto,
  insignias,
  enlaces,
}: Props) {
  return (
    <header className="grid min-w-0 gap-3">
      <FotosDeLaFicha
        vehiculo={vehiculo}
        sobreLaFoto={
          sobreLaFoto ? (
            <EsquinaDeAcciones sobreImagen className="gap-0.5">
              {sobreLaFoto}
            </EsquinaDeAcciones>
          ) : null
        }
      />
      <div className="grid min-w-0 gap-1.5">
        <h1 className="text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
          {vehiculo.titulo}
        </h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-(length:--text-sm) text-(--color-ink-soft)">
          <span className="tabular-nums">#{vehiculo.numero}</span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: origen.color }}
            />
            {origen.nombre}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-(length:--text-sm)">
          <BadgeDeSituacion situacion={vehiculo.situacion} fase={fase} />
          {insignias}
          {enlaces}
        </div>
      </div>
    </header>
  )
}
