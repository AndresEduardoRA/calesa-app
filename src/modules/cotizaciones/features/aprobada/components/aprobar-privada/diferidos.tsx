'use client'

import { diferido } from '@/shared/ui/diferido'

// La pregunta de aprobar una privada se pide la primera vez que se abre (`useAbiertoAlgunaVez()`): ninguna pantalla la carga para dibujarse.
export const ConfirmarAprobarPrivadaDiferido = diferido(() =>
  import('./confirmar-aprobar-privada').then((modulo) => modulo.ConfirmarAprobarPrivada),
)
