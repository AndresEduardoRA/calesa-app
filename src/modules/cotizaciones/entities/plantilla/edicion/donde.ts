// El `donde` de un rechazo de la base (o del espejo) llevado a la selección del lienzo: `celdas.<id>` o `celdas[3].estilo.tamano` eligen esa celda, `filas.<id>` o
// `filas[2].nodo` esa fila, `columnas.<id>` o `columnas[1].ancho` esa columna. Lo demás (`definicion`, `forma`) no elige nada. Puro.
import type { PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import { rectDeLaCelda, type MapaDeLaGrilla } from './mapa-de-la-grilla'
import { seleccionarColumnas, seleccionarFilas, type Seleccion } from './seleccion'

const POR_ID = /^(celdas|filas|columnas)\.(.+)$/
const POR_INDICE = /^(celdas|filas|columnas)\[(\d+)\]/

// La lista y el índice que nombra el `donde` (por índice o por id), o nulo.
function lugarDelDonde(
  donde: string,
  p: PlantillaEnCuadricula,
): { lista: 'celdas' | 'filas' | 'columnas'; indice: number } | null {
  const porIndice = POR_INDICE.exec(donde)
  if (porIndice !== null)
    return { lista: porIndice[1] as 'celdas' | 'filas' | 'columnas', indice: Number(porIndice[2]) }
  const porId = POR_ID.exec(donde)
  if (porId === null) return null
  const lista = porId[1] as 'celdas' | 'filas' | 'columnas'
  const ids: readonly { id: string }[] = p[lista]
  return { lista, indice: ids.findIndex((x) => x.id === porId[2]) }
}

export function seleccionDelDonde(
  donde: string,
  mapa: MapaDeLaGrilla,
  p: PlantillaEnCuadricula,
): Seleccion | null {
  const lugar = lugarDelDonde(donde, p)
  if (lugar === null || lugar.indice < 0) return null
  const { lista, indice } = lugar
  if (lista === 'filas') return indice < p.filas.length ? seleccionarFilas(indice) : null
  if (lista === 'columnas') return indice < p.columnas.length ? seleccionarColumnas(indice) : null
  const celda = p.celdas[indice]
  const r = celda === undefined ? null : rectDeLaCelda(mapa, celda)
  return r === null
    ? null
    : { tipo: 'celdas', ancla: { f: r.f0, k: r.k0 }, foco: { f: r.f0, k: r.k0 } }
}
