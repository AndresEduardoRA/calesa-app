'use client'

import { Button } from '@/shared/ui/button'
import {
  PARA_EDITAR_UNA_OCULTA,
  textoDeLaOculta,
} from '../../../../entities/plantilla/edicion/ocultas'
import type { OcultaParaEditar } from '../../../../entities/vista-previa-de-la-plantilla'

type Props = {
  ocultas: readonly OcultaParaEditar[]
  // Elige la fila (para cambiar su «Ocultar si…» desde el panel).
  alElegir: (fila: string) => void
}

// «Ocultas con esta referencia (N)»: las filas que la tarjeta no dibuja con la referencia elegida, cada una con su rótulo, por qué y «Seleccionar la fila». Sin ocultas,
// nada.
export function OcultasConEstaReferencia({ ocultas, alElegir }: Props) {
  if (ocultas.length === 0) return null
  return (
    <section
      aria-label="Ocultas con esta referencia"
      className="grid gap-1.5"
      data-ocultas-con-esta-referencia=""
    >
      <h4 className="text-(length:--text-sm) font-semibold">
        Ocultas con esta referencia ({ocultas.length})
      </h4>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {ocultas.map((o) => (
          <li
            key={o.fila}
            data-oculta={o.fila}
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-(length:--text-sm)"
          >
            <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{o.etiqueta}</span>
            <span className="min-w-0 [overflow-wrap:anywhere] text-(--color-ink-soft)">
              — {textoDeLaOculta(o)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 md:min-h-8"
              onClick={() => {
                alElegir(o.fila)
              }}
            >
              Seleccionar la fila
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-(length:--text-xs) text-(--color-ink-soft)">{PARA_EDITAR_UNA_OCULTA}</p>
    </section>
  )
}
