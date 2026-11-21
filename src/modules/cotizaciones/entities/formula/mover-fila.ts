// Mover una fila de la planilla (D7): el mismo movimiento sirve para Alt+↑/↓, para arrastrar el número de fila y para «Mover esta fila debajo de la 12».
// Bajarla debajo de la t vale si ninguna fila entre las dos (hasta la t) la nombra; subirla vale si ella no nombra ninguna de las que salta. Es la
// condición exacta: lo demás del orden no cambia. Se mueve el bloque (la pct que absorbe su B, sus auxiliares y ella), y la pct queda justo antes de sus
// auxiliares aunque estuviera más arriba. Insertar, mover y borrar no tocan ningún texto (se guardan ids). Puro, O(nodos).
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { filaDe, hojaDeLaPlanilla, type HojaDeLaPlanilla } from './hoja-de-la-planilla'
import {
  bloqueDe,
  filasQueNombra,
  filasQueUsan,
  indiceDeUsos,
  type IndiceDeUsos,
} from './usos-de-la-fila'

// Dónde queda la fila: justo antes de la fila `antesDe` o justo después de la `despuesDe` (números de la hoja de antes de mover; `despuesDe: 0` es arriba
// de todo).
export type DestinoDeMover = { readonly antesDe: number } | { readonly despuesDe: number }

export type RechazoDeMover = {
  readonly ok: false
  readonly mensaje: string
  // La fila que lo impide.
  readonly fila: number
}
export type ResultadoDeMover = { readonly ok: true; readonly formula: Formula } | RechazoDeMover

type Hoja = { hoja?: HojaDeLaPlanilla; indice?: IndiceDeUsos }

// La fila tras la que queda (0: arriba de todo).
const trasDe = (destino: DestinoDeMover) =>
  'despuesDe' in destino ? destino.despuesDe : destino.antesDe - 1

// ¿Se puede? Nulo si sí; si no, el rechazo con la fila que lo impide.
export function rechazoDeMover(
  formula: Pick<Formula, 'definicion'>,
  numero: number,
  destino: DestinoDeMover,
  indice: IndiceDeUsos,
): RechazoDeMover | null {
  const tras = trasDe(destino)
  const total = indice.hoja.filas.length
  if (numero < 1 || numero > total || tras < 0 || tras > total)
    return { ok: false, mensaje: 'Esa fila no existe.', fila: numero }
  if (tras > numero) {
    const usa = filasQueUsan(indice, numero).find((n) => n > numero && n <= tras)
    if (usa !== undefined)
      return {
        ok: false,
        mensaje: `C${String(usa)} usa esta fila: no puede quedar arriba de ella.`,
        fila: usa,
      }
  }
  if (tras < numero - 1) {
    const usadas = filasQueNombra(formula, indice, numero).filter((n) => n > tras && n < numero)
    const usada = usadas[usadas.length - 1]
    if (usada !== undefined)
      return {
        ok: false,
        mensaje: `Esta fila usa C${String(usada)}: no puede quedar arriba de ella.`,
        fila: usada,
      }
  }
  return null
}

export const puedeMover = (
  formula: Pick<Formula, 'definicion'>,
  numero: number,
  destino: DestinoDeMover,
  indice: IndiceDeUsos,
): boolean => rechazoDeMover(formula, numero, destino, indice) === null

// Dónde empieza una fila en la lista (su primera auxiliar, o ella).
function inicioDe(nodos: readonly Nodo[], hoja: HojaDeLaPlanilla, numero: number): number {
  const f = filaDe(hoja, numero)
  const primero = f?.auxiliares[0] ?? f?.id
  return nodos.findIndex((n) => n.id === primero)
}

export function moverFila(
  formula: Formula,
  numero: number,
  destino: DestinoDeMover,
  { hoja = hojaDeLaPlanilla(formula), indice = indiceDeUsos(formula, hoja) }: Hoja = {},
): ResultadoDeMover {
  const rechazo = rechazoDeMover(formula, numero, destino, indice)
  if (rechazo !== null) return rechazo
  const tras = trasDe(destino)
  if (tras === numero || tras === numero - 1) return { ok: true, formula }
  const ids = bloqueDe(hoja, numero)
  const enElBloque = new Set(ids)
  const porId = new Map(formula.definicion.nodos.map((n) => [n.id, n]))
  const bloque = ids.flatMap((id) => porId.get(id) ?? [])
  const resto = formula.definicion.nodos.filter((n) => !enElBloque.has(n.id))
  const en =
    tras === 0
      ? inicioDe(resto, hoja, 1)
      : resto.findIndex((n) => n.id === filaDe(hoja, tras)?.id) + 1
  const nodos = [...resto.slice(0, en), ...bloque, ...resto.slice(en)]
  return { ok: true, formula: { ...formula, definicion: { ...formula.definicion, nodos } } }
}
