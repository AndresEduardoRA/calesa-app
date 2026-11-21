// Las filas de cada grupo y las que pueden sumar a uno, para el formulario de una banda de la planilla de la fórmula. Un recorrido por fórmula de trabajo.
import type { Formula } from '../../../../../entities/formula'
import { filasQuePuedenSumar } from '../../../../../entities/formula/grupos'
import type { FilaCandidata } from './filas-del-grupo'

export type Miembro = { id: string; etiqueta: string }

// Las filas de cada grupo, de un solo recorrido de los nodos por fórmula de trabajo.
export function miembrosPorGrupo(trabajo: Formula): Map<string, Miembro[]> {
  const por = new Map<string, Miembro[]>()
  for (const n of trabajo.definicion.nodos) {
    if (n.grupo === undefined) continue
    const lista = por.get(n.grupo) ?? []
    lista.push({ id: n.id, etiqueta: n.etiqueta })
    por.set(n.grupo, lista)
  }
  return por
}

export const SIN_MIEMBROS: Miembro[] = []
export const SIN_CANDIDATAS: FilaCandidata[] = []

// Las filas que pueden sumar a un grupo, con la etiqueta del grupo donde están.
export function candidatasDe(trabajo: Formula): FilaCandidata[] {
  const etiquetas = new Map((trabajo.definicion.grupos ?? []).map((g) => [g.id, g.etiqueta]))
  return filasQuePuedenSumar(trabajo).map((n) => ({
    id: n.id,
    etiqueta: n.etiqueta,
    grupo: n.grupo === undefined ? null : (etiquetas.get(n.grupo) ?? n.grupo),
  }))
}
