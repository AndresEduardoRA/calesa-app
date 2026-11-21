'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de la ficha se pide la primera vez que se abre (`useAbiertoAlgunaVez()`), no al dibujar `/perfil` (`.claude/rules/escala.md`).
export const ModalDeFichaDiferido = diferido(
  () => import('./modal-de-ficha').then((modulo) => modulo.ModalDeFicha),
  { aviso: 'pantalla' },
)
