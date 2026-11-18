// Las casillas de comparar de «De este vehículo»: qué cotizaciones están elegidas para «Comparar cotizaciones». Puro: sin React.
import { MAXIMO_PARA_COMPARAR, MINIMO_PARA_COMPARAR } from '../ruta-de-comparar'

export const ELIGE_PARA_COMPARAR = 'Elige 2 o 3 para comparar.'
export const HASTA_TRES = 'Puedes comparar hasta 3.'

// Marcar o desmarcar una; con el máximo ya elegido, una nueva no entra.
export function alternar(
  elegidas: readonly string[],
  id: string,
  maximo: number = MAXIMO_PARA_COMPARAR,
): readonly string[] {
  if (elegidas.includes(id)) {
    return elegidas.filter((e) => e !== id)
  }
  return elegidas.length >= maximo ? elegidas : [...elegidas, id]
}

// Las elegidas que siguen en la lista, en el orden de la lista (la aprobada primero y después de la más nueva): así son las columnas. Tras aprobar o releer, las que ya
// no están se sueltan.
export function elegidasEnLaLista(
  elegidas: readonly string[],
  filas: readonly { id: string }[],
): string[] {
  const marcadas = new Set(elegidas)
  return filas.filter((fila) => marcadas.has(fila.id)).map((fila) => fila.id)
}

export function puedeComparar(cuantas: number): boolean {
  return cuantas >= MINIMO_PARA_COMPARAR && cuantas <= MAXIMO_PARA_COMPARAR
}

// La casilla de una que no está elegida se apaga si ya hay el máximo.
export function casillaApagada(elegidas: readonly string[], id: string): boolean {
  return !elegidas.includes(id) && elegidas.length >= MAXIMO_PARA_COMPARAR
}

// Lo que se dice junto a «Comparar»: qué falta para poder, o el tope; nada con 2.
export function ayudaDeComparar(cuantas: number): string | null {
  if (cuantas >= MAXIMO_PARA_COMPARAR) {
    return HASTA_TRES
  }
  return puedeComparar(cuantas) ? null : ELIGE_PARA_COMPARAR
}
