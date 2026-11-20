'use client'

import { diferido } from '@/shared/ui/diferido'

// Las casillas y «Comparar» del modal de un grupo llegan con el modal (el listado sólo paga esta cáscara, que `src/app` pasa como hueco). Mientras llega, nada: el modal va
// dentro y se abre cuando llega; sin red, el aviso va en una barra fija con «Reintentar».
export const CompararDelGrupoDiferido = diferido(() =>
  import('./comparar-del-grupo').then((modulo) => modulo.CompararDelGrupo),
)
