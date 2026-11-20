'use client'

import { diferido } from '@/shared/ui/diferido'

// La imagen de la tarjeta en el resumen del listado y en la ficha del vehículo: la página paga sólo esta cáscara y el componente llega al abrirse. El esqueleto es
// el marco de la proporción por omisión (15:8), un `div` sin imports. Sin red, el aviso va en su lugar y el resto sigue en pie.
export const ImagenDeLaTarjetaDiferida = diferido(
  () => import('./imagen-de-la-tarjeta').then((modulo) => modulo.ImagenDeLaTarjeta),
  {
    esqueleto: (
      <div className="aspect-15/8 w-full animate-pulse rounded-(--radius-card) bg-(--color-paper-dim)" />
    ),
    aviso: 'aqui',
  },
)

// El visor de fotos con la imagen de la tarjeta: su código llega al primer clic (o con la URL que ya lo nombra).
export const VisorDeLaImagenDiferido = diferido(
  () => import('./visor-de-la-imagen').then((modulo) => modulo.VisorDeLaImagen),
  { aviso: 'pantalla' },
)
