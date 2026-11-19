// Las operaciones del lienzo que ofrecen la barra y el menú contextual, con su texto y la acción del editor, en el orden en que se muestran (como Excel). Sólo datos.
import type { OperacionDeLaBarra } from '../../../../entities/plantilla/edicion/disponibilidad'

export type GrupoDeOperaciones = readonly { clave: OperacionDeLaBarra; texto: string }[]

export const DEL_PORTAPAPELES: GrupoDeOperaciones = [
  { clave: 'pegar', texto: 'Pegar' },
  { clave: 'vaciar', texto: 'Vaciar' },
]
export const DE_LA_COMBINACION: GrupoDeOperaciones = [
  { clave: 'combinar', texto: 'Combinar' },
  { clave: 'separar', texto: 'Separar' },
]
export const PARA_INSERTAR: GrupoDeOperaciones = [
  { clave: 'filaArriba', texto: 'Fila arriba' },
  { clave: 'filaAbajo', texto: 'Fila abajo' },
  { clave: 'columnaIzquierda', texto: 'Columna a la izquierda' },
  { clave: 'columnaDerecha', texto: 'Columna a la derecha' },
]
export const PARA_ELIMINAR: GrupoDeOperaciones = [
  { clave: 'eliminarFilas', texto: 'Filas' },
  { clave: 'eliminarColumnas', texto: 'Columnas' },
]
