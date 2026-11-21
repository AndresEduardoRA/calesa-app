'use client'

import { useDroppable } from '@dnd-kit/core'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import type { ColumnaDelLead } from '../../../entities/tablero-del-lead'
import { PuntoDeColor } from '../../etiquetas/components/insignia-de-etiqueta'
import { TarjetaDelLead, type AccionesDeLaTarjeta } from './tarjeta-del-lead'

type Props = {
  columna: ColumnaDelLead<OportunidadDelLead>
  // Lo de cada tarjeta menos lo que depende de ella (sus acciones las arma el tablero con la oportunidad).
  accionesDe: (o: OportunidadDelLead) => AccionesDeLaTarjeta
  // Hay una tarjeta en el aire: las columnas vacías muestran dónde se puede soltar.
  arrastrando: boolean
}

// Una etapa del embudo del lead: su nombre sobre su color y las oportunidades de este lead que hay en ella. Es el destino de soltar (`useDroppable`,
// con el id de la etapa). En escritorio es una columna angosta del tablero, que se desplaza de costado; en el celular, un bloque más de la lista de
// etapas (una vacía es sólo su encabezado: no se arrastra ahí, «Mover a» está en el «⋯»).
export function ColumnaDelLead({ columna, accionesDe, arrastrando }: Props) {
  const { etapa, oportunidades } = columna
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id })
  const vacia = oportunidades.length === 0
  return (
    <section
      ref={setNodeRef}
      aria-label={etapa.nombre}
      data-etapa={etapa.id}
      data-sobre={isOver ? '' : undefined}
      className={`grid min-w-0 content-start gap-2 rounded-(--radius-card) p-2 @xl/oportunidades:w-44 @xl/oportunidades:shrink-0 ${
        isOver
          ? 'bg-(--color-primario-soft) ring-1 ring-(--color-primario)'
          : 'bg-(--color-surface-2)'
      }`}
    >
      <h3 className="flex min-w-0 items-center gap-2 px-1 text-(length:--text-sm) font-medium text-(--color-ink)">
        <PuntoDeColor color={etapa.color} className="size-2.5 shrink-0" />
        <span className="truncate">{etapa.nombre}</span>
      </h3>
      {vacia ? (
        <div
          className={`hidden min-h-16 rounded-(--radius-md) border border-dashed @xl/oportunidades:block ${
            arrastrando ? 'border-(--color-primario)' : 'border-(--color-line)'
          }`}
        />
      ) : (
        <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
          {oportunidades.map((o) => (
            <li key={o.id} className="min-w-0">
              <TarjetaDelLead oportunidad={o} acciones={accionesDe(o)} />
            </li>
          ))}
        </ul>
      )}
      {columna.hayMasAqui ? (
        <p className="px-1 text-(length:--text-xs) text-(--color-ink-soft)">
          Hay más en esta etapa.
        </p>
      ) : null}
    </section>
  )
}
