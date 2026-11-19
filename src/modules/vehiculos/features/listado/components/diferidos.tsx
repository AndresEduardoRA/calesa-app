'use client'

import { diferido } from '@/shared/ui/diferido'

// Los paneles del «⋯» del inventario se piden recién al abrirse (se montan con `useAbiertoAlgunaVez()`): la lista no paga su código en frío. Son los
// de esta superficie; la ficha tiene los suyos (`acciones/components/diferidos-de-la-ficha.tsx`).
export const PanelDeImagenesDiferido = diferido(() =>
  import('../../fotos/components/panel-de-imagenes').then((modulo) => modulo.PanelDeImagenes),
)

export const PanelDeVitrinaDeLaListaDiferido = diferido(() =>
  import('../../vitrina/components/panel-de-vitrina-de-la-lista').then(
    (modulo) => modulo.PanelDeVitrinaDeLaLista,
  ),
)

export const ActualizarLosDatosDiferido = diferido(() =>
  import('../../subasta/components/actualizar-los-datos').then(
    (modulo) => modulo.ActualizarLosDatos,
  ),
)
