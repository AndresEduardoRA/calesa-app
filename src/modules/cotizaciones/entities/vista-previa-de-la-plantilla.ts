// El hueco de la vista previa del editor de la plantilla (4.19-4): lo que `plantilla` le da al componente que llena el área `tarjeta` (`pantallas/tarjeta-plantilla.ts`).
// Dos áreas no se importan: este tipo, sin código, es lo único que comparten. La lectura es la cuadrícula convertida con lo que nombra, plana y sin `Map` porque
// cruza props de la página al editor (cliente).
import type { LecturaEnCuadricula } from './cuadricula-de-la-tarjeta'

// Cada grupo dibuja a lo sumo estas filas: con 500 miembros en un grupo la vista previa no crece.
export const FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA = 4

export type LecturaParaLaVistaPrevia = {
  readonly lectura: LecturaEnCuadricula
  // Cuántas filas quedaron fuera por el tope, en todos los grupos.
  readonly filasDeMas: number
}

export type PropsDeLaVistaPreviaDeLaPlantilla = { readonly lectura: LecturaParaLaVistaPrevia }
