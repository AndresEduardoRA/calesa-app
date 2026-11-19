'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'

type Props = {
  // Las pestañas que esta persona ve, con su ruta ya resuelta (la del origen abierto); con `motivo`, apagada.
  pestanas: readonly { clave: string; titulo: string; ruta: string; motivo?: string }[]
  valor: string
}

// Las pestañas de una página de Configuración › Cotización (las de un origen o las de General). Cada una es una sub-ruta: elegir navega y
// suelta los parámetros de la otra (`?panel=`, `?tabla=`, `?version=`, `?vista=`); con una barra de cambios sin guardar, antes pregunta
// (`salirSinPerder()`). Con menos de dos no hay nada que elegir: no se dibuja.
export function PestanasDeCotizacion({ pestanas, valor }: Props) {
  const router = useRouter()
  if (pestanas.length < 2) {
    return null
  }
  return (
    <PestanasConDesborde
      pestanas={pestanas}
      valor={valor}
      alElegir={(elegida) => {
        const ruta = pestanas.find((pestana) => pestana.clave === elegida)?.ruta
        if (ruta !== undefined && elegida !== valor) {
          salirSinPerder(() => {
            router.push(ruta as Route)
          })
        }
      }}
    />
  )
}
