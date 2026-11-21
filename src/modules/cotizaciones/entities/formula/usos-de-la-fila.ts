// Quién usa una fila de la planilla: las filas que la nombran (sus auxiliares cuentan como su fila), las bandas y el total que la tienen de tipo de cambio,
// si es la fila del total o la única de su banda, si la muestra la hoja y si la nombra la tarjeta de trabajo. Lo usan eliminar (D8: se rechaza con su
// motivo) y mover (D7). Un bloque es lo que se mueve o se borra con la fila: la pct que absorbe su B, sus auxiliares y ella. El índice inverso se arma
// una vez por fórmula (`indiceDeUsos()`), no por cada fila del menú. Puro, O(nodos).
import type { Diseno } from '../diseno'
import type { Formula } from '../formula'
import { referenciasDe } from '../nodos-referencias'
import { nodosDelDiseno } from '../nodos-del-diseno'
import type { NombradoPorLaTarjeta } from '../tarjeta-en-vivo'
import { filaDe, numeroDeLaCelda, type HojaDeLaPlanilla } from './hoja-de-la-planilla'

// id → el número de la fila a la que pertenece (la fila, sus auxiliares y su pct absorbida).
export type IndiceDeUsos = {
  readonly hoja: HojaDeLaPlanilla
  readonly duenoDe: ReadonlyMap<string, number>
  // id nombrado → las filas que lo nombran.
  readonly nombradoPor: ReadonlyMap<string, ReadonlySet<number>>
}

export const bloqueDe = (hoja: HojaDeLaPlanilla, numero: number): string[] => {
  const f = filaDe(hoja, numero)
  if (f === undefined) return []
  return [...(f.pctAbsorbida === null ? [] : [f.pctAbsorbida]), ...f.auxiliares, f.id]
}

export function indiceDeUsos(
  formula: Pick<Formula, 'definicion'>,
  hoja: HojaDeLaPlanilla,
): IndiceDeUsos {
  const duenoDe = new Map<string, number>()
  for (const f of hoja.filas) for (const id of bloqueDe(hoja, f.numero)) duenoDe.set(id, f.numero)
  const nombradoPor = new Map<string, Set<number>>()
  for (const n of formula.definicion.nodos) {
    const dueno = duenoDe.get(n.id)
    if (dueno === undefined) continue
    for (const r of referenciasDe(n)) {
      if (duenoDe.get(r.id) === dueno) continue
      const filas = nombradoPor.get(r.id) ?? new Set<number>()
      filas.add(dueno)
      nombradoPor.set(r.id, filas)
    }
  }
  return { hoja, duenoDe, nombradoPor }
}

// Las filas que nombran algo del bloque de la fila `numero`, de menor a mayor.
export function filasQueUsan(indice: IndiceDeUsos, numero: number): number[] {
  const filas = new Set<number>()
  for (const id of bloqueDe(indice.hoja, numero))
    for (const n of indice.nombradoPor.get(id) ?? []) filas.add(n)
  return [...filas].sort((a, b) => a - b)
}

// Las filas que nombra el bloque de la fila `numero` (sin ella), de menor a mayor.
export function filasQueNombra(
  formula: Pick<Formula, 'definicion'>,
  indice: IndiceDeUsos,
  numero: number,
): number[] {
  const propios = new Set(bloqueDe(indice.hoja, numero))
  const filas = new Set<number>()
  for (const n of formula.definicion.nodos) {
    if (!propios.has(n.id)) continue
    for (const r of referenciasDe(n)) {
      const otra = numeroDeLaCelda(indice.hoja, r.id) ?? indice.duenoDe.get(r.id)
      if (otra !== undefined && otra !== numero) filas.add(otra)
    }
  }
  return [...filas].sort((a, b) => a - b)
}

export type ContextoDeUsos = {
  readonly diseno: Diseno | null
  // Lo que nombra la tarjeta de trabajo; nulo si no se pudo leer (no se borra a ciegas).
  readonly tarjeta: NombradoPorLaTarjeta | null
}

