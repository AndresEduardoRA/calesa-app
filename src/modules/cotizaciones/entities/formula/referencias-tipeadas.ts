// Lo tipeado en la barra de fórmula o en la celda, pintado (D15 y D16 del cambio de la planilla): cada celda A1 (`C5`, `$B$9`) o rango (`C5:C9`) que nombra una
// fila de la hoja, con su color en el orden en que aparece (`--viz-series-*`, en ciclo), la leyenda «C5 Remate · C7 Fees · B9 % de Agencia» y el borde de cada
// celda nombrada. Lo que no es una celda de la hoja (una fila que no existe, la columna A o D) no se pinta: lo dice `deA1()` al aplicar. También: insertar una
// referencia con un clic y renumerar lo tipeado cuando la fila se mueve. Puro, O(texto).
import { T } from '../compilador-lexico'
import { bDe, type HojaDeLaPlanilla } from './hoja-de-la-planilla'
import { COLORES_DE_REFERENCIA, leerCelda, recorrerTexto, tokensDe } from './referencias-a1'

export type ColumnaDeReferencia = 'B' | 'C'

export type ReferenciaTipeada = {
  readonly desde: number
  readonly hasta: number
  // Como se lee: `C5`, `B9` o `C5:C9` (sin `$` y en mayúsculas).
  readonly texto: string
  readonly color: number
  readonly col: ColumnaDeReferencia
  readonly numeros: readonly number[]
}

type CeldaDeLaHoja = { col: ColumnaDeReferencia; numero: number }

function celdaDeLaHoja(nombre: string, hoja: HojaDeLaPlanilla): CeldaDeLaHoja | null {
  const celda = leerCelda(nombre)
  if (celda === null || celda.fila > hoja.filas.length) return null
  if (celda.col === 'C') return { col: 'C', numero: celda.fila }
  if (celda.col === 'B' && bDe(hoja, celda.fila) !== null) return { col: 'B', numero: celda.fila }
  return null
}

const entre = (a: number, b: number) =>
  Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => Math.min(a, b) + i)

type Encontrada = Omit<ReferenciaTipeada, 'color'>

// La celda C que cierra un rango que empieza en el token `indice` (`C5` `:` `C9`), con su token; nula si no hay rango.
function finDelRango(
  texto: string,
  tokens: ReturnType<typeof tokensDe>,
  indice: number,
  hoja: HojaDeLaPlanilla,
) {
  const fin = tokens[indice + 2]
  if (tokens[indice + 1]?.t !== T.DOS_PUNTOS || fin?.t !== T.NOMBRE) return null
  const otra = celdaDeLaHoja(texto.slice(fin.desde, fin.hasta), hoja)
  return otra?.col === 'C' ? { otra, hasta: fin.hasta } : null
}

function encontradas(texto: string, hoja: HojaDeLaPlanilla): Encontrada[] {
  const tokens = tokensDe(texto)
  const salida: Encontrada[] = []
  let saltar = -1
  recorrerTexto(texto, tokens, ({ token, indice, esFuncion, esClave }) => {
    if (indice <= saltar || token.t !== T.NOMBRE || esFuncion || esClave) return
    const celda = celdaDeLaHoja(texto.slice(token.desde, token.hasta), hoja)
    if (celda === null) return
    const rango = celda.col === 'C' ? finDelRango(texto, tokens, indice, hoja) : null
    if (rango !== null) {
      const { otra } = rango
      saltar = indice + 2
      salida.push({
        desde: token.desde,
        hasta: rango.hasta,
        texto: `C${String(celda.numero)}:C${String(otra.numero)}`,
        col: 'C',
        numeros: entre(celda.numero, otra.numero),
      })
      return
    }
    salida.push({
      desde: token.desde,
      hasta: token.hasta,
      texto: `${celda.col}${String(celda.numero)}`,
      col: celda.col,
      numeros: [celda.numero],
    })
  })
  return salida
}

// Sólo un texto que empieza con «=» lleva referencias (un número no).
export function referenciasTipeadas(
  texto: string,
  hoja: HojaDeLaPlanilla,
): readonly ReferenciaTipeada[] {
  if (!texto.trimStart().startsWith('=')) return []
  const colores = new Map<string, number>()
  return encontradas(texto, hoja).map((r) => {
    const color = colores.get(r.texto) ?? colores.size % COLORES_DE_REFERENCIA
    colores.set(r.texto, color)
    return { ...r, color }
  })
}

export type EntradaDeLaLeyenda = {
  readonly texto: string
  readonly color: number
  readonly etiqueta: string
}

const etiquetaDe = (hoja: HojaDeLaPlanilla, numero: number) =>
  hoja.filas[numero - 1]?.nodo.etiqueta ?? ''

