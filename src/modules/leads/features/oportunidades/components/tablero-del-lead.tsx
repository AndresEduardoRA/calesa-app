'use client'

import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  type Announcements,
  type CollisionDetection,
} from '@dnd-kit/core'
import { useId } from 'react'
import type { EtapaGuardada } from '../../../entities/embudo'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import type { TableroDelLead } from '../../../entities/tablero-del-lead'
import { useArrastreDelTablero } from '../hooks/use-arrastre-del-tablero'
import { ColumnaDelLead } from './columna-del-lead'
import { TarjetaFlotante, type AccionesDeLaTarjeta } from './tarjeta-del-lead'

type Props = {
  tablero: TableroDelLead<OportunidadDelLead>
  // Cartera y `leads.editar`: sólo quien edita arrastra y ve el «⋯» (la base lo vuelve a decidir).
  puedeEditar: boolean
  // La que está moviéndose (se pidió y la base no respondió): no se toma otra vez.
  ocupada: string | null
  alMover: (o: OportunidadDelLead, etapa: EtapaGuardada, motivo: string | null) => Promise<boolean>
  alPedirMotivo: (o: OportunidadDelLead, etapa: EtapaGuardada) => void
  alEditar: (o: OportunidadDelLead) => void
  alEliminar: (o: OportunidadDelLead) => void
}

export const INSTRUCCIONES_DE_MOVIDA =
  'Para mover a otra etapa, pulsa Espacio, usa las flechas y pulsa Espacio otra vez. Esc cancela.'

// Con el mouse, la tarjeta cae bajo el puntero; con el teclado no hay puntero y vale la mayor intersección con la columna.
const colision: CollisionDetection = (args) => {
  const bajoElPuntero = pointerWithin(args)
  return bajoElPuntero.length > 0 ? bajoElPuntero : rectIntersection(args)
}

function anuncios(
  etapas: readonly EtapaGuardada[],
  lista: readonly OportunidadDelLead[],
): Announcements {
  const titulo = (id: string | number) =>
    `«${lista.find((o) => o.id === String(id))?.titulo ?? ''}»`
  const nombre = (id: string | number) =>
    `«${etapas.find((e) => e.id === String(id))?.nombre ?? ''}»`
  return {
    onDragStart: ({ active }) =>
      `Tomaste ${titulo(active.id)}. Usa las flechas para cambiar de etapa.`,
    onDragOver: ({ active, over }) =>
      over === null ? undefined : `${titulo(active.id)} está sobre ${nombre(over.id)}.`,
    onDragEnd: ({ active, over }) =>
      over === null
        ? `Se canceló: ${titulo(active.id)} volvió a su etapa.`
        : `Soltaste ${titulo(active.id)} en ${nombre(over.id)}.`,
    onDragCancel: ({ active }) => `Se canceló: ${titulo(active.id)} volvió a su etapa.`,
  }
}

// El embudo del lead: una columna por etapa con las oportunidades de este lead, que se mueven arrastrando una a otra columna (mouse o teclado,
// `@dnd-kit`; el celular las mueve con «Mover a» del «⋯»). Soltar en una ganada o en otra abierta la mueve ya (vuelve y avisa si la base la rechaza);
// en una perdida pide el motivo, como «Mover a». Todo el código del arrastre llega en este componente, que se pide con `diferido()`.
export function TableroDelLeadConArrastre({
  tablero,
  puedeEditar,
  ocupada,
  alMover,
  alPedirMotivo,
  alEditar,
  alEliminar,
}: Props) {
  const id = useId()
  const etapas = tablero.embudo.etapas
  const lista = tablero.columnas.flatMap((c) => c.oportunidades)
  const arrastre = useArrastreDelTablero({ etapas, lista, alMover, alPedirMotivo })
  const accionesDe = (o: OportunidadDelLead): AccionesDeLaTarjeta => ({
    etapas,
    puedeEditar,
    ocupada: ocupada === o.id,
    alMover: (etapa, motivo) => alMover(o, etapa, motivo),
    alPedirMotivo: (etapa) => {
      alPedirMotivo(o, etapa)
    },
    alEditar: () => {
      alEditar(o)
    },
    alEliminar: () => {
      alEliminar(o)
    },
  })
  return (
    <DndContext
      id={id}
      sensors={arrastre.sensores}
      collisionDetection={colision}
      onDragStart={arrastre.alTomar}
      onDragEnd={arrastre.alSoltar}
      onDragCancel={arrastre.alCancelar}
      accessibility={{
        screenReaderInstructions: { draggable: INSTRUCCIONES_DE_MOVIDA },
        announcements: anuncios(etapas, lista),
      }}
    >
      {/* Desde 36 rem de bloque (en rem: con el texto al 200 % cae a la lista), una fila de columnas que se desplaza de costado; por debajo, las
          etapas una bajo otra. El margen y el relleno dejan ver el aro de foco de lo que toca el borde. */}
      <div
        role="group"
        aria-label={`Etapas de «${tablero.embudo.nombre}»`}
        className="-mx-1 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 px-1 pb-2 @xl/oportunidades:flex @xl/oportunidades:overflow-x-auto"
      >
        {tablero.columnas.map((columna) => (
          <ColumnaDelLead
            key={columna.etapa.id}
            columna={columna}
            accionesDe={accionesDe}
            arrastrando={arrastre.tomada !== null}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {arrastre.tomada ? <TarjetaFlotante oportunidad={arrastre.tomada} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
