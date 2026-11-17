'use client'

import { useRouter } from 'next/navigation'
import type { ParaRelacionados } from '../../../entities/acciones-de-relacionados'
import type { RelacionadosDelLead } from '../../../entities/relacionados'
import { ErrorDeRelacionados } from './error-de-relacionados'
import { RelacionadosDeUnLead } from './relacionados-de-un-lead'

type Props = {
  // Lo que leyó el servidor; null = no se pudo leer (el bloque dice el error con «Reintentar» y la ficha sigue).
  datos: RelacionadosDelLead | null
  para: ParaRelacionados
}

// El bloque «Relacionados» de un lead con lo que leyó el servidor (la ficha del lead, en su presentación compacta). Cada acción lograda revalida la pantalla (`revalidarVinculo()`).
export function RelacionadosDelLeadCliente({ datos, para }: Props) {
  const router = useRouter()
  if (datos === null) {
    return (
      <ErrorDeRelacionados
        presentacion="compacta"
        alReintentar={() => {
          router.refresh()
        }}
      />
    )
  }
  return <RelacionadosDeUnLead datos={datos} lugar="ficha" para={para} presentacion="compacta" />
}
