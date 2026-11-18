'use client'

import { useRouter } from 'next/navigation'
import { EstadoError } from '@/shared/ui/estados'

// Una lectura de la página que se dice en su lugar (el panel de un paso, el vehículo de la cabecera): falló y se dice ahí, con «Reintentar» (vuelve a pedir la página),
// y la hoja sigue en pie (no sube al `error.tsx` de la ruta).
export function ErrorDelPanel({ titulo }: { titulo: string }) {
  const router = useRouter()
  return (
    <EstadoError
      compacto
      titulo={titulo}
      alReintentar={() => {
        router.refresh()
      }}
    />
  )
}
