'use client'

import { useMemo } from 'react'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { FilterShell } from '@/shared/ui/filtros'
import type { VehiculoDeLaFase } from '../../../entities/cadena/leer'
import { useSeleccionDeLaCadena } from '../../nucleo/seleccion/use-seleccion-de-la-cadena'
import { ResultadoDeLaFase } from './resultado-de-la-fase'

type Props = {
  vehiculos: readonly VehiculoDeLaFase[]
  siguiente: string | null
  esquema: EsquemaDeFiltros
  // La fase de la lista: su id y su nombre (la selección del lote es de una sola fase). Nulo en «Sin fase»: no ofrece selección.
  fase: { id: string; nombre: string } | null
  // El instante de la lectura, ISO (lo toma el servidor): los días en la fase se cuentan contra él.
  ahora: string
  hrefDeLaCadena: string
}

// La lista de una fase con sus filtros en la URL (`FilterShell`) y, si quien mira puede mover (hay proveedor de la selección), una casilla por vehículo y la de «Elegir los de esta página».
// La selección sobrevive a «Siguientes» (el proveedor no depende del cursor) y se vacía al cambiar de fase, de origen o de filtros.
export function ListaDeLaFase({
  vehiculos,
  siguiente,
  esquema,
  fase,
  ahora,
  hrefDeLaCadena,
}: Props) {
  const seleccion = useSeleccionDeLaCadena()
  const instante = useMemo(() => new Date(ahora), [ahora])
  const elegible = useMemo(() => {
    if (seleccion === null || fase === null) return null
    const elegidos = seleccion.estado.elegidos
    return {
      elegido: (id: string) => elegidos.has(id),
      alternar: (vehiculo: VehiculoDeLaFase) => {
        seleccion.alternar(fase, { id: vehiculo.id, nombre: vehiculo.nombre })
      },
      elegirLaPagina: () => {
        seleccion.elegirLaPagina(
          fase,
          vehiculos.map((v) => ({ id: v.id, nombre: v.nombre })),
        )
      },
      paginaCompleta: vehiculos.length > 0 && vehiculos.every((v) => elegidos.has(v.id)),
    }
  }, [seleccion, fase, vehiculos])
  return (
    <FilterShell esquema={esquema}>
      <ResultadoDeLaFase
        vehiculos={vehiculos}
        siguiente={siguiente}
        ahora={instante}
        hrefDeLaCadena={hrefDeLaCadena}
        seleccion={elegible}
      />
    </FilterShell>
  )
}
