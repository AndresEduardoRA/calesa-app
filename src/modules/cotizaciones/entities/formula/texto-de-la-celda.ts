// Con qué texto abre la edición de una celda de la planilla (D11 y D15 del cambio de la planilla), o por qué no se escribe: A, el concepto; B, el % que es una
// constante (en puntos); C, según el tipo de celda: la fórmula en A1 (`=C5+C7`), el valor fijo, lo de la unidad de ejemplo (lo que escribe el asesor, el dato del
// vehículo, «Sí» o «No», la opción de la variante) o, en un tipo de cambio o una tabla, el motivo. D nunca se escribe. Puro.
import { textoInicial } from './ajuste'
import type { Formula } from '../formula'
import { formatoDe, type Nodo } from '../nodos'
import { bDe, filaDe, type HojaDeLaPlanilla } from './hoja-de-la-planilla'
import { aA1 } from './referencias-a1'
import type { UnidadDeEjemplo } from './unidad-de-ejemplo'

export type ColumnaDeLaPlanilla = 'A' | 'B' | 'C' | 'D'
export const COLUMNAS_DE_LA_PLANILLA: readonly ColumnaDeLaPlanilla[] = ['A', 'B', 'C', 'D']

export type TextoDeLaCelda =
  | { readonly editable: true; readonly texto: string }
  | { readonly editable: false; readonly motivo: string }

export type ContextoDelTexto = {
  readonly formula: Formula
  readonly hoja: HojaDeLaPlanilla
  readonly unidad: UnidadDeEjemplo
  readonly locale: string
  // El texto vigente de la fila (con ids) si se escribe como texto; nulo si no (`TextoDeLaFila`).
  readonly textoConIds: string | null
  // «De dónde sale» de la fila, para decir por qué su C no se escribe.
  readonly deDondeSale: string
}

export const motivoSinEscribir = (deDondeSale: string) =>
  `Esta celda no se escribe: ${deDondeSale}. Cambia su tipo en «Tipo de celda».`
export const MOTIVO_DE_D = 'D dice de dónde sale el valor: se calcula sola.'
export const MOTIVO_SIN_PORCENTAJE = 'Esta fila no tiene porcentaje.'
export const motivoDelPorcentajeDeOtraFila = (numero: number) =>
  `El % de esta fila es C${String(numero)}: cámbialo ahí.`

const escribe = (texto: string): TextoDeLaCelda => ({ editable: true, texto })

// La opción elegida de la variante en la unidad de ejemplo (o la por defecto).
export function opcionElegida(
  nodo: Extract<Nodo, { tipo: 'opcion' }>,
  unidad: UnidadDeEjemplo,
): string | null {
  const { variante } = unidad
  if (variante !== undefined && nodo.opciones.some((o) => o.clave === variante)) return variante
  return nodo.por_defecto ?? null
}

const delVehiculo = (unidad: UnidadDeEjemplo, campo: string): string => {
  const v = Object.hasOwn(unidad.vehiculo, campo) ? unidad.vehiculo[campo] : null
  return v === null || v === undefined ? '' : String(v)
}

const etiquetaDeLaElegida = (nodo: Extract<Nodo, { tipo: 'opcion' }>, unidad: UnidadDeEjemplo) => {
  const clave = opcionElegida(nodo, unidad)
  return nodo.opciones.find((o) => o.clave === clave)?.etiqueta ?? ''
}

function textoDeLaUnidad(nodo: Nodo, ctx: ContextoDelTexto): string | null {
  const { unidad, locale } = ctx
  if (nodo.tipo === 'input')
    return textoInicial(unidad.inputs[nodo.id] ?? 0, formatoDe(nodo), locale)
  if (nodo.tipo === 'bandera') return unidad.banderas[nodo.id] === true ? 'Sí' : 'No'
  if (nodo.tipo === 'opcion') return etiquetaDeLaElegida(nodo, unidad)
  if (nodo.tipo === 'campo_vehiculo') return delVehiculo(unidad, nodo.campo)
  return null
}

function textoDeC(nodo: Nodo, ctx: ContextoDelTexto): TextoDeLaCelda {
  if (nodo.tipo === 'constante')
    return escribe(
      textoInicial(ctx.formula.params.constantes[nodo.id] ?? 0, formatoDe(nodo), ctx.locale),
    )
  if (nodo.tipo === 'calculo') {
    if (ctx.textoConIds === null) return escribe('')
    const { texto } = aA1(ctx.textoConIds, ctx.hoja)
    return escribe(texto.trimStart().startsWith('=') ? texto : `=${texto}`)
  }
  const deLaUnidad = textoDeLaUnidad(nodo, ctx)
  return deLaUnidad === null
    ? { editable: false, motivo: motivoSinEscribir(ctx.deDondeSale) }
    : escribe(deLaUnidad)
}

function textoDeB(numero: number, ctx: ContextoDelTexto): TextoDeLaCelda {
  const b = bDe(ctx.hoja, numero)
  if (b === null) return { editable: false, motivo: MOTIVO_SIN_PORCENTAJE }
  const nodo = ctx.formula.definicion.nodos.find((n) => n.id === b.id)
  if (nodo?.tipo !== 'constante')
    return {
      editable: false,
      motivo: motivoDelPorcentajeDeOtraFila(ctx.hoja.numeroDe.get(b.id) ?? 0),
    }
  return escribe(textoInicial(ctx.formula.params.constantes[b.id] ?? 0, 'pct', ctx.locale))
}

export function textoDeLaCelda(
  numero: number,
  col: ColumnaDeLaPlanilla,
  ctx: ContextoDelTexto,
): TextoDeLaCelda {
  const fila = filaDe(ctx.hoja, numero)
  if (fila === undefined) return { editable: false, motivo: 'Esa fila ya no está.' }
  if (col === 'A') return escribe(fila.nodo.etiqueta)
  if (col === 'B') return textoDeB(numero, ctx)
  if (col === 'C') return textoDeC(fila.nodo, ctx)
  return { editable: false, motivo: MOTIVO_DE_D }
}
