'use client'

import type { SeccionDeLaUnidad } from './contenido-del-hueco'
import { BarraDeMover } from './barra-de-mover'
import { BloquesDeLaUnidad } from './bloques-de-la-unidad'

// La unidad en celular y tableta vertical: los huecos como bloques plegables (como en un drawer), «Qué falta» abierto, y la barra «Mover» abajo si hay con qué mover.
export function DisposicionPlegable({
  secciones,
  conBarraDeMover,
}: {
  secciones: readonly SeccionDeLaUnidad[]
  conBarraDeMover: boolean
}) {
  return (
    <div>
      <BloquesDeLaUnidad secciones={secciones} />
      {conBarraDeMover ? <BarraDeMover /> : null}
    </div>
  )
}
