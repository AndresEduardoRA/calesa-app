'use client'

import { CORTE_DEL_PANEL } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { enOrdenDelPanel, type ZonasDeLaUnidad } from '../../../entities/nucleo/zonas'
import type { SeccionDeLaUnidad } from './contenido-del-hueco'
import { DisposicionEnZonas } from './disposicion-en-zonas'
import { DisposicionPlegable } from './disposicion-plegable'

type Props = {
  zonas: ZonasDeLaUnidad<SeccionDeLaUnidad>
  // Quien puede mover la unidad (lo calcula `src/app` con `flujos.mover` del origen): la barra «Mover» del celular sólo sale con él y con el hueco «Qué falta».
  puedeMover: boolean
}

// La forma de la página se elige por el ancho de la pantalla (el servidor lo adivina por cookie y la hidratación no salta): desde 1024 px, zonas; por debajo, bloques plegables con la barra «Mover».
// Cada hueco se dibuja una sola vez, en la forma elegida: nunca las dos. Cruzar los 1024 px remonta los huecos.
export function DisposicionDeLaPagina({ zonas, puedeMover }: Props) {
  const enZonas = useAlMenos(CORTE_DEL_PANEL)
  if (enZonas) return <DisposicionEnZonas zonas={zonas} />
  return (
    <DisposicionPlegable
      secciones={enOrdenDelPanel(zonas)}
      conBarraDeMover={puedeMover && zonas.principal.length > 0}
    />
  )
}
