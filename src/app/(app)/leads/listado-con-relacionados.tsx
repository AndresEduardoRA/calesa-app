'use client'

import { createContext, useContext, type ComponentProps } from 'react'
import { ListadoDeLeads } from '@/modules/leads/pantallas/listado'
import type { ParaRelacionados } from '@/modules/vehiculos'
import { RelacionadosDelResumenDeLeadDiferido } from '@/modules/vehiculos/pantallas/relacionados-resumen-de-lead'

// Lo que las acciones de «Relacionados» necesitan de `cotizaciones` y `leads` (lo arma `page.tsx`). Va por contexto porque el hueco es un componente de módulo (estable: un objeto armado en
// cada render lo desmontaría y volvería a leer).
const ParaDelResumen = createContext<ParaRelacionados | null>(null)

// El bloque «Relacionados» del resumen del lead: sus vehículos, leídos al abrir (`vehiculos` no lo importa `leads`: lo une `src/app`).
function Relacionados({ leadId }: { leadId: string }) {
  const para = useContext(ParaDelResumen)
  return para === null ? null : <RelacionadosDelResumenDeLeadDiferido leadId={leadId} para={para} />
}

const HUECOS = { Relacionados }

type Props = Omit<ComponentProps<typeof ListadoDeLeads>, 'huecosDelResumen'> & {
  // Nulo si quien mira no ve vehículos: el resumen no dibuja el bloque.
  para: ParaRelacionados | null
}

// El listado de leads con «Relacionados» en su resumen: copia del patrón de `cotizaciones/listado-con-acciones.tsx`. Es un Client Component porque un componente no cruza de servidor a cliente como prop.
export function ListadoConRelacionados({ para, ...props }: Props) {
  return (
    <ParaDelResumen value={para}>
      <ListadoDeLeads {...props} huecosDelResumen={para === null ? {} : HUECOS} />
    </ParaDelResumen>
  )
}
