'use client'

import { Button } from '@/shared/ui/button'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { usePanelAgregarVehiculo } from '../../vinculo/hooks/use-panel-agregar-vehiculo'

// La única acción del título del bloque «Vehículos» de la ficha del lead (con la cartera y `leads.editar`): abre el panel «Vincular o marcar un
// vehículo» (`?panel=agregar-vehiculo`). Sólo abre: el panel, la URL y la vuelta del foco son de `GestionDelLead`, que devuelve el foco acá.
export function VincularOMarcar() {
  const panel = usePanelAgregarVehiculo({ soloAbrir: true })
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11 md:min-h-8"
      onClick={() => {
        recordarQuienAbre()
        panel.abrir()
      }}
    >
      Vincular o marcar
    </Button>
  )
}
