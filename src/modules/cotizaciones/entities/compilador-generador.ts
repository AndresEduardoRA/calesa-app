// Expresiones al azar para probar el compilador (docs/COTIZADOR.md › «Fórmulas como texto»): un generador con semilla fija
// que arma un árbol y lo escribe como texto (con espacios y paréntesis de más). Lo calcula directo en JS `compilador-oraculo.ts`.
// Sólo para las pruebas.
import type { ContextoDeCompilacion } from './compilador-nombres'
import type { Comparador, Nodo } from './nodos'

export type Azar = { entero: (hasta: number) => number }

// mulberry32: chico, determinista y suficiente para elegir.
export function azarCon(semilla: number): Azar {
  let a = semilla >>> 0
  return {
    entero: (hasta) => {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * hasta)
    },
  }
}
const elegir = <T>(azar: Azar, lista: readonly T[]): T => lista[azar.entero(lista.length)] as T

export type Expr =
  | { t: 'ref'; id: string }
  | { t: 'lit'; texto: string; valor: number }
  | { t: 'bin'; op: '+' | '-' | '*' | '/'; a: Expr; b: Expr }
  | { t: 'suma' }
  | { t: 'si'; flag: string; x: Expr }
  | { t: 'red'; x: Expr; n: number }
  | { t: 'pct'; x: Expr; p: Expr }
  // Las comparaciones y lo que las usa. `flag` sólo va como condición; la condición de `elegir` y de `yo` es `flag`, `cmp` o `yo`.
  | { t: 'cmp'; op: Comparador; a: Expr; b: Expr }
  | { t: 'flag'; id: string }
  | { t: 'elegir'; c: Expr; x: Expr; y?: Expr }
  | { t: 'yo'; op: 'Y' | 'O'; cs: Expr[] }
  | { t: 'ext'; op: 'MAX' | 'MIN'; xs: Expr[] }
  | { t: 'extg'; op: 'MAX' | 'MIN' }

export const VALORES = [0.1, 0.2, 0.3, 0, -5, 1e-300, 1e-200, 1e308, 7, 3.5, 100, -0.1]
// El valor de cada literal está escrito a mano, no calculado: es el doble que JS lee de ese decimal.
export const LITERALES: readonly { texto: string; valor: number }[] = [
  { texto: '0.1', valor: 0.1 },
  { texto: '0.2', valor: 0.2 },
  { texto: '0.3', valor: 0.3 },
  { texto: '0', valor: 0 },
  { texto: '1', valor: 1 },
  { texto: '2', valor: 2 },
  { texto: '7', valor: 7 },
  { texto: '3.5', valor: 3.5 },
  { texto: '100', valor: 100 },
  { texto: '1e-300', valor: 1e-300 },
  { texto: '1e-200', valor: 1e-200 },
  { texto: '1e308', valor: 1e308 },
  { texto: '1e10', valor: 1e10 },
  { texto: '4%', valor: 0.04 },
  { texto: '0.1%', valor: 0.001 },
  { texto: '12.5%', valor: 0.125 },
  { texto: '7%', valor: 0.07 },
  { texto: '-5', valor: -5 },
  { texto: '-0.5', valor: -0.5 },
  { texto: '-4%', valor: -0.04 },
]

const INPUTS = ['x0', 'x1', 'x2', 'x3', 'x4']
const CONSTANTES = ['c0', 'c1']
const PORCENTAJES = ['k1', 'k2']
export const PARAMS: Record<string, number> = { c0: 1000, c1: 0.1, k1: 0.13, k2: 0.05, m2: 250 }

