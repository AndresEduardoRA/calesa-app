'use client'

import type { FilaDeLead } from '../../../entities/listado'
import { MenuDeLead } from '../../marcas/components/menu-de-lead'
import { useIrALasOportunidades } from '../../oportunidades/hooks/use-ir-a-las-oportunidades'
import {
  accionesDelMenu,
  editarDelMenu,
  rutasDelMenu,
  type ParaMarcar,
  verOportunidadesDelMenu,
} from './tipos'

// El «⋯» de un lead en la fila de la tabla o en la tarjeta de la lista: la lista única (`entities/acciones-de-lead.ts`) con lo que cada
// acción hace desde el listado. Lo de cada fila sale de lo que la página trajo una vez (`ParaMarcar`): ningún pedido por fila.
export function MenuDeLaFila({ lead, marcar }: { lead: FilaDeLead; marcar: ParaMarcar }) {
  const irALasOportunidades = useIrALasOportunidades()
  const rutas = rutasDelMenu(marcar, lead)
  return (
    <MenuDeLead
      leadId={lead.id}
      nombre={lead.nombre}
      marcas={lead.marcas}
      etiquetas={marcar.etiquetas}
      alGestionar={marcar.alGestionar}
      puedeEnviar={marcar.eliminables.includes(lead.id)}
      paraCotizar={rutas.paraCotizar}
      acciones={accionesDelMenu(marcar, lead)}
      verOportunidades={verOportunidadesDelMenu(irALasOportunidades, lead)}
      editar={editarDelMenu(marcar, lead)}
      paraActividad={rutas.paraActividad}
    />
  )
}
