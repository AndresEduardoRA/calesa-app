// Los topes de la forma 2 vistos desde el editor: toda operación se mide después de hacerla y, si pasaría uno, no se hace y dice por qué. Manda el tope en bytes
// (24 KiB del texto del `jsonb`): 1.000 celdas no caben en él. Una plantilla que ya pasa un tope (una forma 1 convertida grande) no bloquea lo que lo achica: sólo se
// rechaza lo que pasa el tope **y** crece. Puro.
import {
  ANCHO_TOTAL_MAXIMO,
  MAXIMO_DE_CELDAS,
  MAXIMO_DE_COLUMNAS,
  MAXIMO_DE_FILAS,
  TOPE_EN_BYTES_DE_LA_CUADRICULA,
  type PlantillaEnCuadricula,
} from '../../cuadricula-de-la-tarjeta'
import { bytesComoJsonb } from '../../json-de-la-base'
import { revisarLaGrilla } from '../reglas-de-la-grilla'
import type { ResultadoDeEdicion } from './tipos'

export const MOTIVOS_DE_LOS_TOPES = {
  columnas: 'Ya hay 16 columnas.',
  filas: 'Ya hay 120 filas.',
  celdas: 'Ya hay 1.000 celdas.',
  ancho: 'El ancho total pasaría de 1.600 px.',
  bytes: 'La tarjeta pasaría de 24 KiB.',
} as const

export const MOTIVO_DE_LOS_BYTES_AL_GUARDAR = 'La tarjeta pasa de 24 KiB: quita filas o textos.'

export const bytesDe = (p: PlantillaEnCuadricula): number => bytesComoJsonb(p)
export const anchoTotal = (p: PlantillaEnCuadricula): number =>
  p.columnas.reduce((suma, c) => suma + c.ancho, 0)

// Lo que pasaría un tope y crece; nulo si la plantilla nueva entra.
export function motivoDelTope(
  antes: PlantillaEnCuadricula,
  despues: PlantillaEnCuadricula,
): string | null {
  const medidas: [keyof typeof MOTIVOS_DE_LOS_TOPES, number, number, number][] = [
    ['columnas', antes.columnas.length, despues.columnas.length, MAXIMO_DE_COLUMNAS],
    ['filas', antes.filas.length, despues.filas.length, MAXIMO_DE_FILAS],
    ['celdas', antes.celdas.length, despues.celdas.length, MAXIMO_DE_CELDAS],
    ['ancho', anchoTotal(antes), anchoTotal(despues), ANCHO_TOTAL_MAXIMO],
  ]
  for (const [clave, a, d, tope] of medidas) {
    if (d > tope && d > a) return MOTIVOS_DE_LOS_TOPES[clave]
  }
  const bytes = bytesDe(despues)
  if (bytes > TOPE_EN_BYTES_DE_LA_CUADRICULA && bytes > bytesDe(antes))
    return MOTIVOS_DE_LOS_TOPES.bytes
  return null
}

// El resultado de una operación, medido: si pasaría un tope, o rompe una regla de la grilla que antes no rompía (dos celdas que se pisan), el rechazo con su motivo.
export function medido(
  antes: PlantillaEnCuadricula,
  resultado: ResultadoDeEdicion,
): ResultadoDeEdicion {
  if (!resultado.ok) return resultado
  const tope = motivoDelTope(antes, resultado.plantilla)
  if (tope !== null) return { ok: false, motivo: tope }
  const regla = revisarLaGrilla(resultado.plantilla)
  if (regla !== null && revisarLaGrilla(antes)?.regla !== regla.regla)
    return { ok: false, motivo: regla.mensaje }
  return resultado
}
