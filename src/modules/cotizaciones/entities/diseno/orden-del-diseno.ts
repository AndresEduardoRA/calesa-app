// Ordenar el diseño (la Hoja de la Fórmula de un origen): mover una sección en la lista de secciones y un ítem dentro de su sección. Un ítem no cambia
// de sección (heredaría otros niveles: cambiaría quién lo ve). Puras: un lugar fuera de la lista devuelve el diseño tal cual.
import type { Diseno } from '../diseno'
import { conSeccion } from './edicion-del-diseno'

function mover<T>(lista: readonly T[], desde: number, hasta: number): readonly T[] | null {
  const dentro = (i: number) => Number.isInteger(i) && i >= 0 && i < lista.length
  if (!dentro(desde) || !dentro(hasta) || desde === hasta) return null
  const salida = [...lista]
  const [movido] = salida.splice(desde, 1)
  if (movido === undefined) return null
  salida.splice(hasta, 0, movido)
  return salida
}

export function moverSeccion(d: Diseno, desde: number, hasta: number): Diseno {
  const secciones = mover(d.secciones, desde, hasta)
  return secciones === null ? d : { ...d, secciones: [...secciones] }
}

export function moverItem(d: Diseno, seccionId: string, desde: number, hasta: number): Diseno {
  const s = d.secciones.find((x) => x.id === seccionId)
  const items = s === undefined ? null : mover(s.items, desde, hasta)
  return items === null ? d : conSeccion(d, seccionId, (x) => ({ ...x, items: [...items] }))
}
