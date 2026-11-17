'use client'

import { createContext, use, type ReactNode } from 'react'

// El nivel del encabezado que lleva un `<Bloque>` a la vista: 3 bajo el título de un panel (su `h2`), 4 si va dentro de otro bloque. Sin
// proveedor, `null`: el bloque es el `<details>` plegable de siempre.
const ContextoDeBloquesALaVista = createContext<number | null>(null)

export function useNivelDeBloque(): number | null {
  return use(ContextoDeBloquesALaVista)
}

type Props = { nivel?: number; children: ReactNode }

// Dentro de esto, cada `<Bloque>` se dibuja a la vista (una `<section>` con su encabezado), sin plegar: un panel que muestra todo lo de una cosa (el de una
// fase del flujo) no se vuelve una pila de acordeones. Lo de adentro no cambia: los formularios siguen usando `<Bloque>`.
export function BloquesALaVista({ nivel = 3, children }: Props) {
  return <ContextoDeBloquesALaVista value={nivel}>{children}</ContextoDeBloquesALaVista>
}
