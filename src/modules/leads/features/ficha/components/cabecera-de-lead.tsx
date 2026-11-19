import type { ReactNode } from 'react'
import { EsquinaDeAcciones } from '@/shared/ui/lista'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import type { LeadDeFicha } from '../../../entities/ficha'

type Props = {
  ficha: LeadDeFicha
  // El «⋯» del lead (con «Cotizar lead» y «Editar lead»): arriba a la derecha, en la fila del nombre.
  menu?: ReactNode
  // Quién lo tiene, en una línea («Dueño: Ana · Compartido con Luis y 1 más», `textoDeLaCartera()`); nula, no se dibuja.
  cartera?: string | null
  // Lo que quien mira marcó (sus insignias), bajo los números.
  marcas?: ReactNode
}

// Lo que identifica al lead arriba de la columna de la izquierda: su nombre con el «⋯» a la derecha (el lugar fijo del «⋯» de una
// tarjeta sin imagen: arriba a la derecha y siempre a la vista), quién lo tiene, sus números y las marcas de quien mira. Tipo, origen y
// teléfono van en «Datos»; el detalle de la cartera, en «Quién lo tiene».
export function CabeceraDeLead({ ficha, menu, cartera, marcas }: Props) {
  return (
    <header className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <h1 className="pt-1.5 text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
          {ficha.nombre}
        </h1>
        {menu ? <EsquinaDeAcciones className="-mt-1 -mr-3">{menu}</EsquinaDeAcciones> : null}
      </div>
      {cartera ? (
        <p className="text-(length:--text-sm) break-words text-(--color-ink-soft)">{cartera}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-(length:--text-sm) text-(--color-ink-soft)">
        <NumeroDeLead numeros={ficha.numeros} conSecundario />
      </div>
      {marcas}
    </header>
  )
}
