// Las reglas de la forma 2 que no miran la fórmula, espejo del final de `_plantilla_cuadricula_forma()`, en su orden: los conteos (`demasiadas_columnas`,
// `demasiadas_filas`, `demasiadas_celdas`), los repetidos (la segunda aparición, en el orden del arreglo), `ancho_total`, `celda_fuera_de_la_grilla`,
// `celdas_se_pisan` (la primera celda, en orden, que ocupa una casilla ya ocupada) y `variable_inexistente`. Todo lo que se busca por id va con `Map`/`Set`:
// `constructor` y `__proto__` son ids válidos.
import {
  ANCHO_TOTAL_MAXIMO,
  MAXIMO_DE_CELDAS,
  MAXIMO_DE_COLUMNAS,
  MAXIMO_DE_FILAS,
  VARIABLES_DE_LA_TARJETA,
  type PlantillaEnCuadricula,
} from '../cuadricula-de-la-tarjeta'
import { rechazoDePlantilla, type RechazoDePlantilla } from './motivos-de-plantilla'

const VARIABLES: ReadonlySet<string> = new Set(VARIABLES_DE_LA_TARJETA)

// La segunda aparición de un id, en orden; nulo si no se repite ninguno.
function repetido(ids: readonly string[]): string | null {
  const vistos = new Set<string>()
  for (const id of ids) {
    if (vistos.has(id)) return id
    vistos.add(id)
  }
  return null
}

const indices = (ids: readonly string[]) => new Map(ids.map((id, i) => [id, i]))

function conteos(p: PlantillaEnCuadricula): RechazoDePlantilla | null {
  if (p.columnas.length > MAXIMO_DE_COLUMNAS)
    return rechazoDePlantilla('demasiadas_columnas', 'columnas')
  if (p.filas.length > MAXIMO_DE_FILAS) return rechazoDePlantilla('demasiadas_filas', 'filas')
  if (p.celdas.length > MAXIMO_DE_CELDAS) return rechazoDePlantilla('demasiadas_celdas', 'celdas')
  return null
}

function repetidos(p: PlantillaEnCuadricula): RechazoDePlantilla | null {
  const columna = repetido(p.columnas.map((c) => c.id))
  if (columna !== null) return rechazoDePlantilla('columna_repetida', `columnas.${columna}`)
  const fila = repetido(p.filas.map((f) => f.id))
  if (fila !== null) return rechazoDePlantilla('fila_repetida', `filas.${fila}`)
  const celda = repetido(p.celdas.map((c) => c.id))
  if (celda !== null) return rechazoDePlantilla('celda_repetida', `celdas.${celda}`)
  return null
}

// Fuera: una fila o columna que no existe, o una combinación que pasa del borde. Después, las casillas `"fila:columna"` ocupadas (a lo sumo 16 × 120).
function posiciones(p: PlantillaEnCuadricula): RechazoDePlantilla | null {
  const deLasColumnas = indices(p.columnas.map((c) => c.id))
  const deLasFilas = indices(p.filas.map((f) => f.id))
  const fuera = p.celdas.find((c) => {
    const ci = deLasColumnas.get(c.columna)
    const fi = deLasFilas.get(c.fila)
    return (
      ci === undefined ||
      fi === undefined ||
      ci + (c.abarca_columnas ?? 1) > p.columnas.length ||
      fi + (c.abarca_filas ?? 1) > p.filas.length
    )
  })
  if (fuera !== undefined)
    return rechazoDePlantilla('celda_fuera_de_la_grilla', `celdas.${fuera.id}`)
  const ocupadas = new Set<string>()
  for (const c of p.celdas) {
    const ci = deLasColumnas.get(c.columna) ?? 0
    const fi = deLasFilas.get(c.fila) ?? 0
    for (let f = fi; f < fi + (c.abarca_filas ?? 1); f++) {
      for (let k = ci; k < ci + (c.abarca_columnas ?? 1); k++) {
        const casilla = `${String(f)}:${String(k)}`
        if (ocupadas.has(casilla)) return rechazoDePlantilla('celdas_se_pisan', `celdas.${c.id}`)
        ocupadas.add(casilla)
      }
    }
  }
  return null
}

export function revisarLaGrilla(p: PlantillaEnCuadricula): RechazoDePlantilla | null {
  const rechazo = conteos(p) ?? repetidos(p)
  if (rechazo !== null) return rechazo
  if (p.columnas.reduce((suma, c) => suma + c.ancho, 0) > ANCHO_TOTAL_MAXIMO)
    return rechazoDePlantilla('ancho_total', 'columnas')
  const posicion = posiciones(p)
  if (posicion !== null) return posicion
  const sinVariable = p.celdas.find(
    (c) =>
      c.contenido.tipo === 'dato' &&
      'variable' in c.contenido &&
      !VARIABLES.has(c.contenido.variable),
  )
  return sinVariable === undefined
    ? null
    : rechazoDePlantilla('variable_inexistente', `celdas.${sinVariable.id}`)
}
