// Eliminar una fila de la planilla (D8): saca su bloque (la pct que absorbe su B, sus auxiliares y ella) y sus constantes de `params`. Se rechaza con su
// motivo si otra fila la usa, si es el tipo de cambio de una banda, de un bucket o del total, si es la fila del total o la única de su banda, si la muestra
// la hoja o si la nombra la tarjeta de trabajo (`motivoParaNoEliminar()`): sin eso, publicar dejaría la tarjeta sin plantilla o la hoja con un nodo que no
// existe. Deshacer es de la pantalla (guarda la fórmula de antes). Puro, O(nodos).
import type { Formula } from '../formula'
import { hojaDeLaPlanilla, type HojaDeLaPlanilla } from './hoja-de-la-planilla'
import {
  bloqueDe,
  indiceDeUsos,
  motivoParaNoEliminar,
  usosDe,
  type ContextoDeUsos,
  type IndiceDeUsos,
} from './usos-de-la-fila'

export type ResultadoDeEliminar =
  | { readonly ok: true; readonly formula: Formula }
  | { readonly ok: false; readonly mensaje: string }

export function eliminarFila(
  formula: Formula,
  numero: number,
  contexto: ContextoDeUsos,
  {
    hoja = hojaDeLaPlanilla(formula),
    indice = indiceDeUsos(formula, hoja),
  }: {
    hoja?: HojaDeLaPlanilla
    indice?: IndiceDeUsos
  } = {},
): ResultadoDeEliminar {
  const bloque = new Set(bloqueDe(hoja, numero))
  if (bloque.size === 0) return { ok: false, mensaje: 'Esa fila no existe.' }
  const motivo = motivoParaNoEliminar(usosDe(formula, indice, numero, contexto))
  if (motivo !== null) return { ok: false, mensaje: motivo }
  const constantes = Object.fromEntries(
    Object.entries(formula.params.constantes).filter(([id]) => !bloque.has(id)),
  )
  return {
    ok: true,
    formula: {
      ...formula,
      definicion: {
        ...formula.definicion,
        nodos: formula.definicion.nodos.filter((n) => !bloque.has(n.id)),
      },
      params: { ...formula.params, constantes },
    },
  }
}
