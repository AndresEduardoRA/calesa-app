// La lista de respaldo y las condiciones de la tarjeta resueltas con una cotización (docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)»), antes de dibujar: la
// geometría dibuja siempre un contenido simple (un texto, un dato o nada). Pura y lineal: a lo sumo 5 datos o 15 condiciones por celda, buscadas por `Map`.
// - Una condición sobre un nodo lo lee así: 0 si no aplica, su número si aplica y nulo sin valor; una comparación con nulo no se cumple. `encendido` es
//   «distinto de 0»; `opcion` compara la clave elegida de la variante. Un nodo que no está en la versión del cálculo deja la condición sin respuesta (nula).
// - Unas condiciones: gana la primera rama cuyas condiciones se cumplen todas (sin respuesta no se cumple: la rama se salta); si ninguna, el «si no».
// - Una lista de respaldo: el primero de sus datos con valor (`tieneValor()`); si ninguno, la celda queda vacía.
import type {
  CondicionDeLaTarjeta,
  ContenidoDeLaCelda,
  ContenidoSimple,
} from '../cuadricula-de-la-tarjeta'
import {
  aplica,
  fueraDeLaVersion,
  tieneValor,
  valorDelNodo,
  type EntradaDelContenido,
} from './valor-del-dato'

// Lo que vale un nodo para una condición, o `undefined` si no está en la versión del cálculo.
function valorParaLaCondicion(
  e: EntradaDelContenido,
  nodo: string,
): number | string | null | undefined {
  if (fueraDeLaVersion(e, nodo)) return undefined
  if (!aplica(e, nodo)) return 0
  const v = valorDelNodo(e, nodo)
  return typeof v === 'number' || typeof v === 'string' ? v : null
}

const esNumero = (v: unknown): v is number => typeof v === 'number'

type SobreElNodo = Exclude<CondicionDeLaTarjeta, { dato: unknown }>
type ValorDeLaCondicion = number | string | null
// El número de una comparación (`NaN` en las demás: ninguna comparación con él se cumple).
const umbral = (c: SobreElNodo) => ('a' in c ? c.a : Number.NaN)

const PRUEBAS: {
  readonly [E in SobreElNodo['es']]: (v: ValorDeLaCondicion, c: SobreElNodo) => boolean
} = {
  cero: (v) => v === 0,
  no_cero: (v) => esNumero(v) && v !== 0,
  mayor: (v, c) => esNumero(v) && v > umbral(c),
  menor: (v, c) => esNumero(v) && v < umbral(c),
  igual: (v, c) => esNumero(v) && v === umbral(c),
  opcion: (v, c) => 'opcion' in c && v === c.opcion,
  encendido: (v) => v !== null && v !== 0,
  apagado: (v) => v === 0,
}

// Si se cumple una condición; nulo si no tiene respuesta (su nodo no está en la versión del cálculo).
export function cumple(e: EntradaDelContenido, c: CondicionDeLaTarjeta): boolean | null {
  if ('dato' in c) {
    if ('nodo' in c.dato && fueraDeLaVersion(e, c.dato.nodo)) return null
    const conValor = tieneValor(e, c.dato)
    return c.es === 'vacio' ? !conValor : conValor
  }
  const v = valorParaLaCondicion(e, c.nodo)
  return v === undefined ? null : PRUEBAS[c.es](v, c)
}

// Si se cumplen todas (unidas con Y): una sin respuesta cuenta como que no.
export const seCumplen = (e: EntradaDelContenido, si: readonly CondicionDeLaTarjeta[]): boolean =>
  si.every((c) => cumple(e, c) === true)

const VACIO: ContenidoSimple = { tipo: 'vacio' }

// Lo que queda de una celda tras resolverla: nunca una lista de respaldo ni unas condiciones.
export type ContenidoResuelto = Exclude<ContenidoDeLaCelda, { tipo: 'respaldo' | 'condiciones' }>

// El contenido que se dibuja: el mismo, salvo una lista de respaldo o unas condiciones, que se resuelven con la cotización.
export function resolverElContenido(
  e: EntradaDelContenido,
  c: ContenidoDeLaCelda,
): ContenidoResuelto {
  if (c.tipo === 'respaldo') return c.datos.find((d) => tieneValor(e, d)) ?? VACIO
  if (c.tipo === 'condiciones') return c.ramas.find((r) => seCumplen(e, r.si))?.contenido ?? c.si_no
  return c
}
