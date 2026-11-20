'use client'

import { createContext, use } from 'react'

export type MenuPlegado = {
  // Si el menú lateral se ve plegado a sólo íconos (en escritorio: en el celular el menú no cambia).
  plegado: boolean
  alternar: () => void
}

export const ContextoDelMenuPlegado = createContext<MenuPlegado>({
  plegado: false,
  alternar: () => undefined,
})

export function useMenuPlegado(): MenuPlegado {
  return use(ContextoDelMenuPlegado)
}
