'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Button, buttonVariants } from '@/shared/ui/button'
import type { AccionDeRelacionados } from '../../../entities/acciones-de-relacionados'

export const claveDeLaAccion = (accion: AccionDeRelacionados): string =>
  accion.tipo === 'enlace' || accion.tipo === 'elegir-lead' ? accion.clave : accion.tipo

type Props = {
  accion: AccionDeRelacionados
  enCurso: boolean
  alElegir: (accion: AccionDeRelacionados) => void
}

const TAMANO = 'min-h-11 w-fit md:min-h-8'

// Una acción de un grupo (o de la línea de «todo vacío») dibujada como botón: un enlace navega y lo demás lo hace `alElegir`.
export function AccionSuelta({ accion, enCurso, alElegir }: Props) {
  return accion.tipo === 'enlace' ? (
    <Link
      href={accion.href as Route}
      className={`${buttonVariants({ variant: 'outline', size: 'sm' })} ${TAMANO}`}
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
