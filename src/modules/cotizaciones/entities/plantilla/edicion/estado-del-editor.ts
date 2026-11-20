// El estado del editor de la tarjeta y las acciones que lo cambian (`reductor.ts`): la cuadrícula de trabajo, lo elegido, el historial (deshacer y rehacer), el bloque
// copiado, la celda en la que se escribe y lo que se anuncia. Sólo tipos y el estado inicial.
import type {
  ContenidoDeLaCelda,
  OcultarPorNodo,
  PlantillaEnCuadricula,
} from '../../cuadricula-de-la-tarjeta'
import type { CambioDeEstilo } from './estilo'
import { historialNuevo, type Historial } from './historial'
import type { Bloque } from './portapapeles'
import type { Direccion, Seleccion } from './seleccion'
import type { Pos } from './tipos'

export type Instantanea = {
  readonly plantilla: PlantillaEnCuadricula
  readonly seleccion: Seleccion | null
}

// La celda en la que se escribe en el lugar (Enter, F2 o una letra): su ancla y lo escrito.
export type Escritura = { readonly pos: Pos; readonly texto: string }

export type EstadoDelEditor = {
  readonly plantilla: PlantillaEnCuadricula
  readonly seleccion: Seleccion | null
  readonly historial: Historial<Instantanea>
  readonly bloque: Bloque | null
  readonly escribiendo: Escritura | null
  // Lo que dice la región `role="status"`; `vez` cambia aunque el texto se repita.
  readonly anuncio: { readonly texto: string; readonly vez: number }
  // Por qué no se hizo lo último que se pidió (se dice junto a la barra); nulo si se hizo.
  readonly rechazo: string | null
}

export type AccionDelEditor =
  | { readonly tipo: 'seleccionar'; readonly seleccion: Seleccion | null }
  | {
      readonly tipo: 'mover'
      readonly direccion: Direccion
      readonly extender: boolean
      readonly visibles: readonly number[]
    }
  | { readonly tipo: 'todo' }
  | { readonly tipo: 'filaActiva'; readonly visibles: readonly number[] }
  | { readonly tipo: 'columnaActiva'; readonly visibles: readonly number[] }
  | { readonly tipo: 'combinar' }
  | { readonly tipo: 'separar' }
  | { readonly tipo: 'insertarFila'; readonly lado: 'arriba' | 'abajo' }
  | { readonly tipo: 'insertarColumna'; readonly lado: 'izquierda' | 'derecha' }
  | { readonly tipo: 'eliminarFilas' }
  | { readonly tipo: 'eliminarColumnas' }
  | { readonly tipo: 'vaciar' }
  | { readonly tipo: 'contenido'; readonly contenido: ContenidoDeLaCelda; readonly clave?: string }
  | { readonly tipo: 'estilo'; readonly cambio: CambioDeEstilo }
  | {
      readonly tipo: 'ancho'
      readonly columna: number
      readonly ancho: number
      readonly clave?: string
    }
  | { readonly tipo: 'alto'; readonly fila: number; readonly alto: number; readonly clave?: string }
  | {
      readonly tipo: 'ocultarSi'
      readonly fila: number
      readonly ocultar: OcultarPorNodo
      readonly nodo: string | null
    }
  | { readonly tipo: 'moverFila'; readonly desde: number; readonly hasta: number }
  | { readonly tipo: 'sumarColumna' }
  | { readonly tipo: 'copiar' }
  | { readonly tipo: 'pegar' }
  | { readonly tipo: 'pegarTexto'; readonly texto: string }
  | { readonly tipo: 'deshacer' }
  | { readonly tipo: 'rehacer' }
  | { readonly tipo: 'reponer'; readonly plantilla: PlantillaEnCuadricula; readonly nombre: string }
  // Enter o F2 (sin texto: sigue con el que tiene) o una letra (reemplaza lo que había).
  | {
      readonly tipo: 'empezarAEscribir'
      readonly texto?: string
      readonly visibles: readonly number[]
    }
  | { readonly tipo: 'escribir'; readonly texto: string }
  | { readonly tipo: 'confirmarEscritura' }
  | { readonly tipo: 'descartarEscritura' }
  | { readonly tipo: 'anunciar'; readonly texto: string }

export const MOTIVO_SIN_SELECCION = 'Elige una celda primero.'

export function estadoInicial(plantilla: PlantillaEnCuadricula): EstadoDelEditor {
  return {
    plantilla,
    seleccion: null,
    historial: historialNuevo(),
    bloque: null,
    escribiendo: null,
    anuncio: { texto: '', vez: 0 },
    rechazo: null,
  }
}
