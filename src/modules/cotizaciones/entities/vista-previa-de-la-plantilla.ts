// El hueco del lienzo del editor de la plantilla: lo que `plantilla` le da al componente que llena el área `tarjeta` (`LienzoDeLaPlantilla`, por
// `pantallas/tarjeta-plantilla.ts`) y lo que éste le devuelve a la capa del editor para posicionarse. Dos áreas no se importan: estos tipos, sin código, son lo único
// que comparten (con `referencia-de-la-tarjeta.ts`). La lectura es la cuadrícula de trabajo con lo que nombra, plana y sin `Map`.
import type { ReactNode } from 'react'
import type { LecturaEnCuadricula } from './cuadricula-de-la-tarjeta'
import type { ReferenciaDeLaTarjeta } from './referencia-de-la-tarjeta'

// Cada grupo de una plantilla de la forma 1 convertida lleva a lo sumo estas filas si la conversión entera no entra en la grilla (120 filas).
export const FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA = 4

// Una fila que se dibuja: su banda en px de la tarjeta (sin escalar).
export type FilaParaEditar = { readonly id: string; readonly y: number; readonly alto: number }

// Por qué una fila no se dibuja con esta referencia: su nodo no aplica (con el título de la opción elegida de la variante, si la hay), vale 0, o no está en la versión
// de la fórmula de la referencia.
export type MotivoDeLaOculta = 'no_aplica' | 'cero' | 'fuera_de_la_version'

export type OcultaParaEditar = {
  readonly fila: string
  readonly etiqueta: string
  readonly delNodo: string
  readonly motivo: MotivoDeLaOculta
  readonly variante: string | null
}

// Lo mínimo de la geometría para que la capa del editor se posicione: el tamaño de la tarjeta, las filas que se dibujan y las ocultas. La `x` de cada columna la
// calcula la capa con los anchos de la plantilla; así no repite la regla de qué fila se oculta.
export type GeometriaParaEditar = {
  readonly ancho: number
  readonly alto: number
  readonly filas: readonly FilaParaEditar[]
  readonly ocultas: readonly OcultaParaEditar[]
}

export type EscalaDelLienzo = 'ajustar' | 'real'

// El espacio que la capa necesita alrededor de la tarjeta, en px sin escalar: arriba las cabeceras de columna y a la izquierda las asas de fila.
export type MargenDelLienzo = {
  readonly arriba: number
  readonly izquierda: number
  // A la derecha de la tarjeta: el lugar del borde de la última columna, que se arrastra (sin él, «Ajustar» desborda el marco de costado).
  readonly derecha?: number
}

export type PropsDelLienzoDeLaPlantilla = {
  readonly lectura: LecturaEnCuadricula
  // Nula, sin cotización o ilegible: cifras de ejemplo.
  readonly referencia: ReferenciaDeLaTarjeta | null
  readonly escala: EscalaDelLienzo
  readonly margen?: MargenDelLienzo
  // Lo que va encima de la tarjeta, sin escalar y del tamaño del lienzo con su margen; sin capa, la tarjeta en sólo lectura (menos de 1.024 px).
  readonly capa?: (g: GeometriaParaEditar, escala: number) => ReactNode
  // Lo que va debajo (las filas ocultas con esta referencia).
  readonly debajo?: (g: GeometriaParaEditar) => ReactNode
  // El logo de la empresa no se pudo dibujar (la imagen no cargó): el editor lo avisa.
  readonly alFallarElLogo?: () => void
}
