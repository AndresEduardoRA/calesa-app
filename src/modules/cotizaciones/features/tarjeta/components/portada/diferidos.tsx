'use client'

import { diferido } from '@/shared/ui/diferido'

// La portada en el resumen del listado: la página paga sólo esta cáscara y el componente llega al abrir el resumen. El esqueleto es el marco de la proporción por
// omisión (15:8), un `div` sin imports. Sin red, el aviso va en su lugar y el resto del resumen sigue en pie.
export const PortadaDeLaCotizacionDiferida = diferido(
  () => import('./portada-de-la-cotizacion').then((modulo) => modulo.PortadaDeLaCotizacion),
  {
    esqueleto: (
      <div className="aspect-15/8 w-full animate-pulse rounded-(--radius-card) bg-(--color-paper-dim)" />
    ),
    aviso: 'aqui',
  },
)

// El visor de fotos con la portada: su código llega al primer clic (o con la URL que ya lo nombra).
export const VisorDeLaPortadaDiferido = diferido(
  () => import('./visor-de-la-portada').then((modulo) => modulo.VisorDeLaPortada),
  { aviso: 'pantalla' },
)
