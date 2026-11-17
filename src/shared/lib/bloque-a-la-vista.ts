// Qué bloque de una ficha en bloques está «a la vista», para marcarlo en su índice (`aria-current="location"`). Nada acá sabe del DOM:
// recibe dónde empieza cada bloque (en px desde el borde de arriba de la ventana, en el orden de la página), la línea que cuenta como
// «ya llegué» (el borde de abajo del índice pegajoso más un margen) y si la página ya no baja más.
export type PosicionDeBloque = { ancla: string; arriba: number }

// El último cuyo borde de arriba cruzó la línea; con la página al final, el último (uno corto al pie nunca llega a la línea). Ninguno
// cruzó todavía (se está mirando lo de arriba de los bloques): ninguno.
export function bloqueALaVista(
  posiciones: readonly PosicionDeBloque[],
  linea: number,
  alFinal: boolean,
): string | null {
  const ultimo = posiciones.at(-1)
  if (!ultimo) {
    return null
  }
  if (alFinal) {
    return ultimo.ancla
  }
  let actual: string | null = null
  for (const posicion of posiciones) {
    if (posicion.arriba <= linea) {
      actual = posicion.ancla
    }
  }
  return actual
}