export type UsosDeLaFila = {
  readonly filas: readonly number[]
  // Las etiquetas de las bandas cuyo tipo de cambio es esta fila; `enUnBucket`, si algún bucket la usa (con banda o sin ella).
  readonly bandasConTc: readonly string[]
  readonly enUnBucket: boolean
  readonly esTotalEn: boolean
  readonly esFilaDelTotal: boolean
  // La etiqueta de su banda si es su única fila.
  readonly unicaDeSuBanda: string | null
  readonly enLaHoja: boolean
  readonly enLaTarjeta: boolean
  readonly tarjetaSinLeer: boolean
}

function unicaDeSuBanda(
  formula: Pick<Formula, 'definicion'>,
  hoja: HojaDeLaPlanilla,
  numero: number,
) {
  const grupo = filaDe(hoja, numero)?.grupo ?? null
  if (grupo === null) return null
  const miembros = hoja.filas.filter((f) => f.grupo === grupo).length
  if (miembros > 1) return null
  return formula.definicion.grupos?.find((g) => g.id === grupo)?.etiqueta ?? grupo
}

export function usosDe(
  formula: Pick<Formula, 'definicion'>,
  indice: IndiceDeUsos,
  numero: number,
  contexto: ContextoDeUsos,
): UsosDeLaFila {
  const { hoja } = indice
  const fila = filaDe(hoja, numero)
  const bloque = bloqueDe(hoja, numero)
  const def = formula.definicion
  const buckets = Object.entries(def.buckets ?? {})
    .filter(([, tc]) => tc === fila?.id)
    .map(([b]) => b)
  const enElDiseno = contexto.diseno === null ? null : nodosDelDiseno(contexto.diseno, def)
  const enLaHoja = enElDiseno !== null && bloque.some((id) => enElDiseno.has(id))
  const nombra = contexto.tarjeta
  return {
    filas: filasQueUsan(indice, numero),
    bandasConTc: (def.grupos ?? [])
      .filter((g) => buckets.includes(g.bucket))
      .map((g) => g.etiqueta),
    enUnBucket: buckets.length > 0,
    esTotalEn: def.total_en !== undefined && def.total_en === fila?.id,
    esFilaDelTotal: fila?.nodo.salida === 'total',
    unicaDeSuBanda: unicaDeSuBanda(formula, hoja, numero),
    enLaHoja,
    enLaTarjeta: nombra !== null && bloque.some((id) => nombra.nodos.includes(id)),
    tarjetaSinLeer: nombra === null,
  }
}

const NOMBRADAS = 5

// «C9», «C9 y C12», «C9, C10 y C12»; desde la sexta, «y N más».
export function listaDeCeldas(numeros: readonly number[], col = 'C'): string {
  const celdas = numeros.slice(0, NOMBRADAS).map((n) => `${col}${String(n)}`)
  const resto = numeros.length - celdas.length
  if (resto > 0) return `${celdas.join(', ')} y ${String(resto)} más`
  if (celdas.length <= 1) return celdas.join('')
  return `${celdas.slice(0, -1).join(', ')} y ${celdas[celdas.length - 1] ?? ''}`
}

const entreComillas = (etiquetas: readonly string[]) => etiquetas.map((e) => `«${e}»`).join(' y ')

// Por qué no se borra la fila (D8), en el orden en que se dice; nulo si se puede.
export function motivoParaNoEliminar(u: UsosDeLaFila): string | null {
  if (u.filas.length > 0)
    return `${u.filas.length === 1 ? 'La usa' : 'La usan'} ${listaDeCeldas(u.filas)}.`
  if (u.bandasConTc.length > 0) return `Es el tipo de cambio de ${entreComillas(u.bandasConTc)}.`
  if (u.esTotalEn) return 'Es el tipo de cambio del total: elige otro antes.'
  if (u.enUnBucket)
    return 'Es el tipo de cambio de un bucket: cámbialo en «Total y tipos de cambio» antes.'
  if (u.esFilaDelTotal) return 'Es la fila del total: elige otra antes.'
  if (u.unicaDeSuBanda !== null)
    return `Es la única fila de «${u.unicaDeSuBanda}»: quita la banda o suma otra fila antes.`
  if (u.enLaHoja) return 'La muestra la hoja: quítala en «Hoja» antes.'
  if (u.tarjetaSinLeer) return 'No se pudo leer la tarjeta: recarga la página para eliminar filas.'
  if (u.enLaTarjeta) return 'La usa la tarjeta: quítala en «Tarjeta» antes.'
  return null
}
