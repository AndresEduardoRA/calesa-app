import type { FilaDeItem } from '../nucleo/item'
import { nombreDelValor, type CatalogosDeLaHoja } from './hoja'

// Lo que dice qué es un ítem en la primera columna de la hoja, sobre su descripción: «Bomba de agua · Usado». Puro.

/** El tipo de pieza y la condición del ítem unidos con « · » (también si el valor se desactivó); nulo si no tiene ninguno (o no se encuentra). */
export function queEsElItem(
  fila: Pick<FilaDeItem, 'tipoPiezaId' | 'condicionId'>,
  catalogos: CatalogosDeLaHoja,
): string | null {
  const partes = [
    nombreDelValor(catalogos, 'tipo_pieza', fila.tipoPiezaId),
    nombreDelValor(catalogos, 'condicion', fila.condicionId),
  ].filter((p): p is string => p !== null)
  return partes.length === 0 ? null : partes.join(' · ')
}
