'use client'

import { useId } from 'react'
import type { CampoDeLayout, Categoria, OrigenResumen } from '@/modules/origenes/client'
import { DatosPorGrupo } from '@/shared/ui/campos'
import type { Vehiculo } from '../../../entities/vehiculo'
import { DatosComunes } from './datos-comunes'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  categorias: readonly Categoria[]
}

const REJILLA = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-x-4 gap-y-3'

// El bloque «Ficha» de un vehículo, todo a la vista: «Precio» y, después, un grupo por cada grupo del layout de su origen, en su orden
// (los nombres salen del layout). Los datos clave van en la columna izquierda y la ficha entera, en la ficha completa (`?ver=ficha`).
export function FichaDeVehiculo({ vehiculo, origen, campos, categorias }: Props) {
  const id = useId()
  return (
    <div className="grid min-w-0 gap-5">
      <section aria-labelledby={id} className="grid min-w-0 gap-2">
        <h3 id={id} className="text-(length:--text-sm) font-semibold text-(--color-ink)">
          Precio
        </h3>
        <DatosComunes
          vehiculo={vehiculo}
          origen={origen}
          categorias={categorias}
          bloque="precio"
          className={REJILLA}
        />
      </section>
      <DatosPorGrupo campos={campos} atributos={vehiculo.atributos} plegable={false} />
    </div>
  )
}
