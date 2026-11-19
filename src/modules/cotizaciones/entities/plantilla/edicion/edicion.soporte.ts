// Una grilla de prueba para los tests de las operaciones del editor de la tarjeta: filas `f1`, `f2`… de 25 px, columnas `k1`, `k2`… de 100 px y las celdas que se
// le den por casilla. Sólo para las pruebas (el sufijo `.soporte.` lo deja fuera del mapa).
import type {
  CeldaDeLaTarjeta,
  ContenidoDeLaCelda,
  PlantillaEnCuadricula,
} from '../../cuadricula-de-la-tarjeta'
import { formaDeCuadricula } from '../forma-de-cuadricula'
import { celdaEn, mapaDeLaGrilla } from './mapa-de-la-grilla'
import type { Rect, ResultadoDeEdicion } from './tipos'

const fila = (f: number) => `f${(f + 1).toString(36)}`
const columna = (k: number) => `k${(k + 1).toString(36)}`

export const texto = (t: string): ContenidoDeLaCelda => ({ tipo: 'texto', texto: t })
export const VACIO: ContenidoDeLaCelda = { tipo: 'vacio' }

export function grilla(
  filas: number,
  columnas: number,
  celdas: readonly CeldaDeLaTarjeta[] = [],
  ancho = 100,
): PlantillaEnCuadricula {
  return {
    forma: 2,
    columnas: Array.from({ length: columnas }, (_, k) => ({ id: columna(k), ancho })),
    filas: Array.from({ length: filas }, (_, f) => ({
      id: fila(f),
      alto: 25,
      ocultar_si: 'nunca' as const,
    })),
    celdas,
  }
}

// Una celda en la casilla `(f, k)` con su contenido; lo demás (combinaciones, estilo) se le suma con `{ ...celda(…), abarca_filas: 2 }`.
export const celda = (
  id: string,
  f: number,
  k: number,
  contenido: ContenidoDeLaCelda = VACIO,
): CeldaDeLaTarjeta => ({ id, fila: fila(f), columna: columna(k), contenido })

export const rect = (f0: number, k0: number, f1 = f0, k1 = k0): Rect => ({ f0, k0, f1, k1 })

// La plantilla de un resultado que tiene que haber salido bien y ser una forma 2 válida.
export function plantillaDe(r: ResultadoDeEdicion): PlantillaEnCuadricula {
  if (!r.ok) throw new Error(`Se esperaba que saliera bien: ${r.motivo}`)
  const forma = formaDeCuadricula(r.plantilla)
  if (!forma.ok)
    throw new Error(`No es una forma 2 válida: ${forma.error.mensaje} (${forma.error.donde})`)
  return r.plantilla
}

export const motivoDe = (r: ResultadoDeEdicion): string | null => (r.ok ? null : r.motivo)
export const anuncioDe = (r: ResultadoDeEdicion): string | null => (r.ok ? r.anuncio : null)

// El id de la celda que ocupa la casilla, o nulo.
export function ocupante(p: PlantillaEnCuadricula, f: number, k: number): string | null {
  return celdaEn(mapaDeLaGrilla(p), p, { f, k })?.celda.id ?? null
}

export const celdaPorId = (p: PlantillaEnCuadricula, id: string) =>
  p.celdas.find((c) => c.id === id)
