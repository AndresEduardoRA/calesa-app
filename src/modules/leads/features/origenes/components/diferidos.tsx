'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nuevo origen» y «Editar» se piden recién al abrirse: la lista no carga el código del formulario
// para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeOrigenDiferido = diferido(() =>
  import('./modal-de-origen').then((modulo) => modulo.ModalDeOrigen),
)

// La confirmación de eliminar un origen se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarOrigenDiferido = diferido(() =>
  import('./eliminar-origen').then((modulo) => modulo.EliminarOrigen),
)

// El editor de orígenes (la lista en su modal, con el estado de todo lo que se hace en ella) se pide la primera vez que se abre algún panel de su
// familia (`useFamiliaDelPanel().montar`): la tarjeta sólo dibuja el resumen.
export const EditorDeOrigenesDiferido = diferido(
  () => import('./editor-de-origenes').then((modulo) => modulo.EditorDeOrigenes),
  { aviso: 'pantalla' },
)
