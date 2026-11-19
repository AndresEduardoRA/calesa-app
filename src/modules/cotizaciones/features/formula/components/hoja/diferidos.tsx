'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel del ⚙ de una celda se pide recién al abrirse: la hoja no carga el panel, su hook, la lectura del valor por defecto ni la action para mostrarse (4.20-3b). Aparte
// del `diferidos.tsx` de la pestaña «Fórmula», que trae los modales de publicar y revertir.
export const PanelDelAjusteDiferido = diferido(
  () => import('./panel-del-ajuste').then((modulo) => modulo.PanelDelAjuste),
  { aviso: 'pantalla' },
)

// El del ⚙ de la cabecera, igual: el panel, sus hooks, la lectura de la cabecera publicada y la action llegan al abrirlo.
export const PanelDelAjusteDeLaCabeceraDiferido = diferido(
  () =>
    import('./panel-del-ajuste-de-la-cabecera').then((modulo) => modulo.PanelDelAjusteDeLaCabecera),
  { aviso: 'pantalla' },
)
