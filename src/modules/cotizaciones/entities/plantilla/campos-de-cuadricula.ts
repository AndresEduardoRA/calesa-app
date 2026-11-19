// Lo que comparten las piezas del espejo de la forma 2 (`forma-de-cuadricula.ts`, `celdas-de-cuadricula.ts`): leer una clave sin el prototipo, la forma de un id,
// un entero en un rango y una clave de más. Como la base: `?` mira la clave, no el valor.
import { rechazoDePlantilla } from './motivos-de-plantilla'
import { ES_ID, esEntero } from '../json-de-la-base'

type Objeto = Readonly<Record<string, unknown>>

export const formaRota = (donde: string) => rechazoDePlantilla('forma', donde)
export const campo = (o: Objeto, k: string): unknown => (Object.hasOwn(o, k) ? o[k] : undefined)
export const esId = (v: unknown): v is string => typeof v === 'string' && ES_ID.test(v)
export const entreEnteros = (v: unknown, minimo: number, maximo: number): boolean =>
  esEntero(v) && v >= minimo && v <= maximo
export const conClaveDeMas = (o: Objeto, admitidas: ReadonlySet<string>): boolean =>
  Object.keys(o).some((k) => !admitidas.has(k))
export const enLista = (v: unknown, lista: readonly (string | number)[]): boolean =>
  (typeof v === 'string' || typeof v === 'number') && lista.includes(v)
