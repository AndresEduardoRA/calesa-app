// La hoja de la planilla (glosario: «Planilla de la fórmula», «Banda (de la planilla)»): las filas en el orden de evaluación (`definicion.nodos`),
// numeradas de 1 a n, porque «una fórmula sólo usa filas de arriba» sólo es cierto si lo que se ve es ese orden. Una banda es un tramo de filas seguidas
// con el mismo grupo. La B absorbe el %: una constante `pct` que sólo nombra un `porcentaje_de` como su `pct` no tiene fila propia y se ve en la B de esa
// fila. Las referencias A1 (`C5`, `B9`) se leen sobre esto (`referencias-a1.ts`). Puro, O(nodos).
import type { Definicion, Formula } from '../formula'
import type { Nodo } from '../nodos'
import { referenciasDe } from '../nodos-referencias'
import { filasDe } from './filas'
import { tipoDeCelda, type TipoDeCelda } from './tipo-de-celda'

export type FilaDeLaHoja = {
  readonly numero: number
  readonly id: string
  readonly nodo: Nodo
  // La constante del % que esta fila absorbe (se ve y se edita en su B); nula si no absorbe ninguna.
  readonly pctAbsorbida: string | null
  readonly grupo: string | null
  readonly tipo: TipoDeCelda
  // Sus auxiliares (los nodos que el texto creó, justo antes de ella).
  readonly auxiliares: readonly string[]
}

// Un tramo de filas seguidas con el mismo grupo (de `desde` a `hasta`, números de fila). Un grupo partido en dos tramos lleva su cabecera en cada uno.
export type TramoDeLaHoja = {
  readonly grupo: string | null
  readonly desde: number
  readonly hasta: number
}

// Lo que es la B de una fila: la constante absorbida, un nodo con fila propia (un % compartido o que escribe el asesor) o un número escrito en su fórmula.
export type CeldaBDeLaHoja = {
  readonly id: string
  readonly como: 'absorbida' | 'fila' | 'auxiliar'
}

export type HojaDeLaPlanilla = {
  readonly filas: readonly FilaDeLaHoja[]
  readonly numeroDe: ReadonlyMap<string, number>
  // pct absorbida → el número de la fila que la absorbe.
  readonly absorbidas: ReadonlyMap<string, number>
  readonly tramos: readonly TramoDeLaHoja[]
  // Los grupos de la fórmula sin ninguna fila (se dibujan al final, para arreglarlos).
  readonly gruposSinFilas: readonly string[]
}

const SIN_FILAS: readonly FilaDeLaHoja[] = []

// Una constante de % que no lleva nada propio de una fila: ni grupo, ni salida, ni interruptor, ni variantes.
const esSuelta = (n: Nodo | undefined): boolean =>
  n?.tipo === 'constante' &&
  n.formato === 'pct' &&
  n.grupo === undefined &&
  n.salida === undefined &&
  n.condicion === undefined &&
  n.solo_en === undefined

// Las constantes `pct` que la B absorbe: raíz, sin grupo, salida, interruptor ni variantes, nombradas exactamente una vez en toda la fórmula y como el `pct` de un
// `porcentaje_de` que es una fila (no una auxiliar). id de la constante → id de esa fila.
export function pctAbsorbidas(
  definicion: Definicion,
  raices: ReadonlySet<string>,
): Map<string, string> {
  const usos = new Map<string, number>()
  const candidata = new Map<string, string>()
  for (const n of definicion.nodos) {
    for (const r of referenciasDe(n)) {
      usos.set(r.id, (usos.get(r.id) ?? 0) + 1)
      if (r.papel === 'pct' && raices.has(n.id)) candidata.set(r.id, n.id)
    }
  }
  const porId = new Map(definicion.nodos.map((n) => [n.id, n]))
  const absorbidas = new Map<string, string>()
  for (const [pct, dueno] of candidata) {
    if (usos.get(pct) === 1 && raices.has(pct) && esSuelta(porId.get(pct)))
      absorbidas.set(pct, dueno)
  }
  return absorbidas
}

type FilaDeEntrada = { readonly nodo: Nodo; readonly auxiliares: readonly string[] }

