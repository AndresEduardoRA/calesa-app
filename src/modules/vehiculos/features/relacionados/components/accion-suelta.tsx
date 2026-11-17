'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { cn } from 'cn'
import { Button, buttonVariants } from '@/shared/ui/button'
import type { AccionDeRelacionados } from '../../../entities/acciones-de-relacionados'

export const claveDeLaAccion = (accion: AccionDeRelacionados): string =>
  accion.tipo === 'enlace' || accion.tipo === 'elegir-lead' ? accion.clave : accion.tipo

type Props = {
  accion: AccionDeRelacionados
  enCurso: boolean
  alElegir: (accion: AccionDeRelacionados) => void
}

// Con el texto al 200 % en una columna angosta, la frase se parte en vez de ensanchar la página.
const TAMANO = 'h-auto min-h-11 w-fit max-w-full whitespace-normal text-left md:min-h-8'

// Una acción de un grupo (o de la línea de «todo vacío») dibujada como botón: un enlace navega y lo demás lo hace `alElegir`.
export function AccionSuelta({ accion, enCurso, alElegir }: Props) {
  return accion.tipo === 'enlace' ? (
    <Link
      href={accion.href as Route}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm', className: TAMANO }))}
    >
      {accion.etiqueta}
    </Link>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={TAMANO}
      disabled={enCurso}
      onClick={() => {
        alElegir(accion)
      }}
    >
      {accion.etiqueta}
    </Button>
  )
}
