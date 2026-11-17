'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useId, type ReactNode } from 'react'

type Props = {
  // Los ids de las filas, en su orden.
  ids: readonly string[]
  // El nombre de una fila para los anuncios del lector de pantalla.
  nombreDe: (id: string) => string
  ocupado: boolean
  alMover: (desde: number, hasta: number) => void
  children: ReactNode
}

export const INSTRUCCIONES_DE_ORDEN =
  'Para mover, pulsa Espacio, usa las flechas y pulsa Espacio otra vez. Esc cancela.'

// Las filas se mueven sólo de arriba abajo (sin `@dnd-kit/modifiers`).
const soloVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 })

function anuncios(ids: readonly string[], nombreDe: (id: string) => string): Announcements {
  const nombre = (id: string | number) => `«${nombreDe(String(id))}»`
  const lugar = (id: string | number) =>
    `el lugar ${String(ids.indexOf(String(id)) + 1)} de ${String(ids.length)}`
  return {
    onDragStart: ({ active }) => `Tomaste ${nombre(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over === null ? undefined : `${nombre(active.id)} va en ${lugar(over.id)}.`,
    onDragEnd: ({ active, over }) =>
      over === null
        ? `Se canceló: ${nombre(active.id)} volvió a su lugar.`
        : `Soltaste ${nombre(active.id)} en ${lugar(over.id)}.`,
    onDragCancel: ({ active }) => `Se canceló: ${nombre(active.id)} volvió a su lugar.`,
  }
}

// Una lista que se ordena arrastrando el asa de cada fila (`useFilaOrdenable` y `<AsaDeOrden>`) o con el teclado sobre el asa: Espacio la toma, las flechas
// la mueven, Espacio la suelta y Esc cancela; cada paso se anuncia en español. Al soltar en otro lugar llama `alMover(desde, hasta)`.
export function ListaOrdenable({ ids, nombreDe, ocupado, alMover, children }: Props) {
  const id = useId()
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const alSoltar = ({ active, over }: DragEndEvent) => {
    if (ocupado || over === null || active.id === over.id) return
    const desde = ids.indexOf(String(active.id))
    const hasta = ids.indexOf(String(over.id))
    if (desde >= 0 && hasta >= 0) alMover(desde, hasta)
  }
  return (
    <DndContext
      id={id}
      sensors={sensores}
      collisionDetection={closestCenter}
      modifiers={[soloVertical]}
      onDragEnd={alSoltar}
      accessibility={{
        screenReaderInstructions: { draggable: INSTRUCCIONES_DE_ORDEN },
        announcements: anuncios(ids, nombreDe),
      }}
    >
      <SortableContext items={[...ids]} strategy={verticalListSortingStrategy} disabled={ocupado}>
        {children}
      </SortableContext>
    </DndContext>
  )
}
