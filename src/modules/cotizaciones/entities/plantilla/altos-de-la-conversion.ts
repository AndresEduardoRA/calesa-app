// El alto de una fila de la conversión (D11 de T310), estimado con aritmética entera para que la base (`_plantilla_alto_de_texto()`) dé lo mismo: sólo enteros
// ≥ 0, división truncada y `⌈a/b⌉ = ⌊(a + b − 1)/b⌋`. Un carácter mide 0,6 de la letra; un renglón, 1,4 más 0,9 px; la celda, 8 px de relleno.
import { ALTO_DE_FILA } from '../cuadricula-de-la-tarjeta'
import { caracteres } from '../json-de-la-base'

const division = (a: number, b: number) => Math.floor(a / b)

// Los renglones que ocupa un texto en una celda de ese ancho y esa letra: cada línea del texto, al menos un renglón.
export function renglones(texto: string, ancho: number, tamano: number): number {
  const porRenglon = Math.max(1, division((ancho - 8) * 10, tamano * 6))
  return texto
    .split('\n')
    .reduce(
      (suma, linea) => suma + Math.max(1, division(caracteres(linea) + porRenglon - 1, porRenglon)),
      0,
    )
}

export const altoDeRenglones = (lineas: number, tamano: number): number =>
  lineas * division(tamano * 14 + 9, 10) + 8

export const altoDeTexto = (texto: string, ancho: number, tamano: number): number =>
  altoDeRenglones(renglones(texto, ancho, tamano), tamano)

// El alto de una fila: el mayor de sus celdas de una fila, entre 16 y 240.
export const altoDeLaFila = (altos: readonly number[]): number =>
  Math.min(ALTO_DE_FILA.maximo, Math.max(ALTO_DE_FILA.minimo, ...altos))
