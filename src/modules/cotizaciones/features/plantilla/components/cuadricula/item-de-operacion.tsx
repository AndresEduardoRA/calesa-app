'use client'

import { DropdownMenuItem } from '@/shared/ui/dropdown-menu'

type Props = {
  texto: string
  // Por qué está apagada, o nulo si se puede: se dice bajo el texto, a la vista.
  motivo: string | null
  alHacer: () => void
}

// Una operación de un menú del lienzo (la barra o el menú contextual): apagada, dice por qué.
export function ItemDeOperacion({ texto, motivo, alHacer }: Props) {
  return (
    <DropdownMenuItem
      disabled={motivo !== null}
      onClick={alHacer}
      className="grid min-h-11 gap-0 md:min-h-8"
    >
      <span>{texto}</span>
      {motivo === null ? null : (
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">{motivo}</span>
      )}
    </DropdownMenuItem>
  )
}
