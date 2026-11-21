'use client'

import { diferido } from '@/shared/ui/diferido'

// Los modales de las tarjetas de «Ajustes» se piden la primera vez que se abren (`useAbiertoAlgunaVez()`): la página dibuja sólo texto y los
// formularios no viajan en frío.
export const ModalDeIdentidadDiferido = diferido(
  () => import('./modal-de-identidad').then((modulo) => modulo.ModalDeIdentidad),
  { aviso: 'pantalla' },
)

export const ModalDeContactoDiferido = diferido(
  () => import('./modal-de-contacto').then((modulo) => modulo.ModalDeContacto),
  { aviso: 'pantalla' },
)

export const ModalDeRedesDiferido = diferido(
  () => import('./modal-de-redes').then((modulo) => modulo.ModalDeRedes),
  { aviso: 'pantalla' },
)

export const ModalDeSeoDiferido = diferido(
  () => import('./modal-de-seo').then((modulo) => modulo.ModalDeSeo),
  { aviso: 'pantalla' },
)

export const ModalDeVitrinaDiferido = diferido(
  () => import('./modal-de-vitrina').then((modulo) => modulo.ModalDeVitrina),
  { aviso: 'pantalla' },
)
