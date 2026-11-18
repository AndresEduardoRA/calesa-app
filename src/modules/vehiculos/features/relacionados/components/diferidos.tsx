'use client'

import { diferido } from '@/shared/ui/diferido'

// Lo que sólo se pide al abrirse: «Ver todos» (se monta con `useAbiertoAlgunaVez()`) y el bloque del resumen de un vehículo, que no paga su código hasta que se abre uno.
export const DrawerDeRelacionadosDiferido = diferido(() =>
  import('./drawer-de-relacionados').then((modulo) => modulo.DrawerDeRelacionados),
)

export const DrawerDeVinculosDiferido = diferido(() =>
  import('./drawer-de-vinculos').then((modulo) => modulo.DrawerDeVinculos),
)

export const RelacionadosDelResumenDiferido = diferido(() =>
  import('./relacionados-del-resumen').then((modulo) => modulo.RelacionadosDelResumen),
)

// El grupo de un chip de «Relacionados en una línea»: el popover se monta al primer clic.
export const PopoverDelGrupoDiferido = diferido(() =>
  import('./popover-del-grupo').then((modulo) => modulo.PopoverDelGrupo),
)
