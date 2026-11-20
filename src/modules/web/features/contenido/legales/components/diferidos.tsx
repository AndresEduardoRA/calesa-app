'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDeModalDeLegal } from './modal-de-legal'

// El modal con el editor (Tiptap) se pide la primera vez que se abre (`useAbiertoAlgunaVez()`): la página dibuja sólo texto y el editor no viaja en frío.
export const ModalDeLegalDiferido = diferido<PropsDeModalDeLegal>(
  () => import('./modal-de-legal').then((modulo) => modulo.ModalDeLegal),
  { aviso: 'pantalla' },
)
