'use client'

import { diferido } from '@/shared/ui/diferido'

// Los modales de las tarjetas de Embudo, Mensaje del portal y Teléfonos extra, y las confirmaciones de «Restablecer», se piden la primera vez que
// se abren (`useFamiliaDelPanel().montar`, `useAbiertoAlgunaVez()`): la página dibuja sólo texto y los formularios no viajan en frío.
export const ModalDePlantillaDelEmbudoDiferido = diferido(
  () =>
    import('./modal-de-plantilla-del-embudo').then((modulo) => modulo.ModalDePlantillaDelEmbudo),
  { aviso: 'pantalla' },
)

export const ModalDelMensajeDelPortalDiferido = diferido(
  () => import('./modal-del-mensaje-del-portal').then((modulo) => modulo.ModalDelMensajeDelPortal),
  { aviso: 'pantalla' },
)

export const ModalDeTelefonosExtraDiferido = diferido(
  () => import('./modal-de-telefonos-extra').then((modulo) => modulo.ModalDeTelefonosExtra),
  { aviso: 'pantalla' },
)

export const ModalDeNumerosRepetidosDiferido = diferido(
  () => import('./modal-de-numeros-repetidos').then((modulo) => modulo.ModalDeNumerosRepetidos),
  { aviso: 'pantalla' },
)

export const RestablecerEmbudoDiferido = diferido(
  () => import('./restablecer-del-embudo').then((modulo) => modulo.RestablecerDelEmbudo),
  { aviso: 'pantalla' },
)

export const RestablecerPortalDiferido = diferido(
  () => import('./restablecer-del-portal').then((modulo) => modulo.RestablecerDelPortal),
  { aviso: 'pantalla' },
)
