// «Se cotiza en par» en el editor de la fórmula (glosario: «Variante en par»): la casilla de la fila de la variante. Sólo una variante de dos opciones se
// cotiza en par (`par_sin_dos_opciones`); desmarcarla quita la clave, así la fórmula vuelve a ser la de antes, byte a byte. Puro.
import type { Formula } from '../formula'
import type { Nodo, NodoOpcion } from '../nodos'

export const MOTIVO_SIN_DOS_OPCIONES = 'Sólo una variante de dos opciones se cotiza en par.'

export const admiteEnPar = (nodo: Nodo): nodo is NodoOpcion =>
  nodo.tipo === 'opcion' && nodo.opciones.length === 2

export const estaEnPar = (nodo: Nodo): boolean => nodo.tipo === 'opcion' && nodo.en_par === true

// La fórmula con la variante `nodoId` en par (o sin la clave). Si el nodo no es la variante, o no admite el par y se pide marcarlo, la fórmula tal cual.
export function ponerEnPar(formula: Formula, nodoId: string, valor: boolean): Formula {
  const i = formula.definicion.nodos.findIndex((n) => n.id === nodoId)
  const nodo = formula.definicion.nodos[i]
  if (nodo?.tipo !== 'opcion' || estaEnPar(nodo) === valor) return formula
  if (valor && !admiteEnPar(nodo)) return formula
  const { en_par: _, ...sinLaClave } = nodo
  const nuevo: NodoOpcion = valor ? { ...sinLaClave, en_par: true } : sinLaClave
  const nodos = formula.definicion.nodos.with(i, nuevo)
  return { ...formula, definicion: { ...formula.definicion, nodos } }
}
