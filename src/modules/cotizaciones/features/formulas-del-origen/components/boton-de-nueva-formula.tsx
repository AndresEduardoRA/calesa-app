'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type Props = {
  // Ya hay 50 fórmulas sin archivar: no se crea otra (la base dice lo mismo).
  enElTope: boolean
  alAbrir: () => void
}

// «Nueva fórmula»: la acción principal de la pestaña. Abre `?panel=nueva-formula`.
export function BotonDeNuevaFormula({ enElTope, alAbrir }: Props) {
  return (
    <Button type="button" className="min-h-11 md:min-h-9" disabled={enElTope} onClick={alAbrir}>
      <PlusIcon aria-hidden className="size-4" />
      Nueva fórmula
    </Button>
  )
}
