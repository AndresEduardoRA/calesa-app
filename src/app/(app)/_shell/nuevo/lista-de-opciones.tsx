'use client'

import {
  BellPlusIcon,
  CalculatorIcon,
  CalendarPlusIcon,
  CarIcon,
  ListChecksIcon,
  MessageSquarePlusIcon,
  UserPlusIcon,
  WrenchIcon,
  type LucideIcon,
} from 'lucide-react'
import type { KeyboardEvent, Ref } from 'react'
import { CATALOGO_DE_NUEVO, type ClaveDeNuevo } from './catalogo'

const ICONO: Record<ClaveDeNuevo, LucideIcon> = {
  lead: UserPlusIcon,
  vehiculo: CarIcon,
  'vehiculo-al-cotizar': CarIcon,
  cotizacion: CalculatorIcon,
  proyecto: WrenchIcon,
  seguimiento: MessageSquarePlusIcon,
  recordatorio: BellPlusIcon,
  evento: CalendarPlusIcon,
  tarea: ListChecksIcon,
}

type Props = {
  opciones: readonly ClaveDeNuevo[]
  alElegir: (clave: ClaveDeNuevo) => void
  // El puntero o el foco llegó a una opción: quien la conoce pide por adelantado lo que va a necesitar.
  alAdelantar: (clave: ClaveDeNuevo) => void
  // El primer botón (el de «Lead» si puede): el foco del modal al abrir, para que Enter lo abra.
  primero: Ref<HTMLButtonElement>
}

// Flechas arriba y abajo recorren las opciones (Tab también): el foco queda en el botón y Enter elige.
function moverConFlechas(evento: KeyboardEvent<HTMLUListElement>) {
  if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') {
    return
  }
  const botones = Array.from(evento.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
  const actual = botones.indexOf(document.activeElement as HTMLButtonElement)
  const paso = evento.key === 'ArrowDown' ? 1 : -1
  botones.at((actual + paso) % botones.length)?.focus()
  evento.preventDefault()
}

// Lo que se puede crear, una fila por cosa: el nombre y qué es. 44 px de alto en el celular; las filas crecen con el texto.
export function ListaDeOpciones({ opciones, alElegir, alAdelantar, primero }: Props) {
  return (
    <ul aria-label="Qué crear" className="grid gap-1" onKeyDown={moverConFlechas}>
      {opciones.map((clave, i) => {
        const opcion = CATALOGO_DE_NUEVO[clave]
        const Icono = ICONO[clave]
        return (
          <li key={clave}>
            <button
              ref={i === 0 ? primero : undefined}
              type="button"
              onClick={() => {
                alElegir(clave)
              }}
              onPointerEnter={() => {
                alAdelantar(clave)
              }}
              onFocus={() => {
                alAdelantar(clave)
              }}
              className="focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 py-2 text-left hover:bg-(--color-surface-2) focus-visible:ring-3 focus-visible:outline-none md:min-h-10"
            >
              <Icono aria-hidden className="size-4 shrink-0 text-(--color-ink-soft)" />
              <span className="grid min-w-0">
                <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
                  {opcion.titulo}
                </span>
                <span className="text-(length:--text-xs) text-(--color-ink-soft)">
                  {opcion.descripcion}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
