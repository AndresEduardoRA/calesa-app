// La hoja en par (glosario: «Variante en par»): con una variante que se cotiza en par, la hoja no dibuja sus chips; los nodos que cambian según la opción
// (`enPar` de cada celda y subtotal, lo decide la base) van en dos celdas lado a lado, una por opción, y los comunes una sola vez. Puro.

export type OpcionDelPar = { clave: string; etiqueta: string }
export type ParDeHoja = {
  nodo: string
  etiqueta: string
  opciones: readonly [OpcionDelPar, OpcionDelPar]
}
// La columna de una opción: 0 la primera, 1 la segunda (el orden de las opciones de la variante).
export type LadoDelPar = 0 | 1

export const LADOS_DEL_PAR: readonly LadoDelPar[] = [0, 1]

// «Transporte · 20 pies»: el rótulo de la celda, « · » y la etiqueta de la opción.
export const rotuloEnPar = (etiqueta: string, opcion: OpcionDelPar): string =>
  `${etiqueta} · ${opcion.etiqueta}`

// La línea de arriba de la hoja, la de V1 adaptada.
export const lineaDelPar = (par: ParDeHoja): string =>
  `Dos versiones: ${par.opciones[0].etiqueta} y ${par.opciones[1].etiqueta}.`

// La columna de una opción por su clave, o nulo si no es del par.
export function ladoDeLaOpcion(
  par: ParDeHoja,
  clave: string | null | undefined,
): LadoDelPar | null {
  if (par.opciones[0].clave === clave) return 0
  if (par.opciones[1].clave === clave) return 1
  return null
}

export const otroLado = (lado: LadoDelPar): LadoDelPar => (lado === 0 ? 1 : 0)
