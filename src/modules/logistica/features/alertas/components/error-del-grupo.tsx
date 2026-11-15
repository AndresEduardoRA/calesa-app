'use client'

import { useRouter } from 'next/navigation'
import { EstadoError } from '@/shared/ui/estados'

// El error de un solo grupo: dice cuál no cargó y ofrece «Reintentar», sin tumbar a los demás.
export function ErrorDelGrupo({ titulo }: { titulo: string }) {
  const router = useRouter()
  return (
    <EstadoError
      compacto
      titulo={`No se pudo cargar «${titulo}»`}
      alReintentar={() => {
        router.refresh()
      }}
    />
  )
}
