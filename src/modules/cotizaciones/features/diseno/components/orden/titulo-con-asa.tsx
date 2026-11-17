'use client'

import type { ReactNode } from 'react'
import type { FilaOrdenable } from '../../hooks/use-fila-ordenable'
import { AsaDeOrden } from './asa-de-orden'

type Props = { etiquetaDelAsa: string; asa: FilaOrdenable['asa']; children: ReactNode }

// La primera línea de una fila que se ordena: el asa y su título.
export function TituloConAsa({ etiquetaDelAsa, asa, children }: Props) {
  return (
    <div className="mb-2 flex min-w-0 items-center gap-2">
      <AsaDeOrden etiqueta={etiquetaDelAsa} asa={asa} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
