// Las operaciones de condición y de extremos de `calculo` (docs/COTIZADOR.md › «El motor» › «La aritmética»): `comparar`,
// `es_opcion`, `y` y `o` valen 1 o 0; `elegir` toma una rama según su `prueba`; `max` y `min`, el mayor y el menor. La igualdad es
// exacta en dobles, como `=` de float8. Un null en lo que se lee vuelve null el resultado, sin faltante nuevo (el faltante es de
// donde nació); en `elegir`, sólo el de la `prueba` y el de la rama elegida. `evaluar_formula()` lo copia bit a bit.
import { recorrer } from './medidor'
import { leer, leerGuardado, sinValidar, type Evaluacion, type Valor } from './motor-contexto'
import type { Comparador, NodoDeComparacion } from './nodos'

type De<Op extends NodoDeComparacion['op']> = Extract<NodoDeComparacion, { op: Op }>

export function valorDeComparacion(ev: Evaluacion, n: NodoDeComparacion): Valor {
  switch (n.op) {
    case 'comparar':
      return comparar(ev, n)
    case 'es_opcion':
      return esOpcion(ev, n)
    case 'y':
    case 'o':
      return yO(ev, n)
    case 'elegir':
      return elegir(ev, n)
    case 'max':
    case 'min':
      return extremo(ev, n)
    default: {
      const _: never = n
      return _
    }
  }
}

const unoSi = (x: boolean): Valor => (x ? 1 : 0)

function compara(a: number, cmp: Comparador, b: number): boolean {
  switch (cmp) {
    case '>':
      return a > b
    case '<':
      return a < b
    case '>=':
      return a >= b
    case '<=':
      return a <= b
    case '=':
      return a === b
    case '<>':
      return a !== b
    default: {
      const _: never = cmp
      return _
    }
  }
}

function comparar(ev: Evaluacion, n: De<'comparar'>): Valor {
  const a = leer(ev, n.de[0], n.id)
  const b = leer(ev, n.de[1], n.id)
  return a === null || b === null ? null : unoSi(compara(a, n.cmp, b))
}

// La variante vale su clave (un texto): se compara como texto, sin conversión.
function esOpcion(ev: Evaluacion, n: De<'es_opcion'>): Valor {
  const v = leerGuardado(ev, n.de[0], n.id)
  if (typeof v !== 'string')
    throw sinValidar(`«${n.id}» compara «${n.de[0]}», que no es la variante`, n.id)
  return unoSi((v === n.clave) === (n.cmp === '='))
}

// Los términos en el orden de `de`, leídos todos aunque uno sea null; null si alguno lo es.
function terminos(ev: Evaluacion, quien: string, de: readonly string[]): number[] | null {
  const valores: number[] = []
  let nulo = false
  for (const id of recorrer(de, ev.m)) {
    const v = leer(ev, id, quien)
    if (v === null) nulo = true
    else valores.push(v)
  }
  return nulo ? null : valores
}

// `y`: todos distintos de 0; `o`: alguno distinto de 0.
function yO(ev: Evaluacion, n: De<'y'> | De<'o'>): Valor {
  const valores = terminos(ev, n.id, n.de)
  if (valores === null) return null
  let todos = true
  let alguno = false
  for (const v of recorrer(valores, ev.m)) {
    if (v === 0) todos = false
    else alguno = true
  }
  return unoSi(n.op === 'y' ? todos : alguno)
}

// Se leen la `prueba` y las dos ramas (una rama que falta vale 0); vale la rama que elige la prueba.
function elegir(ev: Evaluacion, n: De<'elegir'>): Valor {
  const prueba = leer(ev, n.prueba, n.id)
  const si = leer(ev, n.de[0] ?? '', n.id)
  const otra = n.de[1]
  const no = otra === undefined ? 0 : leer(ev, otra, n.id)
  if (prueba === null) return null
  return prueba !== 0 ? si : no
}

// De izquierda a derecha: el primero y, después, cada término que lo supera (estrictamente). Nunca `Math.max`: igual da lo mismo,
// pero el bucle es el que copia la base (que no usa `greatest`, porque ignora los null).
function extremo(ev: Evaluacion, n: De<'max'> | De<'min'>): Valor {
  const valores = terminos(ev, n.id, n.de)
  if (valores === null) return null
  let actual: number | undefined
  for (const v of recorrer(valores, ev.m)) {
    if (actual === undefined || (n.op === 'max' ? v > actual : v < actual)) actual = v
  }
  return actual ?? null
}
