// Eliminar filas y columnas del editor de la tarjeta, como Excel: sus celdas se van con ellas. Una combinación que cruza lo eliminado se achica; si empezaba en lo
// eliminado, su ancla pasa a la primera pieza que queda después; si no le queda ninguna, se quita. La tarjeta lleva al menos una fila y una columna. Puro.
import type { CeldaDeLaTarjeta, PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import { medido } from './limites'
import { mapaDeLaGrilla, rectDeLaCelda } from './mapa-de-la-grilla'
import { conAbarca, enPlural } from './piezas'
import { rechazo, type ResultadoDeEdicion } from './tipos'

type Eje = 'filas' | 'columnas'

function celdasSin(p: PlantillaEnCuadricula, eje: Eje, a: number, b: number): CeldaDeLaTarjeta[] {
  const mapa = mapaDeLaGrilla(p)
  const piezas = eje === 'filas' ? p.filas : p.columnas
  return p.celdas.flatMap((c) => {
    const r = rectDeLaCelda(mapa, c)
    if (r === null) return [c]
    const [r0, r1] = eje === 'filas' ? [r.f0, r.f1] : [r.k0, r.k1]
    const solapa = Math.max(0, Math.min(r1, b) - Math.max(r0, a) + 1)
    const quedan = r1 - r0 + 1 - solapa
    if (quedan === 0) return []
    const nuevaAncla = r0 >= a && r0 <= b ? piezas[b + 1]?.id : undefined
    const movida =
      nuevaAncla === undefined
        ? c
        : eje === 'filas'
          ? { ...c, fila: nuevaAncla }
          : { ...c, columna: nuevaAncla }
    return [
      eje === 'filas'
        ? conAbarca(movida, quedan, c.abarca_columnas ?? 1)
        : conAbarca(movida, c.abarca_filas ?? 1, quedan),
    ]
  })
}

const entre = (desde: number, hasta: number, n: number): [number, number] => [
  Math.max(0, Math.min(desde, hasta)),
  Math.min(n - 1, Math.max(desde, hasta)),
]

export function eliminarFilas(
  p: PlantillaEnCuadricula,
  desde: number,
  hasta: number,
): ResultadoDeEdicion {
  const [a, b] = entre(desde, hasta, p.filas.length)
  if (a > b) return rechazo('Esa fila no está en la tarjeta.')
  if (a === 0 && b === p.filas.length - 1) return rechazo('La tarjeta lleva al menos una fila.')
  const filas = p.filas.filter((_, i) => i < a || i > b)
  const fila = Math.min(a, filas.length - 1)
  return medido(p, {
    ok: true,
    plantilla: { ...p, filas, celdas: celdasSin(p, 'filas', a, b) },
    anuncio: enPlural(b - a + 1, 'Se eliminó una fila.', 'Se eliminaron N filas.'),
    seleccion: { tipo: 'filas', desde: fila, hasta: fila },
  })
}

export function eliminarColumnas(
  p: PlantillaEnCuadricula,
  desde: number,
  hasta: number,
): ResultadoDeEdicion {
  const [a, b] = entre(desde, hasta, p.columnas.length)
  if (a > b) return rechazo('Esa columna no está en la tarjeta.')
  if (a === 0 && b === p.columnas.length - 1)
    return rechazo('La tarjeta lleva al menos una columna.')
  const columnas = p.columnas.filter((_, i) => i < a || i > b)
  const columna = Math.min(a, columnas.length - 1)
  return medido(p, {
    ok: true,
    plantilla: { ...p, columnas, celdas: celdasSin(p, 'columnas', a, b) },
    anuncio: enPlural(b - a + 1, 'Se eliminó una columna.', 'Se eliminaron N columnas.'),
    seleccion: { tipo: 'columnas', desde: columna, hasta: columna },
  })
}
