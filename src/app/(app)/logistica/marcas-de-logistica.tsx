import type { ReactNode } from 'react'
import { MarcasDeVistoDeLaPagina } from '@/modules/equipo/pantallas/marcas-de-visto'

// Las marcas de «visto» del contexto `logistica` de una lista de vehículos: «visto» es haber abierto `/logistica/vehiculo/[id]` (o el panel de gastos, por
// `?vehiculo=`), nunca la ficha de `/vehiculos`. `ids` son los de la página que se dibuja; `parametro`, la clave de la URL que abre la unidad sobre la lista.
export function MarcasDeLogistica({
  ids,
  parametro,
  children,
}: {
  ids: readonly string[]
  parametro?: string
  children: ReactNode
}) {
  return (
    <MarcasDeVistoDeLaPagina
      modulo="logistica"
      consultas={[{ tipo: 'vehiculo', ids, ...(parametro === undefined ? {} : { parametro }) }]}
    >
      {children}
    </MarcasDeVistoDeLaPagina>
  )
}
