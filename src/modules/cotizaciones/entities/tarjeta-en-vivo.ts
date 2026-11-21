// El hueco de la tarjeta en vivo de la planilla de la fórmula: lo que el área `plantilla` lee (la plantilla de trabajo del origen, plana) y lo que el área `tarjeta`
// dibuja con el cálculo de la unidad de ejemplo. La fórmula no importa ninguna de las dos (dos áreas no se importan): estos tipos, sin código, son lo único que
// comparten, y `src/app` las une (`pantallas/tarjeta-formula.ts`, `leerLaTarjetaDeLaFormula()`).
import type { CalculoDeLaTarjeta } from './calculo-de-la-tarjeta'
import type { LecturaEnCuadricula } from './cuadricula-de-la-tarjeta'

// Lo que la tarjeta de trabajo nombra (con lo restringido): los nodos de sus filas y celdas (también los de sus condiciones) y, si se guardó en la forma 1, sus
// grupos y los nodos de sus etiquetas y leyendas. La planilla no borra una fila ni quita una banda que nombra: publicar la fórmula dejaría la tarjeta sin
// calzar (`entities/formula/usos-de-la-fila.ts`). Arreglos: cruza de una página de servidor a un componente de cliente.
export type NombradoPorLaTarjeta = {
  readonly nodos: readonly string[]
  readonly grupos: readonly string[]
}

export type LecturaDeLaTarjetaEnVivo =
  // La plantilla de trabajo (el borrador si hay, si no la publicada) con lo que nombra del nivel «todos».
  | {
      readonly estado: 'lista'
      readonly lectura: LecturaEnCuadricula
      readonly nombra: NombradoPorLaTarjeta
    }
  // El origen no tiene borrador ni publicada de la tarjeta (o no tiene fórmula publicada con qué leerla).
  | { readonly estado: 'sin_tarjeta' }
  | { readonly estado: 'no_se_leyo' }

export type PropsDeLaTarjetaEnVivo = {
  readonly lectura: LecturaEnCuadricula
  readonly calculo: CalculoDeLaTarjeta
  // La moneda del total en la moneda local («Ver total»); nula si no se conoce.
  readonly monedaBs: string | null
}
