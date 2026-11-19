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
import { GripVerticalIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useAsaDeFila } from '../../hooks/use-asa-de-fila'

export const INSTRUCCIONES_DE_LAS_FILAS =
  'Para mover la fila, pulsa Espacio, usa las flechas y pulsa Espacio otra vez. Esc cancela. → vuelve a la tarjeta.'

// Las filas se mueven sólo de arriba abajo (sin `@dnd-kit/modifiers`).
const soloVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 })

function anuncios(ids: readonly string[], numeroDe: (id: string) => number): Announcements {
  const fila = (id: string | number) => `la fila ${String(numeroDe(String(id)))}`
  const lugar = (id: string | number) => String(ids.indexOf(String(id)) + 1)
  const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
  return {
    onDragStart: ({ active }) => `Tomaste ${fila(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over === null
        ? undefined
        : `${mayuscula(fila(active.id))} va en el lugar ${lugar(over.id)} de ${String(ids.length)}.`,
    onDragEnd: ({ active, over }) =>
      over === null
        ? `Se canceló: ${fila(active.id)} volvió a su lugar.`
        : `Soltaste ${fila(active.id)} en el lugar ${lugar(over.id)}.`,
    onDragCancel: ({ active }) => `Se canceló: ${fila(active.id)} volvió a su lugar.`,
  }
}

type PropsDelOrden = {
  // Los ids de las filas que se dibujan, en su orden.
  ids: readonly string[]
  // El número de una fila (su índice + 1) para los anuncios.
  numeroDe: (id: string) => number
  ocupado: boolean
  alMover: (desde: string, hasta: string) => void
  children: ReactNode
}

// El orden de las filas del lienzo con dnd-kit, como el orden del diseño: el asa se arrastra o se toma con el teclado (Espacio la toma, las flechas la mueven, Espacio la
// suelta y Esc cancela), con anuncios en español. Envuelve toda la capa: la región de los anuncios no puede quedar dentro de la grilla.
export function OrdenDeLasFilas({ ids, numeroDe, ocupado, alMover, children }: PropsDelOrden) {
  const id = useId()
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const alSoltar = ({ active, over }: DragEndEvent) => {
    if (ocupado || over === null || active.id === over.id) return
    alMover(String(active.id), String(over.id))
  }
  return (
    <DndContext
      id={id}
      sensors={sensores}
      collisionDetection={closestCenter}
      modifiers={[soloVertical]}
      onDragEnd={alSoltar}
      accessibility={{
        screenReaderInstructions: { draggable: INSTRUCCIONES_DE_LAS_FILAS },
        announcements: anuncios(ids, numeroDe),
      }}
    >
      <SortableContext items={[...ids]} strategy={verticalListSortingStrategy} disabled={ocupado}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

type PropsDelAsa = {
  id: string
  numero: number
  // Su banda, en px del lienzo ya escalados (sin el margen de arriba).
  alto: number
  ocupado: boolean
  elegida: boolean
  alElegir: (extender: boolean) => void
  // → (sin estar arrastrando) devuelve el foco a la grilla.
  alVolver: () => void
}

// El asa de una fila (`role="rowheader"`): se arrastra para ordenar o se toca para elegir la fila. Fuera del orden de Tab (la grilla lleva un solo `tabindex=0`): se llega
// con ← desde la columna A.
export function AsaDeLaFila({
  id,
  numero,
  alto,
  ocupado,
  elegida,
  alElegir,
  alVolver,
}: PropsDelAsa) {
  const { alMontar, estilo, asa, arrastrando } = useAsaDeFila(id, ocupado)
  const { alMontar: alMontarElAsa, atributos, oyentes } = asa
  return (
    <div
      role="rowheader"
      aria-colindex={1}
      ref={alMontar}
      style={{ ...estilo, height: alto }}
      className="pointer-events-auto absolute top-0 left-0 w-[44px]"
      data-asa-de-fila={id}
    >
      <button
        type="button"
        ref={alMontarElAsa}
        {...atributos}
        {...oyentes}
        tabIndex={-1}
        aria-label={`Mover la fila ${String(numero)}`}
        {...(elegida ? { 'data-elegida': '' } : {})}
        onClick={(e) => {
          alElegir(e.shiftKey)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' && !arrastrando) {
            e.preventDefault()
            alVolver()
            return
          }
          oyentes?.['onKeyDown']?.(e)
        }}
        className="flex size-full min-h-0 cursor-grab touch-none items-center justify-center gap-0.5 rounded-(--radius-sm) text-(length:--text-xs) text-(--color-ink-soft) tabular-nums outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) active:cursor-grabbing aria-pressed:bg-(--color-primario-soft) data-elegida:bg-(--color-primario-soft) data-elegida:text-(--color-ink)"
      >
        <GripVerticalIcon aria-hidden className="size-3 shrink-0" />
        {numero}
      </button>
    </div>
  )
}
