'use client'

import { diferido } from '@/shared/ui/diferido'

// «Publicar la tarjeta de <Origen>» (4.19-3c) se pide recién al abrirse: la pestaña no carga el código del formulario para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDePublicarLaTarjetaDiferido = diferido(() =>
  import('./modal-de-publicar-la-tarjeta').then((modulo) => modulo.ModalDePublicarLaTarjeta),
)

// «Descartar el borrador de la tarjeta de <Origen>» (4.19-3c), igual.
export const DescartarLaPlantillaDiferido = diferido(() =>
  import('./descartar-la-plantilla').then((modulo) => modulo.DescartarLaPlantilla),
)
