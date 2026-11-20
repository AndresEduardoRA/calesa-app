// El árbol que arma el parser del compilador de fórmulas como texto (docs/COTIZADOR.md › «Fórmulas como texto»). Cada
// hoja y cada operación guardan su tramo del texto: así un error, una etiqueta y la posición de un auxiliar salen de él.
import type { Token } from './compilador-lexico'
import type { CodigoDeCompilacion, DatosDeError } from './motivos-del-compilador'
import type { Comparador, Nodo } from './nodos'

export type Rango = { desde: number; hasta: number }

// Las operaciones del grafo que el texto puede producir.
export type OpDeArbol =
  | 'suma'
  | 'restar'
  | 'multiplicar'
  | 'dividir'
  | 'porcentaje_de'
  | 'si'
  | 'redondear'
  | 'depreciar'
  | 'comparar'
  | 'es_opcion'
  | 'y'
  | 'o'
  | 'elegir'
  | 'max'
  | 'min'
  | 'buscarv'

export type Numero = Rango & {
  k: 'num'
  valor: number
  // Escrito con «%»: vale el número ÷ 100, y la constante es de formato pct.
  pct: boolean
  // Usado donde va un porcentaje (el segundo argumento de PORCENTAJE_DE).
  comoPct: boolean
  negativo: boolean
  // Dónde están los dígitos, sin el signo ni el %.
  numDesde: number
  numHasta: number
  paren: boolean
}
export type Referencia = Rango & { k: 'ref'; nodo: Nodo; paren: boolean }
// Un nombre que no es un nodo: un grupo o el id de una tabla o de una columna, según el argumento de su función.
export type Clave = Rango & { k: 'clave'; texto: string; paren: boolean }
// Un texto entre comillas, sin ellas: sólo vale frente a la variante (`variante="a"`) o donde una función pide un texto.
export type Texto = Rango & { k: 'texto'; texto: string; paren: boolean }

export type Campos = {
  condicion?: string
  n?: number
  tabla?: string
  sobre?: string
  columna?: string
  // El comparador de `comparar` y `es_opcion`, y la opción con la que `es_opcion` compara la variante.
  cmp?: Comparador
  clave?: string
  // BUSCARV exacta: la columna de la tabla donde se busca el valor (la primera). Sin ella, BUSCARV es por tramo.
  buscarEn?: string
}
export type Calculo = Rango & {
  k: 'calc'
  op: OpDeArbol
  hijos: Arbol[]
  // El porcentaje de PORCENTAJE_DE: una referencia o un número. (La condición de `elegir` va primera en `hijos`, como en el texto.)
  pct?: Arbol
  campos: Campos
  // Viene de una función (SUMA, SI…): una cadena «a+b+c» no se le suma.
  deFuncion: boolean
  paren: boolean
}
export type Arbol = Numero | Referencia | Clave | Texto | Calculo

export type ErrorCrudo = Rango & { codigo: CodigoDeCompilacion; datos: DatosDeError }

export const error = (
  codigo: CodigoDeCompilacion,
  desde: number,
  hasta: number,
  datos: DatosDeError = {},
): ErrorCrudo => ({ codigo, desde, hasta, datos })

export const errorEn = (a: Rango, codigo: CodigoDeCompilacion, datos: DatosDeError = {}) =>
  error(codigo, a.desde, a.hasta, datos)

// Los errores que se dicen desde más de un lugar, con su código escrito una sola vez.
export const faltaUnValor = (a: Rango) => errorEn(a, 'falta_un_valor')
export const demasiadosTerminos = (a: Rango) => errorEn(a, 'demasiados_terminos')
export const argumentoInvalido = (a: Rango, esperado?: string) =>
  errorEn(a, 'argumento_invalido', esperado === undefined ? {} : { esperado })
export const funcionDesconocida = (a: Rango, nombre: string) =>
  errorEn(a, 'funcion_desconocida', { nombre })

export const esError = (x: object): x is ErrorCrudo => 'codigo' in x

// `condicion`: una bandera, una comparación, Y u O. `valor_o_grupo`: un valor o, si es el único argumento, un grupo entero.
// `buscado`: el valor que BUSCARV busca (también la variante); `texto`, entre comillas; `logico`, VERDADERO o FALSO.
export type TipoDeArgumento =
  | 'valor'
  | 'condicion'
  | 'valor_o_grupo'
  | 'buscado'
  | 'texto'
  | 'logico'
  | 'nodo'
  | 'grupo'
  | 'clave'
  | 'entero'
  | 'pct'
// `args`, lo que pide cada posición; `resto`, lo que piden las que siguen (sin tope); `minimo`, cuántos hacen falta como mínimo
// (sin él, todos los de `args`).
export type EspecDeFuncion = {
  nombre: string
  args: readonly TipoDeArgumento[]
  resto?: TipoDeArgumento
  minimo?: number
}

// Una agrupación abierta: un paréntesis suelto o la llamada a una función.
export type Marco = {
  tipo: 'grupo' | 'funcion'
  // El «(».
  abre: Token
  // La función: su nombre en mayúsculas y su tramo.
  nombre?: string
  nombreRango?: Rango
  spec?: EspecDeFuncion
  args: Arbol[]
  baseOperadores: number
  baseOperandos: number
}
