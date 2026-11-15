'use client'

import { PopoverContent } from '@/shared/ui/popover'
import { NOMBRE_DEL_TIPO } from '../../../entities/relacionados'
import { UnGrupoDeRelacionados } from './grupo-de-relacionados'

// El contenido del popover de un chip de «Relacionados en una línea»: el mismo grupo del bloque, con sus filas, acciones y «Ver todos». Va diferido (`diferidos.tsx`).
export function PopoverDelGrupo(props: React.ComponentProps<typeof UnGrupoDeRelacionados>) {
  return (
    <PopoverContent
      align="start"
      aria-label={`Relacionados: ${NOMBRE_DEL_TIPO[props.grupo.tipo]}`}
      className="max-h-(--available-height) w-96 max-w-[calc(100vw-1rem)] overflow-y-auto p-1"
    >
      <UnGrupoDeRelacionados {...props} />
    </PopoverContent>
  )
}
