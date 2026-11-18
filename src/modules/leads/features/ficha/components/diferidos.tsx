'use client'

import { diferido } from '@/shared/ui/diferido'

// «Agregar teléfono» se pide recién al abrirse: «Datos» no carga su código para mostrar la lista. Se
// monta con `useAbiertoAlgunaVez()`.
export const ModalDeExtraDiferido = diferido(() =>
  import('./modal-de-extra').then((modulo) => modulo.ModalDeExtra),
)

// El panel de edición abierto desde el «⋯» de la lista o del kanban (con el formulario y la lectura del lead) se pide al abrirse: el
// listado no carga su código para dibujar las filas. Se monta con `useAbiertoAlgunaVez()`.
export const EdicionFueraDeLaFichaDiferida = diferido(
  () => import('./edicion-fuera-de-la-ficha').then((modulo) => modulo.EdicionFueraDeLaFicha),
  { aviso: 'pantalla' },
)
