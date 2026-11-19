// El nombre de una columna en pantalla: las columnas sólo tienen `id` y `ancho` (sin rótulo en el esquema), así que la cabecera dice su letra, como Excel (A a P), y,
// si el id es uno de la conversión de la forma 1, su nombre («B · Concepto»). Puro.
import type { COLUMNAS_DE_LA_CONVERSION } from '../../cuadricula-de-la-tarjeta'

const NOMBRES: ReadonlyMap<string, string> = new Map<
  (typeof COLUMNAS_DE_LA_CONVERSION)[number]['id'],
  string
>([
  ['grupo', 'Grupo'],
  ['concepto', 'Concepto'],
  ['monto', 'Monto'],
  ['leyenda', 'Leyenda'],
  ['tipo_cambio', 'Tipo de cambio'],
  ['plazo', 'Plazo'],
])

// A, B… P (la forma 2 lleva hasta 16 columnas); más allá, AA, AB… por si acaso.
export function letraDeColumna(k: number): string {
  const letra = (n: number) => String.fromCharCode(65 + n)
  return k < 26 ? letra(k) : `${letra(Math.floor(k / 26) - 1)}${letra(k % 26)}`
}

export const nombreConocido = (id: string): string | null => NOMBRES.get(id) ?? null

// «B · Concepto» o «G».
export function rotuloDeColumna(k: number, id: string): string {
  const nombre = nombreConocido(id)
  return nombre === null ? letraDeColumna(k) : `${letraDeColumna(k)} · ${nombre}`
}