// Una entrada por referencia distinta, en orden: «C5 Remate», «B9 % de Agencia», «C5:C9 Remate … Seguro».
export function leyendaDeReferencias(
  refs: readonly ReferenciaTipeada[],
  hoja: HojaDeLaPlanilla,
): EntradaDeLaLeyenda[] {
  const vistas = new Set<string>()
  const salida: EntradaDeLaLeyenda[] = []
  for (const r of refs) {
    if (vistas.has(r.texto)) continue
    vistas.add(r.texto)
    const primera = etiquetaDe(hoja, r.numeros[0] ?? 0)
    const ultima = etiquetaDe(hoja, r.numeros[r.numeros.length - 1] ?? 0)
    const etiqueta =
      r.numeros.length > 1 ? `${primera} … ${ultima}` : r.col === 'B' ? `% de ${primera}` : primera
    salida.push({ texto: r.texto, color: r.color, etiqueta })
  }
  return salida
}

export type BordesDeLaFila = { readonly B?: number; readonly C?: number }

// El borde de color de cada celda nombrada (la primera referencia que la nombra da el color).
export function bordesDeReferencias(
  refs: readonly ReferenciaTipeada[],
): ReadonlyMap<number, BordesDeLaFila> {
  const bordes = new Map<number, BordesDeLaFila>()
  for (const r of refs) {
    for (const n of r.numeros) {
      const fila = bordes.get(n) ?? {}
      if (fila[r.col] === undefined) bordes.set(n, { ...fila, [r.col]: r.color })
    }
  }
  return bordes
}

// --- referenciar con un clic -------------------------------------------------------------------------

// Después de esto el cursor espera un operando: un clic en otra celda inserta su referencia.
const ANTES_DE_UN_OPERANDO = new Set(['=', '+', '-', '*', '/', '(', ';', ':', '<', '>', '&', '^'])

export function esperaOperando(texto: string, cursor: number): boolean {
  if (!texto.trimStart().startsWith('=')) return false
  const antes = texto.slice(0, cursor).trimEnd()
  const ultimo = antes[antes.length - 1]
  return ultimo !== undefined && ANTES_DE_UN_OPERANDO.has(ultimo)
}

export type TramoDeTexto = { readonly desde: number; readonly hasta: number }

export type TextoConCursor = {
  readonly texto: string
  readonly cursor: number
  // La última referencia que insertó un clic: otro clic con el cursor justo después la reemplaza (o, con Shift, la vuelve un rango).
  readonly ultima: TramoDeTexto | null
}

const inicioDelRango = (ref: string) => ref.split(':')[0] ?? ref

// Lo tipeado con la referencia de `celda` (`C5`, `B9`) insertada; nulo si el cursor no espera una (el clic aplica y elige esa celda, como Excel). Con Shift sobre
// la última referencia de la columna C, arma un rango desde su inicio.
export function insertarReferencia(
  e: TextoConCursor,
  celda: string,
  conShift: boolean,
): TextoConCursor | null {
  const { texto, cursor, ultima } = e
  if (ultima !== null && cursor === ultima.hasta) {
    const inicio = inicioDelRango(texto.slice(ultima.desde, ultima.hasta))
    const rango = conShift && inicio.startsWith('C') && celda.startsWith('C') && inicio !== celda
    const ref = rango ? `${inicio}:${celda}` : celda
    const nuevo = texto.slice(0, ultima.desde) + ref + texto.slice(ultima.hasta)
    const hasta = ultima.desde + ref.length
    return { texto: nuevo, cursor: hasta, ultima: { desde: ultima.desde, hasta } }
  }
  if (!esperaOperando(texto, cursor)) return null
  const nuevo = texto.slice(0, cursor) + celda + texto.slice(cursor)
  const hasta = cursor + celda.length
  return { texto: nuevo, cursor: hasta, ultima: { desde: cursor, hasta } }
}

// --- renumerar lo tipeado ---------------------------------------------------------------------------

// Lo tipeado con cada celda de la hoja vieja vuelta a escribir con su número en la nueva (tras mover la fila con «Mover esta fila debajo de la N»): la
// referencia sigue a la fila, no al número. Lo que no es una celda de la hoja vieja queda como está.
export function renumerar(texto: string, vieja: HojaDeLaPlanilla, nueva: HojaDeLaPlanilla): string {
  const tokens = tokensDe(texto)
  let salida = ''
  let desde = 0
  recorrerTexto(texto, tokens, ({ token, esFuncion, esClave }) => {
    if (token.t !== T.NOMBRE || esFuncion || esClave) return
    const celda = leerCelda(texto.slice(token.desde, token.hasta))
    if (celda === null || (celda.col !== 'B' && celda.col !== 'C')) return
    const id = vieja.filas[celda.fila - 1]?.id
    const numero = id === undefined ? undefined : nueva.numeroDe.get(id)
    if (numero === undefined) return
    salida += texto.slice(desde, token.desde) + `${celda.col}${String(numero)}`
    desde = token.hasta
  })
  return salida + texto.slice(desde)
}
