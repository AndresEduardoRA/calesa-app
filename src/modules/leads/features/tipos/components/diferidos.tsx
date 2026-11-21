'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nuevo tipo» y «Editar» se piden recién al abrirse: la lista no carga el código del formulario
// para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeTipoDiferido = diferido(() =>
  import('./modal-de-tipo').then((modulo) => modulo.ModalDeTipo),
)

// La confirmación de eliminar un tipo se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarTipoDiferido = diferido(() =>
  import('./eliminar-tipo').then((modulo) => modulo.EliminarTipo),
)

// El editor de tipos (la lista en su modal, con el estado de todo lo que se hace en ella) se pide la primera vez que se abre algún panel de su
// familia (`useFamiliaDelPanel().montar`): la tarjeta sólo dibuja el resumen.
export const EditorDeTiposDiferido = diferido(
  () => import('./editor-de-tipos').then((modulo) => modulo.EditorDeTipos),
  { aviso: 'pantalla' },
)
