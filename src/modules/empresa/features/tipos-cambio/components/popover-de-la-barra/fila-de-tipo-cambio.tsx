'use client'

import type { TipoCambioVigente } from '../../../../entities/tipos-cambio-vigentes'
import { ValorDeCambio } from '../valor-de-cambio'
import { UltimoCambio } from './ultimo-cambio'

type Props = { tipo: TipoCambioVigente }

// Un tipo de cambio del popover: nombre y valor («1 USD = Bs 12,20», por <Monto>) y, debajo, quién y cuándo lo cambió por última vez.
export function FilaDeTipoCambio({ tipo }: Props) {
  return (
    <li className="grid min-w-0 gap-0.5 py-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="min-w-0 font-medium break-words text-(--color-ink)">{tipo.nombre}</span>
        <ValorDeCambio tipo={tipo} className="ml-auto shrink-0 tabular-nums" />
      </div>
      <UltimoCambio cambio={tipo.ultimoCambio} />
    </li>
  )
}
