'use client'

import { diferido } from '@/shared/ui/diferido'

// «Agregar» y «Editar» de un tramo o de una caja se piden recién al abrirse: la pestaña no carga el código del formulario para mostrarse. Se montan con
// `useAbiertoAlgunaVez()`.
export const ModalDeTramoDiferido = diferido(() =>
  import('./modal-de-tramo').then((modulo) => modulo.ModalDeTramo),
)

export const ModalDeCajaDiferido = diferido(() =>
  import('./modal-de-caja').then((modulo) => modulo.ModalDeCaja),
)

// El panel «Cotizaciones» bajo los pasos de `/repuestos/[id]`: la lista se pide al elegirlo, no viaja con la hoja.
export const CotizacionesDelProyectoDiferido = diferido(
  () => import('./cotizaciones-del-proyecto').then((modulo) => modulo.CotizacionesDelProyecto),
  { aviso: 'aqui' },
)
