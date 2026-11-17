import type { Route } from 'next'
import Link from 'next/link'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { claseDe, type AgendaDeRango, type ClaveDeClase } from '../../../entities/agenda'

type Props = {
  hayMas: AgendaDeRango['hayMas']
  clases: readonly ClaveDeClase[]
  deTodos: boolean
  // El día que ancla la vista, para acortar el rango; nulo si ya se está en la vista de día.
  enlaceDelDia: string | null
}

// Al pie del calendario: de cada clase que se ve y llegó a su tope, el aviso con el camino a lo que quedó afuera (un día, menos clases o «Mi agenda»).
export function AvisosDeTopeDelCalendario({ hayMas, clases, deTodos, enlaceDelDia }: Props) {
  const salida = enlaceDelDia
    ? 'Mira un día o quita clases en «Vista y opciones».'
    : deTodos
      ? 'Quita clases en «Vista y opciones» o mira «Mi agenda».'
      : 'Quita clases en «Vista y opciones».'
  return clases
    .filter((clave) => hayMas[clave])
    .map((clave) => (
      <AvisoDeTope
        key={clave}
        texto={`Hay más ${claseDe(clave).plural} de las que se muestran. ${salida}`}
        camino={
          enlaceDelDia ? (
            <Link href={enlaceDelDia as Route} className="underline">
              Ver el día
            </Link>
          ) : undefined
        }
      />
    ))
}
