'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { PlantillaEnCuadricula } from '../../../../entities/cuadricula-de-la-tarjeta'
import {
  motivoDelTextoLargo,
  nombreDeLaCelda,
} from '../../../../entities/tarjeta/retoques/modo-de-la-tarjeta'
import type { ModoRetocar } from '../../hooks/use-modo-retocar'

// «Listo» (la acción principal), «Cancelar» (descarta sin preguntar) y el «⋯» con «Volver a la plantilla» si la cotización tiene retoques guardados. Con un texto
// de más de 300 caracteres, «Listo» se apaga con su motivo a la vista. En el celular los botones van a lo ancho (44 px); desde `sm`, en fila.
export function PieDelModoConBotones({
  modo,
  plantilla,
}: {
  modo: ModoRetocar
  plantilla: PlantillaEnCuadricula | null
}) {
  const id = useId()
  const motivo =
    modo.textoLargo === null
      ? null
      : motivoDelTextoLargo(nombreDeLaCelda(plantilla, modo.textoLargo))
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
      {motivo === null ? null : (
        <p
          id={id}
          className="basis-full text-(length:--text-sm) text-(--color-peligro-ink) sm:mr-auto sm:basis-auto"
        >
          {motivo}
        </p>
      )}
      {modo.hayGuardados ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Más acciones de la tarjeta"
            disabled={modo.enCurso}
            className="flex size-[44px] items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) sm:ml-auto md:size-8"
          >
            <MoreHorizontalIcon aria-hidden className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-w-(--available-width)">
            <DropdownMenuItem className="min-h-11 md:min-h-8" onClick={modo.pedirVolver}>
              Volver a la plantilla
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Button
        variant="outline"
        disabled={modo.enCurso}
        className="min-h-[44px] max-sm:min-w-fit max-sm:flex-1 sm:min-h-8"
        onClick={modo.salir}
      >
        Cancelar
      </Button>
      <Button
        disabled={modo.enCurso || motivo !== null}
        aria-describedby={motivo === null ? undefined : id}
        className="min-h-[44px] max-sm:min-w-fit max-sm:flex-1 sm:min-h-8"
        onClick={modo.listo}
      >
        {modo.enCurso ? 'Guardando…' : 'Listo'}
      </Button>
    </div>
  )
}
