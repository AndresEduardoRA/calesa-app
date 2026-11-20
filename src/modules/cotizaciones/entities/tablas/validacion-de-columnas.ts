// Espejo de `_tabla_referencia_columnas_validas()` (docs/COTIZADOR.md › «Crear, columnas y desactivar»): los mismos mensajes, el mismo camino y el
// mismo orden (columna por columna, el primer rechazo). Copia los detalles de la base: `char_length` cuenta puntos de código, `btrim` sólo quita
// U+0020 y las minúsculas de `lower(… collate "C")` son sólo ASCII. La base vuelve a validar: esto adelanta el mensaje junto a su campo.
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import { LARGO_MAXIMO_DE_LA_ETIQUETA, TOPE_DE_COLUMNAS, esTipoDeColumna } from './estructura'

export type RechazoDeColumnas = { mensaje: string; camino: string }

const CLAVE_DE_COLUMNA =
  /^[abcdefghijklmnopqrstuvwxyz][abcdefghijklmnopqrstuvwxyz0123456789_]{0,40}$/

// `btrim(x, ' ')`: sólo el espacio ASCII.
export function sinEspaciosEnLosBordes(texto: string): string {
  return texto.replace(/^ +| +$/g, '')
}

function minusculasAscii(texto: string): string {
  return texto.replace(/[A-Z]/g, (letra) => letra.toLowerCase())
}

const largo = (texto: string) => [...texto].length

export type ColumnaPedida = { clave: unknown; etiqueta: unknown; tipo: unknown }

type Vistas = { claves: Set<string>; etiquetas: Set<string> }
// Dónde va el rechazo: el número que lee la persona y el camino del campo.
type Lugar = { n: number; camino: string }

function rechazoDeLaClave(clave: string | null, { n, camino }: Lugar, vistas: Vistas) {
  if (clave === null || !CLAVE_DE_COLUMNA.test(clave)) {
    return {
      mensaje: `La columna ${n}: la clave va en minúsculas, sin espacios ni acentos, y empieza con una letra.`,
      camino: `${camino}.clave`,
    }
  }
  if (vistas.claves.has(clave)) {
    return {
      mensaje: `La columna ${n}: ya hay otra con la clave «${clave}».`,
      camino: `${camino}.clave`,
    }
  }
  return null
}

function rechazoDeLaEtiqueta(etiqueta: string, { n, camino }: Lugar, vistas: Vistas) {
  if (etiqueta === '') {
    return { mensaje: `La columna ${n}: le falta el nombre.`, camino: `${camino}.etiqueta` }
  }
  if (largo(etiqueta) > LARGO_MAXIMO_DE_LA_ETIQUETA) {
    return {
      mensaje: `La columna ${n}: el nombre pasa de ${LARGO_MAXIMO_DE_LA_ETIQUETA} letras.`,
      camino: `${camino}.etiqueta`,
    }
  }
  if (vistas.etiquetas.has(minusculasAscii(etiqueta))) {
    return { mensaje: `La columna ${n}: ya hay otra «${etiqueta}».`, camino: `${camino}.etiqueta` }
  }
  return null
}

// Un tipo fuera de número, año o texto pasa sólo si la columna ya lo tenía (una tabla de antes con otro tipo).
function rechazoDelTipo(
  tipo: string | null,
  clave: string,
  { n, camino }: Lugar,
  anteriores: readonly ColumnaDeTabla[],
) {
  const heredado = anteriores.some((a) => a.clave === clave && a.tipo === tipo)
  if (tipo === null || (!esTipoDeColumna(tipo) && !heredado)) {
    return { mensaje: `La columna ${n}: el tipo es número, año o texto.`, camino: `${camino}.tipo` }
  }
  return null
}

function rechazoDeLaColumna(
  columna: ColumnaPedida,
  i: number,
  vistas: Vistas,
  anteriores: readonly ColumnaDeTabla[],
): RechazoDeColumnas | null {
  const lugar = { n: i + 1, camino: `columnas.${i}` }
  const clave = typeof columna.clave === 'string' ? columna.clave : null
  const etiqueta =
    typeof columna.etiqueta === 'string' ? sinEspaciosEnLosBordes(columna.etiqueta) : ''
  const tipo = typeof columna.tipo === 'string' ? columna.tipo : null
  return (
    rechazoDeLaClave(clave, lugar, vistas) ??
    rechazoDeLaEtiqueta(etiqueta, lugar, vistas) ??
    rechazoDelTipo(tipo, clave ?? '', lugar, anteriores)
  )
}

export function validarColumnas(
  columnas: readonly ColumnaPedida[],
  anteriores: readonly ColumnaDeTabla[] = [],
): RechazoDeColumnas | null {
  if (columnas.length < 1 || columnas.length > TOPE_DE_COLUMNAS) {
    return { mensaje: `Una tabla tiene de 1 a ${TOPE_DE_COLUMNAS} columnas.`, camino: 'columnas' }
  }
  const vistas: Vistas = { claves: new Set(), etiquetas: new Set() }
  for (const [i, columna] of columnas.entries()) {
    const rechazo = rechazoDeLaColumna(columna, i, vistas, anteriores)
    if (rechazo) return rechazo
    vistas.claves.add(columna.clave as string)
    vistas.etiquetas.add(minusculasAscii(sinEspaciosEnLosBordes(columna.etiqueta as string)))
  }
  return null
}

// Las columnas como las guarda la base: la etiqueta sin espacios en los bordes y sólo clave, etiqueta y tipo.
export function normalizarColumnas(columnas: readonly ColumnaDeTabla[]): ColumnaDeTabla[] {
  return columnas.map((c) => ({
    clave: c.clave,
    etiqueta: sinEspaciosEnLosBordes(c.etiqueta),
    tipo: c.tipo,
  }))
}
