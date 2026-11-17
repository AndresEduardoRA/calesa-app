'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { rutaDeLasOportunidadesDe } from '../../../entities/oportunidad-rapida'

// «Ver oportunidades» del «⋯»: la ficha del lead en su sección «Oportunidades».
export function useIrALasOportunidades() {
  const router = useRouter()
  return (leadId: string) => {
    router.push(rutaDeLasOportunidadesDe(leadId) as Route)
  }
}
