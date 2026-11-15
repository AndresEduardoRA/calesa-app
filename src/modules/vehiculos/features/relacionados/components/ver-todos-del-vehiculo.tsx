'use client'

import type { ReactNode } from 'react'
import type {
  FilaRelacionada,
  LeadRelacionado,
  TipoDeRelacion,
} from '../../../entities/relacionados'
import { DrawerDeRelacionadosDiferido, DrawerDeVinculosDiferido } from './diferidos'

type Props = {
  vehiculoId: string
  // El grupo abierto en la URL (`?relacionados=`), y el último que se abrió: el drawer que se cierra no se vacía.
  tipo: TipoDeRelacion | null
  ultimoTipo: TipoDeRelacion | null
  alCerrar: () => void
  filaDe: (fila: FilaRelacionada<LeadRelacionado>, clave: string) => ReactNode
}

// El «Ver todos» de un grupo en un vehículo: de Vinculado, el vínculo vigente y los anteriores; de Interesado y Cotizado, la lista de leads por cursor.
export function VerTodosDelVehiculo({ vehiculoId, tipo, ultimoTipo, alCerrar, filaDe }: Props) {
  return (
    <>
      <DrawerDeVinculosDiferido
        abierto={tipo === 'vinculado'}
        alCerrar={alCerrar}
        vehiculoId={vehiculoId}
      />
      {ultimoTipo !== null && ultimoTipo !== 'vinculado' ? (
        <DrawerDeRelacionadosDiferido
          abierto={tipo === ultimoTipo}
          alCerrar={alCerrar}
          lista={{ lado: 'vehiculo', id: vehiculoId, tipo: ultimoTipo }}
          sustantivo="leads"
          filaDe={(fila) => {
            const delLead = fila as FilaRelacionada<LeadRelacionado>
            const cotizacion =
              delLead.detalle.tipo === 'cotizado' ? delLead.detalle.cotizacion.id : ''
            return filaDe(
              delLead,
              `todos-${ultimoTipo}-${delLead.contraparte.leadId}-${cotizacion}`,
            )
          }}
        />
      ) : null}
    </>
  )
}
