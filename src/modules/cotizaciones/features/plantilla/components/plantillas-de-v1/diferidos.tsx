'use client'

import { diferido } from '@/shared/ui/diferido'

// «Empezar desde una plantilla» se pide recién al abrirse (`?panel=plantillas-de-v1`): las cuatro pestañas del origen sólo cargan el botón. Se monta con
// `useAbiertoAlgunaVez()`.
export const ModalDePlantillasDeV1Diferido = diferido(() =>
  import('./modal-de-plantillas-de-v1').then((modulo) => modulo.ModalDePlantillasDeV1),
)
