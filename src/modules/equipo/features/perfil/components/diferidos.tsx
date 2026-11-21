'use client'

import { diferido } from '@/shared/ui/diferido'

// Los modales de `/perfil` se piden la primera vez que se abren (`useAbiertoAlgunaVez()`): la página dibuja sólo texto.
export const ModalDeTuDiferido = diferido(
  () => import('./modal-de-tu').then((modulo) => modulo.ModalDeTu),
  { aviso: 'pantalla' },
)

export const ModalDePreferenciasDiferido = diferido(
  () => import('./modal-de-preferencias').then((modulo) => modulo.ModalDePreferencias),
  { aviso: 'pantalla' },
)
