'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { VehiculosDelLead } from '../../../entities/vehiculos-del-lead'
import { useDesvincularPorUrl } from '../hooks/use-desvincular-por-url'
import { usePanelAgregarVehiculo } from '../hooks/use-panel-agregar-vehiculo'
import { useVinculo } from '../hooks/use-vinculo'
import { ConfirmarDesvincularDiferido, PanelAgregarVehiculoDiferido } from './diferidos'
import { HistorialDeVinculos } from './historial-de-vinculos'

type Props = { leadId: string; leadNombre: string; datos: VehiculosDelLead }

// La gestión de los vehículos del lead que no repite Relacionados: «Vínculos anteriores» (sólo los de vehículos que quien mira ve), el
// panel «Vincular o marcar un vehículo» (con la cartera: `puedoActuar`; sin ella la URL no abre nada) y la confirmación de desvincular,
// que pide quien no podría volver a vincular (quien sí, desvincula en la fila de Relacionados con «Deshacer»).
export function GestionDelLead({ leadId, leadNombre, datos }: Props) {
  const acciones = useVinculo(leadId)
  const panel = usePanelAgregarVehiculo()
  const agregando = datos.puedoActuar && panel.abierto
  const montarPanel = useAbiertoAlgunaVez(agregando)
  const confirmacion = useDesvincularPorUrl(datos.vinculados, !datos.puedoActuar)
  const montarConfirmar = useAbiertoAlgunaVez(confirmacion.abierto)
  return (
    <>
      {datos.historial.length > 0 ? (
        <HistorialDeVinculos historial={datos.historial} hayMas={datos.hayMas.historial} />
      ) : null}
      {montarPanel ? (
        <PanelAgregarVehiculoDiferido
          abierto={agregando}
          alCerrar={panel.cerrar}
          leadId={leadId}
          leadNombre={leadNombre}
          acciones={acciones}
        />
      ) : null}
      {montarConfirmar ? (
        <ConfirmarDesvincularDiferido
          abierto={confirmacion.abierto}
          vehiculo={confirmacion.vehiculo}
          enCurso={acciones.enCurso}
          alCerrar={confirmacion.cerrar}
          alConfirmar={async () => {
            if (confirmacion.vehiculo) {
              await acciones.desvincular(confirmacion.vehiculo, { deshacer: false })
            }
            confirmacion.cerrar()
          }}
        />
      ) : null}
    </>
  )
}
