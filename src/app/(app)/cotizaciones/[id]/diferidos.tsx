'use client'

import { diferido } from '@/shared/ui/diferido'

// La barra del vehículo de la cabecera de una guardada (T307) se pide aparte: `/cotizaciones/[id]` está al borde de su presupuesto de JS. Mientras llega, un hueco de su
// alto (la miniatura y dos líneas) para que la cabecera no salte.
export const BarraDeLaGuardadaDiferida = diferido(
  () => import('./barra-de-la-guardada').then((modulo) => modulo.BarraDeLaGuardada),
  {
    esqueleto: (
      <div
        aria-hidden
        className="h-16 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface-3)"
      />
    ),
  },
)
