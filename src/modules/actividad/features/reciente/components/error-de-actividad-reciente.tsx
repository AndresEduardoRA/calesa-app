'use client'

import { useRouter } from 'next/navigation'
import { EstadoError } from '@/shared/ui/estados/estado-error'

// La lectura de la «Actividad reciente» falló en el servidor: el error con «Reintentar», que vuelve a pedir la página. Es el único JS propio
// del bloque.
export function ErrorDeActividadReciente() {
  const router = useRouter()
  return (
    <EstadoError
      compacto
      titulo="No se pudo cargar la actividad"
      alReintentar={() => {
        router.refresh()
      }}
    />
  )
}
