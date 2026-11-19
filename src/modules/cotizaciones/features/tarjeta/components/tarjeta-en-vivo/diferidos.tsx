'use client'

import { diferido } from '@/shared/ui/diferido'

// La tarjeta en vivo de la planilla de la fórmula: su código (la geometría y las celdas de la tarjeta) se pide al dibujarla, no con la pestaña. Va en su propio
// `diferidos.tsx`: el del área viaja con la hoja de cotizar y un `diferido()` de nivel superior es efecto de módulo. El esqueleto es un `div` de alto fijo.
export const TarjetaEnVivoDiferida = diferido(
  () => import('./tarjeta-en-vivo').then((modulo) => modulo.TarjetaEnVivo),
  {
    esqueleto: (
      <div className="h-64 w-full animate-pulse rounded-(--radius-card) bg-(--color-surface-sunken)" />
    ),
    aviso: 'aqui',
  },
)
