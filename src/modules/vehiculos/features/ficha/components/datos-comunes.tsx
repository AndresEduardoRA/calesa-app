'use client'

import type { Categoria, OrigenResumen } from '@/modules/origenes/client'
import { Dato, ValorMostrado } from '@/shared/ui/campos'
import { useRegional } from '@/shared/ui/regional'
import { camposComunes, valorComun, type BloqueComun } from '../../../entities/comunes'
import type { Vehiculo } from '../../../entities/vehiculo'

type Props = {
  vehiculo: Vehiculo
  origen: Pick<OrigenResumen, 'tipo'>
  categorias: readonly Categoria[]
  // `principales` (sin el título: ya está arriba) o `precio`.
  bloque: BloqueComun
  className: string
}

// Los datos comunes de un bloque (`camposComunes()`), cada uno con su valor: «Precio» del bloque «Ficha» y «Datos principales» y «Precio» de la ficha
// completa. Un monto pasa por <Monto> (Modo Live).
export function DatosComunes({ vehiculo, origen, categorias, bloque, className }: Props) {
  const { locale } = useRegional()
  const campos = camposComunes(origen.tipo).filter(
    (campo) => campo.bloque === bloque && campo.clave !== 'titulo',
  )
  return (
    <dl className={className}>
      {campos.map((campo) => (
        <Dato key={campo.clave} etiqueta={campo.etiqueta}>
          <ValorMostrado valor={valorComun(campo, vehiculo, { categorias, locale })} />
        </Dato>
      ))}
    </dl>
  )
}
