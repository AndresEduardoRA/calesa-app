// Cómo se marca un enlace del menú de Configuración según la ruta actual (`aria-current`):
// - `'page'`: es la página que se ve (la ruta exacta, o una ruta de más abajo que no es ninguna de sus sub-secciones, como el detalle
//   `/configuracion/origenes/<id>`);
// - `'true'`: se ve una de sus sub-secciones; la sección queda marcada como la rama y la sub-sección lleva `'page'`;
// - `undefined`: otra página.
// El prefijo se compara con la barra (`/configuracion/web` no marca `/configuracion/web-otra`). Con `exacta` (la sub-sección índice, que
// vive en la ruta de su sección) sólo su ruta es la página: las otras sub-secciones de la sección están debajo y no la marcan.
export type MarcaDelEnlace = 'page' | 'true' | undefined

function estaEn(actual: string, ruta: string): boolean {
  return actual === ruta || actual.startsWith(`${ruta}/`)
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
