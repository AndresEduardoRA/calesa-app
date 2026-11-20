// El texto de una fila que no lo tiene (4.21-1, C11): las fórmulas sembradas no traen `texto`, y el editor las muestra como el Excel: `a+b+c`, `SI(b; x)`,
// `a>b`, `MAX(a; b)`. Una búsqueda (BUSCARV) no se escribe: una fila que la tiene nació de su texto y lo trae.
// El texto no lleva el «=» (es opcional en el compilador). Sólo se da si compilarlo, en su contexto, deja EL MISMO nodo (sin auxiliares nuevas y con el
// mismo valor); si no (una forma que la gramática no tiene, o un `de` que nombra un nodo posterior), es nulo y la fila se muestra por sus campos.
import type { Formula } from '../formula'
import type { Medidor } from '../medidor'
import { esDeComparacion, type Nodo, type NodoDeComparacion, type NodoDeCuenta } from '../nodos'
import { compilarFilaBase } from './compilar-fila-base'
import { filasDe } from './filas'
import { escribirLiteral } from './literal'
import { mismaEstructura } from './misma-estructura'

function textoDeCuenta(nodo: NodoDeCuenta): string {
  const [x = ''] = nodo.de
  switch (nodo.op) {
    case 'suma':
      return nodo.de.join('+')
    case 'restar':
      return nodo.de.join('-')
    case 'multiplicar':
      return nodo.de.join('*')
    case 'dividir':
      return nodo.de.join('/')
    case 'porcentaje_de':
      return `PORCENTAJE_DE(${nodo.de.join('+')}; ${nodo.pct})`
    case 'si':
      return `SI(${nodo.condicion}; ${x})`
    case 'redondear':
      return `REDONDEAR(${x}; ${String(nodo.n)})`
    case 'depreciar':
      return `DEPRECIAR(${x}; ${nodo.tabla}; ${nodo.sobre}; ${nodo.columna})`
    default: {
      const _: never = nodo
      return _
    }
  }
}

// Una condición o un extremo, como en Excel. Un `elegir` de una bandera sin «si no» se escribiría como el `si` de siempre: no recompila igual y queda nulo.
function textoDeCondicion(nodo: NodoDeComparacion): string {
  switch (nodo.op) {
    case 'comparar':
      return `${nodo.de[0]}${nodo.cmp}${nodo.de[1]}`
    case 'es_opcion':
      return `${nodo.de[0]}${nodo.cmp}"${nodo.clave}"`
    case 'y':
      return `Y(${nodo.de.join('; ')})`
    case 'o':
      return `O(${nodo.de.join('; ')})`
    case 'elegir':
      return `SI(${[nodo.prueba, ...nodo.de].join('; ')})`
    case 'max':
      return `MAX(${nodo.de.join('; ')})`
    case 'min':
      return `MIN(${nodo.de.join('; ')})`
    default: {
      const _: never = nodo
      return _
    }
  }
}

function textoDe(nodo: Nodo, formula: Formula): string | null {
  if (nodo.tipo === 'constante')
    return escribirLiteral(formula.params.constantes[nodo.id] ?? Number.NaN, nodo.formato === 'pct')
  if (nodo.tipo !== 'calculo') return null
  return esDeComparacion(nodo) ? textoDeCondicion(nodo) : textoDeCuenta(nodo)
}

const sinTexto = (n: Nodo): Nodo => ({ ...n, texto: undefined }) as Nodo

export function textoDeNodo(formula: Formula, filaId: string, medidor?: Medidor): string | null {
  const m = medidor ?? { visitas: 0 }
  const fila = filasDe(formula.definicion, m).find((f) => f.nodo.id === filaId)
  if (fila === undefined) return null
  const texto = textoDe(fila.nodo, formula)
  if (texto === null) return null
  const r = compilarFilaBase(formula, { destino: { existente: filaId }, texto }, m)
  if (!r.ok || r.nodos.length !== 1) return null
  const nuevo = r.nodos[0]
  if (nuevo === undefined || !mismaEstructura(sinTexto(nuevo), sinTexto(fila.nodo))) return null
  if (
    fila.nodo.tipo === 'constante' &&
    !Object.is(r.params[filaId], formula.params.constantes[filaId])
  )
    return null
  return texto
}
