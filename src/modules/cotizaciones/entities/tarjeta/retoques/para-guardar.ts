// Lo que el modo «Retocar» manda a la base: del borrador, sólo lo que aplica a la cuadrícula que se dibuja y es un retoque de verdad. Pura.
import type { PlantillaEnCuadricula, RetoquesDeLaTarjeta } from '../../cuadricula-de-la-tarjeta'
import { compararComoC } from '../../json-de-la-base'

// Sólo las celdas de texto que están y cuyo texto no es el de la plantilla (un retoque igual al original no es un retoque), y las filas que están, en el orden
// de la plantilla y una vez. Nulo si no queda nada: la base guarda la columna nula.
export function retoquesParaGuardar(
  borrador: RetoquesDeLaTarjeta | null,
  plantilla: PlantillaEnCuadricula,
): RetoquesDeLaTarjeta | null {
  if (borrador === null) return null
  const originales = new Map(
    plantilla.celdas.flatMap((c) =>
      c.contenido.tipo === 'texto' ? [[c.id, c.contenido.texto] as const] : [],
    ),
  )
  const celdas = Object.entries(borrador.celdas ?? {})
    .filter(([id, texto]) => originales.has(id) && originales.get(id) !== texto)
    .sort(([a], [b]) => compararComoC(a, b))
  const pedidas = new Set(borrador.filas_ocultas ?? [])
  const filas = plantilla.filas.filter((f) => pedidas.has(f.id)).map((f) => f.id)
  if (celdas.length === 0 && filas.length === 0) return null
  return {
    ...(celdas.length > 0 ? { celdas: Object.fromEntries(celdas) } : {}),
    ...(filas.length > 0 ? { filas_ocultas: filas } : {}),
  }
}

// La forma canónica: las celdas en orden C y las filas como vinieron (ya en el orden de la plantilla si salieron de `retoquesParaGuardar`).
const canonica = (r: RetoquesDeLaTarjeta | null): string =>
  JSON.stringify([
    Object.entries(r?.celdas ?? {}).sort(([a], [b]) => compararComoC(a, b)),
    r?.filas_ocultas ?? [],
  ])

// Si dos juegos de retoques son el mismo (nulo y vacío también).
export const mismosRetoques = (a: RetoquesDeLaTarjeta | null, b: RetoquesDeLaTarjeta | null) =>
  canonica(a) === canonica(b)