const nodo = (n: Nodo): Nodo => n
// El contexto de las propiedades: inputs, constantes, porcentajes, dos banderas y un grupo `g` de dos miembros.
export const CONTEXTO: ContextoDeCompilacion = {
  nodos: [
    nodo({ id: 'tc', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'TC', formato: 'raw' }),
    nodo({ id: 'on', tipo: 'bandera', etiqueta: 'Encendida', formato: 'raw' }),
    nodo({ id: 'off', tipo: 'bandera', etiqueta: 'Apagada', formato: 'raw' }),
    ...INPUTS.map((id) => nodo({ id, tipo: 'input', etiqueta: id })),
    ...CONSTANTES.map((id) => nodo({ id, tipo: 'constante', etiqueta: id })),
    ...PORCENTAJES.map((id) => nodo({ id, tipo: 'constante', etiqueta: id, formato: 'pct' })),
    nodo({ id: 'm1', tipo: 'input', etiqueta: 'M1', grupo: 'g' }),
    nodo({ id: 'm2', tipo: 'constante', etiqueta: 'M2', grupo: 'g' }),
  ],
  grupos: ['g'],
  params: PARAMS,
  destino: { id: 'total', etiqueta: 'Total', salida: 'total' },
}
export const MIEMBROS = ['m1', 'm2']

export type Caso = {
  expr: Expr
  texto: string
  inputs: Record<string, number>
  banderas: Record<string, boolean>
}

function hoja(azar: Azar): Expr {
  const k = azar.entero(10)
  if (k < 5) return { t: 'ref', id: elegir(azar, [...INPUTS, ...CONSTANTES, 'm1', 'm2']) }
  return { t: 'lit', ...elegir(azar, LITERALES) }
}

const COMPARADORES_AL_AZAR: readonly Comparador[] = ['>', '<', '>=', '<=', '=', '<>']

// Una condición: una bandera, una comparación o Y/O de dos o tres condiciones.
function condicion(azar: Azar, profundidad: number): Expr {
  const k = profundidad <= 0 ? 0 : azar.entero(4)
  if (k === 0) return { t: 'flag', id: elegir(azar, ['on', 'off']) }
  if (k < 3) {
    const op = elegir(azar, COMPARADORES_AL_AZAR)
    return { t: 'cmp', op, a: generar(azar, profundidad - 1), b: generar(azar, profundidad - 1) }
  }
  const cs = Array.from({ length: 2 + azar.entero(2) }, () => condicion(azar, profundidad - 1))
  return { t: 'yo', op: elegir(azar, ['Y', 'O'] as const), cs }
}

// SI con condición, MAX y MIN de dos o tres valores o del grupo, y una comparación usada como valor.
function comparativa(azar: Azar, profundidad: number, k: number): Expr {
  const sub = () => generar(azar, profundidad - 1)
  if (k < 22) return { t: 'cmp', op: elegir(azar, COMPARADORES_AL_AZAR), a: sub(), b: sub() }
  if (k < 25) {
    const c = condicion(azar, profundidad - 1)
    return azar.entero(2) === 0
      ? { t: 'elegir', c, x: sub() }
      : { t: 'elegir', c, x: sub(), y: sub() }
  }
  const op = elegir(azar, ['MAX', 'MIN'] as const)
  if (k === 27) return { t: 'extg', op }
  return { t: 'ext', op, xs: Array.from({ length: 2 + azar.entero(2) }, sub) }
}

export function generar(azar: Azar, profundidad: number): Expr {
  if (profundidad <= 0 || azar.entero(10) < 2) return hoja(azar)
  const k = azar.entero(28)
  if (k >= 20) return comparativa(azar, profundidad, k)
  if (k < 12) {
    const op = elegir(azar, ['+', '-', '*', '/'] as const)
    return { t: 'bin', op, a: generar(azar, profundidad - 1), b: generar(azar, profundidad - 1) }
  }
  if (k < 14) return { t: 'suma' }
  if (k < 16)
    return { t: 'si', flag: elegir(azar, ['on', 'off']), x: generar(azar, profundidad - 1) }
  if (k < 18) return { t: 'red', x: generar(azar, profundidad - 1), n: azar.entero(7) }
  const p: Expr =
    azar.entero(2) === 0
      ? { t: 'ref', id: elegir(azar, PORCENTAJES) }
      : { t: 'lit', ...elegir(azar, LITERALES) }
  return { t: 'pct', x: generar(azar, profundidad - 1), p }
}

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 }
// Una comparación va por debajo de todo: entre paréntesis dentro de una cuenta o de otra comparación.
const precedenciaDe = (e: Expr) => (e.t === 'bin' ? PREC[e.op] : e.t === 'cmp' ? 0 : 3)
const espacio = (azar: Azar) => elegir(azar, ['', ' ', '  ', '\n', '\t'])

