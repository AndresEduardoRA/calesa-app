'use client'

import { useId, useState, type ReactNode } from 'react'
import {
  alternar,
  casillaApagada,
  elegidasEnLaLista,
} from '../../../../entities/aprobada/eleccion-para-comparar'
import { BotonComparar } from '../de-este-vehiculo/boton-comparar'
import { CasillaDeComparar } from '../de-este-vehiculo/casilla-de-comparar'

type Fila = { id: string; numero: number }

type Props = {
  filas: readonly Fila[]
  // La página de donde se vino (`returnTo` de «Comparar cotizaciones»).
  volverA: string
  // Cómo dibuja el grupo cada línea, con la casilla que le da esto.
  linea: (fila: Fila, casilla: ReactNode) => ReactNode
}

// «Comparar» de un grupo desplegado de la lista agrupada por vehículo (lo llena el área `aprobada` en el hueco `Comparar` del listado): una casilla por cotización
// para elegir 2 o 3 y, al pie, «Comparar» con su ayuda («Elige 2 o 3 para comparar.», «Puedes comparar hasta 3.»), como «De este vehículo». Las elegidas viven aquí:
// cerrar el despliegue las suelta.
export function CompararDelGrupo({ filas, volverA, linea }: Props) {
  const [elegidas, setElegidas] = useState<readonly string[]>([])
  const idDelAviso = useId()
  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        {filas.map((fila) =>
          linea(
            fila,
            <CasillaDeComparar
              numero={fila.numero}
              elegida={elegidas.includes(fila.id)}
              apagada={casillaApagada(elegidas, fila.id)}
              idDelAviso={idDelAviso}
              alAlternar={() => {
                setElegidas((antes) => alternar(antes, fila.id))
              }}
            />,
          ),
        )}
      </div>
      <BotonComparar
        elegidas={elegidasEnLaLista(elegidas, filas)}
        volverA={volverA}
        idDelAviso={idDelAviso}
      />
    </div>
  )
}
