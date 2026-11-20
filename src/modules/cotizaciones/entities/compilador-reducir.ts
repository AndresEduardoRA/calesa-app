// Reducir operadores del parser: una cadena `a+b+c` (`-`, `*`) se aplana al reducir en UN nodo, en el orden del texto; un
// paréntesis o una función corta el aplanado, y `/` nunca se aplana. Una comparación tampoco: `a<b<c` sin paréntesis es un error.
import {
  demasiadosTerminos,
  errorEn,
  esError,
  faltaUnValor,
  type Arbol,
  type Calculo,
  type Campos,
  type ErrorCrudo,
  type OpDeArbol,
  type Rango,
  type Referencia,
} from './compilador-arbol'
import { contar, type Estado, type Operador } from './compilador-estado'
import { datosDeVariante, tieneOpcion } from './compilador-nombres'
import { COMPARADORES, type Comparador } from './nodos'

export const PRECEDENCIA: Readonly<Record<string, number>> = {
  '>': 1,
  '<': 1,
  '>=': 1,
  '<=': 1,
  '=': 1,
  '<>': 1,
  '+': 2,
  '-': 2,
  '*': 3,
  '/': 3,
}
const OPERACION: Readonly<Record<string, OpDeArbol>> = {
  '+': 'suma',
  '-': 'restar',
  '*': 'multiplicar',
  '/': 'dividir',
}

const COMPARA = new Set<string>(COMPARADORES)
export const esComparador = (s: string): s is Comparador => COMPARA.has(s)
// `=` y `<>`: los únicos con los que se pregunta por una opción de la variante.
export const esIgualdad = (s: string) => s === '=' || s === '<>'

const esVariante = (a: Arbol): a is Referencia => a.k === 'ref' && a.nodo.tipo === 'opcion'
const comoError = (a: Arbol): ErrorCrudo =>
  esVariante(a)
    ? errorEn(a, 'variante_en_calculo', datosDeVariante(a.nodo))
    : errorEn(a, 'texto_fuera_de_lugar')
// Un texto o la variante no entran en una cuenta.
const noEsNumero = (a: Arbol) => a.k === 'texto' || esVariante(a)

const armar = (op: OpDeArbol, hijos: Arbol[], r: Rango, campos: Campos): Calculo => ({
  k: 'calc',
  op,
  hijos,
  campos,
  deFuncion: false,
  paren: false,
  ...r,
})
const contado = (e: Estado, o: Operador, c: Calculo) => (contar(e)(1) ? c : demasiadosTerminos(o))
const entre = (izq: Arbol, der: Arbol): Rango => ({ desde: izq.desde, hasta: der.hasta })

// Dos textos, o un texto frente a un número.
function textoConOtro(izq: Arbol, der: Arbol): ErrorCrudo {
  if (izq.k === 'texto' && der.k === 'texto') return comoError(izq)
  const t = izq.k === 'texto' ? izq : der
  return errorEn(t, 'comparar_texto_con_numero', { texto: t.k === 'texto' ? t.texto : '' })
}

// Una comparación con la variante o con un texto: sólo vale la variante frente a una de sus opciones, con `=` o `<>`, en cualquier
// orden (`variante="a"`, `"a"<>variante`), y es un `es_opcion`.
function conVarianteOTexto(e: Estado, izq: Arbol, o: Operador, der: Arbol): Arbol | ErrorCrudo {
  const variante = esVariante(izq) ? izq : esVariante(der) ? der : undefined
  const texto = izq.k === 'texto' ? izq : der.k === 'texto' ? der : undefined
  if (variante === undefined) return textoConOtro(izq, der)
  if (texto === undefined || !esIgualdad(o.op)) return comoError(variante)
  if (!tieneOpcion(variante.nodo, texto.texto, e.m))
    return errorEn(texto, 'opcion_inexistente', { nombre: variante.nodo.id, texto: texto.texto })
  const campos = { cmp: o.op as Comparador, clave: texto.texto }
  return contado(e, o, armar('es_opcion', [variante], entre(izq, der), campos))
}

// Una comparación entre dos números. `a<b<c` sin paréntesis no se lee como en matemática: es un error.
function comparacion(e: Estado, izq: Arbol, o: Operador, der: Arbol): Arbol | ErrorCrudo {
  const cadena = izq.k === 'calc' && (izq.op === 'comparar' || izq.op === 'es_opcion') && !izq.paren
  if (cadena) return errorEn(o, 'comparacion_encadenada')
  if (noEsNumero(izq) || noEsNumero(der)) return conVarianteOTexto(e, izq, o, der)
  return contado(e, o, armar('comparar', [izq, der], entre(izq, der), { cmp: o.op as Comparador }))
}

function combinar(e: Estado, izq: Arbol, o: Operador, der: Arbol): Arbol | ErrorCrudo {
  if (!contar(e)(1)) return demasiadosTerminos(o)
  if (esComparador(o.op)) return comparacion(e, izq, o, der)
  if (noEsNumero(izq)) return comoError(izq)
  if (noEsNumero(der)) return comoError(der)
  const op = OPERACION[o.op] ?? 'suma'
  if (op !== 'dividir' && izq.k === 'calc' && izq.op === op && !izq.paren && !izq.deFuncion) {
    izq.hijos.push(der)
    izq.hasta = der.hasta
    return izq
  }
  return contado(e, o, armar(op, [izq, der], entre(izq, der), {}))
}

// Reduce los operadores del marco de arriba cuya precedencia es al menos `prec` (izquierda con izquierda).
export function reducir(e: Estado, prec: number): ErrorCrudo | undefined {
  const base = e.marcos[e.marcos.length - 1]?.baseOperadores ?? 0
  while (e.operadores.length > base) {
    const o = e.operadores[e.operadores.length - 1]
    if (o === undefined || (PRECEDENCIA[o.op] ?? 0) < prec) break
    e.m.visitas += 1
    e.operadores.pop()
    const der = e.operandos.pop()
    const izq = e.operandos.pop()
    if (der === undefined || izq === undefined) return faltaUnValor(o)
    const r = combinar(e, izq, o, der)
    if (esError(r)) return r
    e.operandos.push(r)
  }
  return undefined
}
