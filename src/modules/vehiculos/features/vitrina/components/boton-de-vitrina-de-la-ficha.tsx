'use client'

import type { DeLaFila } from '../../../entities/vitrina-rapida'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import { usePanelDeVitrina } from '../hooks/use-panel-de-vitrina'
import { BotonDeVitrinaDeLaFila } from './boton-de-vitrina-de-la-fila'

// El botón de vitrina sobre la foto de la ficha: el mismo de la tarjeta de la lista, que abre el panel de la vitrina de la ficha (`?panel=vitrina`).
// Sin el permiso, apagado con el motivo de `permisoDeVitrina()`.
export function BotonDeVitrinaDeLaFicha({
  vehiculo,
  permiso,
}: {
  vehiculo: DeLaFila
  permiso: PermisoDeVitrina
}) {
  const vitrina = usePanelDeVitrina()
  return (
    <BotonDeVitrinaDeLaFila
      vehiculo={vehiculo}
      alPublicar={vitrina.abrir}
      motivo={permiso.estado === 'deshabilitado' ? permiso.motivo : null}
      className="md:size-11"
    />
  )
}
