'use client'

import { useEffect, useRef } from 'react'
import type { PaginaDeRecordatorios } from '../../../entities/pagina-de-recordatorios'
import type { Recordatorio } from '../../../entities/recordatorios'
import { useRecordatorios } from '../hooks/use-recordatorios'
import { BloqueDeRecordatorios, type FormaDelBloque } from './bloque-de-recordatorios'

type Props = {
  leadId: string
  zona: string
  // Los que nacieron con un seguimiento (el «Próximo contacto» de la ficha): se ponen en su lugar.
  agendados?: readonly Recordatorio[]
  // Lo leído en el servidor (el resumen de la ficha): sin esto, se lee la primera página al montar.
  inicial?: PaginaDeRecordatorios
} & FormaDelBloque

// «Tus recordatorios» de un lead con su lectura por páginas: lo que montan el resumen del bloque de la ficha (con `inicial`) y «Ver todos».
export function RecordatoriosDelLead({ leadId, zona, agendados = [], inicial, ...forma }: Props) {
  const recordatorios = useRecordatorios(leadId, inicial)
  const puestos = useRef(new Set<string>())
  const { poner } = recordatorios
  useEffect(() => {
    for (const r of agendados) {
      if (!puestos.current.has(r.id)) {
        puestos.current.add(r.id)
        poner(r)
      }
    }
  }, [agendados, poner])
  return (
    <BloqueDeRecordatorios leadId={leadId} zona={zona} recordatorios={recordatorios} {...forma} />
  )
}
