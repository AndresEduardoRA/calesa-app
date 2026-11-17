'use client'

import { createContext, use } from 'react'

// Ordenar las fases desde el diagrama (arrastrar) y desde el panel («Mover antes/después»). Escribe el área `fases` (`fase_mover`, con la versión): llena este
// contexto con su hueco `ordenDeFases` (el núcleo no importa áreas).
export type OrdenDeFases = {
  // Por qué no se puede ordenar ninguna (la lista cortada por el tope), o nulo.
  motivo: string | null
  // `fase_mover(id, despuesDe)`; devuelve si se movió. Un rechazo ya lo dijo quien escribe.
  mover: (id: string, despuesDe: string | null) => Promise<boolean>
  enCurso: boolean
}

export const ContextoDeOrdenDeFases = createContext<OrdenDeFases | null>(null)

export const MOTIVO_SIN_ORDEN_AQUI = 'No se puede ordenar desde aquí.'

// Nulo fuera del proveedor: arrastrar queda apagado con `MOTIVO_SIN_ORDEN_AQUI`.
export function useOrdenDeFases(): OrdenDeFases | null {
  return use(ContextoDeOrdenDeFases)
}