function tramosDe(filas: readonly FilaDeLaHoja[]): TramoDeLaHoja[] {
  const tramos: TramoDeLaHoja[] = []
  let actual: { grupo: string | null; desde: number; hasta: number } | null = null
  for (const f of filas) {
    if (actual !== null && actual.grupo === f.grupo) actual.hasta = f.numero
    else {
      if (actual !== null) tramos.push(actual)
      actual = { grupo: f.grupo, desde: f.numero, hasta: f.numero }
    }
  }
  if (actual !== null) tramos.push(actual)
  return tramos
}

// `filas`: las filas de la fórmula ya calculadas (las de `filasDe()` o las de la sesión); sin ellas se calculan.
export function hojaDeLaPlanilla(
  formula: Pick<Formula, 'definicion'>,
  filas?: readonly FilaDeEntrada[],
): HojaDeLaPlanilla {
  const definicion = formula.definicion
  const entrada =
    filas ?? filasDe(definicion).map((f) => ({ nodo: f.nodo, auxiliares: f.auxiliares }))
  const raices = new Set(entrada.map((f) => f.nodo.id))
  const absorbidaPor = pctAbsorbidas(definicion, raices)
  const absorbe = new Map([...absorbidaPor].map(([pct, dueno]) => [dueno, pct]))
  const grupos = new Set((definicion.grupos ?? []).map((g) => g.id))
  const lista: FilaDeLaHoja[] = []
  const numeroDe = new Map<string, number>()
  for (const f of entrada) {
    if (absorbidaPor.has(f.nodo.id)) continue
    const numero = lista.length + 1
    const grupo = f.nodo.grupo !== undefined && grupos.has(f.nodo.grupo) ? f.nodo.grupo : null
    lista.push({
      numero,
      id: f.nodo.id,
      nodo: f.nodo,
      pctAbsorbida: absorbe.get(f.nodo.id) ?? null,
      grupo,
      tipo: tipoDeCelda(f.nodo),
      auxiliares: f.auxiliares,
    })
    numeroDe.set(f.nodo.id, numero)
  }
  const absorbidas = new Map<string, number>()
  for (const [pct, dueno] of absorbidaPor) {
    const n = numeroDe.get(dueno)
    if (n !== undefined) absorbidas.set(pct, n)
  }
  const conFilas = new Set(lista.flatMap((f) => (f.grupo === null ? [] : [f.grupo])))
  return {
    filas: lista.length === 0 ? SIN_FILAS : lista,
    numeroDe,
    absorbidas,
    tramos: tramosDe(lista),
    gruposSinFilas: [...grupos].filter((g) => !conFilas.has(g)),
  }
}

export const filaDe = (hoja: HojaDeLaPlanilla, numero: number): FilaDeLaHoja | undefined =>
  hoja.filas[numero - 1]

// La B de la fila `numero`: el `pct` de su `porcentaje_de`, con qué es; nula si la fila no tiene %.
export function bDe(hoja: HojaDeLaPlanilla, numero: number): CeldaBDeLaHoja | null {
  const fila = filaDe(hoja, numero)
  const n = fila?.nodo
  if (fila === undefined || n?.tipo !== 'calculo' || n.op !== 'porcentaje_de') return null
  if (fila.pctAbsorbida === n.pct) return { id: n.pct, como: 'absorbida' }
  if (hoja.numeroDe.has(n.pct)) return { id: n.pct, como: 'fila' }
  return { id: n.pct, como: 'auxiliar' }
}

// Cómo se escribe un nodo en A1: `C<n>` si es una fila, `B<n>` si es la pct absorbida de la fila n; nula si no es ninguna (una auxiliar, un grupo).
export function celdaDe(hoja: HojaDeLaPlanilla, id: string): string | null {
  const n = hoja.numeroDe.get(id)
  if (n !== undefined) return `C${String(n)}`
  const b = hoja.absorbidas.get(id)
  return b === undefined ? null : `B${String(b)}`
}

// El número de fila donde vive un nodo (la fila o la que absorbe su %); nulo si no está en la hoja.
export function numeroDeLaCelda(hoja: HojaDeLaPlanilla, id: string): number | null {
  return hoja.numeroDe.get(id) ?? hoja.absorbidas.get(id) ?? null
}
