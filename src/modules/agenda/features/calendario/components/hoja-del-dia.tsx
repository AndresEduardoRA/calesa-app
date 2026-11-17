'use client'

import type { ReactNode } from 'react'
import { useAhora } from '@/shared/ui/use-ahora'
import type { EntradaDeAgenda } from '../../../entities/agenda'
import {
  hojaDelDia,
  ROTULO_DE_ANTES,
  ROTULO_DE_DESPUES,
  type TramoFuera,
} from '../../../entities/hoja-del-dia'
import { ChipEvento } from './chip-de-agenda'

type Props = {
  fecha: string
  entradas: readonly EntradaDeAgenda[]
  zona: string
  // El instante en que el servidor dibujó la pantalla (ISO): la marca de «ahora» parte de él y avanza cada minuto, sin recargar.
  ahora: string
}

function Chips({ entradas, zona }: { entradas: readonly EntradaDeAgenda[]; zona: string }) {
  return entradas.length > 0 ? (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
      {entradas.map((entrada) => (
        <li key={`${entrada.clave}-${entrada.id}`} className="min-w-0">
          <ChipEvento entrada={entrada} zona={zona} />
        </li>
      ))}
    </ul>
  ) : null
}

// Una fila de la hoja: la hora (o el rótulo de lo que cae fuera de la jornada) y lo suyo. La de ahora lleva el borde de acento y «Ahora» en texto (nunca sólo color).
function Fila({
  etiqueta,
  ahora,
  children,
}: {
  etiqueta: string
  ahora: boolean
  children: ReactNode
}) {
  return (
    <li
      aria-current={ahora ? 'time' : undefined}
      className={`grid min-h-9 grid-cols-[minmax(0,4.5rem)_minmax(0,1fr)] items-start gap-3 border-t py-1.5 ${
        ahora
          ? 'border-t-2 border-(--color-primario) bg-(--color-primario-soft)/40'
          : 'border-(--color-line)'
      }`}
    >
      <span className="grid text-(length:--text-sm) break-words text-(--color-ink-soft) tabular-nums">
        {etiqueta}
        {ahora ? <span className="font-semibold text-(--color-primario-ink)">Ahora</span> : null}
      </span>
      <div className="min-w-0">{children}</div>
    </li>
  )
}

function Fuera({
  rotulo,
  tramo,
  zona,
}: {
  rotulo: string
  tramo: TramoFuera<EntradaDeAgenda>
  zona: string
}) {
  // «Antes» y «Después» sólo aparecen si traen algo o la marca de ahora.
  return tramo.entradas.length > 0 || tramo.ahora ? (
    <Fila etiqueta={rotulo} ahora={tramo.ahora}>
      <Chips entradas={tramo.entradas} zona={zona} />
    </Fila>
  ) : null
}

// La hoja del día: las horas de la jornada siempre a la vista, con lo que pasa en cada una (eventos, tareas con vencimiento, recordatorios y cierres de
// subasta), lo de antes arriba y lo de después abajo, y la hora actual marcada si el día es hoy. La hora es la de la zona de la empresa.
export function HojaDelDia({ fecha, entradas, zona, ahora }: Props) {
  const instante = useAhora(ahora)
  const hoja = hojaDelDia(entradas, { dia: fecha, zona, ahora: instante.toISOString() })
  return (
    <section aria-label="Hoja del día" className="min-w-0">
      <ol
        aria-label="Horas"
        className="grid grid-cols-[minmax(0,1fr)] border-b border-(--color-line)"
      >
        <Fuera rotulo={ROTULO_DE_ANTES} tramo={hoja.antes} zona={zona} />
        {hoja.horas.map((fila) => (
          <Fila key={fila.hora} etiqueta={fila.etiqueta} ahora={fila.ahora}>
            <Chips entradas={fila.entradas} zona={zona} />
          </Fila>
        ))}
        <Fuera rotulo={ROTULO_DE_DESPUES} tramo={hoja.despues} zona={zona} />
      </ol>
    </section>
  )
}
