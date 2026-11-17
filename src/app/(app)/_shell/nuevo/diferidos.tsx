'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDelModalDeNuevo } from './modal-de-nuevo'

// El modal con sus opciones y el paso de elegir un lead se piden la primera vez que se abre «Nuevo»: el botón vive en la barra de **todas** las pantallas.
export const ModalDeNuevoDiferido = diferido<PropsDelModalDeNuevo>(
  () => import('./modal-de-nuevo').then((m) => m.ModalDeNuevo),
  { aviso: 'pantalla' },
)

// Pide el código sin abrir nada: al llegar el puntero al botón y al tomar el foco. Un fallo acá no se dice: nadie pidió nada todavía.
export function adelantarElModalDeNuevo() {
  void import('./modal-de-nuevo').catch(() => undefined)
}
