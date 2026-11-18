'use client'

import { ArrowDownIcon, ArrowUpIcon, XIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export type DatoClaveDeLaLista = {
  // Única en la lista: `comun:<clave>` o `campo:<clave>`.
  llave: string
  etiqueta: string
  // De dónde sale: «Dato común» o el grupo del campo.
  deDonde: string
}

type Props = {
  dato: DatoClaveDeLaLista
  posicion: number
  esPrimero: boolean
  esUltimo: boolean
  // Sin permiso o con un cambio en vuelo: los botones no hacen nada y el lector oye el motivo (`describir`).
  apagado: boolean
  describir: string | undefined
  alSubir: () => void
  alBajar: () => void
  alQuitar: () => void
}

// Un botón de la fila: 44 px en el celular, con su nombre completo para el lector («Subir «Año»»). En el borde, `disabled` con su
// `title`, como las flechas del layout.
function BotonDeLaFila(props: {
  Icono: LucideIcon
  verbo: string
  etiqueta: string
  variante: 'ghost' | 'outline'
  enElBorde?: string | undefined
  apagado: boolean
  describir: string | undefined
  alElegir: () => void
}) {
  const { Icono, verbo, etiqueta, variante, enElBorde, apagado, describir, alElegir } = props
  return (
    <Button
      type="button"
      variant={variante}
      className="h-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 max-sm:flex-1 md:h-8"
      disabled={enElBorde !== undefined}
      title={enElBorde}
      aria-disabled={apagado || undefined}
      aria-describedby={describir}
      onClick={() => {
        if (!apagado) alElegir()
      }}
    >
      <Icono aria-hidden />
      <span className="sr-only">{`${verbo} «${etiqueta}»`}</span>
      <span aria-hidden>{verbo}</span>
    </Button>
  )
}

// Un dato clave en su lugar: el número, la etiqueta, de dónde sale y «Subir», «Bajar» y «Quitar».
export function FilaDeDatoClave(props: Props) {
  const { dato, posicion, esPrimero, esUltimo, apagado, describir } = props
  const comun = { etiqueta: dato.etiqueta, apagado, describir }
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
      <span className="w-6 shrink-0 text-(length:--text-sm) text-(--color-ink-faint) tabular-nums">
        {posicion}
      </span>
      <span className="grid min-w-40 flex-1 gap-0.5">
        <span className="text-(length:--text-base) font-medium break-words text-(--color-ink)">
          {dato.etiqueta}
        </span>
        <span className="text-(length:--text-sm) text-(--color-ink-faint)">{dato.deDonde}</span>
      </span>
      <span className="flex w-full gap-2 sm:w-auto">
        <BotonDeLaFila
          {...comun}
          Icono={ArrowUpIcon}
          verbo="Subir"
          variante="ghost"
          enElBorde={esPrimero ? 'Ya es el primero.' : undefined}
          alElegir={props.alSubir}
        />
        <BotonDeLaFila
          {...comun}
          Icono={ArrowDownIcon}
          verbo="Bajar"
          variante="ghost"
          enElBorde={esUltimo ? 'Ya es el último.' : undefined}
          alElegir={props.alBajar}
        />
        <BotonDeLaFila
          {...comun}
          Icono={XIcon}
          verbo="Quitar"
          variante="outline"
          alElegir={props.alQuitar}
        />
      </span>
    </li>
  )
}
