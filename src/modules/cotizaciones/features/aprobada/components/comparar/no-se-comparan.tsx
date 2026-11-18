import { GitCompareArrowsIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'

export const NO_SE_COMPARAN =
  'Sólo se comparan 2 o 3 cotizaciones del mismo vehículo que puedas ver.'

// Lo que dice la página si `ids` no sirve: mal formados, 1 o más de 3, repetidos, de vehículos distintos o alguno que no se ve (no existe, está en la papelera o quien
// mira no lo ve). Nunca dice cuál: decir «no tienes permiso» confirmaría que existe. Sin estado: lo dibuja el servidor.
export function NoSeComparan({ volverA }: { volverA: string }) {
  return (
    <EstadoVacio
      Icono={GitCompareArrowsIcon}
      titulo={NO_SE_COMPARAN}
      accion={
        <Link href={volverA as Route} className={buttonVariants({ variant: 'outline' })}>
          Volver
        </Link>
      }
    />
  )
}
