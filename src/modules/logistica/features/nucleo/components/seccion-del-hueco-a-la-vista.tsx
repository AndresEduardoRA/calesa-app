'use client'

import { useId, useRef, type ReactNode } from 'react'
import { ATRIBUTO_DEL_BLOQUE, useAlPedirAbrirElHueco } from '../hooks/eventos-de-la-unidad'

type Props = {
  // La clave del hueco (`ORDEN_DE_HUECOS`) o del bloque: con ella el atajo de una falta encuentra la sección.
  clave: string
  titulo: string
  children: ReactNode
}

// Una sección del panel de un ítem, siempre a la vista (sin `<details>`): su título es un `h3` y su contenido se monta con el panel. Un aviso «abre ese hueco» (el
// atajo de una falta) la trae a la vista y le lleva el foco a su título.
export function SeccionDelHuecoALaVista({ clave, titulo, children }: Props) {
  const id = useId()
  const seccion = useRef<HTMLElement>(null)
  const encabezado = useRef<HTMLHeadingElement>(null)
  useAlPedirAbrirElHueco(clave, () => {
    seccion.current?.scrollIntoView({ block: 'nearest' })
    encabezado.current?.focus()
  })
  return (
    <section
      ref={seccion}
      aria-labelledby={id}
      {...{ [ATRIBUTO_DEL_BLOQUE]: clave }}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
    >
      <h3
        id={id}
        ref={encabezado}
        tabIndex={-1}
        className="text-(length:--text-base) font-medium text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus)"
      >
        {titulo}
      </h3>
      {children}
    </section>
  )
}
