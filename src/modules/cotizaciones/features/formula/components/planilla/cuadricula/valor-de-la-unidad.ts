// Lo que cada fila de la planilla saca de la sesión para su B y su C, en valores simples (las filas son `memo`). Puro.
import type { Formula } from '../../../../../entities/formula'
import { bDe, type HojaDeLaPlanilla } from '../../../../../entities/formula/hoja-de-la-planilla'
import { opcionElegida } from '../../../../../entities/formula/texto-de-la-celda'
import type { UnidadDeEjemplo } from '../../../../../entities/formula/unidad-de-ejemplo'
import type { VistaPrevia } from '../../../../../entities/formula/vista-previa'
import type { Nodo } from '../../../../../entities/nodos'

// Lo tipeado (0 sin tipear), el interruptor, el dato del vehículo (nulo sin dato) o la clave de la opción elegida.
export type ValorDeLaUnidad = number | boolean | string | null

export function unidadDe(unidad: UnidadDeEjemplo, nodo: Nodo): ValorDeLaUnidad | undefined {
  if (nodo.tipo === 'input') return unidad.inputs[nodo.id] ?? 0
  if (nodo.tipo === 'bandera') return unidad.banderas[nodo.id] ?? false
  if (nodo.tipo === 'opcion') return opcionElegida(nodo, unidad)
  if (nodo.tipo !== 'campo_vehiculo') return undefined
  return Object.hasOwn(unidad.vehiculo, nodo.campo) ? (unidad.vehiculo[nodo.campo] ?? null) : null
}

const numeroDe = (vista: VistaPrevia | null, id: string): number | null => {
  const v = vista?.tipo === 'calculada' ? vista.valores.get(id) : undefined
  return typeof v === 'number' ? v : null
}

// El % que muestra la B de la fila `numero` (el valor fijo o, si es de otra fila, su cifra); `undefined` si la fila no tiene %.
export function porcentajeDe(
  hoja: HojaDeLaPlanilla,
  numero: number,
  { trabajo, vista }: { trabajo: Formula; vista: VistaPrevia | null },
): number | null | undefined {
  const b = bDe(hoja, numero)
  if (b === null) return undefined
  return trabajo.params.constantes[b.id] ?? numeroDe(vista, b.id)
}
