// Qué se puede hacer desde la barra y el menú con lo elegido, y por qué no: cada operación se prueba en seco con el reductor (la misma regla, los mismos topes) y lo
// que rechazaría queda apagado con ese motivo. Puro.
import type { AccionDelEditor, EstadoDelEditor } from './estado-del-editor'
import { loQueSeDeshace, loQueSeRehace } from './historial'
import { reductorDelEditor } from './reductor'

export const OPERACIONES_DE_LA_BARRA = {
  combinar: { tipo: 'combinar' },
  separar: { tipo: 'separar' },
  filaArriba: { tipo: 'insertarFila', lado: 'arriba' },
  filaAbajo: { tipo: 'insertarFila', lado: 'abajo' },
  columnaIzquierda: { tipo: 'insertarColumna', lado: 'izquierda' },
  columnaDerecha: { tipo: 'insertarColumna', lado: 'derecha' },
  eliminarFilas: { tipo: 'eliminarFilas' },
  eliminarColumnas: { tipo: 'eliminarColumnas' },
  vaciar: { tipo: 'vaciar' },
  pegar: { tipo: 'pegar' },
} as const satisfies Readonly<Record<string, AccionDelEditor>>

export type OperacionDeLaBarra = keyof typeof OPERACIONES_DE_LA_BARRA

export type Disponibilidad = Readonly<Record<OperacionDeLaBarra, string | null>> & {
  readonly deshacer: string | null
  readonly rehacer: string | null
}

export function disponibilidad(e: EstadoDelEditor): Disponibilidad {
  const motivos = Object.fromEntries(
    Object.entries(OPERACIONES_DE_LA_BARRA).map(([clave, accion]) => [
      clave,
      reductorDelEditor({ ...e, rechazo: null }, accion).rechazo,
    ]),
  ) as Record<OperacionDeLaBarra, string | null>
  return {
    ...motivos,
    deshacer: loQueSeDeshace(e.historial) === null ? 'No hay nada que deshacer.' : null,
    rehacer: loQueSeRehace(e.historial) === null ? 'No hay nada que rehacer.' : null,
  }
}
