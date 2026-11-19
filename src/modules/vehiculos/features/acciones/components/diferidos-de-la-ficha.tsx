'use client'

import { diferido } from '@/shared/ui/diferido'

// Los paneles del «⋯» de la ficha se piden recién al abrirse (se montan con `useAbiertoAlgunaVez()`): la ficha no paga su código en frío. Son los de
// esta superficie; el inventario tiene los suyos (`listado/components/diferidos.tsx`).
export const PanelDeImagenesDeLaFichaDiferido = diferido(() =>
  import('../../fotos/components/panel-de-imagenes').then((modulo) => modulo.PanelDeImagenes),
)

export const ActualizarLosDatosDeLaFichaDiferido = diferido(() =>
  import('../../subasta/components/actualizar-los-datos').then(
    (modulo) => modulo.ActualizarLosDatos,
  ),
)
