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
  // La página de donde se vino (`returnTo` de «Comparar cotizaciones»).
  volverA: string
  // Cómo dibuja el modal del grupo: da la casilla de cada línea y «Comparar» para su pie.
  children: (partes: {
    casilla: (fila: Fila) => ReactNode
    pie: (filas: readonly Fila[]) => ReactNode
  }) => ReactNode
}

// «Comparar» del modal de un grupo de la lista agrupada por vehículo (lo llena el área `aprobada` en el hueco `Comparar` del listado): una casilla por cotización para elegir
// 2 o 3 y, para el pie del modal, «Comparar» con su ayuda («Elige 2 o 3 para comparar.», «Puedes comparar hasta 3.»), como «De este vehículo». Las elegidas viven aquí, sobre
// el modal: cada apertura (`key` nueva) las suelta.
export function CompararDelGrupo({ volverA, children }: Props) {
  const [elegidas, setElegidas] = useState<readonly string[]>([])
  const idDelAviso = useId()
  return (
    <>
      {children({
        casilla: (fila) => (
          <CasillaDeComparar
            numero={fila.numero}
            elegida={elegidas.includes(fila.id)}
            apagada={casillaApagada(elegidas, fila.id)}
            idDelAviso={idDelAviso}
            alAlternar={() => {
              setElegidas((antes) => alternar(antes, fila.id))
            }}
          />
        ),
        pie: (filas) => (
          <BotonComparar
            elegidas={elegidasEnLaLista(elegidas, filas)}
            volverA={volverA}
            idDelAviso={idDelAviso}
          />
        ),
      })}
    </>
  )
}
