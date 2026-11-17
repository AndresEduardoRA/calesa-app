'use client'

import { createContext, use } from 'react'
import { SIN_MARCAS, type MarcasDelDiagrama } from '../../../entities/marcas-del-diagrama'

// Los avisos de «Revisar» en cada fase y salida. Los lee el área `revisar` una vez por versión del flujo y llena este contexto con su hueco
// `proveedorDeRevisar` (el núcleo no importa áreas). Sin proveedor, nada marcado.
export const ContextoDeMarcasDelDiagrama = createContext<MarcasDelDiagrama>(SIN_MARCAS)

export function useMarcasDelDiagrama(): MarcasDelDiagrama {
  return use(ContextoDeMarcasDelDiagrama)
}
