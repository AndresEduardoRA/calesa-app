import { ATRIBUTO_DE_COLUMNA, type ColumnaDeFicha } from './estilos'

// La columna de la ficha, si en este ancho se desplaza por dentro (desde 56 rem de contenedor); nula si la página la lleva (el celular, el
// texto al 200 %) o la columna no está.
export function columnaQueSeDesplaza(raiz: Element, cual: ColumnaDeFicha): HTMLElement | null {
  const columna = raiz.querySelector<HTMLElement>(`[${ATRIBUTO_DE_COLUMNA}="${cual}"]`)
  if (!columna) {
    return null
  }
  const { overflowY } = getComputedStyle(columna)
  return overflowY === 'auto' || overflowY === 'scroll' ? columna : null
}
