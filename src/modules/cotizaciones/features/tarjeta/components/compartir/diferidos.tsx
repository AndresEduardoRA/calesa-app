'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel «Compartir cotización» se pide la primera vez que se abre (`useAbiertoAlgunaVez()`): ni el detalle ni la lista lo cargan para dibujarse.
export const PanelDeCompartirDiferido = diferido(
  () => import('./panel-de-compartir').then((modulo) => modulo.PanelDeCompartir),
  { aviso: 'pantalla' },
)
