'use client'

import { useId } from 'react'
import type { CampoDeLayout, Categoria, OrigenResumen } from '@/modules/origenes/client'
import { Dato, DatosPorGrupo, ValorMostrado } from '@/shared/ui/campos'
import { useRegional } from '@/shared/ui/regional'
import { camposComunes, valorComun } from '../../../entities/comunes'
import type { Vehiculo } from '../../../entities/vehiculo'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  categorias: readonly Categoria[]
}

const REJILLA = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-x-4 gap-y-3'

// El bloque «Ficha» de un vehículo, todo a la vista: «Precio» y, después, un grupo por cada grupo del layout de su origen, en su orden
// (los nombres salen del layout). «Datos principales» va en la columna izquierda (`DatosPrincipalesDelVehiculo`).
export function FichaDeVehiculo({ vehiculo, origen, campos, categorias }: Props) {
  const { locale } = useRegional()
  const id = useId()
  const precio = camposComunes(origen.tipo).filter((campo) => campo.bloque === 'precio')
  return (
    <div className="grid min-w-0 gap-5">
      <section aria-labelledby={id} className="grid min-w-0 gap-2">
        <h3 id={id} className="text-(length:--text-sm) font-semibold text-(--color-ink)">
          Precio
        </h3>
        <dl className={REJILLA}>
          {precio.map((campo) => (
            <Dato key={campo.clave} etiqueta={campo.etiqueta}>
              <ValorMostrado valor={valorComun(campo, vehiculo, { categorias, locale })} />
            </Dato>
          ))}
        </dl>
      </section>
      <DatosPorGrupo campos={campos} atributos={vehiculo.atributos} plegable={false} />
    </div>
  )
}
