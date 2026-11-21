// Las referencias A1 de la planilla (glosario: «Referencia (de la planilla)», «Rango»): una capa del navegador sobre los ids. Se guardan ids
// (`nodo.texto` con `remate+fees`) y se muestran como A1 (`=C5+C7`); `C<n>` es el valor de la fila n y `B<n>` su %. Insertar, mover o borrar filas no
// toca ningún texto: lo que se muestra se recalcula. Aquí, leer una celda, recorrer el texto con el léxico del compilador y `aA1()` (ids → A1, con los
// rangos comprimidos y un color por referencia); `deA1()` (A1 → ids, con sus rechazos) está en `de-a1.ts`. Puro, O(texto).
import type { NombreEnLaPlanilla } from '../compilador'
import { crearLexico, siguiente, T, type Token } from '../compilador-lexico'
import { celdaDe, type HojaDeLaPlanilla } from './hoja-de-la-planilla'

// Una celda leída: la columna en mayúsculas y la fila (0 si se escribió así: no existe).
export type Celda = { readonly col: string; readonly fila: number }

const esLetra = (c: number) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122)
const esDigito = (c: number) => c >= 48 && c <= 57

// `C5`, `c5`, `$C$5`, `AB12`: de 1 a 3 letras y la fila, con «$» opcionales (se aceptan y se ignoran). Nula si no tiene esa forma.
export function leerCelda(s: string): Celda | null {
  let i = 0
  if (s.charCodeAt(i) === 36) i += 1
  const inicio = i
  while (i < s.length && esLetra(s.charCodeAt(i))) i += 1
  if (i === inicio || i - inicio > 3) return null
  const col = s.slice(inicio, i).toUpperCase()
  if (s.charCodeAt(i) === 36) i += 1
  const digitos = i
  while (i < s.length && esDigito(s.charCodeAt(i))) i += 1
  if (i === digitos || i !== s.length) return null
  return { col, fila: Number(s.slice(digitos)) }
}

export const escribirCelda = (c: Celda): string => `${c.col}${String(c.fila)}`

// Las funciones donde va un rango.
export const CON_RANGO: ReadonlySet<string> = new Set(['SUMA', 'MAX', 'MIN'])
// DEPRECIAR(x; tabla; sobre; columna): la tabla y la columna son claves, no filas.
const esClaveDeDepreciar = (fn: string | null, arg: number) =>
  fn === 'DEPRECIAR' && (arg === 1 || arg === 3)

// Un paréntesis abierto mientras se recorre: el de una función (su nombre en mayúsculas) o uno suelto (`fn` nulo), y en qué argumento va.
export type MarcoDelTexto = { fn: string | null; arg: number; args: number[][] }

export type PasoDelTexto = {
  token: Token
  indice: number
  // El marco donde está el token (nulo, fuera de todo paréntesis).
  marco: MarcoDelTexto | null
  // Un nombre seguido de «(»: el de una función.
  esFuncion: boolean
  // Un nombre que es una clave de DEPRECIAR: no se traduce.
  esClave: boolean
}

// Todos los tokens del texto (sin el «=» inicial, que el léxico salta), hasta el final.
export function tokensDe(texto: string): Token[] {
  const lex = crearLexico(texto, { visitas: 0 })
  const tokens: Token[] = []
  for (;;) {
    const t = siguiente(lex)
    if (t.t === T.FIN) return tokens
    tokens.push(t)
  }
}

type Recorrido = { pila: MarcoDelTexto[]; funcion: string | null }

const anotar = (marco: MarcoDelTexto | null | undefined, indice: number) => {
  marco?.args[marco.arg]?.push(indice)
}

// Un paréntesis, un cierre o un separador cambian la pila (y no se le pasan a `alPaso`): true si lo era.
function moverLaPila(
  r: Recorrido,
  token: Token,
  indice: number,
  alCerrar: (m: MarcoDelTexto) => void,
): boolean {
  const marco = r.pila[r.pila.length - 1]
  if (token.t === T.ABRE) {
    anotar(marco, indice)
    r.pila.push({ fn: r.funcion, arg: 0, args: [[]] })
    r.funcion = null
    return true
  }
  if (token.t === T.CIERRA) {
    const cerrado = r.pila.pop()
    if (cerrado !== undefined) alCerrar(cerrado)
    anotar(r.pila[r.pila.length - 1], indice)
    return true
  }
  if (token.t === T.PUNTO_Y_COMA && marco !== undefined) {
    marco.arg += 1
    marco.args.push([])
    return true
  }
  return false
}

// Recorre los tokens con la pila de paréntesis: `alPaso` ve cada uno con su marco; `alCerrar`, cada marco que se cierra, con los índices de los tokens de
// cada argumento.
export function recorrerTexto(
  texto: string,
  tokens: readonly Token[],
  alPaso: (p: PasoDelTexto) => void,
  alCerrar: (m: MarcoDelTexto) => void = () => undefined,
): void {
  const r: Recorrido = { pila: [], funcion: null }
  for (const [indice, token] of tokens.entries()) {
    if (moverLaPila(r, token, indice, alCerrar)) continue
    const marco = r.pila[r.pila.length - 1] ?? null
    anotar(marco, indice)
    const esFuncion = token.t === T.NOMBRE && tokens[indice + 1]?.t === T.ABRE
    if (esFuncion) r.funcion = texto.slice(token.desde, token.hasta).toUpperCase()
    const esClave = marco !== null && esClaveDeDepreciar(marco.fn, marco.arg)
    alPaso({ token, indice, marco, esFuncion, esClave })
  }
}

// Una referencia del texto en A1, con su lugar en el texto que se muestra, los nodos que nombra y su color (índice de `--viz-series-*`, en ciclo).
export type ReferenciaPintada = {
  readonly desde: number
  readonly hasta: number
  readonly texto: string
  readonly ids: readonly string[]
  readonly color: number
}

