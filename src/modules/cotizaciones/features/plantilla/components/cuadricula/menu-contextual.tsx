'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  OPERACIONES_DE_LA_BARRA,
  type Disponibilidad,
} from '../../../../entities/plantilla/edicion/disponibilidad'
import type { AccionDelEditor } from '../../../../entities/plantilla/edicion/reductor'
import { ItemDeOperacion } from './item-de-operacion'
import {
  DE_LA_COMBINACION,
  DEL_PORTAPAPELES,
  PARA_ELIMINAR,
  PARA_INSERTAR,
  type GrupoDeOperaciones,
} from './lista-de-operaciones'

type Props = {
  abierto: boolean
  // Dónde se ancla: la caja de la celda activa, en px del lienzo ya escalados y con su margen.
  caja: { x: number; y: number; ancho: number; alto: number }
  disponible: Disponibilidad
  hacer: (accion: AccionDelEditor) => void
  alCopiar: () => void
  alCerrar: () => void
}

function Grupo({
  titulo,
  operaciones,
  disponible,
  hacer,
}: {
  titulo?: string
  operaciones: GrupoDeOperaciones
  disponible: Disponibilidad
  hacer: (accion: AccionDelEditor) => void
}) {
  return (
    <DropdownMenuGroup>
      {titulo === undefined ? null : <DropdownMenuLabel>{titulo}</DropdownMenuLabel>}
      {operaciones.map((o) => (
        <ItemDeOperacion
          key={o.clave}
          texto={o.texto}
          motivo={disponible[o.clave]}
          alHacer={() => {
            hacer(OPERACIONES_DE_LA_BARRA[o.clave])
          }}
        />
      ))}
    </DropdownMenuGroup>
  )
}

// El menú contextual de la celda (clic derecho, Shift+F10 o la tecla Menú): lo mismo que la barra, anclado a la celda. Sale de `DropdownMenu` con un disparador
// invisible sobre la celda (no se suma un `context-menu` a `shared/ui`). Lo apagado dice por qué.
export function MenuContextual({ abierto, caja, disponible, hacer, alCopiar, alCerrar }: Props) {
  return (
    <DropdownMenu
      open={abierto}
      onOpenChange={(abre) => {
        if (!abre) alCerrar()
      }}
    >
      <DropdownMenuTrigger
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none absolute opacity-0"
        style={{ left: caja.x, top: caja.y, width: caja.ancho, height: caja.alto }}
      />
      <DropdownMenuContent
        align="start"
        className="max-w-(--available-width) min-w-56"
        data-menu-de-la-celda=""
      >
        <DropdownMenuGroup>
          <DropdownMenuItem className="min-h-11 md:min-h-8" onClick={alCopiar}>
            Copiar
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <Grupo operaciones={DEL_PORTAPAPELES} disponible={disponible} hacer={hacer} />
        <DropdownMenuSeparator />
        <Grupo operaciones={DE_LA_COMBINACION} disponible={disponible} hacer={hacer} />
        <DropdownMenuSeparator />
        <Grupo
          titulo="Insertar"
          operaciones={PARA_INSERTAR}
          disponible={disponible}
          hacer={hacer}
        />
        <DropdownMenuSeparator />
        <Grupo
          titulo="Eliminar"
          operaciones={PARA_ELIMINAR}
          disponible={disponible}
          hacer={hacer}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
