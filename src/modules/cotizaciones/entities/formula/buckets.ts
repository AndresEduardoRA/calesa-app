// El tipo de cambio de una banda (D14 del cambio de la planilla): la persona elige una fila «Tipo de cambio» y la fórmula guarda un bucket que apunta a ella.
// Se usa el bucket que ya apunta a esa fila (primero el que la banda ya tenía) o se crea uno con la clave del tipo de cambio. Con modos de tipo de cambio en la
// hoja no se crea ninguno: los modos llenan exactamente los buckets de la fórmula (`modo_bucket_inexistente`) y uno nuevo rompería la hoja al publicar. Sin
// modos, el bucket que ya nadie usa se limpia (`sinBucketsSueltos()`). Puro.
import type { Definicion, Formula } from '../formula'
import type { Nodo } from '../nodos'
import { filasDe } from './filas'
import { idDeFilaNueva } from './fila-nueva'

export const MENSAJE_BUCKET_CON_MODOS =
  'La hoja tiene modos de tipo de cambio: suma este tipo de cambio primero en cada modo, en «Hoja».'
export const MENSAJE_SIN_TIPO_DE_CAMBIO = 'Elige un tipo de cambio de la lista.'

export type ConModos = { readonly conModos: boolean }

const tiposDeCambio = (formula: Pick<Formula, 'definicion'>) =>
  formula.definicion.nodos.filter(
    (n): n is Extract<Nodo, { tipo: 'tipo_cambio' }> => n.tipo === 'tipo_cambio',
  )

// Una fila «Tipo de cambio» para el selector de una banda; `motivo` apaga la que no se puede elegir (con modos, la que ningún bucket usa).
export type OpcionDeTipoDeCambio = {
  readonly id: string
  readonly etiqueta: string
  readonly clave: string
  // Los buckets que hoy apuntan a ella (así un formulario sabe cuál es la de una banda).
  readonly buckets: readonly string[]
  readonly motivo: string | null
}

export function opcionesDeTipoDeCambio(
  formula: Pick<Formula, 'definicion'>,
  { conModos }: ConModos,
): OpcionDeTipoDeCambio[] {
  const buckets = Object.entries(formula.definicion.buckets ?? {})
  const filas = new Set(filasDe(formula.definicion).map((f) => f.nodo.id))
  return tiposDeCambio(formula)
    .filter((n) => filas.has(n.id))
    .map((n) => ({
      id: n.id,
      etiqueta: n.etiqueta,
      clave: n.clave,
      buckets: buckets.filter(([, id]) => id === n.id).map(([b]) => b),
      motivo: conModos && !buckets.some(([, id]) => id === n.id) ? MENSAJE_BUCKET_CON_MODOS : null,
    }))
}

// La fila del tipo de cambio de un bucket (la de `buckets`, por omisión), o nula.
export function tipoDeCambioDelBucket(
  formula: Pick<Formula, 'definicion'>,
  bucket: string,
): string | null {
  const buckets = formula.definicion.buckets ?? {}
  return Object.hasOwn(buckets, bucket) ? (buckets[bucket] ?? null) : null
}

export type BucketElegido =
  | { readonly ok: true; readonly bucket: string; readonly buckets: Record<string, string> }
  | { readonly ok: false; readonly mensaje: string }

// El id de un bucket nuevo: la clave del tipo de cambio, o con `_2`… si ya la usa un nodo, un grupo, una constante u otro bucket.
function idDelBucketNuevo(formula: Pick<Formula, 'definicion' | 'params'>, clave: string): string {
  const ocupados = new Set<string>([
    ...formula.definicion.nodos.map((n) => n.id),
    ...(formula.definicion.grupos ?? []).map((g) => g.id),
    ...Object.keys(formula.definicion.buckets ?? {}),
    ...Object.keys(formula.params.constantes),
  ])
  return idDeFilaNueva(clave, ocupados)
}

export function bucketPara(
  formula: Pick<Formula, 'definicion' | 'params'>,
  tipoDeCambio: string,
  { conModos, preferido }: ConModos & { readonly preferido?: string },
): BucketElegido {
  const nodo = tiposDeCambio(formula).find((n) => n.id === tipoDeCambio)
  if (nodo === undefined) return { ok: false, mensaje: MENSAJE_SIN_TIPO_DE_CAMBIO }
  const buckets = { ...(formula.definicion.buckets ?? {}) }
  if (preferido !== undefined && buckets[preferido] === tipoDeCambio)
    return { ok: true, bucket: preferido, buckets }
  const usado = Object.entries(buckets).find(([, id]) => id === tipoDeCambio)
  if (usado !== undefined) return { ok: true, bucket: usado[0], buckets }
  if (conModos) return { ok: false, mensaje: MENSAJE_BUCKET_CON_MODOS }
  const bucket = idDelBucketNuevo(formula, nodo.clave)
  return { ok: true, bucket, buckets: { ...buckets, [bucket]: tipoDeCambio } }
}

// Sin los buckets que ya no usa ningún grupo ni ningún nodo (el de la forma sin grupos). Sólo sin modos: con modos, cada bucket es de la hoja también.
export function sinBucketsSueltos(definicion: Definicion): Definicion {
  if (definicion.buckets === undefined) return definicion
  const usados = new Set<string>()
  for (const g of definicion.grupos ?? []) usados.add(g.bucket)
  for (const n of definicion.nodos) if (n.bucket !== undefined) usados.add(n.bucket)
  const buckets = Object.fromEntries(
    Object.entries(definicion.buckets).filter(([b]) => usados.has(b)),
  )
  if (Object.keys(buckets).length === Object.keys(definicion.buckets).length) return definicion
  return { ...definicion, buckets }
}
