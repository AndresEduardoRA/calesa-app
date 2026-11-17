import type { ReactNode } from 'react'
import type { LeadDeFicha } from '../../../entities/ficha'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'

type Props = {
  ficha: LeadDeFicha
  // «Editar», «Cotizar» y el «⋯»: lo que la persona puede hacer.
  acciones?: ReactNode
  // Lo que quien mira marcó (sus insignias), bajo el nombre.
  marcas?: ReactNode
}

// Lo que identifica al lead arriba de la columna de la izquierda: su nombre, sus números y las marcas de quien mira, con las acciones
// debajo (en 24 rem no entran al lado). Tipo y origen van en «Datos»; el teléfono, en «Teléfonos»; quién lo tiene, en su bloque: nada
// se dice dos veces en la misma columna.
export function CabeceraDeLead({ ficha, acciones, marcas }: Props) {
  return (
    <header className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <h1 className="text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
        {ficha.nombre}
      </h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-(length:--text-sm) text-(--color-ink-soft)">
        <NumeroDeLead numeros={ficha.numeros} conSecundario />
      </div>
      {marcas}
      {acciones ? <div className="flex flex-wrap items-start gap-2">{acciones}</div> : null}
    </header>
  )
}
