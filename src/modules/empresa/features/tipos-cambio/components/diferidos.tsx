'use client'

import { diferido } from '@/shared/ui/diferido'

// Los modales de Monedas y tipos de cambio se piden la primera vez que se abren (`useAbiertoAlgunaVez()`): la página dibuja sólo tarjetas.
export const ModalDeMonedasDiferido = diferido(
  () => import('./modal-de-monedas').then((modulo) => modulo.ModalDeMonedas),
  { aviso: 'pantalla' },
)

export const ModalDeLeyendaDiferido = diferido(
  () => import('./modal-de-leyenda').then((modulo) => modulo.ModalDeLeyenda),
  { aviso: 'pantalla' },
)
