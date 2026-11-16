'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { EstadoError } from '@/shared/ui/estados'

// Un bloque que no pudo leer: «Reintentar» vuelve a pedir la pantalla; los demás bloques no se tocan.
// `alReintentar` es de quien lo dibuja tras atrapar un fallo (el límite del bloque), que además de pedir de nuevo debe volver a montar.
export function ErrorDeBloque({ alReintentar }: { alReintentar?: () => void }) {
  const router = useRouter()
  const [pendiente, empezar] = useTransition()
  return (
    <div aria-busy={pendiente}>
      <EstadoError
        alReintentar={() =>
          empezar(() => {
            alReintentar?.()
            router.refresh()
          })
        }
      />
    </div>
  )
}
