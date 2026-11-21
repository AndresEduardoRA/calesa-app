// Adónde lleva una tecla la celda activa de la planilla (D del cambio de la planilla; el patrón «grid» de WAI-ARIA, como Excel): las flechas, Tab y Shift+Tab
// (dentro de la fila y a la siguiente; al final, sale de la grilla), Enter y Shift+Enter (abajo y arriba), Inicio y Fin (la fila), Ctrl+Inicio y Ctrl+Fin (la
// planilla), RePág y AvPág (de a 10 filas). Nunca sale de la planilla salvo con Tab en sus bordes. Puro.

export type LugarEnLaCuadricula = { readonly fila: number; readonly col: number }
export type TeclaDeLaCuadricula = {
  readonly key: string
  readonly shift: boolean
  readonly ctrl: boolean
}
// Nulo: la tecla no mueve. `salir`: Tab en un borde deja la grilla (el navegador sigue).
export type DestinoDeLaTecla = LugarEnLaCuadricula | 'salir' | null

export const ULTIMA_COLUMNA = 3
export const FILAS_POR_PAGINA = 10

type Mover = (d: LugarEnLaCuadricula, t: TeclaDeLaCuadricula, filas: number) => DestinoDeLaTecla

function tab(d: LugarEnLaCuadricula, t: TeclaDeLaCuadricula, filas: number): DestinoDeLaTecla {
  if (t.shift) {
    if (d.col > 0) return { fila: d.fila, col: d.col - 1 }
    return d.fila > 0 ? { fila: d.fila - 1, col: ULTIMA_COLUMNA } : 'salir'
  }
  if (d.col < ULTIMA_COLUMNA) return { fila: d.fila, col: d.col + 1 }
  return d.fila < filas - 1 ? { fila: d.fila + 1, col: 0 } : 'salir'
}

const MOVIMIENTOS: Readonly<Record<string, Mover>> = {
  ArrowUp: (d) => ({ fila: d.fila - 1, col: d.col }),
  ArrowDown: (d) => ({ fila: d.fila + 1, col: d.col }),
  ArrowLeft: (d) => ({ fila: d.fila, col: d.col - 1 }),
  ArrowRight: (d) => ({ fila: d.fila, col: d.col + 1 }),
  Enter: (d, t) => ({ fila: d.fila + (t.shift ? -1 : 1), col: d.col }),
  Home: (d, t) => ({ fila: t.ctrl ? 0 : d.fila, col: 0 }),
  End: (d, t, filas) => ({ fila: t.ctrl ? filas - 1 : d.fila, col: ULTIMA_COLUMNA }),
  PageUp: (d) => ({ fila: d.fila - FILAS_POR_PAGINA, col: d.col }),
  PageDown: (d) => ({ fila: d.fila + FILAS_POR_PAGINA, col: d.col }),
  Tab: tab,
}

const entre = (n: number, max: number) => Math.min(Math.max(n, 0), max)

export function destinoDeLaTecla(
  tecla: TeclaDeLaCuadricula,
  desde: LugarEnLaCuadricula,
  filas: number,
): DestinoDeLaTecla {
  const mover = Object.hasOwn(MOVIMIENTOS, tecla.key) ? MOVIMIENTOS[tecla.key] : undefined
  if (mover === undefined || filas === 0) return null
  const d = mover(desde, tecla, filas)
  if (d === null || d === 'salir') return d
  return { fila: entre(d.fila, filas - 1), col: entre(d.col, ULTIMA_COLUMNA) }
}

// Una tecla que se escribe (una letra, un número, «=»): abre la edición con ella, como Excel.
export const esTeclaQueSeEscribe = (e: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}): boolean => e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
