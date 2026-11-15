'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'

type Props = {
  // `sin_origenes`: la persona ve la logística pero ningún origen la tiene encendida. `sin_fases`: el origen todavía no tiene flujo. `error`: no se pudo leer (los orígenes o la cadena).
  tipo: 'sin_origenes' | 'sin_fases' | 'error'
  // «Configurar los flujos» sólo con `flujos.configurar`.
  enlaceAFlujos?: boolean
}

// Los estados de la gráfica que no dependen de los números: sin orígenes con la logística encendida, un origen sin fases (con el camino a configurarlas, si se puede) y el error con «Reintentar».
export function EstadoDeLaGrafica({ tipo, enlaceAFlujos = false }: Props) {
  const router = useRouter()
  if (tipo === 'sin_origenes') {
    return <EstadoVacio compacto titulo="Ningún origen tiene la logística encendida." />
  }
  if (tipo === 'sin_fases') {
    return (
      <EstadoVacio
        compacto
        titulo="Este origen todavía no tiene fases."
        accion={
          enlaceAFlujos ? (
            <Link
              href={RUTAS.configuracionDeFlujos as Route}
              className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
            >
              Configurar los flujos
            </Link>
          ) : undefined
        }
      />
    )
  }
  return (
    <EstadoError
      titulo="No se pudo cargar la cadena"
      alReintentar={() => {
        router.refresh()
      }}
    />
  )
}
