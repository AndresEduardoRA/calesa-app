// La tarjeta de una cotización como texto (D19 de T310): lo que copia «Copiar texto» para pegarlo en un chat, sacado de la misma geometría que dibujan el HTML,
// el PDF y la imagen. Por cada fila visible, de arriba abajo, las celdas que empiezan en ella, en orden de columna y sin las vacías:
// - con un monto: la celda de antes es el concepto («<concepto>: <monto>»); las anteriores a ella (el título de un grupo), cada una en su línea antes; después
//   cada celda posterior en su línea y por último la segunda línea del monto (el total en moneda local);
// - sin monto: los textos unidos con « · », salvo un rótulo literal seguido de un dato, que va con « » («Asesor: Ana»).
// Abren un bloque (una línea en blanco antes) las filas `cabecera`, `total` y `nota`, y la primera de cada grupo. Los montos siempre con cifras, aunque Live esté
// encendido: es lo que recibe el cliente.
import type { CeldaDibujada, Geometria } from './geometria-de-la-tarjeta'
import type { LecturaDeLaTarjeta } from './lectura-de-la-tarjeta'

const QUE_ABREN = new Set(['cabecera', 'total', 'nota'])

export const textoDe = (c: CeldaDibujada): string =>
  c.contenido.tipo === 'texto'
    ? c.contenido.lineas
        .map((l) => l.trim())
        .filter((l) => l !== '')
        .join(' ')
    : ''

const conTexto = (c: CeldaDibujada) =>
  c.contenido.tipo === 'monto' || (c.contenido.tipo === 'texto' && textoDe(c) !== '')

const esLiteral = (c: CeldaDibujada) => c.marca.nodo === undefined && c.marca.variable === undefined

function sinMonto(celdas: readonly CeldaDibujada[]): string {
  return celdas.reduce((linea, c, i) => {
    if (i === 0) return textoDe(c)
    const anterior = celdas[i - 1]
    const junto = anterior !== undefined && esLiteral(anterior) && !esLiteral(c)
    return `${linea}${junto ? ' ' : ' · '}${textoDe(c)}`
  }, '')
}

function conMonto(celdas: readonly CeldaDibujada[], i: number): string[] {
  const monto = celdas[i]
  if (monto?.contenido.tipo !== 'monto') return []
  const concepto = i > 0 ? celdas[i - 1] : undefined
  return [
    ...celdas.slice(0, Math.max(0, i - 1)).map(textoDe),
    concepto === undefined
      ? monto.contenido.texto
      : `${textoDe(concepto)}: ${monto.contenido.texto}`,
    ...celdas
      .slice(i + 1)
      .map((c) => (c.contenido.tipo === 'monto' ? c.contenido.texto : textoDe(c))),
    ...(monto.contenido.segunda === null ? [] : [monto.contenido.segunda.texto]),
  ]
}

// El grupo del nodo de una fila (la primera de un grupo abre un bloque).
function grupoDeLaFila(lectura: LecturaDeLaTarjeta, fila: string): string | null {
  if (lectura.estado !== 'lista') return null
  const nodo = lectura.definicion.filas.find((f) => f.id === fila)?.nodo
  return nodo === undefined ? null : (lectura.nodos.get(nodo)?.grupo ?? null)
}

export function textoDeLaTarjeta(geometria: Geometria, lectura: LecturaDeLaTarjeta): string {
  const porFila = new Map<string, CeldaDibujada[]>()
  for (const c of geometria.celdas) {
    if (conTexto(c)) porFila.set(c.fila, [...(porFila.get(c.fila) ?? []), c])
  }
  // Las filas que empiezan alguna celda, de arriba abajo (la geometría ya va en orden de lectura).
  const filas = [...new Set(geometria.celdas.map((c) => c.fila))]
  const bloques: string[][] = []
  let grupoAnterior: string | null = null
  for (const fila of filas) {
    const celdas = porFila.get(fila) ?? []
    const grupo = grupoDeLaFila(lectura, fila)
    const abre = QUE_ABREN.has(fila) || (grupo !== null && grupo !== grupoAnterior)
    grupoAnterior = grupo
    if (celdas.length === 0) continue
    const i = celdas.findIndex((c) => c.contenido.tipo === 'monto')
    const lineas = (i === -1 ? [sinMonto(celdas)] : conMonto(celdas, i)).filter((l) => l !== '')
    const ultimo = bloques[bloques.length - 1]
    if (abre || ultimo === undefined) bloques.push(lineas)
    else ultimo.push(...lineas)
  }
  return bloques
    .filter((b) => b.length > 0)
    .map((b) => b.join('\n'))
    .join('\n\n')
}
