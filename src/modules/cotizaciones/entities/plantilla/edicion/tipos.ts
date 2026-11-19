// Lo que comparten las operaciones del editor de la tarjeta (`entities/plantilla/edicion/`): una posición de la grilla por índices, un rectángulo y el resultado
// de una operación. Sin lógica. Las operaciones son puras y no mutan su entrada: devuelven la plantilla nueva o el motivo por el que no se hizo.
import type { PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import type { Seleccion } from './seleccion'

// Una casilla: el índice de su fila y el de su columna.
export type Pos = { readonly f: number; readonly k: number }

// Un rectángulo de casillas, con los dos extremos incluidos (`f0 ≤ f1`, `k0 ≤ k1`).
export type Rect = {
  readonly f0: number
  readonly k0: number
  readonly f1: number
  readonly k1: number
}

export type ResultadoDeEdicion =
  | {
      readonly ok: true
      readonly plantilla: PlantillaEnCuadricula
      // Lo que se anuncia al lector de pantalla («Se combinaron 3 celdas.»).
      readonly anuncio: string
      // La selección que queda, si la operación la cambia (la celda que quedó al combinar, la fila insertada).
      readonly seleccion?: Seleccion
    }
  | { readonly ok: false; readonly motivo: string }

export const rechazo = (motivo: string): ResultadoDeEdicion => ({ ok: false, motivo })
