'use client'

import { SearchXIcon } from 'lucide-react'
import { Button } from '../button'
import { MarcoEstado } from './marco-estado'

type Props = {
  // Sin esto no se ofrece limpiar (una búsqueda de un solo campo se limpia en el campo).
  alLimpiar?: () => void
  descripcion?: string
  // Lo que dice el botón; «Limpiar filtros» si no se dice (con sólo una búsqueda puesta, «Limpiar búsqueda»).
  etiquetaDeLimpiar?: string
}

// Vacío por filtro: hay datos, pero ninguno cumple lo que se pidió. Ofrece limpiar los filtros.
export function EstadoSinResultados({ alLimpiar, descripcion, etiquetaDeLimpiar }: Props) {
  return (
    <MarcoEstado
      Icono={SearchXIcon}
      titulo="Nada coincide con los filtros"
      descripcion={descripcion ?? 'Probar con menos filtros o con otra búsqueda.'}
      accion={
        alLimpiar ? (
          <Button variant="outline" onClick={alLimpiar}>
            {etiquetaDeLimpiar ?? 'Limpiar filtros'}
          </Button>
        ) : undefined
      }
    />
  )
}
