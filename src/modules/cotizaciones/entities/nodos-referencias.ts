// Las referencias de un nodo (`referenciasDe()`): qué nodos lee y con qué papel, en el orden en que aparecen. Las usan la validación, las
// auxiliares del compilador, la variante en par y la fila con texto; sus espejos en la base son `validar_formula()`, `_diseno_auxiliares()` y
// `_nodos_en_par()` (una clave nueva va en los cuatro). Puro, sin I/O.
import {
  esDeComparacion,
  type Nodo,
  type NodoCalculo,
  type NodoDeComparacion,
  type NodoDeCuenta,
} from './nodos'

// Cómo un nodo nombra a otro. `match` puede nombrar un nodo o un campo del vehículo. `prueba` es la condición de un `elegir` y cada
// término de un `y` o un `o` (una bandera o una operación de condición); `variante`, la que compara un `es_opcion`.
export type PapelDeReferencia =
  | 'de'
  | 'pct'
  | 'sobre'
  | 'condicion'
  | 'requerido_si'
  | 'sugerido_de'
  | 'match'
  | 'prueba'
  | 'variante'
export type Referencia = { id: string; papel: PapelDeReferencia }

const refs = (papel: PapelDeReferencia, ids: readonly (string | undefined)[]): Referencia[] =>
  ids.flatMap((id) => (id === undefined ? [] : [{ id, papel }]))

// Lo propio de cada operación; la `condicion`, siempre al final.
function referenciasDeCalculo(n: NodoCalculo): Referencia[] {
  const propias = esDeComparacion(n) ? referenciasDeComparacion(n) : referenciasDeCuenta(n)
  return [...propias, ...refs('condicion', [n.condicion])]
}

function referenciasDeCuenta(n: NodoDeCuenta): Referencia[] {
  switch (n.op) {
    case 'porcentaje_de':
      return [...refs('de', n.de), ...refs('pct', [n.pct])]
    case 'depreciar':
      return [...refs('de', n.de), ...refs('sobre', [n.sobre])]
    case 'suma':
    case 'multiplicar':
    case 'restar':
    case 'dividir':
    case 'si':
    case 'redondear':
      return refs('de', n.de)
    default: {
      const _: never = n
      return _
    }
  }
}

function referenciasDeComparacion(n: NodoDeComparacion): Referencia[] {
  switch (n.op) {
    case 'es_opcion':
      return refs('variante', n.de)
    case 'y':
    case 'o':
      return refs('prueba', n.de)
    case 'elegir':
      return [...refs('prueba', [n.prueba]), ...refs('de', n.de)]
    case 'comparar':
    case 'max':
    case 'min':
      return refs('de', n.de)
    default: {
      const _: never = n
      return _
    }
  }
}

// Los nodos que este nodo lee, en el orden en que aparecen. Un nodo nuevo = un caso acá.
export function referenciasDe(n: Nodo): Referencia[] {
  switch (n.tipo) {
    case 'input':
      return [
        ...refs('sugerido_de', [n.sugerido_de]),
        ...refs('requerido_si', [n.requerido_si]),
        ...refs('condicion', [n.condicion]),
      ]
    case 'constante':
      return refs('condicion', [n.condicion])
    case 'tipo_cambio':
    case 'campo_vehiculo':
    case 'bandera':
    case 'opcion':
      return []
    case 'tabla':
      return [...refs('match', Object.values(n.match)), ...refs('condicion', [n.condicion])]
    case 'tramo':
      return [...refs('sobre', [n.sobre]), ...refs('condicion', [n.condicion])]
    case 'calculo':
      return referenciasDeCalculo(n)
    default: {
      const _: never = n
      return _
    }
  }
}
