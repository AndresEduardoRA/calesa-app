// «De dónde sale» una fila de la planilla de la fórmula (columna D; glosario: «De dónde sale»): lo que calcula, dicho en palabras con las etiquetas de los nodos que
// nombra (nunca sus ids), como la planilla de V1. Una auxiliar se dice en línea: una constante con su valor y un cálculo entre paréntesis
// (`=(remate+fees)*4%` → «(Remate + Fees) × 4 %»). Puro, nunca lanza y lineal con el medidor: cada auxiliar es de una sola fila, así que decir todas las filas
// recorre cada nodo una vez.
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import type { Formula } from '../formula'
import { buscar, recorrer, type Medidor } from '../medidor'
import { formatoDe, type Nodo, type NodoCalculo } from '../nodos'
import { filasDe } from './filas'

export type ContextoDeDondeSale = {
  nodos: ReadonlyMap<string, Nodo>
  // Todas las auxiliares de la fórmula (las de cada fila con texto).
  auxiliares: ReadonlySet<string>
  // El valor de cada constante (`params`).
  constantes: Readonly<Record<string, number>>
  locale: string
}

// Más hondo que esto, una auxiliar se dice por su etiqueta: el compilador no anida más de 64 y una fórmula armada a mano no tumba la pila.
const PROFUNDIDAD_MAXIMA = 64
const FALTA = 'una fila que no está'
const DECIMALES_DEL_NUMERO = 6

// El contexto de una fórmula: un recorrido de los nodos y uno de las filas.
export function contextoDeDondeSale(
  formula: Formula,
  locale: string,
  medidor?: Medidor,
): ContextoDeDondeSale {
  const m = medidor ?? { visitas: 0 }
  const nodos = new Map<string, Nodo>()
  for (const n of recorrer(formula.definicion.nodos, m)) nodos.set(n.id, n)
  const auxiliares = new Set<string>()
  for (const f of filasDe(formula.definicion, m)) for (const id of f.auxiliares) auxiliares.add(id)
  return { nodos, auxiliares, constantes: formula.params.constantes, locale }
}

// El valor de una constante, con su formato (un porcentaje como porcentaje); sin valor, su etiqueta.
function valorDeConstante(n: Nodo, ctx: ContextoDeDondeSale): string {
  const valor = Object.hasOwn(ctx.constantes, n.id) ? ctx.constantes[n.id] : undefined
  if (valor === undefined) return n.etiqueta
  return formatoDe(n) === 'pct'
    ? formatearPorcentaje(valor, { locale: ctx.locale, decimales: DECIMALES_DEL_NUMERO })
    : formatearNumero(valor, { locale: ctx.locale, decimales: DECIMALES_DEL_NUMERO })
}

type Paso = { ctx: ContextoDeDondeSale; m: Medidor; hondo: number }

// Cómo se dice un nodo nombrado por otro: una auxiliar en línea (su valor o su cálculo entre paréntesis), cualquier otro por su etiqueta.
function operando(id: string, p: Paso): string {
  const n = buscar(p.ctx.nodos, id, p.m)
  if (n === undefined) return FALTA
  if (!p.ctx.auxiliares.has(id) || p.hondo >= PROFUNDIDAD_MAXIMA) return n.etiqueta
  if (n.tipo === 'constante') return valorDeConstante(n, p.ctx)
  if (n.tipo !== 'calculo') return n.etiqueta
  return `(${calculo(n, { ...p, hondo: p.hondo + 1 })})`
}

const unidos = (ids: readonly string[], separador: string, p: Paso): string =>
  Array.from(recorrer(ids, p.m), (id) => operando(id, p)).join(separador)

// Varios sumandos se dicen entre paréntesis («4 % de (Remate + Fees)»); uno, solo.
const sumaDe = (ids: readonly string[], p: Paso): string =>
  ids.length === 1 ? unidos(ids, ' + ', p) : `(${unidos(ids, ' + ', p)})`

const decimales = (n: number) =>
  n === 0 ? 'sin decimales' : n === 1 ? 'a 1 decimal' : `a ${String(n)} decimales`

function calculo(n: NodoCalculo, p: Paso): string {
  switch (n.op) {
    case 'suma':
      return unidos(n.de, ' + ', p)
    case 'porcentaje_de':
      return `${operando(n.pct, p)} de ${sumaDe(n.de, p)}`
    case 'multiplicar':
      return unidos(n.de, ' × ', p)
    case 'restar':
      return unidos(n.de, ' − ', p)
    case 'dividir':
      return unidos(n.de, ' ÷ ', p)
    case 'si':
      return `${unidos(n.de, ' + ', p)} si ${operando(n.condicion, p)} está encendida`
    case 'depreciar':
      return `${unidos(n.de, ' + ', p)} × factor de ${n.tabla}`
    case 'redondear':
      return `${unidos(n.de, ' + ', p)} redondeado ${decimales(n.n)}`
    default: {
      const _: never = n
      return _
    }
  }
}

const CONSTANTES = {
  pct: 'porcentaje fijo',
  raw: 'número fijo',
  usd: 'monto fijo',
  moneda: 'monto fijo',
} as const

// La frase de la columna D de una fila. Nunca lanza: una referencia que falta se dice «una fila que no está».
export function deDondeSale(nodo: Nodo, ctx: ContextoDeDondeSale, medidor?: Medidor): string {
  const p: Paso = { ctx, m: medidor ?? { visitas: 0 }, hondo: 0 }
  switch (nodo.tipo) {
    case 'input':
      return 'lo escribe el asesor'
    case 'constante':
      return CONSTANTES[formatoDe(nodo)]
    case 'tipo_cambio':
      return `tipo de cambio ${nodo.etiqueta} de hoy`
    case 'campo_vehiculo':
      return `dato del vehículo: ${nodo.etiqueta}`
    case 'bandera':
      return 'interruptor'
    case 'opcion':
      return 'se elige al cotizar'
    case 'tabla':
    case 'tramo':
      return `de la tabla ${nodo.tabla}`
    case 'calculo':
      return calculo(nodo, p)
    default: {
      const _: never = nodo
      return _
    }
  }
}
