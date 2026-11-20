'use client'

import { createContext, useContext, type ReactNode } from 'react'

// Qué hace el botón del «Costo estimado»: abrir «Compartir la cotización» de la aprobada. Lo da `src/app` (el diálogo es de `cotizaciones`, que este módulo no importa) y
// llega por contexto: de la lista al dato de cada tarjeta o fila hay cuatro componentes de por medio. Nulo = no hay cómo compartir: el costo queda como texto.
export type CompartirLaAprobada = (cotizacionId: string) => void

const Contexto = createContext<CompartirLaAprobada | null>(null)

export function ProveedorDeCompartirLaAprobada({
  compartir,
  children,
}: {
  compartir: CompartirLaAprobada | null
  children: ReactNode
}) {
  return <Contexto.Provider value={compartir}>{children}</Contexto.Provider>
}

export function useCompartirLaAprobada(): CompartirLaAprobada | null {
  return useContext(Contexto)
}
