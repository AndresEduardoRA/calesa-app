// Las funciones del texto (docs/COTIZADOR.md › «Fórmulas como texto»): sólo operaciones que el grafo ya tiene. Al cerrarse
// el paréntesis se revisa cuántos argumentos llegaron y cada uno contra lo que su posición pide, y se arma la operación.
import {
  demasiadosTerminos,
  errorEn,
  esError,
  faltaUnValor,
  funcionDesconocida,
  type Arbol,
  type ErrorCrudo,
  type EspecDeFuncion,
  type Marco,
  type Rango,
} from './compilador-arbol'
import { calculo, expandirGrupo, invalido, type Contar } from './compilador-argumentos'
import { cerrarBuscarv } from './compilador-buscarv'
import { cerrarExtremo, cerrarLogica, cerrarSi } from './compilador-condiciones'
import type { Token } from './compilador-lexico'
import type { Nombres } from './compilador-nombres'
import { recorrer } from './medidor'
import type { DatosDeError } from './motivos-del-compilador'
import { formatoDe } from './nodos'

export type { Contar } from './compilador-argumentos'

export const FUNCIONES: ReadonlyMap<string, EspecDeFuncion> = new Map(
  (
    [
      { nombre: 'SUMA', args: ['grupo'] },
      { nombre: 'SI', args: ['condicion', 'valor', 'valor'], minimo: 2 },
      { nombre: 'Y', args: [], resto: 'condicion', minimo: 2 },
      { nombre: 'O', args: [], resto: 'condicion', minimo: 2 },
      { nombre: 'MAX', args: ['valor_o_grupo'], resto: 'valor', minimo: 1 },
      { nombre: 'MIN', args: ['valor_o_grupo'], resto: 'valor', minimo: 1 },
      { nombre: 'BUSCARV', args: ['buscado', 'texto', 'texto', 'logico'], minimo: 3 },
      { nombre: 'REDONDEAR', args: ['valor', 'entero'] },
      { nombre: 'PORCENTAJE_DE', args: ['valor', 'pct'] },
      { nombre: 'DEPRECIAR', args: ['valor', 'clave', 'nodo', 'clave'] },
    ] satisfies EspecDeFuncion[]
  ).map((f) => [f.nombre, f] as const),
)

// El patrón de un id (`esquemaId`), sin regex: una letra minúscula y hasta 40 más entre a-z, 0-9 y _.
function esIdValido(s: string): boolean {
  if (s.length > 41) return false
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i)
    const minuscula = c >= 97 && c <= 122
    if (i === 0 ? !minuscula : !(minuscula || c === 95 || (c >= 48 && c <= 57))) return false
  }
  return true
}

function cerrarSuma(arg: Arbol, rango: Rango, nombres: Nombres, contar: Contar) {
  if (arg.k !== 'clave') return invalido(arg, 'grupo')
  const hijos = expandirGrupo(arg, nombres, contar)
  return esError(hijos) ? hijos : calculo('suma', rango, hijos)
}

function cerrarRedondear(args: Arbol[], rango: Rango) {
  const [x, n] = args
  if (x === undefined || n === undefined) return faltaUnValor(rango)
  const entero = n.k === 'num' && !n.pct && !n.negativo && Number.isInteger(n.valor) && n.valor <= 6
  if (n.k !== 'num' || !entero) return invalido(n, 'entero')
  return calculo('redondear', rango, [x], { campos: { n: n.valor } })
}

function cerrarPorcentaje(args: Arbol[], rango: Rango, contar: Contar) {
  const [x, p] = args
  if (x === undefined || p === undefined) return faltaUnValor(rango)
  if (p.k === 'ref') {
    if (formatoDe(p.nodo) !== 'pct') return invalido(p, 'pct')
  } else if (p.k === 'num') p.comoPct = true
  else return invalido(p, 'pct')
  // «a+b+c» sin paréntesis va directo a `de`: Σde × pct es lo mismo que (a+b+c) × pct.
  const cadena = x.k === 'calc' && x.op === 'suma' && !x.paren
  if (!contar(1)) return demasiadosTerminos(x)
  return calculo('porcentaje_de', rango, cadena ? x.hijos : [x], { pct: p })
}

