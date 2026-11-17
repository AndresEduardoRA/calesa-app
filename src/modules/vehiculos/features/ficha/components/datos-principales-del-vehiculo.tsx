'use client'

import { useId } from 'react'
import type { Categoria, OrigenResumen } from '@/modules/origenes/client'
import { Dato, ValorMostrado } from '@/shared/ui/campos'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques/estilos'
import { useRegional } from '@/shared/ui/regional'
import { camposComunes, valorComun } from '../../../entities/comunes'
import type { Vehiculo } from '../../../entities/vehiculo'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  categorias: readonly Categoria[]
}

// En rem y con `min(100%, …)`: dos columnas en la lateral de 24 rem y, al 200 %, una sola en vez de ensanchar.
const REJILLA = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-x-4 gap-y-3'

// «Datos principales» de la columna izquierda de la ficha: los comunes del bloque `principales` (marca, modelo, año, VIN, categoría, km,
// placado y, en una subasta, lote, plataforma y enlace), a la vista. El título ya está en la cabecera.
export function DatosPrincipalesDelVehiculo({ vehiculo, origen, categorias }: Props) {
  const { locale } = useRegional()
  const id = useId()
  const campos = camposComunes(origen.tipo).filter(
    (campo) => campo.bloque === 'principales' && campo.clave !== 'titulo',
  )
  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-3">
      <h2 id={id} className={TITULO_DE_BLOQUE}>
        Datos principales
      </h2>
      <dl className={REJILLA}>
        {campos.map((campo) => (
          <Dato key={campo.clave} etiqueta={campo.etiqueta}>
            <ValorMostrado valor={valorComun(campo, vehiculo, { categorias, locale })} />
          </Dato>
        ))}
      </dl>
    </section>
  )
}
