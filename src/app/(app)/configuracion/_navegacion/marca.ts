// Cómo se marca un enlace del menú de Configuración según la ruta actual (`aria-current`):
// - `'page'`: es la página que se ve (la ruta exacta, o una ruta de más abajo que no es ninguna de sus sub-secciones);
// - `'true'`: se ve una de sus sub-secciones; la sección queda marcada como la rama y la sub-sección lleva `'page'`;
// - `undefined`: otra página.
// Se compara por segmentos (`/configuracion/web` no marca `/configuracion/web-otra`). Una sub-sección puede ser una plantilla: un segmento
// `[x]` acepta cualquiera (`/configuracion/origenes/[id]/campos` es la parte «Campos» de cualquier origen) y el menú la resuelve con la
// ruta actual (`rutaResuelta()`).
export type MarcaDelEnlace = 'page' | 'true' | undefined

const segmentos = (ruta: string) => ruta.split('/').filter((segmento) => segmento !== '')
const esComodin = (segmento: string) => segmento.startsWith('[') && segmento.endsWith(']')

function estaEn(actual: string, ruta: string): boolean {
  const deActual = segmentos(actual)
  const deRuta = segmentos(ruta)
  if (deRuta.length > deActual.length) {
    return false
  }
  return deRuta.every((segmento, i) => esComodin(segmento) || segmento === deActual[i])
}

export function marcaDelEnlace(
  actual: string,
  ruta: string,
  subrutas: readonly string[] = [],
): MarcaDelEnlace {
  if (!estaEn(actual, ruta)) {
    return undefined
  }
  return subrutas.some((subruta) => estaEn(actual, subruta)) ? 'true' : 'page'
}

// La ruta de una plantilla rellenada con la ruta actual: cada `[x]` toma el segmento de `actual` en su lugar, si los segmentos fijos
// anteriores coinciden; si no se puede (la lista de orígenes no tiene id), null. Una ruta sin `[` vuelve igual.
export function rutaResuelta(plantilla: string, actual: string): string | null {
  const deRuta = segmentos(plantilla)
  const ultimo = deRuta.findLastIndex(esComodin)
  if (ultimo === -1) {
    return plantilla
  }
  const deActual = segmentos(actual)
  const resueltos: string[] = []
  for (const [i, segmento] of deRuta.entries()) {
    const delActual = deActual[i]
    if (i > ultimo) {
      resueltos.push(segmento)
    } else if (delActual === undefined || (!esComodin(segmento) && segmento !== delActual)) {
      return null
    } else {
      resueltos.push(esComodin(segmento) ? delActual : segmento)
    }
  }
  return `/${resueltos.join('/')}`
}
