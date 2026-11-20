'use client'

import { diferido } from '@/shared/ui/diferido'

// Los modales de las tarjetas de Datos se piden la primera vez que se abren (`useAbiertoAlgunaVez()`): la página dibuja sólo texto, y los
// formularios, los datalists y el código de los logos y los íconos no viajan en frío.
export const ModalDeIdentidadDiferido = diferido(
  () => import('./modal-de-identidad').then((modulo) => modulo.ModalDeIdentidad),
  { aviso: 'pantalla' },
)

export const ModalDeRegionDiferido = diferido(
  () => import('./modal-de-region').then((modulo) => modulo.ModalDeRegion),
  { aviso: 'pantalla' },
)

export const ModalDeDatosLegalesDiferido = diferido(
  () => import('./modal-de-datos-legales').then((modulo) => modulo.ModalDeDatosLegales),
  { aviso: 'pantalla' },
)

export const ModalDePoliticasDiferido = diferido(
  () => import('./modal-de-politicas').then((modulo) => modulo.ModalDePoliticas),
  { aviso: 'pantalla' },
)

export const ModalDeIconosDiferido = diferido(
  () => import('../../iconos/components/modal-de-iconos').then((modulo) => modulo.ModalDeIconos),
  { aviso: 'pantalla' },
)

// Lo pide Monedas y tipos de cambio, la primera vez que se abre «Cambiar» la moneda base.
export const ModalDeMonedaBaseDiferido = diferido(
  () => import('./modal-de-moneda-base').then((modulo) => modulo.ModalDeMonedaBase),
  { aviso: 'pantalla' },
)
