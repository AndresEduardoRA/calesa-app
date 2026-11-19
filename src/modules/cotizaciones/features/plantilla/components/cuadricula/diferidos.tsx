'use client'

import { diferido } from '@/shared/ui/diferido'

// El editor de la tarjeta (el lienzo como Excel, el panel, dnd-kit y los atajos): la pestaña no carga su código para mostrarse; se pide cuando hay una fórmula que
// editar y la pantalla es ancha. Si no llega, el aviso va en su lugar.
export const EditorDeLaCuadriculaDiferido = diferido(
  () => import('./editor-de-la-cuadricula').then((modulo) => modulo.EditorDeLaCuadricula),
  { aviso: 'aqui' },
)
