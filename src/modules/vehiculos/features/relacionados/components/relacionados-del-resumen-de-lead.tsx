'use client'

import { useUltimo } from '@/shared/ui/use-ultimo'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerRelacionadosDelLeadEnElNavegador } from '../../../composicion.client'
import type { ParaRelacionados } from '../../../entities/acciones-de-relacionados'
import type { RelacionadosDelLead } from '../../../entities/relacionados'
import { ErrorDeRelacionados } from './error-de-relacionados'
import { EsqueletoDeRelacionados } from './esqueleto-de-relacionados'
import { RelacionadosDeUnLead } from './relacionados-de-un-lead'

type Props = { leadId: string; para: ParaRelacionados }

// «Relacionados» en el resumen del listado de leads: se lee al abrir y otra vez tras cada acción lograda; mientras vuelve a leer se sigue viendo lo anterior. «Quitar interés», «Desvincular»
// (con la cartera) y «Cotizar» se hacen en el lugar; lo demás lleva a la ficha del lead.
export function RelacionadosDelResumenDeLead({ leadId, para }: Props) {
  const { lectura, reintentar } = useLecturaAlMontar(
    () => leerRelacionadosDelLeadEnElNavegador(leadId),
    leadId,
  )
  const anterior = useUltimo<RelacionadosDelLead>(lectura.estado === 'leido' ? lectura.dato : null)
  const datos = lectura.estado === 'leido' ? lectura.dato : anterior
  if (datos !== null && datos.leadId === leadId) {
    return (
      <div aria-busy={lectura.estado === 'leyendo'}>
        <RelacionadosDeUnLead
          datos={datos}
          lugar="resumen"
          para={para}
          alCambiar={reintentar}
          presentacion="linea"
        />
      </div>
    )
  }
  return lectura.estado === 'fallo' ? (
    <ErrorDeRelacionados presentacion="linea" alReintentar={reintentar} />
  ) : (
    <EsqueletoDeRelacionados presentacion="linea" />
  )
}
