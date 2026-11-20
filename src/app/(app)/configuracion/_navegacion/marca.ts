// Cómo se marca un enlace del menú de Configuración según la ruta actual (`aria-current`):
// - `'page'`: es la página que se ve (la ruta exacta, o una ruta de más abajo que no es ninguna de sus sub-secciones);
// - `'true'`: se ve una de sus sub-secciones; la sección queda marcada como la rama y la sub-sección lleva `'page'`;
// - `undefined`: otra página.
// Se compara por segmentos (`/configuracion/web` no marca `/configuracion/web-otra`). Con `exacta` (la sub-sección índice, que vive en la
// ruta de su sección) sólo su ruta es la página: las otras sub-secciones de la sección están debajo y no la marcan. Un sub-ítem que se marca
// por un prefijo y no por su ruta (un origen, en todas sus pestañas) pasa su `marca` (`marcaDe()`).
export type MarcaDelEnlace = 'page' | 'true' | undefined

const segmentos = (ruta: string) => ruta.split('/').filter((segmento) => segmento !== '')

function estaEn(actual: string, ruta: string): boolean {
  const deActual = segmentos(actual)
  const deRuta = segmentos(ruta)
  if (deRuta.length > deActual.length) {
    return false
  }
  return deRuta.every((segmento, i) => segmento === deActual[i])
}

export function marcaDelEnlace(
  actual: string,
  ruta: string,
  subrutas: readonly string[] = [],
  exacta = false,
): MarcaDelEnlace {
  if (exacta) {
    return actual === ruta ? 'page' : undefined
  }
  if (!estaEn(actual, ruta)) {
    return undefined
  }
  return subrutas.some((subruta) => estaEn(actual, subruta)) ? 'true' : 'page'
}

// Por dónde se marca un sub-ítem: su `marca` o, sin ella, su ruta.
export function marcaDe(sub: { ruta: string; marca?: string }): string {
  return sub.marca ?? sub.ruta
}
