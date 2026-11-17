'use client'

import { XIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { ID_DEL_PANEL_DEL_PASO } from '@/modules/repuestos/pantallas/flujo-pasos'
import { Button } from '@/shared/ui/button'

type Props = {
  titulo: string
  // Lo abrió el botón de un ítem: el foco va al título del panel (si no, se quedaría en una fila que ya no se usa).
  enfocar: boolean
  alEnfocar: () => void
  alCerrar: () => void
  children: ReactNode
}

// El panel de un paso, bajo los pasos y antes de la hoja (que sigue a la vista): su título, «Cerrar» y lo que dibuja el servidor (Cotizaciones, Pagos o Compras).
export function PanelDelPaso({ titulo, enfocar, alEnfocar, alCerrar, children }: Props) {
  const encabezado = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (!enfocar) return
    encabezado.current?.focus()
    encabezado.current?.scrollIntoView({ block: 'nearest' })
    alEnfocar()
  }, [enfocar, alEnfocar])
  return (
    <section
      id={ID_DEL_PANEL_DEL_PASO}
      aria-labelledby={`${ID_DEL_PANEL_DEL_PASO}-titulo`}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id={`${ID_DEL_PANEL_DEL_PASO}-titulo`}
          ref={encabezado}
          tabIndex={-1}
          className="text-(length:--text-lg) font-semibold outline-none focus-visible:shadow-(--shadow-focus)"
        >
          {titulo}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 md:min-h-9"
          aria-label={`Cerrar ${titulo}`}
          onClick={alCerrar}
        >
          <XIcon aria-hidden />
          Cerrar
        </Button>
      </div>
      {children}
    </section>
  )
}
