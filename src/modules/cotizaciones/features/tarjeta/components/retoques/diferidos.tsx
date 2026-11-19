'use client'

import { diferido } from '@/shared/ui/diferido'

// El modo «Retocar» se pide al tocar «Retocar»: la vista previa no carga su interfaz para dibujarse. El cuerpo y el pie salen de un mismo módulo (un chunk).
// Mientras llega, el cuerpo dice que carga y el pie va sin botones; sin red, el aviso va en el cuerpo con «Reintentar».
export const CuerpoDelModoDiferido = diferido(
  () => import('./modo-retocar').then((modulo) => modulo.CuerpoDelModo),
  {
    esqueleto: (
      <div
        aria-busy="true"
        aria-label="Cargando el modo «Retocar»"
        className="h-64 w-full animate-pulse rounded-(--radius-card) bg-(--color-surface-sunken)"
      />
    ),
    aviso: 'aqui',
  },
)

export const PieDelModoDiferido = diferido(() =>
  import('./modo-retocar').then((modulo) => modulo.PieDelModo),
)
