import type { ReactNode } from 'react'
import type { CotizacionDelListado } from '../../../entities/listado/filas-del-listado'

export type FilaDeCotizacion = CotizacionDelListado

// El «⋯» de una fila o una tarjeta: lo dibuja quien compone la pantalla (`src/app`, que une lo de cada área); sin él, sin menú. Devuelve nulo si la fila no tiene qué ofrecer.
export type MenuDeFila = (fila: FilaDeCotizacion) => ReactNode

// Un origen con el que se nombra a una fila (los de `cotizaciones.ver` de quien mira).
export type OrigenDelListado = { id: string; nombre: string }

// El nombre de una fila que no se ve (o no tiene) se dibuja «—», sin distinguir un caso del otro.
export const SIN_NOMBRE = '—'

export function nombreDelOrigen(origenes: readonly OrigenDelListado[], id: string): string {
  return origenes.find((origen) => origen.id === id)?.nombre ?? SIN_NOMBRE
}
