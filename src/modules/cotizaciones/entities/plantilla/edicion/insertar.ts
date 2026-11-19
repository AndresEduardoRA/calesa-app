// Insertar filas y columnas en el editor de la tarjeta, como Excel: la pieza nueva copia el alto (o el ancho) de la de al lado y nace sin celdas. Insertar dentro de
// una combinación la agranda; en su borde no la cambia. Una columna nueva no pasa del ancho total si cabe (24 px como mínimo); si no cabe, el tope lo dice. Puro.
import {
  ANCHO_DE_COLUMNA,
  ANCHO_TOTAL_MAXIMO,
  type CeldaDeLaTarjeta,
  type PlantillaEnCuadricula,
} from '../../cuadricula-de-la-tarjeta'
import { idNuevo } from './ids-nuevos'
import { anchoTotal, medido } from './limites'
import { mapaDeLaGrilla, rectDeLaCelda } from './mapa-de-la-grilla'
import { rechazo, type ResultadoDeEdicion } from './tipos'

type Eje = 'filas' | 'columnas'

// Las celdas cruzadas por la inserción en el índice `i` de un eje: crecen si `i` cae dentro de su combinación (`a < i ≤ b`).
function celdasConInsercion(p: PlantillaEnCuadricula, eje: Eje, i: number): CeldaDeLaTarjeta[] {
  const mapa = mapaDeLaGrilla(p)
  return p.celdas.map((c) => {
    const r = rectDeLaCelda(mapa, c)
    if (r === null) return c
    const [a, b] = eje === 'filas' ? [r.f0, r.f1] : [r.k0, r.k1]
    if (!(a < i && i <= b)) return c
    return eje === 'filas'
      ? { ...c, abarca_filas: (c.abarca_filas ?? 1) + 1 }
      : { ...c, abarca_columnas: (c.abarca_columnas ?? 1) + 1 }
  })
}

const insertado = <T>(lista: readonly T[], i: number, pieza: T): T[] => [
  ...lista.slice(0, i),
  pieza,
  ...lista.slice(i),
]

export function insertarFila(
  p: PlantillaEnCuadricula,
  f: number,
  lado: 'arriba' | 'abajo',
): ResultadoDeEdicion {
  const junto = p.filas[f]
  if (junto === undefined) return rechazo('Esa fila no está en la tarjeta.')
  const i = lado === 'arriba' ? f : f + 1
  const fila = {
    id: idNuevo('f', new Set(p.filas.map((x) => x.id))),
    alto: junto.alto,
    ocultar_si: 'nunca' as const,
  }
  return medido(p, {
    ok: true,
    plantilla: {
      ...p,
      filas: insertado(p.filas, i, fila),
      celdas: celdasConInsercion(p, 'filas', i),
    },
    anuncio: lado === 'arriba' ? 'Se insertó una fila arriba.' : 'Se insertó una fila abajo.',
    seleccion: { tipo: 'filas', desde: i, hasta: i },
  })
}

// El ancho de una columna nueva: el de la de al lado, sin pasar del ancho total que queda (y nunca menos de 24 px).
function anchoNuevo(p: PlantillaEnCuadricula, junto: number): number {
  const queda = Math.max(ANCHO_DE_COLUMNA.minimo, ANCHO_TOTAL_MAXIMO - anchoTotal(p))
  return Math.max(ANCHO_DE_COLUMNA.minimo, Math.min(junto, queda))
}

export function insertarColumna(
  p: PlantillaEnCuadricula,
  k: number,
  lado: 'izquierda' | 'derecha',
): ResultadoDeEdicion {
  const junto = p.columnas[k]
  if (junto === undefined) return rechazo('Esa columna no está en la tarjeta.')
  const i = lado === 'izquierda' ? k : k + 1
  const columna = {
    id: idNuevo('k', new Set(p.columnas.map((x) => x.id))),
    ancho: anchoNuevo(p, junto.ancho),
  }
  return medido(p, {
    ok: true,
    plantilla: {
      ...p,
      columnas: insertado(p.columnas, i, columna),
      celdas: celdasConInsercion(p, 'columnas', i),
    },
    anuncio:
      lado === 'izquierda'
        ? 'Se insertó una columna a la izquierda.'
        : 'Se insertó una columna a la derecha.',
    seleccion: { tipo: 'columnas', desde: i, hasta: i },
  })
}

// «Sumar columna» del resumen: una columna nueva al final.
export function sumarColumna(p: PlantillaEnCuadricula): ResultadoDeEdicion {
  const resultado = insertarColumna(p, p.columnas.length - 1, 'derecha')
  return resultado.ok ? { ...resultado, anuncio: 'Se sumó una columna.' } : resultado
}