export type TextoEnA1 = { readonly texto: string; readonly refs: readonly ReferenciaPintada[] }

export const COLORES_DE_REFERENCIA = 6
// Una función con 3 filas o más (`SUMA(C5; C6; C7)`) muestra cada corrida de 2 o más filas seguidas como rango: `SUMA(C5:C9)` con una fila insertada en
// medio se ve `SUMA(C5:C6; C8:C10)`. Con menos, cada fila va sola (`MAX(C5; C6)`).
const MINIMO_DE_FILAS = 3
const MINIMO_DEL_RANGO = 2

type Reemplazo = { desde: number; hasta: number; texto: string; ids: string[]; fila: number | null }

// Hasta qué argumento sigue la corrida de filas seguidas que empieza en `i` (con la fila de cada argumento, nula si no es una fila sola).
function finDeLaCorrida(filas: readonly (number | null)[], i: number): number {
  const inicio = filas[i]
  if (inicio === null || inicio === undefined) return i
  let j = i
  while (j + 1 < filas.length && filas[j + 1] === inicio + (j + 1 - i)) j += 1
  return j
}

// Las corridas de argumentos que son cada uno una fila (C) y van seguidas: `SUMA(C5; C6; C7)` se ve `SUMA(C5:C7)` (`MINIMO_DE_FILAS`).
function comprimir(
  marco: MarcoDelTexto,
  porToken: ReadonlyMap<number, Reemplazo>,
  tokens: readonly Token[],
): Reemplazo[] {
  const unico = (arg: readonly number[]) => (arg.length === 1 ? arg[0] : undefined)
  const filas = marco.args.map((arg) => {
    const t = unico(arg)
    return t === undefined ? null : (porToken.get(t)?.fila ?? null)
  })
  const salida: Reemplazo[] = []
  if (filas.filter((f) => f !== null).length < MINIMO_DE_FILAS) return salida
  for (let i = 0; i < filas.length;) {
    const j = finDeLaCorrida(filas, i)
    const inicio = filas[i]
    const primero = tokens[marco.args[i]?.[0] ?? -1]
    const ultimo = tokens[marco.args[j]?.[0] ?? -1]
    if (inicio != null && j - i + 1 >= MINIMO_DEL_RANGO && primero && ultimo) {
      const ids = marco.args.slice(i, j + 1).flatMap((a) => porToken.get(a[0] ?? -1)?.ids ?? [])
      salida.push({
        desde: primero.desde,
        hasta: ultimo.hasta,
        texto: `C${String(inicio)}:C${String(inicio + j - i)}`,
        ids,
        fila: null,
      })
    }
    i = j + 1
  }
  return salida
}

// Arma el texto con los reemplazos (sin solaparse) y les da su lugar en el texto nuevo y su color.
function armar(texto: string, reemplazos: readonly Reemplazo[]): TextoEnA1 {
  const colores = new Map<string, number>()
  const refs: ReferenciaPintada[] = []
  let salida = ''
  let desde = 0
  for (const r of [...reemplazos].sort((a, b) => a.desde - b.desde)) {
    if (r.desde < desde) continue
    salida += texto.slice(desde, r.desde)
    const color = colores.get(r.texto) ?? colores.size % COLORES_DE_REFERENCIA
    colores.set(r.texto, color)
    refs.push({
      desde: salida.length,
      hasta: salida.length + r.texto.length,
      texto: r.texto,
      ids: r.ids,
      color,
    })
    salida += r.texto
    desde = r.hasta
  }
  return { texto: salida + texto.slice(desde), refs }
}

// El texto guardado (con ids) como se muestra: cada nodo que es una fila, `C<n>`; la pct absorbida, `B<n>`; los argumentos de SUMA, MAX o MIN que son filas
// seguidas, un rango (`MINIMO_DE_FILAS`). Lo demás (grupos, funciones, textos, claves) queda como está.
export function aA1(texto: string, hoja: HojaDeLaPlanilla): TextoEnA1 {
  const tokens = tokensDe(texto)
  const porToken = new Map<number, Reemplazo>()
  const comprimidos: Reemplazo[] = []
  recorrerTexto(
    texto,
    tokens,
    ({ token, indice, esFuncion, esClave }) => {
      if (token.t !== T.NOMBRE || esFuncion || esClave) return
      const id = texto.slice(token.desde, token.hasta)
      const celda = celdaDe(hoja, id)
      if (celda === null) return
      const fila = celda.startsWith('C') ? (hoja.numeroDe.get(id) ?? null) : null
      porToken.set(indice, {
        desde: token.desde,
        hasta: token.hasta,
        texto: celda,
        ids: [id],
        fila,
      })
    },
    (marco) => {
      if (marco.fn !== null && CON_RANGO.has(marco.fn))
        comprimidos.push(...comprimir(marco, porToken, tokens))
    },
  )
  return armar(texto, [...comprimidos, ...porToken.values()])
}

// Cómo el compilador nombra un nodo en sus mensajes con la hoja: «C5 (Remate)», o «B9 (% de Agencia)».
export function nombrarConLaHoja(
  hoja: HojaDeLaPlanilla,
): (id: string) => NombreEnLaPlanilla | undefined {
  return (id) => {
    const celda = celdaDe(hoja, id)
    if (celda === null) return undefined
    const n = hoja.numeroDe.get(id) ?? hoja.absorbidas.get(id) ?? 0
    const fila = hoja.filas[n - 1]
    if (fila === undefined) return undefined
    return { celda, etiqueta: fila.id === id ? fila.nodo.etiqueta : `% de ${fila.nodo.etiqueta}` }
  }
}
