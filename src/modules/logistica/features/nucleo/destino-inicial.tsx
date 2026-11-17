'use client'

import { createContext, use, type ReactNode } from 'react'

// El destino que «Qué falta» abre solo al montarse (`?destino=<fase>` del panel de un ítem, que pone el botón del siguiente en la hoja). Nulo por defecto: sólo lo
// provee el panel del ítem con sus secciones a la vista, así que un vehículo no cambia en nada. Lo aplica `CuerpoDeQueFalta` si el destino está entre los leídos.
const DestinoInicial = createContext<string | null>(null)

export function ProveedorDelDestinoInicial({
  destino,
  children,
}: {
  destino: string | null
  children: ReactNode
}) {
  return <DestinoInicial value={destino}>{children}</DestinoInicial>
}

export function useDestinoInicialDelMover(): string | null {
  return use(DestinoInicial)
}
