'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { ConMotivo, RENGLON } from './submenus-de-la-fila'

type Props = {
  etiqueta: string
  // Por qué no se quita (la tarjeta la nombra, es la última con modos…), o nulo.
  motivoParaQuitar: string | null
  alEditar: () => void
  alQuitar: () => void
}

export const BOTON_DEL_MENU =
  'flex size-[44px] shrink-0 items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:pointer-fine:size-8'

// El «⋯» de la cabecera de una banda (D21): «Renombrar, color, plazo y tipo de cambio…» (el panel de la banda, todo junto) y «Quitar banda» (sus filas quedan sin
// banda, con «Deshacer»; apagado con su motivo). El panel se abre cuando el menú terminó de cerrarse.
export function MenuDeLaBanda({ etiqueta, motivoParaQuitar, alEditar, alQuitar }: Props) {
  const [editar, setEditar] = useState(false)
  return (
    <DropdownMenu
      onOpenChange={(abierto) => {
        if (abierto) setEditar(false)
      }}
      onOpenChangeComplete={(abierto) => {
        if (abierto || !editar) return
        setEditar(false)
        alEditar()
      }}
    >
      <DropdownMenuTrigger
        aria-label={`Acciones de la banda «${etiqueta}»`}
        className={BOTON_DEL_MENU}
      >
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-w-(--available-width)">
        <DropdownMenuItem
          className={RENGLON}
          onClick={() => {
            setEditar(true)
          }}
        >
          Renombrar, color, plazo y tipo de cambio…
        </DropdownMenuItem>
        <DropdownMenuItem
          className={RENGLON}
          variant="destructive"
          disabled={motivoParaQuitar !== null}
          onClick={alQuitar}
        >
          <ConMotivo texto="Quitar banda" motivo={motivoParaQuitar} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
