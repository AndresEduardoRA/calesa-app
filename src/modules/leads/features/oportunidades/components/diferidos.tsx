'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de «Mover a …» una etapa perdida se pide recién al abrirse (`useAbiertoAlgunaVez()`): ni el kanban ni la
// ficha cargan su código para dibujar las tarjetas.
export const ModalDeMovidaDiferido = diferido(() =>
  import('./modal-de-movida').then((modulo) => modulo.ModalDeMovida),
)

// «Nueva oportunidad…» (el aviso de las que ya tiene y el formulario corto) en la ficha y en el resumen: se pide al elegirla, no al dibujar la
// cabecera. En el listado y el kanban viaja con el modal de las acciones de fila.
export const ModalDeOportunidadRapidaDiferido = diferido(() =>
  import('./modal-de-oportunidad-rapida').then((modulo) => modulo.ModalDeOportunidadRapida),
)
