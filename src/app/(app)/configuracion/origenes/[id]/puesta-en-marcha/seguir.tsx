import type { Route } from 'next'
import Link from 'next/link'
import {
  pasoAnterior,
  pasoSiguiente,
  type EstadoDeLaPuestaEnMarcha,
  type PasoDeLaPuestaEnMarcha,
} from '@/modules/origenes'
import { rutaDeLaPuestaEnMarcha } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

const A_LO_ANCHO = 'min-h-11 w-full md:min-h-9 md:w-auto'

// El pie de cada paso: una sola acción principal, «Seguir» (antes de Publicar, «Ir a publicar»), al próximo paso que la persona puede hacer, y «Volver»
// al anterior como enlace secundario. «Seguir» no guarda: cada editor guarda con sus botones y avisa si se sale con cambios. En el celular, los dos a lo
// ancho y de 44 px, «Seguir» arriba.
export function Seguir({
  origenId,
  paso,
  estado,
}: {
  origenId: string
  paso: PasoDeLaPuestaEnMarcha
  estado: EstadoDeLaPuestaEnMarcha
}) {
  const siguiente = pasoSiguiente(paso, estado)
  const anterior = pasoAnterior(paso, estado)
  return (
    <div className="flex flex-col gap-2 border-t border-(--color-line) pt-4 md:flex-row-reverse md:items-center md:justify-start">
      <Link
        href={rutaDeLaPuestaEnMarcha(origenId, siguiente)}
        className={`${buttonVariants({ size: 'lg' })} ${A_LO_ANCHO}`}
      >
        {siguiente === 'publicar' ? 'Ir a publicar' : 'Seguir'}
      </Link>
      {anterior === null ? null : (
        <Link
          href={rutaDeLaPuestaEnMarcha(origenId, anterior) as Route}
          className={`${buttonVariants({ variant: 'ghost', size: 'lg' })} ${A_LO_ANCHO}`}
        >
          Volver
        </Link>
      )}
    </div>
  )
}
