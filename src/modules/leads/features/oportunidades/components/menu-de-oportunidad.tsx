'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { EtapaGuardada } from '../../../entities/embudo'
import { PuntoDeColor } from '../../etiquetas/components/insignia-de-etiqueta'

type Props = {
  // Para el foco de vuelta del modal del motivo (`data-mover-a`) y el nombre del botón.
  id: string
  titulo: string
  // Las etapas de su embudo, en orden, y en la que está.
  etapas: readonly EtapaGuardada[]
  actual: string
  ocupada: boolean
  alMover: (etapa: EtapaGuardada, motivo: string | null) => Promise<boolean>
  // Ir a una etapa perdida pregunta el motivo: lo hace un modal con su URL, que monta el bloque.
  alPedirMotivo: (etapa: EtapaGuardada) => void
  alEditar: () => void
  alEliminar: () => void
}

type Pendiente = { tipo: 'editar' } | { tipo: 'motivo'; etapa: EtapaGuardada }

const RENGLON = 'min-h-11 md:min-h-8'

// «Mover a»: las etapas de su embudo menos la actual. Una perdida pregunta el motivo (lo abre quien tiene el menú, cuando terminó de cerrarse).
function SubmenuMoverA({
  etapas,
  actual,
  alMover,
  alElegirPerdida,
}: Pick<Props, 'etapas' | 'actual' | 'alMover'> & {
  alElegirPerdida: (etapa: EtapaGuardada) => void
}) {
  return (
    <DropdownMenuSub>
      {/* Se abre con el clic, el toque o el teclado, no al pasar el puntero: abierto por el paso, el clic que le sigue lo cerraba. */}
      <DropdownMenuSubTrigger className={RENGLON} openOnHover={false}>
        Mover a
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56 max-w-(--available-width)">
        {etapas
          .filter((etapa) => etapa.id !== actual)
          .map((etapa) => (
            <DropdownMenuItem
              key={etapa.id}
              className={RENGLON}
              onClick={() => {
                if (etapa.esPerdida) {
                  alElegirPerdida(etapa)
                  return
                }
                void alMover(etapa, null)
              }}
            >
              <PuntoDeColor color={etapa.color} className="size-2.5" />
              {etapa.nombre}
            </DropdownMenuItem>
          ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

// El «⋯» de una oportunidad del bloque: «Mover a» (un submenú con las etapas de su embudo menos la actual; sin arrastrar, con el teclado y
// el dedo), «Editar» y «Eliminar» (con «Deshacer»). Lo que abre algo encima (el panel de editar, el modal del motivo de una perdida) espera
// a que el menú termine de cerrarse: si no, el foco que vuelve al botón lo cierra. El botón lleva `data-mover-a`: el modal del motivo le
// devuelve el foco ahí.
export function MenuDeOportunidad({
  id,
  titulo,
  etapas,
  actual,
  ocupada,
  alMover,
  alPedirMotivo,
  alEditar,
  alEliminar,
}: Props) {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  return (
    <DropdownMenu
      // Abrirlo de nuevo antes de que termine de cerrarse olvida lo elegido: no se abre en el cierre siguiente.
      onOpenChange={(abierto) => {
        if (abierto) {
          setPendiente(null)
        }
      }}
      onOpenChangeComplete={(abierto) => {
        if (abierto || pendiente === null) {
          return
        }
        setPendiente(null)
        if (pendiente.tipo === 'editar') {
          alEditar()
        } else {
          alPedirMotivo(pendiente.etapa)
        }
      }}
    >
      <DropdownMenuTrigger
        disabled={ocupada}
        data-mover-a={id}
        aria-label={`Más acciones de «${titulo}»`}
        className="flex size-[44px] shrink-0 items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) disabled:opacity-50 md:size-8"
      >
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 max-w-(--available-width)">
        <SubmenuMoverA
          etapas={etapas}
          actual={actual}
          alMover={alMover}
          alElegirPerdida={(etapa) => {
            setPendiente({ tipo: 'motivo', etapa })
          }}
        />
        <DropdownMenuItem
          className={RENGLON}
          onClick={() => {
            setPendiente({ tipo: 'editar' })
          }}
        >
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem className={RENGLON} variant="destructive" onClick={alEliminar}>
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
