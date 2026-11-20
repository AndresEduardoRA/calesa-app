'use client'

import { useDraggable } from '@dnd-kit/core'
import { Monto } from '@/shared/ui/monto'
import type { EtapaGuardada } from '../../../entities/embudo'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import { rotuloDeVehiculoDeNota } from '../../../entities/vehiculo-de-nota'
import { MenuDeOportunidad } from './menu-de-oportunidad'

export type AccionesDeLaTarjeta = {
  etapas: readonly EtapaGuardada[]
  // Cartera y `leads.editar`: sin esto la tarjeta ni se arrastra ni lleva «⋯».
  puedeEditar: boolean
  ocupada: boolean
  alMover: (etapa: EtapaGuardada, motivo: string | null) => Promise<boolean>
  alPedirMotivo: (etapa: EtapaGuardada) => void
  alEditar: () => void
  alEliminar: () => void
}

type PropsDeLaPresentacion = {
  oportunidad: OportunidadDelLead
  acciones: AccionesDeLaTarjeta | null
}

// Lo que dice la tarjeta: el título (hasta dos líneas), el vehículo si lo tiene, el monto (sin monto, nada) y el motivo de una perdida. El «⋯» va
// arriba a la derecha, con «Mover a», «Editar» y «Eliminar».
function ContenidoDeLaTarjeta({ oportunidad: o, acciones }: PropsDeLaPresentacion) {
  return (
    <>
      <div className="flex min-w-0 items-start gap-1">
        <p
          title={o.titulo}
          className="line-clamp-2 min-w-0 flex-1 pt-1 text-(length:--text-sm) font-medium break-words text-(--color-ink)"
        >
          {o.titulo}
        </p>
        {acciones?.puedeEditar ? (
          <MenuDeOportunidad
            id={o.id}
            titulo={o.titulo}
            etapas={acciones.etapas}
            actual={o.etapaId}
            ocupada={acciones.ocupada}
            alMover={acciones.alMover}
            alPedirMotivo={acciones.alPedirMotivo}
            alEditar={acciones.alEditar}
            alEliminar={acciones.alEliminar}
          />
        ) : null}
      </div>
      {o.vehiculo ? (
        <p className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
          {rotuloDeVehiculoDeNota(o.vehiculo)}
        </p>
      ) : null}
      {o.monto === null ? null : (
        <Monto
          valor={o.monto}
          moneda={o.moneda}
          className="text-(length:--text-sm) text-(--color-ink) tabular-nums"
        />
      )}
      {o.estado === 'perdida' && o.motivoPerdida ? (
        <p className="line-clamp-2 text-(length:--text-xs) text-(--color-ink-soft)">
          Motivo: {o.motivoPerdida}
        </p>
      ) : null}
    </>
  )
}

const CLASES =
  'grid min-w-0 gap-1 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) p-2'

// La copia que sigue al puntero mientras se arrastra: sin «⋯» ni foco.
export function TarjetaFlotante({ oportunidad }: { oportunidad: OportunidadDelLead }) {
  return (
    <article
      aria-hidden
      className={`${CLASES} cursor-grabbing shadow-(--shadow-md) ring-1 ring-(--color-primario)`}
    >
      <ContenidoDeLaTarjeta oportunidad={oportunidad} acciones={null} />
    </article>
  )
}

// Una oportunidad del lead en su columna. Con permiso se arrastra con el mouse (desde cualquier parte menos el «⋯») y con el teclado (Tab a la
// tarjeta, Espacio la toma, flechas la llevan a la etapa de al lado, Espacio la suelta). En el celular no se arrastra: «Mover a» del «⋯». Sigue
// siendo un `article` (con su nombre), no un botón: lo que se hace con ella está en su «⋯».
export function TarjetaDelLead({ oportunidad, acciones }: PropsDeLaPresentacion) {
  const arrastrable = acciones !== null && acciones.puedeEditar
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: oportunidad.id,
    data: { etapaId: oportunidad.etapaId },
    disabled: !arrastrable || acciones.ocupada,
  })
  // `attributes` trae `role="button"` y `aria-pressed`: aquí es un `article`.
  const propias = arrastrable
    ? {
        tabIndex: attributes.tabIndex,
        'aria-describedby': attributes['aria-describedby'],
        'aria-roledescription': 'oportunidad arrastrable',
        ...listeners,
      }
    : {}
  return (
    <article
      ref={(nodo) => {
        setNodeRef(nodo)
        setActivatorNodeRef(nodo)
      }}
      aria-label={oportunidad.titulo}
      data-arrastrando={isDragging ? '' : undefined}
      {...propias}
      className={`${CLASES} ${arrastrable ? 'md:cursor-grab' : ''} ${isDragging ? 'opacity-40' : ''} outline-none focus-visible:shadow-(--shadow-focus)`}
    >
      <ContenidoDeLaTarjeta oportunidad={oportunidad} acciones={acciones} />
    </article>
  )
}