// El texto: los paréntesis que hacen falta, y a veces uno de más. Un `si` o un literal negativo van donde quepan.
export function imprimir(e: Expr, azar: Azar): string {
  const s = sinParentesis(e, azar)
  return azar.entero(10) === 0 ? `(${s})` : s
}

// Las familias de Expr, para repartir sin un switch de trece casos.
export function esDe<T extends Expr['t']>(tipos: readonly T[]) {
  const s = new Set<string>(tipos)
  return (e: Expr): e is Extract<Expr, { t: T }> => s.has(e.t)
}
export const esDeFuncion = esDe(['suma', 'si', 'red', 'pct'] as const)
export const esDeCondicion = esDe(['cmp', 'flag', 'elegir'] as const)

const lista = (xs: readonly Expr[], azar: Azar) =>
  xs.map((x) => imprimir(x, azar)).join(`;${espacio(azar)}`)

function deFuncion(e: Extract<Expr, { t: 'suma' | 'si' | 'red' | 'pct' }>, azar: Azar): string {
  switch (e.t) {
    case 'suma':
      return `SUMA${espacio(azar)}(g)`
    case 'si':
      return `SI(${e.flag};${espacio(azar)}${imprimir(e.x, azar)})`
    case 'red':
      return `REDONDEAR(${imprimir(e.x, azar)};${espacio(azar)}${String(e.n)})`
    case 'pct':
      return `PORCENTAJE_DE(${imprimir(e.x, azar)};${espacio(azar)}${imprimir(e.p, azar)})`
  }
}

function deCondicion(e: Extract<Expr, { t: 'cmp' | 'flag' | 'elegir' }>, azar: Azar): string {
  switch (e.t) {
    case 'cmp': {
      const lado = (x: Expr) => (x.t === 'cmp' ? `(${imprimir(x, azar)})` : imprimir(x, azar))
      return `${lado(e.a)}${espacio(azar)}${e.op}${espacio(azar)}${lado(e.b)}`
    }
    case 'flag':
      return e.id
    case 'elegir': {
      const otra = e.y === undefined ? '' : `;${espacio(azar)}${imprimir(e.y, azar)}`
      return `SI(${imprimir(e.c, azar)};${espacio(azar)}${imprimir(e.x, azar)}${otra})`
    }
  }
}

function sinParentesis(e: Expr, azar: Azar): string {
  if (esDeFuncion(e)) return deFuncion(e, azar)
  if (esDeCondicion(e)) return deCondicion(e, azar)
  switch (e.t) {
    case 'ref':
      return e.id
    case 'lit':
      return e.texto
    case 'yo':
      return `${e.op}(${lista(e.cs, azar)})`
    case 'ext':
      return `${e.op}(${lista(e.xs, azar)})`
    case 'extg':
      return `${e.op}${espacio(azar)}(g)`
    case 'bin': {
      const p = PREC[e.op]
      const a = imprimir(e.a, azar)
      const b = imprimir(e.b, azar)
      const izq = precedenciaDe(e.a) < p ? `(${a})` : a
      const der = precedenciaDe(e.b) <= p ? `(${b})` : b
      return `${izq}${espacio(azar)}${e.op}${espacio(azar)}${der}`
    }
  }
}

// Un caso entero: el árbol, su texto y los datos con que se calcula. Un `si` en la raíz no puede ser el total (un total no lleva
// condición): se le suma 0. `SI(bandera; x)` también es un `si`.
export function casoAlAzar(azar: Azar): Caso {
  let expr = generar(azar, 4)
  const esSi =
    expr.t === 'si' || (expr.t === 'elegir' && expr.c.t === 'flag' && expr.y === undefined)
  if (esSi) expr = { t: 'bin', op: '+', a: expr, b: { t: 'lit', texto: '0', valor: 0 } }
  const inputs: Record<string, number> = {}
  for (const id of [...INPUTS, 'm1']) inputs[id] = elegir(azar, VALORES)
  const banderas = { on: true, off: false }
  return { expr, texto: imprimir(expr, azar), inputs, banderas }
}
