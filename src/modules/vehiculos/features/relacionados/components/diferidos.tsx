'use client'

import { diferido } from '@/shared/ui/diferido'

// Lo que sólo se pide al abrirse: «Ver todos» (se monta con `useAbiertoAlgunaVez()`) y los bloques de un resumen, que no pagan su código hasta que se abre uno.
export const DrawerDeRelacionadosDiferido = diferido(() =>
  import('./drawer-de-relacionados').then((modulo) => modulo.DrawerDeRelacionados),
)

export const DrawerDeVinculosDiferido = diferido(() =>
  import('./drawer-de-vinculos').then((modulo) => modulo.DrawerDeVinculos),
)

export const RelacionadosDelResumenDiferido = diferido(() =>
  import('./relacionados-del-resumen').then((modulo) => modulo.RelacionadosDelResumen),
)

export const RelacionadosDelResumenDeLeadDiferido = diferido(() =>
  import('./relacionados-del-resumen-de-lead').then(
    (modulo) => modulo.RelacionadosDelResumenDeLead,
  ),
)
