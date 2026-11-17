'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { AccionesDelRequisito } from '../../../entities/mover/accion-de-requisito'
import { usePedirloPorUrl } from '../hooks/use-pedirlo-por-url'
import { ModalParaPedirloDiferido } from './diferidos-de-que-falta'

// «Pedirlo» de «Qué falta» en un vehículo: la URL se mira aquí y el modal llega con `diferido()` la primera vez que se abre (y queda montado para irse con su
// animación). Una apertura nueva lo monta de nuevo (`key`): otro id del intento y nada elegido.
export function PedirloDeQueFalta({
  vehiculoId,
  acciones,
}: {
  vehiculoId: string
  acciones: Readonly<Record<string, AccionesDelRequisito>>
}) {
  const { abierto, apertura, pedido, cerrar } = usePedirloPorUrl(acciones)
  const montado = useAbiertoAlgunaVez(abierto)
  if (!montado || pedido === null) return null
  return (
    <ModalParaPedirloDiferido
      key={apertura}
      abierto={abierto}
      cerrar={cerrar}
      vehiculoId={vehiculoId}
      pedido={pedido}
    />
  )
}
