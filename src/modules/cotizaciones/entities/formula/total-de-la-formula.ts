// El panel «Total y tipos de cambio» de la planilla (D14 del cambio de la planilla): `total_en` (el tipo de cambio que divide el total en Bs), la fila del total
// (la que lleva `salida: 'total'`) y el tipo de cambio de cada bucket. Lo que no viene queda igual. Puro y nunca lanza.
import type { Formula } from '../formula'
import { daMonto, esMonto, type Nodo } from '../nodos'
import { filasDe } from './filas'

export const MENSAJE_SIN_TOTAL_EN = 'Elige el tipo de cambio del total.'

// Si el id es una fila «Tipo de cambio».
export const esTipoDeCambio = (formula: Pick<Formula, 'definicion'>, id: string | undefined) =>
  id !== undefined &&
  filasDe(formula.definicion).some((f) => f.nodo.id === id && f.nodo.tipo === 'tipo_cambio')

const conDefinicion = (formula: Formula, definicion: Formula['definicion']): Formula => ({
  ...formula,
  definicion,
})

// `buckets` cambia el tipo de cambio de buckets que ya están (no suma ni quita:
// con modos, la hoja llena exactamente los de la fórmula).
export type CambiosDelTotal = {
  readonly totalEn?: string
  readonly filaDelTotal?: string
  readonly buckets?: Readonly<Record<string, string>>
}
export type ErrorDelTotal = {
  readonly campo: 'total_en' | 'fila_del_total' | 'buckets'
  readonly mensaje: string
  readonly bucket?: string
}
export type ResultadoDelTotal =
  | { readonly ok: true; readonly formula: Formula }
  | { readonly ok: false; readonly errores: readonly ErrorDelTotal[] }

// Lo que `validarFormula()` pide del total (`total_no_es_monto`) y que no esté en una banda (`miembro_con_salida`) ni sea otra salida.
const puedeSerElTotal = (n: Nodo) =>
  daMonto(n) &&
  esMonto(n) &&
  n.grupo === undefined &&
  (n.salida === undefined || n.salida === 'total')

export const filasQuePuedenSerElTotal = (formula: Pick<Formula, 'definicion'>): Nodo[] =>
  filasDe(formula.definicion)
    .map((f) => f.nodo)
    .filter(puedeSerElTotal)

function motivoDeLaFilaDelTotal(formula: Formula, id: string): string | null {
  const nodo = filasDe(formula.definicion).find((f) => f.nodo.id === id)?.nodo
  if (nodo === undefined) return 'Esa fila no existe.'
  if (!daMonto(nodo) || !esMonto(nodo))
    return 'El total tiene que ser un monto en dólares o en moneda.'
  if (nodo.grupo !== undefined) {
    const etiqueta =
      formula.definicion.grupos?.find((g) => g.id === nodo.grupo)?.etiqueta ?? nodo.grupo
    return `Esa fila suma a «${etiqueta}»: sácala de la banda antes.`
  }
  if (nodo.salida !== undefined && nodo.salida !== 'total')
    return 'Esa fila ya es otra salida de la fórmula.'
  return null
}

function erroresDelTotal(formula: Formula, cambios: CambiosDelTotal): ErrorDelTotal[] {
  const errores: ErrorDelTotal[] = []
  if (cambios.totalEn !== undefined && !esTipoDeCambio(formula, cambios.totalEn))
    errores.push({ campo: 'total_en', mensaje: MENSAJE_SIN_TOTAL_EN })
  const motivo =
    cambios.filaDelTotal === undefined
      ? null
      : motivoDeLaFilaDelTotal(formula, cambios.filaDelTotal)
  if (motivo !== null) errores.push({ campo: 'fila_del_total', mensaje: motivo })
  const actuales = formula.definicion.buckets ?? {}
  for (const [bucket, tc] of Object.entries(cambios.buckets ?? {})) {
    if (!Object.hasOwn(actuales, bucket))
      errores.push({
        campo: 'buckets',
        bucket,
        mensaje: 'Ese tipo de cambio ya no está en la fórmula.',
      })
    else if (!esTipoDeCambio(formula, tc))
      errores.push({ campo: 'buckets', bucket, mensaje: 'Elige un tipo de cambio de la lista.' })
  }
  return errores
}

const sinSalida = (n: Nodo): Nodo => {
  const { salida: _salida, ...resto } = n
  return resto as Nodo
}

// La fila del total pasa a otra: la de antes pierde `salida: 'total'` en la misma operación (`total_unico`).
function nodosConElTotal(nodos: readonly Nodo[], id: string | undefined): Nodo[] {
  if (id === undefined) return [...nodos]
  return nodos.map((n) => {
    if (n.id === id) return { ...n, salida: 'total' } as Nodo
    return n.salida === 'total' ? sinSalida(n) : n
  })
}

export function cambiarTotal(formula: Formula, cambios: CambiosDelTotal): ResultadoDelTotal {
  const errores = erroresDelTotal(formula, cambios)
  if (errores.length > 0) return { ok: false, errores }
  const def = formula.definicion
  const buckets =
    cambios.buckets === undefined ? def.buckets : { ...(def.buckets ?? {}), ...cambios.buckets }
  const totalEn = cambios.totalEn ?? def.total_en
  return {
    ok: true,
    formula: conDefinicion(formula, {
      ...def,
      nodos: nodosConElTotal(def.nodos, cambios.filaDelTotal),
      ...(buckets === undefined ? {} : { buckets }),
      ...(totalEn === undefined ? {} : { total_en: totalEn }),
    }),
  }
}
