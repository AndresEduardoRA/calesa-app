// Lo que comparten las operaciones del editor de la tarjeta: las casillas vacías de un rectángulo, una celda nueva, los ids usados, una celda con sus
// combinaciones (`abarca_*` omitido si vale 1) o con su estilo (omitido si queda vacío), y el plural de un anuncio. Puro: nada muta lo que recibe.
import type {
  CeldaDeLaTarjeta,
  ContenidoDeLaCelda,
  EstiloDeLaCelda,
  PlantillaEnCuadricula,
} from '../../cuadricula-de-la-tarjeta'
import { posicionesDe, type MapaDeLaGrilla } from './mapa-de-la-grilla'
import type { Pos, Rect } from './tipos'

// Las casillas del rectángulo que ninguna celda ocupa, en orden de lectura.
export const casillasVacias = (mapa: MapaDeLaGrilla, r: Rect): Pos[] =>
  posicionesDe(r).filter(({ f, k }) => (mapa.ocupa[f * mapa.columnas + k] ?? -1) === -1)

export const idsDeCeldas = (p: PlantillaEnCuadricula): ReadonlySet<string> =>
  new Set(p.celdas.map((c) => c.id))

// Una celda nueva en la casilla `pos` (su fila y su columna por id), sin combinación.
export function celdaNueva(
  p: PlantillaEnCuadricula,
  id: string,
  pos: Pos,
  { contenido, estilo }: { contenido: ContenidoDeLaCelda; estilo?: EstiloDeLaCelda | undefined },
): CeldaDeLaTarjeta {
  return {
    id,
    fila: p.filas[pos.f]?.id ?? '',
    columna: p.columnas[pos.k]?.id ?? '',
    contenido,
    ...(estilo === undefined ? {} : { estilo }),
  }
}

// La celda con estas combinaciones: un `abarca_*` de 1 no se escribe.
export function conAbarca(c: CeldaDeLaTarjeta, filas: number, columnas: number): CeldaDeLaTarjeta {
  const { abarca_filas: _f, abarca_columnas: _c, ...resto } = c
  return {
    ...resto,
    ...(columnas > 1 ? { abarca_columnas: columnas } : {}),
    ...(filas > 1 ? { abarca_filas: filas } : {}),
  }
}

// La celda con este estilo: sin estilo, la clave no se escribe.
export function conEstilo(
  c: CeldaDeLaTarjeta,
  estilo: EstiloDeLaCelda | undefined,
): CeldaDeLaTarjeta {
  const { estilo: _e, ...resto } = c
  return estilo === undefined ? resto : { ...resto, estilo }
}

export const combinada = (c: CeldaDeLaTarjeta): boolean =>
  (c.abarca_filas ?? 1) > 1 || (c.abarca_columnas ?? 1) > 1

export const iguales = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

// «Se vació la celda.» o «Se vaciaron 3 celdas.»: `varios` lleva `N` donde va el número.
export const enPlural = (n: number, uno: string, varios: string): string =>
  n === 1 ? uno : varios.replace('N', String(n))
