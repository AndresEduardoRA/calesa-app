// El tipo de celda de una fila de la planilla (glosario: «Tipo de celda»): lo que la persona ve en vez del tipo de nodo. Un número escrito es «Valor fijo»;
// lo que empieza con «=», «Cálculo»; los demás se eligen en el menú «Tipo de celda». Una tabla y un tramo se ven igual («De una tabla»; un tramo no se ofrece).
// Cambiar el tipo (D10) conserva el id, la etiqueta, la descripción y, si puede sumar, la banda, y se aplica sólo si `validarFormula()` sigue valiendo (un
// rechazo que ya estaba antes no lo frena: lo dice su fila, como tras aplicar un texto). Puro.
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { validarFormula } from '../validar'
import { filaDe, hojaDeLaPlanilla, type HojaDeLaPlanilla } from './hoja-de-la-planilla'
import { mensajeEnA1 } from './mensaje-en-a1'
import { paramsParaValidar } from './params-para-validar'
import { nodoDelTipo, type PedidoDeTipo } from './tipo-de-celda-nodos'

export type { OpcionDeLaVariante, PedidoDeTipo } from './tipo-de-celda-nodos'

export const TIPOS_DE_CELDA = [
  'valor_fijo',
  'calculo',
  'lo_escribe_el_asesor',
  'dato_del_vehiculo',
  'tipo_de_cambio',
  'interruptor',
  'de_una_tabla',
  'variante',
] as const

export type TipoDeCelda = (typeof TIPOS_DE_CELDA)[number]

export const ETIQUETA_DEL_TIPO: Record<TipoDeCelda, string> = {
  valor_fijo: 'Valor fijo',
  calculo: 'Cálculo',
  lo_escribe_el_asesor: 'Lo escribe el asesor',
  dato_del_vehiculo: 'Dato del vehículo',
  tipo_de_cambio: 'Tipo de cambio',
  interruptor: 'Interruptor Sí/No',
  de_una_tabla: 'De una tabla',
  variante: 'Variante',
}

export function tipoDeCelda(nodo: Nodo): TipoDeCelda {
  switch (nodo.tipo) {
    case 'constante':
      return 'valor_fijo'
    case 'calculo':
      return 'calculo'
    case 'input':
      return 'lo_escribe_el_asesor'
    case 'campo_vehiculo':
      return 'dato_del_vehiculo'
    case 'tipo_cambio':
      return 'tipo_de_cambio'
    case 'bandera':
      return 'interruptor'
    case 'opcion':
      return 'variante'
    case 'tabla':
    case 'tramo':
      return 'de_una_tabla'
  }
}

export type ResultadoDeCambiarTipo =
  | { readonly ok: true; readonly formula: Formula }
  | { readonly ok: false; readonly mensaje: string }

const MENSAJE_TC_EN_USO =
  'Es el tipo de cambio de una banda o del total: cámbialo en «Total y tipos de cambio» antes.'

// Por qué esa fila no puede ser de ese tipo antes de armarla, o nulo: una sola variante por fórmula y un tipo de cambio en uso no deja de serlo.
export function motivoDelTipo(
  formula: Pick<Formula, 'definicion'>,
  numero: number,
  tipo: TipoDeCelda,
  hoja: HojaDeLaPlanilla = hojaDeLaPlanilla(formula),
): string | null {
  const fila = filaDe(hoja, numero)
  if (fila === undefined) return 'Esa fila no existe.'
  if (tipo === 'variante') {
    const otra = hoja.filas.find((f) => f.nodo.tipo === 'opcion' && f.numero !== numero)
    if (otra !== undefined) return `Esta fórmula ya tiene una variante (C${String(otra.numero)}).`
  }
  const def = formula.definicion
  const enUso = def.total_en === fila.id || Object.values(def.buckets ?? {}).includes(fila.id)
  if (fila.nodo.tipo === 'tipo_cambio' && tipo !== 'tipo_de_cambio' && enUso)
    return MENSAJE_TC_EN_USO
  return null
}

export function cambiarTipo(
  formula: Formula,
  numero: number,
  pedido: PedidoDeTipo,
  hoja: HojaDeLaPlanilla = hojaDeLaPlanilla(formula),
): ResultadoDeCambiarTipo {
  const motivo = motivoDelTipo(formula, numero, pedido.tipo, hoja)
  const fila = filaDe(hoja, numero)
  if (motivo !== null || fila === undefined)
    return { ok: false, mensaje: motivo ?? 'Esa fila no existe.' }
  // Las auxiliares eran de su texto: se van con él, y sus constantes.
  const fuera = new Set(fila.auxiliares)
  const nuevo = nodoDelTipo(fila.nodo, pedido)
  const nodos = formula.definicion.nodos.flatMap((n) => {
    if (fuera.has(n.id)) return []
    return n.id === fila.id ? [nuevo] : [n]
  })
  const constantes = Object.fromEntries(
    Object.entries(formula.params.constantes).filter(([k]) => !fuera.has(k) && k !== fila.id),
  )
  if (pedido.tipo === 'valor_fijo') constantes[fila.id] = pedido.valor
  const nueva: Formula = {
    ...formula,
    definicion: { ...formula.definicion, nodos },
    params: { ...formula.params, constantes },
  }
  const v = validarFormula(nueva.definicion, paramsParaValidar(nueva))
  if (v.ok) return { ok: true, formula: nueva }
  const antes = validarFormula(formula.definicion, paramsParaValidar(formula))
  if (!antes.ok && antes.error.mensaje === v.error.mensaje) return { ok: true, formula: nueva }
  return { ok: false, mensaje: mensajeEnA1(v.error.mensaje, hojaDeLaPlanilla(nueva)) }
}
