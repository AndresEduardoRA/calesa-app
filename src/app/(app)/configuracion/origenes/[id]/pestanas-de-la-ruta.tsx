'use client'

import type { Route } from 'next'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'

type Props = {
  // Las pestañas, con su ruta ya resuelta; con `motivo`, apagada.
  pestanas: readonly { clave: string; titulo: string; ruta: string; motivo?: string }[]
  // La pestaña que vive en la ruta del layout, sin segmento propio (`…/formula` es «Fórmula»; `…/formula/hoja`, «Hoja»).
  sinSegmento: string
}

// Las pestañas de un layout de Configuración (las de un origen y las de su Fórmula). Cada una es una sub-ruta y la abierta sale del segmento
// de la URL; elegir navega y suelta los parámetros de la otra (`?panel=`, `?tabla=`, `?version=`, `?vista=`); con una barra de cambios sin
// guardar, antes pregunta (`salirSinPerder()`).
export function PestanasDeLaRuta({ pestanas, sinSegmento }: Props) {
  const router = useRouter()
  const valor = useSelectedLayoutSegment() ?? sinSegmento
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