function cerrarDepreciar(args: Arbol[], rango: Rango) {
  const [x, t, s, c] = args
  if (x === undefined || t === undefined || s === undefined || c === undefined) {
    return faltaUnValor(rango)
  }
  if (t.k !== 'clave' || !esIdValido(t.texto)) return invalido(t, 'clave')
  if (s.k !== 'ref') return invalido(s, 'nodo')
  if (c.k !== 'clave' || !esIdValido(c.texto)) return invalido(c, 'clave')
  return calculo('depreciar', rango, [x], {
    campos: { tabla: t.texto, sobre: s.nodo.id, columna: c.texto },
  })
}

// Cuántos argumentos lleva: fijos, entre dos números o sin tope.
function cuantos(spec: EspecDeFuncion, minimo: number, maximo: number | undefined): DatosDeError {
  if (minimo === maximo) return { nombre: spec.nombre, cantidad: minimo }
  return maximo === undefined
    ? { nombre: spec.nombre, minimo }
    : { nombre: spec.nombre, minimo, maximo }
}

// Un texto entre comillas sólo va donde la función pide un texto (la tabla y la columna de BUSCARV).
function textoFueraDeLugar(
  spec: EspecDeFuncion,
  args: Arbol[],
  nombres: Nombres,
): ErrorCrudo | undefined {
  let i = 0
  for (const a of recorrer(args, nombres.m)) {
    const pide = spec.args[i] ?? spec.resto
    i += 1
    if (a.k === 'texto' && pide !== 'texto') return errorEn(a, 'texto_fuera_de_lugar')
  }
  return undefined
}

// Se cerró el paréntesis de una función: sus argumentos ya están en `marco.args`.
export function cerrarFuncion(
  marco: Marco,
  cierre: Token,
  nombres: Nombres,
  contar: Contar,
): Arbol | ErrorCrudo {
  const spec = marco.spec
  const nombreRango = marco.nombreRango
  if (spec === undefined || nombreRango === undefined)
    return funcionDesconocida({ desde: 0, hasta: 0 }, '')
  const n = marco.args.length
  const minimo = spec.minimo ?? spec.args.length
  const maximo = spec.resto === undefined ? spec.args.length : undefined
  if (n < minimo || (maximo !== undefined && n > maximo)) {
    return errorEn(nombreRango, 'cantidad_de_argumentos', cuantos(spec, minimo, maximo))
  }
  const fuera = textoFueraDeLugar(spec, marco.args, nombres)
  if (fuera !== undefined) return fuera
  const rango = { desde: nombreRango.desde, hasta: cierre.hasta }
  return porNombre(spec.nombre, marco.args, { rango, nombreRango }, { nombres, contar })
}

function porNombre(
  nombre: string,
  args: Arbol[],
  r: { rango: Rango; nombreRango: Rango },
  ctx: { nombres: Nombres; contar: Contar },
): Arbol | ErrorCrudo {
  const { rango } = r
  const primero = args[0]
  switch (nombre) {
    case 'SUMA':
      return primero === undefined
        ? faltaUnValor(rango)
        : cerrarSuma(primero, rango, ctx.nombres, ctx.contar)
    case 'SI':
      return cerrarSi(args, rango)
    case 'Y':
      return cerrarLogica('y', args, rango, ctx)
    case 'O':
      return cerrarLogica('o', args, rango, ctx)
    case 'MAX':
      return cerrarExtremo('max', args, r, ctx)
    case 'MIN':
      return cerrarExtremo('min', args, r, ctx)
    case 'REDONDEAR':
      return cerrarRedondear(args, rango)
    case 'PORCENTAJE_DE':
      return cerrarPorcentaje(args, rango, ctx.contar)
    case 'BUSCARV':
      return cerrarBuscarv(args, rango, ctx.nombres)
    default:
      return cerrarDepreciar(args, rango)
  }
}
