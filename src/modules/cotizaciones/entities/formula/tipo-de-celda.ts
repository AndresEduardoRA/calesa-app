// El tipo de celda de una fila de la planilla (glosario: «Tipo de celda»): lo que la persona ve en vez del tipo de nodo. Un número escrito es «Valor fijo»;
// lo que empieza con «=», «Cálculo»; los demás se eligen en el menú «Tipo de celda». Una tabla y un tramo se ven igual («De una tabla»). Puro.
import type { Nodo } from '../nodos'

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
