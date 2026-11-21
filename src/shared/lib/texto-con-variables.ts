// Un texto configurable con variables entre llaves (`Hola, {cliente}`): lo puro que comparten el editor, la tarjeta y el mensaje del portal.

// Toda `{…}` cuenta como variable, como en la base (`\{([^{}]*)\}`): una errata como `{Codigo}` se rechaza, no sale literal. Es global: se
// recorre con `matchAll` o `replace` (que la reinician), nunca con `test` ni `exec`.
export const PATRON_DE_VARIABLE = /\{([^{}]*)\}/g

export type ParteDelTexto =
  | { tipo: 'texto'; valor: string }
  // Una variable que ese texto acepta: `valor` es lo escrito (`{cliente}`) y `clave`, lo de adentro.
  | { tipo: 'variable'; valor: string; clave: string }
  // Una `{…}` que ese texto no acepta.
  | { tipo: 'desconocida'; valor: string; clave: string }

// El texto en segmentos, en su orden: lo que es texto, cada variable que se acepta y cada `{…}` que no. Unidos, dan el texto de entrada.
export function partesDelTexto(texto: string, claves: readonly string[]): ParteDelTexto[] {
  const partes: ParteDelTexto[] = []
  let desde = 0
  for (const encontrada of texto.matchAll(PATRON_DE_VARIABLE)) {
    const inicio = encontrada.index
    if (inicio > desde) {
      partes.push({ tipo: 'texto', valor: texto.slice(desde, inicio) })
    }
    const clave = encontrada[1] ?? ''
    partes.push({
      tipo: claves.includes(clave) ? 'variable' : 'desconocida',
      valor: encontrada[0],
      clave,
    })
    desde = inicio + encontrada[0].length
  }
  if (desde < texto.length) {
    partes.push({ tipo: 'texto', valor: texto.slice(desde) })
  }
  return partes
}

// Qué le pasa a las variables de un texto: las `{…}` que no acepta (sin repetir, en su orden) y las obligatorias que no están.
export function revisarVariables(
  texto: string,
  claves: readonly string[],
  obligatorias: readonly string[] = [],
): { desconocidas: string[]; faltan: string[] } {
  const usadas = new Set<string>()
  const desconocidas: string[] = []
  for (const [, clave = ''] of texto.matchAll(PATRON_DE_VARIABLE)) {
    usadas.add(clave)
    if (!claves.includes(clave) && !desconocidas.includes(clave)) {
      desconocidas.push(clave)
    }
  }
  return { desconocidas, faltan: obligatorias.filter((clave) => !usadas.has(clave)) }
}

function unidas(elementos: readonly string[], conjuncion: 'y' | 'o'): string {
  const ultimo = elementos.at(-1) ?? ''
  return elementos.length < 2
    ? ultimo
    : `${elementos.slice(0, -1).join(', ')} ${conjuncion} ${ultimo}`
}

// El aviso en vivo de las variables que un texto no acepta; `null` si todas valen.
// «{foo} no es una variable de este texto. Usa {cliente}, {empresa} o {codigo}.»
export function avisoDeVariablesDesconocidas(
  desconocidas: readonly string[],
  claves: readonly string[],
): string | null {
  if (desconocidas.length === 0) {
    return null
  }
  const escritas = desconocidas.map((clave) => `{${clave}}`)
  const quien =
    escritas.length === 1
      ? `${unidas(escritas, 'y')} no es una variable de este texto`
      : `${unidas(escritas, 'y')} no son variables de este texto`
  return `${quien}. Usa ${unidas(
    claves.map((clave) => `{${clave}}`),
    'o',
  )}.`
}

// Escribe `insercion` en el cursor, o sobre lo seleccionado (`inicio` a `fin`, como los de una `<textarea>`), y dice dónde queda el cursor:
// justo detrás de lo escrito. Los índices fuera de rango se acotan y un rango al revés se endereza.
export function insertarEnElCursor(
  texto: string,
  inicio: number,
  fin: number,
  insercion: string,
): { texto: string; cursor: number } {
  const acotar = (n: number) => Math.min(Math.max(Math.trunc(n), 0), texto.length)
  const desde = Math.min(acotar(inicio), acotar(fin))
  const hasta = Math.max(acotar(inicio), acotar(fin))
  return {
    texto: texto.slice(0, desde) + insercion + texto.slice(hasta),
    cursor: desde + insercion.length,
  }
}
