// BUSCARV (docs/COTIZADOR.md › «Fórmulas como texto»): busca en una tabla de referencia del origen con los nodos que ya existen. La
// exacta (sin cuarto argumento o con FALSO) es un nodo `tabla` que casa el valor con la primera columna; con VERDADERO, un `tramo`
// sobre el valor (las columnas desde y hasta). La tabla y la columna se revisan contra el catálogo de tablas del origen.
import {
  errorEn,
  esError,
  faltaUnValor,
  type Arbol,
  type ErrorCrudo,
  type Rango,
} from './compilador-arbol'
import { calculo, invalido } from './compilador-argumentos'
import { datosDeVariante, type Nombres } from './compilador-nombres'
import { buscar, recorrer, type Medidor } from './medidor'

const tiene = (columnas: readonly string[], clave: string, m: Medidor) => {
  for (const c of recorrer(columnas, m)) if (c === clave) return true
  return false
}

// VERDADERO, FALSO o (sin cuarto argumento) FALSO; null si es otra cosa.
function porTramo(l: Arbol | undefined): boolean | null {
  if (l === undefined) return false
  const texto = l.k === 'clave' ? l.texto.toUpperCase() : ''
  return texto === 'VERDADERO' ? true : texto === 'FALSO' ? false : null
}

type Busqueda = { tabla: string; columna: string; columnas: readonly string[] }

// La tabla y la columna, contra el catálogo.
function busquedaDe(t: Arbol, c: Arbol, tramo: boolean, nombres: Nombres): Busqueda | ErrorCrudo {
  if (t.k !== 'texto') return invalido(t, 'texto')
  if (c.k !== 'texto') return invalido(c, 'texto')
  if (nombres.tablas === null) return errorEn(t, 'tablas_sin_leer')
  const columnas = buscar(nombres.tablas, t.texto, nombres.m)
  const dato = { texto: t.texto }
  if (columnas === undefined) return errorEn(t, 'tabla_inexistente', dato)
  if (columnas.length === 0) return errorEn(t, 'tabla_sin_columnas', dato)
  if (!tiene(columnas, c.texto, nombres.m))
    return errorEn(c, 'columna_inexistente', { tabla: t.texto, texto: c.texto })
  const sinTramos = !tiene(columnas, 'desde', nombres.m) || !tiene(columnas, 'hasta', nombres.m)
  if (tramo && sinTramos) return errorEn(t, 'tabla_sin_tramos', dato)
  return { tabla: t.texto, columna: c.texto, columnas }
}

export function cerrarBuscarv(args: Arbol[], rango: Rango, nombres: Nombres): Arbol | ErrorCrudo {
  const [v, t, c, l] = args
  if (v === undefined || t === undefined || c === undefined) return faltaUnValor(rango)
  const tramo = porTramo(l)
  if (tramo === null) return invalido(l ?? rango, 'logico')
  const b = busquedaDe(t, c, tramo, nombres)
  if (esError(b)) return b
  // La variante sólo se busca por igualdad: un tramo compara números.
  if (tramo && v.k === 'ref' && v.nodo.tipo === 'opcion')
    return errorEn(v, 'variante_en_calculo', datosDeVariante(v.nodo))
  const buscarEn = tramo ? {} : { buscarEn: b.columnas[0] ?? '' }
  return calculo('buscarv', rango, [v], {
    campos: { tabla: b.tabla, columna: b.columna, ...buscarEn },
  })
}
